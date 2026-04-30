import { useState } from 'react'
import { Layout } from '../components/Layout'
import { useMonitorStats } from '../hooks/useMonitorStats'
import { useEvolucionStats } from '../hooks/useEvolucionStats'
import { LineChart, Line } from 'recharts'
import { SkeletonMetricsBand, SkeletonAgendaGrid, SkeletonTopicGrid } from '../components/Skeleton'
import type { AgendaStat, TopicStat, ColectivoFiltros, SemanaStats } from '../types'
import { Tooltip } from '../components/Tooltip'

// ── Helpers (exported for tests) ─────────────────────────────────────────────

export function calcTopicsCriticas(topics: TopicStat[]): number {
  return topics.filter(t => t.categoria === 'critica').length
}

export function calcCoberturaMedia(topics: TopicStat[]): number {
  if (topics.length === 0) return 0
  const mean = topics.reduce((acc, t) => acc + t.gap_score, 0) / topics.length
  return Math.round((1 - mean) * 100)
}

// ── Agenda spark helpers ──────────────────────────────────────────────────────

type AgendaKey = 'tecnologica' | 'datos' | 'genero'

function agendaSparkData(semanas: SemanaStats[], agKey: AgendaKey) {
  return semanas.slice(-8).map(s => ({ v: s.por_agenda[agKey].score_avg }))
}

function agendaDelta(semanas: SemanaStats[], agKey: AgendaKey): number | null {
  if (semanas.length < 2) return null
  const last = semanas[semanas.length - 1].por_agenda[agKey].score_avg
  const prev = semanas[semanas.length - 2].por_agenda[agKey].score_avg
  return last - prev
}

// ── MetricsBand ───────────────────────────────────────────────────────────────

function MetricsBand({ totalDatasets, totalNormativas, topics }: {
  totalDatasets: number
  totalNormativas: number
  topics: TopicStat[]
}) {
  const criticas = calcTopicsCriticas(topics)
  const cobertura = calcCoberturaMedia(topics)

  return (
    <div className="metrics-band" style={{ justifyContent: 'center' }}>
      <div className="metrics-band-card">
        <div className="metrics-band-num" style={{ fontSize: '2.5rem' }}>{totalDatasets + totalNormativas}</div>
        <div className="metrics-band-label" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          Total entradas
          <Tooltip text="Suma de datasets y normativas en el corpus, aplicando los filtros activos de agenda, país y calidad." />
        </div>
      </div>
      <div className="metrics-band-card">
        <div className="metrics-band-num">3</div>
        <div className="metrics-band-label" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          Agendas activas
          <Tooltip text="Tres agendas temáticas del proyecto: Tecnológica, de Datos y de Género." />
        </div>
      </div>
      <div className="metrics-band-card">
        <div className="metrics-band-num" style={{ color: criticas > 0 ? 'var(--gap-crit)' : 'var(--gap-cov)' }}>
          {criticas}
        </div>
        <div className="metrics-band-label" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          Tópicos críticos
          <Tooltip text="Tópicos con brecha ≥ 65%: el corpus tiene muy pocos datos relevantes para ese tema." />
        </div>
      </div>
      <div className="metrics-band-card">
        <div className="metrics-band-num" style={{ fontSize: '2.5rem', color: cobertura >= 50 ? 'var(--gap-cov)' : 'var(--gap-crit)' }}>
          {cobertura}%
        </div>
        <div className="metrics-band-label" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          Cobertura media
          <Tooltip text="Promedio de cobertura sobre los 5 tópicos (100% − score de brecha promedio). Mayor % = corpus más completo." />
        </div>
      </div>
    </div>
  )
}

// ── AgendaCard ────────────────────────────────────────────────────────────────

function AgendaCard({ a, semanas }: { a: AgendaStat; semanas: SemanaStats[] }) {
  const totalCalidad = a.calidad_dist.Completa + a.calidad_dist.Parcial + a.calidad_dist.Nula || 1
  const pct = (n: number) => `${Math.round((n / totalCalidad) * 100)}%`
  const agKey = a.id as AgendaKey
  const sparkData = agendaSparkData(semanas, agKey)
  const delta = agendaDelta(semanas, agKey)

  return (
    <div className="agenda-monitor-card" style={{ borderTopColor: a.barColor, color: a.color }}>
      <div className="agenda-monitor-eyebrow" style={{ color: a.color }}>{a.label}</div>

      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 8 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
            <div className="agenda-monitor-total" style={{ color: a.color }}>{a.datasets_en_agenda}</div>
            <Tooltip text="Datasets clasificados bajo esta agenda en el corpus. Incluye todos los datasets independientemente de su calidad." />
          </div>
          <div className="agenda-monitor-label" style={{ color: 'var(--ink-light)' }}>datasets disponibles en esta agenda</div>
          {delta !== null && (
            <div style={{
              fontSize: 12, fontFamily: 'var(--mono)', marginTop: 4,
              color: delta > 0 ? 'var(--gap-crit)' : delta < 0 ? 'var(--gap-cov)' : 'var(--ink-light)',
            }}>
              {delta > 0 ? '▲' : delta < 0 ? '▼' : '—'} {Math.abs(Math.round(delta * 100))}% esta semana
            </div>
          )}
        </div>
        {sparkData.length > 1 && (
          <LineChart width={100} height={36} data={sparkData} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
            <Line
              type="monotone"
              dataKey="v"
              stroke={a.color}
              strokeWidth={2}
              dot={false}
              isAnimationActive
            />
          </LineChart>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8 }}>
        <div className="calidad-bar" style={{ flex: 1 }}>
          <div className="calidad-segment" style={{ width: pct(a.calidad_dist.Completa), background: 'var(--gap-cov)' }} />
          <div className="calidad-segment" style={{ width: pct(a.calidad_dist.Parcial),  background: 'var(--gap-part)' }} />
          <div className="calidad-segment" style={{ width: pct(a.calidad_dist.Nula),     background: 'var(--ink-faint)' }} />
        </div>
        <Tooltip text="Calidad de los metadatos: Completa = todos los campos requeridos presentes. Parcial = faltan algunos campos. Nula = sin metadatos." />
      </div>
      <div className="calidad-legend">
        <span>{a.calidad_dist.Completa} completos</span>
        <span>{a.calidad_dist.Parcial} parciales</span>
        <span>{a.calidad_dist.Nula} nulos</span>
      </div>

      {a.top_subtemas.length > 0 && (
        <div className="agenda-topic-list" style={{ marginTop: 12 }}>
          {a.top_subtemas.map(t => (
            <div key={t.subtema} className="agenda-topic-row">
              <span className="agenda-topic-name">{t.subtema}</span>
              <span className="agenda-topic-count">{t.count}</span>
            </div>
          ))}
        </div>
      )}

    </div>
  )
}

// ── TopicCard ─────────────────────────────────────────────────────────────────

function TopicCard({ t }: { t: TopicStat }) {
  const colors = { critica: 'var(--gap-crit)', parcial: 'var(--gap-part)', cubierta: 'var(--gap-cov)' }
  const labels = { critica: 'sin datos', parcial: 'dato insuficiente', cubierta: 'bien cubierto' }
  const color = colors[t.categoria]
  const cobertura = 100 - Math.round(t.gap_score * 100)

  return (
    <div className="topic-card">
      <div className="topic-card-label">{t.label}</div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
        <div className="topic-score-big" style={{ color }}>{cobertura}</div>
        <Tooltip text="Score de cobertura: 100 = tópico completamente cubierto en el corpus. 0 = brecha crítica, sin datos disponibles." />
      </div>
      <div className="topic-score-sublabel" style={{ color }}>{labels[t.categoria]}</div>
      <div className="topic-meta">
        <span>{t.datasets_cubriendo} datasets</span>
        <span>·</span>
        <span>{t.normativas_cubriendo} normativas</span>
      </div>
    </div>
  )
}

// ── MonitorColectivo ──────────────────────────────────────────────────────────

export function MonitorColectivo() {
  const [filtros, setFiltros] = useState<ColectivoFiltros>({
    agenda: 'todas', pais: 'todos', calidad: 'todas',
  })
  const { agendas, topics, totalDatasets, totalNormativas, paises, isReady, error } = useMonitorStats(filtros)
  const { semanas } = useEvolucionStats()

  return (
    <Layout>
      <main className="monitor-page">
        <div className="hero">
          <p className="hero-eyebrow">¿Qué tenemos?</p>
          <h1>El corpus de datos <em>disponible</em></h1>
          <p className="hero-sub">
            Cada pregunta ingresada contribuye al mapa común de brechas.
          </p>
        </div>

        {error && (
          <p style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--warn)', marginBottom: '1rem' }}>
            {error}
          </p>
        )}

        <div className="colectivo-filtros">
          <select value={filtros.agenda} onChange={e => setFiltros(f => ({ ...f, agenda: e.target.value as ColectivoFiltros['agenda'] }))}>
            <option value="todas">Todas las agendas</option>
            <option value="tecnologica">Ag. Tecnológica</option>
            <option value="datos">Ag. de Datos</option>
            <option value="genero">Ag. de Género</option>
          </select>

          <select value={filtros.pais} onChange={e => setFiltros(f => ({ ...f, pais: e.target.value }))}>
            <option value="todos">Todos los países</option>
            {paises.map(p => <option key={p} value={p}>{p}</option>)}
          </select>

          <select value={filtros.calidad} onChange={e => setFiltros(f => ({ ...f, calidad: e.target.value as ColectivoFiltros['calidad'] }))}>
            <option value="todas">Toda calidad</option>
            <option value="Completa">Completa</option>
            <option value="Parcial">Parcial</option>
            <option value="Nula">Nula</option>
          </select>

          {(filtros.agenda !== 'todas' || filtros.pais !== 'todos' || filtros.calidad !== 'todas') && (
            <button className="btn-ghost" style={{ fontSize: 11 }}
              onClick={() => setFiltros({ agenda: 'todas', pais: 'todos', calidad: 'todas' })}>
              Limpiar filtros
            </button>
          )}
        </div>

        {isReady ? (
          <MetricsBand
            totalDatasets={totalDatasets}
            totalNormativas={totalNormativas}
            topics={topics}
          />
        ) : (
          <SkeletonMetricsBand />
        )}

        <p className="mapa-section-title">Brechas por Agenda</p>
        <p className="section-description">
          Cada agenda agrupa los datasets según el marco temático al que pertenecen.
          La barra de calidad indica qué porcentaje de datasets cumplen con requisitos
          relativos a datos abiertos y principios de datos oficiales.
        </p>
        {isReady ? (
          <div className="monitor-grid">
            {agendas.map(a => <AgendaCard key={a.id} a={a} semanas={semanas} />)}
          </div>
        ) : (
          <SkeletonAgendaGrid />
        )}

        <p className="mapa-section-title">Brechas por Tópico</p>
        <p className="section-description">
          El score de brecha mide qué tan cubierto está cada tópico teniendo en cuenta
          el estado de los datos y normativas vigentes.{' '}
          <strong>Brecha crítica</strong> (sin datos).{' '}
          <strong>Brecha parcial</strong> (dato existente pero insuficiente o escaso).
        </p>
        {isReady ? (
          <div className="mapa-grid">
            {topics.map(t => <TopicCard key={t.id} t={t} />)}
          </div>
        ) : (
          <SkeletonTopicGrid />
        )}
      </main>
    </Layout>
  )
}
