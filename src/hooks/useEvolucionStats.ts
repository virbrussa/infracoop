import { useState, useEffect } from 'react'
import { useSearchIndex } from '../context/SearchIndexContext'
import { getPreguntas } from '../services/dataService'
import type { EvolucionStats, SemanaStats, Dataset } from '../types'

const AGENDA_PATTERNS = {
  tecnologica: /tecnol/i,
  datos: /dato/i,
  genero: /g[eé]nero/i,
} as const

const BASELINE_QUERIES = [
  'salud reproductiva maternidad mortalidad',
  'violencia género femicidio agresión',
  'justicia litigios denuncias tribunales',
  'interseccionalidad etnia raza indígena',
  'tecnología datos digitales acceso internet',
]

function deriveAgendaKey(
  datasetsEncontrados: string[],
  datasetsMap: Map<string, Dataset>
): keyof typeof AGENDA_PATTERNS | null {
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

function toIsoWeek(dateStr: string): string {
  const d = new Date(dateStr)
  const thu = new Date(d)
  thu.setDate(d.getDate() + 4 - (d.getDay() || 7))
  const yearStart = new Date(thu.getFullYear(), 0, 4)
  const weekNum = Math.ceil(((thu.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
  return `${thu.getFullYear()}-W${String(weekNum).padStart(2, '0')}`
}

function weekLabel(isoWeek: string): string {
  const [year, wPart] = isoWeek.split('-W')
  return `Sem. ${wPart} · ${year}`
}

function avg(nums: number[]): number {
  if (nums.length === 0) return 0
  return Math.round(nums.reduce((a, b) => a + b, 0) / nums.length * 100) / 100
}

export function useEvolucionStats(): EvolucionStats {
  const { index, isReady: indexReady } = useSearchIndex()
  const [state, setState] = useState<EvolucionStats>({
    semanas: [], topTemas: [],
    baseline: { score: 0, criticas: 0, parciales: 0, cubiertas: 0 },
    baselinePerAgenda: { tecnologica: 0, datos: 0, genero: 0 },
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

        // Baseline: corpus coverage before any preguntas.
        // Uses Fuse.js raw scores (lower = better match) to get real similarity values,
        // avoiding the normalization issue where MiniSearch always makes maxSim=1.
        const baselineScores = BASELINE_QUERIES.map(q => {
          const dsFuse = idx.fuseDatasets.search(q, { limit: 10 })
          const nmFuse = idx.fuseNormativas.search(q, { limit: 10 })
          const maxDsSim = dsFuse.length > 0 ? 1 - Math.min(...dsFuse.map(r => r.score ?? 1)) : 0
          const maxNmSim = nmFuse.length > 0 ? 1 - Math.min(...nmFuse.map(r => r.score ?? 1)) : 0
          return Math.round(((1 - maxDsSim) * 0.6 + (1 - maxNmSim) * 0.4) * 100) / 100
        })
        const baseline = {
          score: avg(baselineScores),
          criticas:  baselineScores.filter(s => s >= 0.65).length,
          parciales: baselineScores.filter(s => s >= 0.35 && s < 0.65).length,
          cubiertas: baselineScores.filter(s => s < 0.35).length,
        }
        // Per-agenda baselines: genero=q[0,1], datos=q[2,3], tecnologica=q[4]
        const baselinePerAgenda = {
          genero:      avg([baselineScores[0], baselineScores[1]]),
          datos:       avg([baselineScores[2], baselineScores[3]]),
          tecnologica: baselineScores[4],
        }

        // Group by ISO week
        const byWeek = new Map<string, typeof preguntas>()
        for (const p of preguntas) {
          const week = toIsoWeek(p.fecha)
          if (!byWeek.has(week)) byWeek.set(week, [])
          byWeek.get(week)!.push(p)
        }

        let cumulative = 0
        const semanas: SemanaStats[] = [...byWeek.keys()].sort().map(isoWeek => {
          const wPqs = byWeek.get(isoWeek)!
          cumulative += wPqs.length

          const agendaStats = (key: keyof typeof AGENDA_PATTERNS) => {
            const ag = wPqs.filter(p =>
              p.agenda_clasificada
                ? AGENDA_PATTERNS[key].test(p.agenda_clasificada)
                : deriveAgendaKey(p.datasets_encontrados, idx.datasetsMap) === key
            )
            return { nuevas: ag.length, score_avg: avg(ag.map(p => p.resultado_score ?? 0)) }
          }

          return {
            isoWeek, label: weekLabel(isoWeek),
            nuevas: wPqs.length, acumuladas: cumulative,
            score_promedio: avg(wPqs.map(p => p.resultado_score ?? 0)),
            criticas:  wPqs.filter(p => (p.resultado_score ?? 0) >= 0.65).length,
            parciales: wPqs.filter(p => { const s = p.resultado_score ?? 0; return s >= 0.35 && s < 0.65 }).length,
            cubiertas: wPqs.filter(p => (p.resultado_score ?? 1) < 0.35).length,
            por_agenda: {
              tecnologica: agendaStats('tecnologica'),
              datos: agendaStats('datos'),
              genero: agendaStats('genero'),
            },
          }
        })

        // Top temas from datasets_encontrados across all preguntas
        const subtemaCounts = new Map<string, number>()
        for (const p of preguntas) {
          for (const id of p.datasets_encontrados) {
            const ds = idx.datasetsMap.get(id)
            if (ds?.subtema) subtemaCounts.set(ds.subtema, (subtemaCounts.get(ds.subtema) ?? 0) + 1)
          }
        }
        const topTemas = [...subtemaCounts.entries()]
          .sort((a, b) => b[1] - a[1]).slice(0, 5)
          .map(([subtema, count]) => ({ subtema, count }))

        setState({ semanas, topTemas, baseline, baselinePerAgenda, isReady: true, error: null })
      } catch (err) {
        if (!cancelled) setState(s => ({
          ...s, isReady: true,
          error: err instanceof Error ? err.message : 'Error al computar evolución',
        }))
      }
    }

    compute()
    return () => { cancelled = true }
  }, [index, indexReady])

  return state
}
