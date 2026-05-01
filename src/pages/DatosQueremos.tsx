import { useState, useMemo } from 'react'
import {
  ComposedChart, Bar, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, Legend,
} from 'recharts'
import { Layout } from '../components/Layout'
import { Tooltip as InfoTooltip } from '../components/Tooltip'
import { useEvolucionStats } from '../hooks/useEvolucionStats'
import { Skeleton } from '../components/Skeleton'
import type { SemanaStats } from '../types'

const AGENDA_CFG = {
  tecnologica: { color: '#0C447C', bar: '#378ADD', label: 'Agenda Tecnológica' },
  datos:       { color: '#3C3489', bar: '#7F77DD', label: 'Agenda de Datos' },
  genero:      { color: '#7A4FA3', bar: '#A07CC2', label: 'Agenda de Género' },
} as const

type AgendaKey = keyof typeof AGENDA_CFG

// ── Helpers (exported for tests) ─────────────────────────────────────────────

export function parseIsoWeek(isoWeek: string): { year: number; week: number } {
  const [year, wPart] = isoWeek.split('-W')
  return { year: Number(year), week: Number(wPart) }
}

export function isoWeekToNum(isoWeek: string): number {
  const { year, week } = parseIsoWeek(isoWeek)
  return year * 100 + week
}

export function filterSemanasByRange(
  semanas: SemanaStats[],
  desde: string,
  hasta: string
): SemanaStats[] {
  const desdeNum = isoWeekToNum(desde)
  const hastaNum = isoWeekToNum(hasta)
  return semanas.filter(s => {
    const n = isoWeekToNum(s.isoWeek)
    return n >= desdeNum && n <= hastaNum
  })
}

export function deriveYears(semanas: { isoWeek: string }[]): number[] {
  const years = new Set(semanas.map(s => parseIsoWeek(s.isoWeek).year))
  return [...years].sort((a, b) => a - b)
}

export function deriveWeeksForYear(semanas: { isoWeek: string }[], year: number): number[] {
  const weeks = semanas
    .filter(s => parseIsoWeek(s.isoWeek).year === year)
    .map(s => parseIsoWeek(s.isoWeek).week)
  return [...new Set(weeks)].sort((a, b) => a - b)
}

const MESES_ES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
                  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

export function isoWeekToYearMonth(isoWeek: string): string {
  const { year, week } = parseIsoWeek(isoWeek)
  // ISO week to approximate date: Jan 4 is always in week 1
  const jan4 = new Date(year, 0, 4)
  const dayOfWeek = jan4.getDay() || 7
  const weekStart = new Date(jan4)
  weekStart.setDate(jan4.getDate() - (dayOfWeek - 1) + (week - 1) * 7)
  const m = String(weekStart.getMonth() + 1).padStart(2, '0')
  return `${weekStart.getFullYear()}-${m}`
}

export function getUniqueMeses(semanas: { isoWeek: string }[]): string[] {
  const set = new Set(semanas.map(s => isoWeekToYearMonth(s.isoWeek)))
  return [...set].sort()
}

export function filterSemanasByMes(semanas: SemanaStats[], mesKey: string): SemanaStats[] {
  return semanas.filter(s => isoWeekToYearMonth(s.isoWeek) === mesKey)
}

function mesLabel(mesKey: string): string {
  const [year, month] = mesKey.split('-')
  return `${MESES_ES[Number(month) - 1]} ${year}`
}

// ── MesSelector ───────────────────────────────────────────────────────────────

interface MesSelectorProps {
  meses: string[]
  selected: string
  onChange: (m: string) => void
}

function MesSelector({ meses, selected, onChange }: MesSelectorProps) {
  return (
    <div className="mes-selector">
      <div className="mes-selector-title">Mes y año</div>
      <select
        className="mes-select"
        value={selected}
        onChange={e => onChange(e.target.value)}
      >
        {meses.map(m => (
          <option key={m} value={m}>{mesLabel(m)}</option>
        ))}
      </select>
    </div>
  )
}

// ── MetricaCard ───────────────────────────────────────────────────────────────

function MetricaCard({ eyebrow, num, numColor, sub }: {
  eyebrow: string; num: number | string; numColor: string; sub: string
}) {
  return (
    <div className="evolucion-card">
      <div className="evolucion-card-eyebrow">{eyebrow}</div>
      <div className="evolucion-card-num" style={{ color: numColor }}>{num}</div>
      <div className="evolucion-card-delta delta-neu">{sub}</div>
    </div>
  )
}

// ── StackedWeekChart ──────────────────────────────────────────────────────────

const MAX_CHART_BARS = 24

function StackedWeekChart({ semanas }: { semanas: SemanaStats[] }) {
  const visible = semanas.length <= MAX_CHART_BARS
    ? semanas
    : semanas.slice(semanas.length - MAX_CHART_BARS)

  const labelEvery = visible.length > 16 ? 4 : visible.length > 8 ? 2 : 1

  const data = visible.map(s => ({
    label: s.label.replace('Sem. ', 'S'),
    tecnologica: s.por_agenda.tecnologica.nuevas,
    datos: s.por_agenda.datos.nuevas,
    genero: s.por_agenda.genero.nuevas,
    total: s.nuevas,
  }))

  return (
    <div className="chart-section">
      <div className="chart-title">Preguntas nuevas por semana — distribución por agenda</div>
      <ResponsiveContainer width="100%" height={220}>
        <ComposedChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--ink-faint)" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 10, fontFamily: 'var(--mono)', fill: 'var(--ink-light)' }}
            interval={labelEvery - 1}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            tick={{ fontSize: 10, fontFamily: 'var(--mono)', fill: 'var(--ink-light)' }}
            tickLine={false}
            axisLine={false}
            width={28}
          />
          <Tooltip
            contentStyle={{ fontFamily: 'var(--mono)', fontSize: 12, border: '1px solid var(--ink-faint)', borderRadius: 6 }}
            labelStyle={{ fontWeight: 600, marginBottom: 4 }}
          />
          <Bar dataKey="tecnologica" stackId="a" fill="#378ADD" name="Ag. Tecnológica" isAnimationActive />
          <Bar dataKey="datos"       stackId="a" fill="#7F77DD" name="Ag. de Datos"    isAnimationActive />
          <Bar dataKey="genero"      stackId="a" fill="#A07CC2" name="Ag. de Género"   isAnimationActive radius={[2, 2, 0, 0]} />
          <Line
            type="monotone"
            dataKey="total"
            name="Total"
            stroke="var(--ink)"
            strokeWidth={2}
            dot={false}
            isAnimationActive
          />
          <Legend
            wrapperStyle={{ fontSize: 11, fontFamily: 'var(--mono)', paddingTop: 8 }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}

// ── AgendaDemandCard ──────────────────────────────────────────────────────────

function AgendaDemandCard({ agKey, sem, baselineScore }: {
  agKey: AgendaKey; sem: SemanaStats; baselineScore: number
}) {
  const cfg = AGENDA_CFG[agKey]
  const ag = sem.por_agenda[agKey]
  const baseScore = Math.round(baselineScore * 100)
  const noData = ag.nuevas === 0

  return (
    <div className="agenda-evol-card" style={{ borderLeftColor: cfg.bar }}>
      <div className="agenda-evol-header">
        <div>
          <div className="agenda-evol-title" style={{ color: cfg.color }}>{cfg.label}</div>
          <div style={{ fontSize: 15, color: 'var(--ink-mid)', marginTop: 2 }}>
            Brecha promedio: <strong>{Math.round(ag.score_avg * 100)}%</strong>
          </div>
        </div>
        <div style={{ fontFamily: 'var(--mono)', fontSize: 15, color: 'var(--ink-light)' }}>
          {ag.nuevas} preguntas esta semana
        </div>
      </div>
      <div className="agenda-evol-bars">
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-start' }}>
          <div className="evol-bar-label" style={{ display: 'flex', alignItems: 'flex-start', gap: 4 }}>
            Brecha base del corpus
            <InfoTooltip text="Nivel de brecha calculado a partir de las consultas de referencia sobre este tema, antes de recibir preguntas de la comunidad. Barra más larga = mayor brecha preexistente." />
          </div>
          <div className="evol-bar-track">
            <div className="evol-bar-fill" style={{ width: `${baseScore}%`, background: 'var(--ink-mid)', opacity: 0.4 }} />
          </div>
          <div className="evol-bar-pct">{baseScore}% de brecha sin preguntas</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-start' }}>
          {noData ? (
            <div style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--ink-light)', paddingTop: 2 }}>
              — Sin preguntas en este período —
            </div>
          ) : (
            <>
              <div className="evol-bar-label" style={{ display: 'flex', alignItems: 'flex-start', gap: 4 }}>
                <span>
                  Brecha en preguntas recibidas
                  <span style={{ display: 'block', opacity: 0.75 }}>{sem.label}</span>
                </span>
                <InfoTooltip text="Promedio del score de brecha de las preguntas recibidas en esta agenda durante el período seleccionado. Un score alto indica que las preguntas buscan datos que el corpus aún no tiene." />
              </div>
              <div className="evol-bar-track">
                <div className="evol-bar-fill" style={{ width: `${Math.round(ag.score_avg * 100)}%`, background: cfg.bar }} />
              </div>
              <div className="evol-bar-pct">{Math.round(ag.score_avg * 100)}% en preguntas</div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ── DatosQueremos ─────────────────────────────────────────────────────────────

export function DatosQueremos() {
  const { semanas, topTemas, baseline, baselinePerAgenda, isReady, error } = useEvolucionStats()

  const meses = useMemo(() => getUniqueMeses(semanas), [semanas])

  const [selectedMes, setSelectedMes] = useState<string | null>(null)

  const effectiveMes = selectedMes ?? meses[meses.length - 1] ?? ''

  const filteredSemanas = useMemo(
    () => filterSemanasByMes(semanas, effectiveMes),
    [semanas, effectiveMes]
  )

  const selected = filteredSemanas[filteredSemanas.length - 1]

  const totalAcumuladas = filteredSemanas[filteredSemanas.length - 1]?.acumuladas ?? 0
  const maxTopTema = topTemas[0]?.count ?? 1

  const sidebarMetrics = selected ? [
    { eyebrow: 'Preguntas en el mes', num: totalAcumuladas, numColor: 'var(--ink)', sub: `${filteredSemanas.length} semanas` },
    { eyebrow: 'Brechas críticas', num: selected.criticas, numColor: 'var(--gap-crit)', sub: `${selected.parciales} parciales` },
    { eyebrow: 'Score promedio', num: `${Math.round(selected.score_promedio * 100)}%`, numColor: 'var(--gap-part)', sub: 'en el mes' },
  ] : []

  return (
    <Layout>
      <main className="datos-page">
        <div className="hero">
          <p className="hero-eyebrow">¿Qué datos queremos?</p>
          <h1>Los datos que el corpus <em>no tiene</em></h1>
          <p className="hero-sub">
            {isReady
              ? `${totalAcumuladas} preguntas · demanda mensual de datos`
              : 'Cargando demanda…'}
          </p>
        </div>

        {error && (
          <p style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--warn)', marginBottom: '1rem' }}>
            {error}
          </p>
        )}

        {!isReady && !error && (
          <div className="datos-layout">
            <aside className="datos-sidebar">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <Skeleton height={36} width="70%" />
                <Skeleton height={36} width="80%" />
                <Skeleton height={80} width="100%" style={{ marginTop: 8 }} />
                <Skeleton height={80} width="100%" />
              </div>
            </aside>
            <div className="datos-main">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: '1rem' }}>
                {[...Array(6)].map((_, i) => (
                  <Skeleton key={i} height={32} width="100%" />
                ))}
              </div>
            </div>
          </div>
        )}

        {semanas.length === 0 && isReady && (
          <p style={{ fontFamily: 'var(--mono)', fontSize: 13, color: 'var(--ink-light)' }}>
            — Aún no hay preguntas ingresadas —
          </p>
        )}

        {semanas.length > 0 && (
          <div className="datos-layout">
            {/* ── Sidebar ── */}
            <aside className="datos-sidebar">
              <MesSelector
                meses={meses}
                selected={effectiveMes}
                onChange={m => setSelectedMes(m)}
              />

              <div className="metricas-compare" style={{ gridTemplateColumns: '1fr', gap: '.75rem' }}>
                <div>
                  <div className="metricas-col-label" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    Corpus base
                    <InfoTooltip text="Métricas calculadas sobre el corpus de datasets y normativas existente, sin considerar ninguna pregunta de la comunidad." />
                  </div>
                  <MetricaCard eyebrow="Score brecha base" num={`${Math.round(baseline.score * 100)}%`} numColor="var(--ink)" sub="Antes de cualquier pregunta" />
                  <MetricaCard eyebrow="Tópicos críticos" num={baseline.criticas} numColor="var(--gap-crit)" sub="Sin cobertura" />
                </div>
                {selected && (
                  <div style={{ marginTop: '.5rem' }}>
                    <div className="metricas-col-label">Mes seleccionado</div>
                    {sidebarMetrics.map(m => (
                      <MetricaCard key={m.eyebrow} {...m} />
                    ))}
                  </div>
                )}
              </div>

              {topTemas.length > 0 && (
                <>
                  <p className="mapa-section-title" style={{ marginTop: '1.5rem', display: 'flex', alignItems: 'center', gap: 5 }}>
                Temas más demandados
                <InfoTooltip text="Subtemas más frecuentes en los datasets encontrados por las preguntas de la comunidad. Refleja qué tipos de datos se buscan con más insistencia." />
              </p>
                  <div className="top-temas-list">
                    {topTemas.map((t, i) => (
                      <div key={t.subtema} className="top-tema-row">
                        <span className="top-tema-rank">#{i + 1}</span>
                        <span className="top-tema-name">{t.subtema}</span>
                        <div className="top-tema-bar-wrap">
                          <div className="top-tema-bar-fill" style={{ width: `${Math.round((t.count / maxTopTema) * 100)}%` }} />
                        </div>
                        <span className="top-tema-count">{t.count}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </aside>

            {/* ── Main content ── */}
            <div className="datos-main">
              <StackedWeekChart semanas={filteredSemanas} />

              {selected && (
                <div className="agenda-evol-list" style={{ marginTop: '2rem' }}>
                  {(['tecnologica', 'datos', 'genero'] as AgendaKey[]).map(ag => (
                    <AgendaDemandCard key={ag} agKey={ag} sem={selected} baselineScore={baselinePerAgenda[ag]} />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </Layout>
  )
}
