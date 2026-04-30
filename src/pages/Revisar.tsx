import { useState } from 'react'
import { Layout } from '../components/Layout'
import { Tooltip } from '../components/Tooltip'
import { useRevisionQueue } from '../hooks/useRevisionQueue'
import type { ItemRevision } from '../hooks/useRevisionQueue'
import { updateEmbedding } from '../services/dataService'
import { useEmbedder } from '../context/EmbedderContext'

// ── Full revision item fetched from Supabase ──────────────────────────────────

interface ItemDetalle {
  agendas?: string[]
  calidad?: string
  anio_publicacion?: number | null
  anio_adopcion?: number | null
  descripcion_notas?: string | null
  url_descarga?: string | null
  url_texto_oficial?: string | null
}

// ── RevisionCard ──────────────────────────────────────────────────────────────

function AgendaPill({ label }: { label: string }) {
  const color =
    /tecnol/i.test(label) ? { bg: '#E6F1FB', fg: '#0C447C' } :
    /dato/i.test(label)   ? { bg: '#EEEDFE', fg: '#3C3489' } :
    /g[eé]nero/i.test(label) ? { bg: '#FBEAF0', fg: '#72243E' } :
    { bg: 'var(--ink-faint)', fg: 'var(--ink)' }

  return (
    <span style={{
      display: 'inline-block',
      background: color.bg,
      color: color.fg,
      fontFamily: 'var(--mono)',
      fontSize: 11,
      padding: '2px 8px',
      borderRadius: 20,
      whiteSpace: 'nowrap',
    }}>
      {label}
    </span>
  )
}

function safeHref(url: string): string | undefined {
  try {
    const u = new URL(url)
    return u.protocol === 'https:' || u.protocol === 'http:' ? url : undefined
  } catch {
    return undefined
  }
}

function RevisionCard({
  item,
  detalle,
  isBusy,
  onAprobar,
  onRechazar,
}: {
  item: ItemRevision
  detalle: ItemDetalle
  isBusy: boolean
  onAprobar: () => void
  onRechazar: () => void
}) {
  const [expanded, setExpanded] = useState(false)
  const anio = detalle.anio_publicacion ?? detalle.anio_adopcion
  const url  = detalle.url_descarga ?? detalle.url_texto_oficial

  return (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--ink-faint)',
      borderRadius: 'var(--r)',
      overflow: 'hidden',
    }}>
      {/* ── Header row ── */}
      <div style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '1rem',
        padding: '1.1rem 1.25rem',
      }}>
        {/* Type badge */}
        <span style={{
          fontFamily: 'var(--mono)',
          fontSize: 10,
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          color: item.tipo === 'dataset' ? 'var(--accent)' : 'var(--agenda-genero)',
          flexShrink: 0,
          paddingTop: 3,
        }}>
          {item.tipo}
          <Tooltip text={item.tipo === 'dataset'
            ? 'Dataset enviado por la comunidad, pendiente de revisión para incorporarlo al corpus.'
            : 'Normativa enviada por la comunidad, pendiente de revisión para incorporarla al corpus.'
          } />
        </span>

        {/* Main info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 4, lineHeight: 1.3 }}>
            {item.titulo}
          </div>
          <div style={{
            fontFamily: 'var(--mono)',
            fontSize: 12,
            color: 'var(--ink-light)',
            display: 'flex',
            flexWrap: 'wrap',
            gap: '0 12px',
            marginBottom: 8,
          }}>
            {item.fuente && <span>{item.fuente}</span>}
            {item.pais   && <span>🌐 {item.pais}</span>}
            {anio        && <span>📅 {anio}</span>}
            {detalle.calidad && (
              <span style={{ color: detalle.calidad === 'Completa' ? 'var(--gap-cov)' : detalle.calidad === 'Parcial' ? 'var(--gap-part)' : 'var(--gap-crit)' }}>
                ● {detalle.calidad}
              </span>
            )}
          </div>
          {(detalle.agendas ?? []).length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 4 }}>
              {(detalle.agendas ?? []).map(a => <AgendaPill key={a} label={a} />)}
            </div>
          )}
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0, alignItems: 'flex-end' }}>
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              className="btn-ghost"
              style={{ color: 'var(--warn)', borderColor: 'var(--warn)', fontSize: 13, padding: '5px 12px' }}
              disabled={isBusy}
              onClick={onRechazar}
            >Rechazar</button>
            <button
              className="btn-primary"
              style={{ fontSize: 13, padding: '5px 14px' }}
              disabled={isBusy}
              onClick={onAprobar}
            >Aprobar →</button>
          </div>
          <button
            onClick={() => setExpanded(v => !v)}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-light)',
              padding: '2px 0',
            }}
          >
            {expanded ? '▲ menos detalle' : '▼ ver detalle'}
          </button>
        </div>
      </div>

      {/* ── Expanded detail ── */}
      {expanded && (
        <div style={{
          borderTop: '1px solid var(--ink-faint)',
          padding: '1rem 1.25rem',
          background: 'var(--bg)',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.6rem',
        }}>
          {detalle.descripcion_notas && (
            <div>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-light)', marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Descripción / notas
              </div>
              <p style={{ fontSize: 14, lineHeight: 1.6, margin: 0, color: 'var(--ink)' }}>
                {detalle.descripcion_notas}
              </p>
            </div>
          )}
          {url && (
            <div>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-light)', marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                URL
              </div>
              {safeHref(url) ? (
                <a
                  href={safeHref(url)}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ fontSize: 13, color: 'var(--accent)', wordBreak: 'break-all' }}
                >
                  {url}
                </a>
              ) : (
                <span style={{ fontSize: 13, color: 'var(--warn)', fontFamily: 'var(--mono)' }}>
                  URL inválida
                </span>
              )}
            </div>
          )}
          <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-light)' }}>
            Enviado: {new Date(item.created_at).toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' })}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Revisar ───────────────────────────────────────────────────────────────────

export function Revisar() {
  const { items, isLoading, error, aprobar, rechazar, rawItems } = useRevisionQueue()
  const { status: embedderStatus, embed } = useEmbedder()
  const [actionItem, setActionItem] = useState<string | null>(null)

  async function handleAprobar(item: ItemRevision) {
    setActionItem(item.id)
    try {
      const raw = rawItems[item.id] ?? {}
      const newId = await aprobar(item)

      if (embedderStatus === 'ready') {
        const text = `${item.titulo} ${(raw.descripcion_notas as string | null) ?? ''}`.trim()
        const tabla = item.tipo === 'dataset' ? 'datasets' : 'normativas'
        const vector = await embed(text)
        await updateEmbedding(tabla, newId, Array.from(vector))
      }
    } catch {
      // error propagated by hook state
    } finally {
      setActionItem(null)
    }
  }

  async function handleRechazar(item: ItemRevision) {
    setActionItem(item.id)
    await rechazar(item).catch(() => {})
    setActionItem(null)
  }

  return (
    <Layout>
      <main className="container" style={{ paddingTop: '2rem', paddingBottom: '4rem' }}>
        <div className="hero">
          <p className="hero-eyebrow">Panel curatorial</p>
          <h1>Cola de <em>revisión</em></h1>
          <p className="hero-sub" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {isLoading ? 'Cargando…' : `${items.length} ítems pendientes`}
            <Tooltip text="Datasets y normativas enviados por la comunidad esperando aprobación. Al aprobar, se insertan directamente en el corpus del motor de brechas." />
          </p>
        </div>

        {error && (
          <p style={{ color: 'var(--warn)', fontFamily: 'var(--mono)', fontSize: 12 }}>{error}</p>
        )}

        {items.length === 0 && !isLoading && (
          <p style={{ fontFamily: 'var(--mono)', fontSize: 13, color: 'var(--ink-light)', marginTop: '1rem' }}>
            — Cola vacía —
          </p>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1.5rem' }}>
          {items.map(item => (
            <RevisionCard
              key={item.id}
              item={item}
              detalle={rawItems[item.id] ?? {}}
              isBusy={actionItem === item.id}
              onAprobar={() => handleAprobar(item)}
              onRechazar={() => handleRechazar(item)}
            />
          ))}
        </div>
      </main>
    </Layout>
  )
}
