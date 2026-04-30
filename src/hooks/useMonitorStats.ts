import { useState, useEffect } from 'react'
import { useSearchIndex } from '../context/SearchIndexContext'
import { getPreguntas } from '../services/dataService'
import type { MonitorStats, AgendaStat, TopicStat, Dataset, ColectivoFiltros } from '../types'

const AGENDA_CONFIG = [
  { id: 'tecnologica' as const, label: 'Agenda Tecnológica', color: '#0C447C', colorBg: '#E6F1FB', barColor: '#378ADD', pattern: /tecnol/i },
  { id: 'datos'       as const, label: 'Agenda de Datos',    color: '#3C3489', colorBg: '#EEEDFE', barColor: '#7F77DD', pattern: /dato/i },
  { id: 'genero'      as const, label: 'Agenda de Género',   color: '#72243E', colorBg: '#FBEAF0', barColor: '#D4537E', pattern: /g[eé]nero/i },
]

const TOPIC_QUERIES = [
  { id: 'salud-reproductiva', label: 'Salud reproductiva',  query: 'salud reproductiva maternidad mortalidad' },
  { id: 'violencia-genero',   label: 'Violencia de género',  query: 'violencia género femicidio agresión' },
  { id: 'justicia-litigios',  label: 'Justicia y litigios',  query: 'justicia litigios denuncias tribunales' },
  { id: 'interseccionalidad', label: 'Interseccionalidad',   query: 'interseccionalidad etnia raza indígena' },
  { id: 'tecnologias-datos',  label: 'Tecnologías y datos',  query: 'tecnología datos digitales acceso internet' },
]

function deriveAgenda(
  datasetsEncontrados: string[],
  datasetsMap: Map<string, Dataset>
): 'tecnologica' | 'datos' | 'genero' | null {
  const counts = { tecnologica: 0, datos: 0, genero: 0 }
  for (const id of datasetsEncontrados) {
    const ds = datasetsMap.get(id)
    if (!ds) continue
    for (const ag of ds.agendas) {
      if (/tecnol/i.test(ag)) counts.tecnologica++
      else if (/dato/i.test(ag)) counts.datos++
      else if (/g[eé]nero/i.test(ag)) counts.genero++
    }
  }
  const max = Math.max(counts.tecnologica, counts.datos, counts.genero)
  if (max === 0) return null
  if (counts.genero === max) return 'genero'
  if (counts.datos === max) return 'datos'
  return 'tecnologica'
}

const AGENDA_PATTERNS: Record<string, RegExp> = {
  tecnologica: /tecnol/i,
  datos: /dato/i,
  genero: /g[eé]nero/i,
}

export function useMonitorStats(filtros: ColectivoFiltros): MonitorStats {
  const { index, isReady: indexReady } = useSearchIndex()
  const [state, setState] = useState<MonitorStats>({
    agendas: [], topics: [],
    totalPreguntas: 0, totalDatasets: 0, totalNormativas: 0,
    paises: [],
    isReady: false, error: null,
  })

  useEffect(() => {
    if (!indexReady || !index) return
    const idx = index
    let cancelled = false

    async function compute() {
      try {
        const preguntas = await getPreguntas()
        if (cancelled) return

        function datasetPasaFiltros(ds: Dataset): boolean {
          if (filtros.agenda !== 'todas') {
            const pattern = AGENDA_PATTERNS[filtros.agenda]
            if (!ds.agendas.some(a => pattern.test(a))) return false
          }
          if (filtros.pais !== 'todos' && ds.pais_iso3 !== filtros.pais) return false
          if (filtros.calidad !== 'todas' && ds.calidad !== filtros.calidad) return false
          return true
        }

        const filteredDatasets = [...idx.datasetsMap.values()].filter(datasetPasaFiltros)
        const filteredMap = new Map(filteredDatasets.map(d => [d.id, d]))

        const paises = [...new Set(
          [...idx.datasetsMap.values()].map(d => d.pais_iso3).filter((p): p is string => Boolean(p))
        )].sort()

        const agendas: AgendaStat[] = AGENDA_CONFIG.map(cfg => {
          const inAgenda = preguntas.filter(p => {
            if (p.agenda_clasificada) return cfg.pattern.test(p.agenda_clasificada)
            return deriveAgenda(p.datasets_encontrados, filteredMap) === cfg.id
          })

          const criticas  = inAgenda.filter(p => (p.resultado_score ?? 0) >= 0.65).length
          const parciales = inAgenda.filter(p => { const s = p.resultado_score ?? 0; return s >= 0.35 && s < 0.65 }).length
          const cubiertas = inAgenda.filter(p => (p.resultado_score ?? 1) < 0.35).length

          const subtemaCounts = new Map<string, number>()
          for (const p of inAgenda) {
            for (const id of p.datasets_encontrados) {
              const ds = filteredMap.get(id)
              if (ds?.subtema) subtemaCounts.set(ds.subtema, (subtemaCounts.get(ds.subtema) ?? 0) + 1)
            }
          }
          const top_subtemas = [...subtemaCounts.entries()]
            .sort((a, b) => b[1] - a[1]).slice(0, 3)
            .map(([subtema, count]) => ({ subtema, count }))

          let datasets_en_agenda = 0
          const calidad_dist = { Completa: 0, Parcial: 0, Nula: 0 }
          for (const ds of filteredMap.values()) {
            if (ds.agendas.some(a => cfg.pattern.test(a))) {
              datasets_en_agenda++
              if (ds.calidad === 'Completa') calidad_dist.Completa++
              else if (ds.calidad === 'Parcial') calidad_dist.Parcial++
              else if (ds.calidad === 'Nula') calidad_dist.Nula++
            }
          }

          return { ...cfg, total: inAgenda.length, criticas, parciales, cubiertas, top_subtemas, datasets_en_agenda, calidad_dist }
        })

        const topics: TopicStat[] = TOPIC_QUERIES.map(tq => {
          // Use Fuse.js raw scores (lower = better match) so the gap score reflects
          // actual corpus coverage, not just relative ranking within results.
          const dsFuse = idx.fuseDatasets.search(tq.query, { limit: 10 })
          const nmFuse = idx.fuseNormativas.search(tq.query, { limit: 10 })
          const maxDsSim = dsFuse.length > 0 ? 1 - Math.min(...dsFuse.map(r => r.score ?? 1)) : 0
          const maxNmSim = nmFuse.length > 0 ? 1 - Math.min(...nmFuse.map(r => r.score ?? 1)) : 0
          const gap_score = Math.round(((1 - maxDsSim) * 0.6 + (1 - maxNmSim) * 0.4) * 100) / 100
          const categoria: 'critica' | 'parcial' | 'cubierta' =
            gap_score >= 0.65 ? 'critica' : gap_score >= 0.35 ? 'parcial' : 'cubierta'

          const topicDatasetIds = new Set(dsFuse.map(r => String(r.item.id)))
          const preguntas_relacionadas = preguntas.filter(p =>
            p.datasets_encontrados.some(id => topicDatasetIds.has(id))
          ).length
          return {
            id: tq.id, label: tq.label, gap_score, categoria,
            datasets_cubriendo: dsFuse.length,
            normativas_cubriendo: nmFuse.length,
            preguntas_relacionadas,
          }
        })

        setState({
          agendas, topics,
          totalPreguntas: preguntas.length,
          totalDatasets: filteredMap.size,
          totalNormativas: idx.normativasMap.size,
          paises,
          isReady: true, error: null,
        })
      } catch (err) {
        if (!cancelled) setState(s => ({
          ...s, isReady: true,
          error: err instanceof Error ? err.message : 'Error al computar métricas',
        }))
      }
    }

    compute()
    return () => { cancelled = true }
  }, [index, indexReady, filtros])

  return state
}
