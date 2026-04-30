import { describe, it, expect } from 'vitest'
import { calcTopicsCriticas, calcCoberturaMedia } from '../pages/MonitorColectivo'
import type { TopicStat } from '../types'

const TOPICS: TopicStat[] = [
  { id: 't1', label: 'A', gap_score: 0.8, categoria: 'critica',  datasets_cubriendo: 2, normativas_cubriendo: 1, preguntas_relacionadas: 5 },
  { id: 't2', label: 'B', gap_score: 0.5, categoria: 'parcial',  datasets_cubriendo: 3, normativas_cubriendo: 2, preguntas_relacionadas: 3 },
  { id: 't3', label: 'C', gap_score: 0.2, categoria: 'cubierta', datasets_cubriendo: 5, normativas_cubriendo: 3, preguntas_relacionadas: 1 },
]

describe('calcTopicsCriticas', () => {
  it('counts only critica topics', () => {
    expect(calcTopicsCriticas(TOPICS)).toBe(1)
  })

  it('returns 0 for empty array', () => {
    expect(calcTopicsCriticas([])).toBe(0)
  })
})

describe('calcCoberturaMedia', () => {
  it('calculates inverted mean gap score as percentage', () => {
    // mean gap = (0.8 + 0.5 + 0.2) / 3 = 0.5 → cobertura = 50%
    expect(calcCoberturaMedia(TOPICS)).toBe(50)
  })

  it('returns 0 for empty array', () => {
    expect(calcCoberturaMedia([])).toBe(0)
  })

  it('returns 100 for all-zero gap scores', () => {
    const covered = TOPICS.map(t => ({ ...t, gap_score: 0 }))
    expect(calcCoberturaMedia(covered)).toBe(100)
  })
})
