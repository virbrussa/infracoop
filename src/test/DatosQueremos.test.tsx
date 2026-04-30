import { describe, it, expect } from 'vitest'
import {
  filterSemanasByRange,
  deriveYears,
  deriveWeeksForYear,
  isoWeekToNum,
  isoWeekToYearMonth,
  getUniqueMeses,
  filterSemanasByMes,
} from '../pages/DatosQueremos'
import type { SemanaStats } from '../types'

const makeSemana = (isoWeek: string): SemanaStats => ({
  isoWeek, label: isoWeek, nuevas: 1, acumuladas: 1,
  score_promedio: 0.5, criticas: 0, parciales: 1, cubiertas: 0,
  por_agenda: {
    tecnologica: { nuevas: 0, score_avg: 0 },
    datos: { nuevas: 0, score_avg: 0 },
    genero: { nuevas: 1, score_avg: 0.5 },
  },
})

const SEMANAS = [
  makeSemana('2025-W01'),
  makeSemana('2025-W10'),
  makeSemana('2026-W05'),
  makeSemana('2026-W17'),
]

describe('filterSemanasByRange', () => {
  it('returns all semanas when range covers everything', () => {
    expect(filterSemanasByRange(SEMANAS, '2025-W01', '2026-W17')).toHaveLength(4)
  })

  it('filters to a single year', () => {
    const result = filterSemanasByRange(SEMANAS, '2025-W01', '2025-W52')
    expect(result).toHaveLength(2)
    expect(result.map(s => s.isoWeek)).toEqual(['2025-W01', '2025-W10'])
  })

  it('returns empty when desde > hasta', () => {
    expect(filterSemanasByRange(SEMANAS, '2026-W17', '2025-W01')).toHaveLength(0)
  })

  it('returns exactly one semana for exact match', () => {
    expect(filterSemanasByRange(SEMANAS, '2026-W05', '2026-W05')).toHaveLength(1)
  })
})

describe('deriveYears', () => {
  it('returns unique years sorted', () => {
    expect(deriveYears(SEMANAS)).toEqual([2025, 2026])
  })
})

describe('deriveWeeksForYear', () => {
  it('returns weeks for 2025', () => {
    expect(deriveWeeksForYear(SEMANAS, 2025)).toEqual([1, 10])
  })

  it('returns weeks for 2026', () => {
    expect(deriveWeeksForYear(SEMANAS, 2026)).toEqual([5, 17])
  })
})

describe('isoWeekToNum', () => {
  it('converts correctly for cross-year comparison', () => {
    expect(isoWeekToNum('2025-W52')).toBeLessThan(isoWeekToNum('2026-W01'))
  })
})

describe('isoWeekToYearMonth', () => {
  it('extracts year-month from iso week', () => {
    expect(isoWeekToYearMonth('2025-W03')).toBe('2025-01')
    expect(isoWeekToYearMonth('2025-W05')).toBe('2025-01')
    // Week 9 of 2025 starts 2025-02-24
    expect(isoWeekToYearMonth('2025-W09')).toBe('2025-02')
  })
})

describe('getUniqueMeses', () => {
  const semanas = [
    { isoWeek: '2025-W03' } as SemanaStats,
    { isoWeek: '2025-W04' } as SemanaStats,
    { isoWeek: '2025-W09' } as SemanaStats,
  ]
  it('returns sorted unique YYYY-MM strings', () => {
    expect(getUniqueMeses(semanas)).toEqual(['2025-01', '2025-02'])
  })
})

describe('filterSemanasByMes', () => {
  const semanas = [
    { isoWeek: '2025-W03' } as SemanaStats,
    { isoWeek: '2025-W04' } as SemanaStats,
    { isoWeek: '2025-W09' } as SemanaStats,
  ]
  it('returns only weeks belonging to the given month', () => {
    const result = filterSemanasByMes(semanas, '2025-01')
    expect(result).toHaveLength(2)
    expect(result[0].isoWeek).toBe('2025-W03')
  })
})
