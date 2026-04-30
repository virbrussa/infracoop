import type { CSSProperties } from 'react'

interface SkeletonProps {
  width?: string | number
  height?: string | number
  rounded?: boolean
  style?: CSSProperties
}

export function Skeleton({ width = '100%', height = 16, rounded = false, style }: SkeletonProps) {
  return (
    <div
      className="skeleton"
      style={{ width, height, borderRadius: rounded ? 999 : 4, ...style }}
    />
  )
}

export function SkeletonMetricsBand() {
  return (
    <div className="metrics-band">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="metrics-band-card">
          <Skeleton height={36} width="55%" style={{ marginBottom: 8 }} />
          <Skeleton height={11} width="75%" />
        </div>
      ))}
    </div>
  )
}

export function SkeletonAgendaGrid() {
  return (
    <div className="monitor-grid">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="agenda-monitor-card" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <Skeleton height={10} width="40%" />
          <Skeleton height={32} width="50%" />
          <Skeleton height={8} width="70%" />
          <Skeleton height={10} width="100%" />
          <Skeleton height={10} width="90%" />
          <Skeleton height={10} width="80%" />
        </div>
      ))}
    </div>
  )
}

export function SkeletonTopicGrid() {
  return (
    <div className="mapa-grid">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="topic-card" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <Skeleton height={12} width="65%" />
          <Skeleton height={42} width="45%" />
          <Skeleton height={10} width="55%" />
          <Skeleton height={10} width="80%" />
        </div>
      ))}
    </div>
  )
}
