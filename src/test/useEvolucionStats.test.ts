import { describe, it, expect, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useEvolucionStats } from '../hooks/useEvolucionStats'

const makeDataset = (id: string, subtema: string) => ({
  id, titulo: `Dataset ${id}`, fuente_organismo: null, pais_iso3: null,
  anio_publicacion: null, subtema, agendas: ['género'], calidad: 'Completa',
  frecuencia: null, desagregacion_geo: null, accesibilidad_formato: null,
  url_descarga: null, url_valida: true, descripcion_notas: null,
  es_sintetico: false, created_at: '2026-01-01', embedding: null,
})

vi.mock('../context/SearchIndexContext', () => ({
  useSearchIndex: () => ({
    index: {
      datasetsMap: new Map([
        ['DS-001', makeDataset('DS-001', 'Salud reproductiva')],
        ['DS-002', makeDataset('DS-002', 'Salud reproductiva')],
        ['DS-003', makeDataset('DS-003', 'Violencia de género')],
      ]),
      normativasMap: new Map(),
      miniDatasets: {} as any, miniNormativas: {} as any,
      fuseDatasets: { search: () => [] } as any, fuseNormativas: { search: () => [] } as any,
    },
    isReady: true, error: null,
  }),
}))

vi.mock('../services/dataService', () => ({
  getPreguntas: vi.fn().mockResolvedValue([
    // Week 1: Apr 7 2026
    { id: 'p1', texto: 'q1', fecha: '2026-04-07T10:00:00Z',
      agenda_clasificada: 'genero', resultado_score: 0.8,
      datasets_encontrados: ['DS-001'], es_sintetico: false },
    { id: 'p2', texto: 'q2', fecha: '2026-04-07T11:00:00Z',
      agenda_clasificada: 'genero', resultado_score: 0.3,
      datasets_encontrados: ['DS-002'], es_sintetico: false },
    // Week 2: Apr 14 2026
    { id: 'p3', texto: 'q3', fecha: '2026-04-14T10:00:00Z',
      agenda_clasificada: 'genero', resultado_score: 0.9,
      datasets_encontrados: ['DS-003'], es_sintetico: false },
  ]),
}))

vi.mock('../services/searchService', () => ({
  search: vi.fn().mockReturnValue({ datasets: [], normativas: [] }),
}))

describe('useEvolucionStats', () => {
  it('agrupa preguntas en 2 semanas distintas', async () => {
    const { result } = renderHook(() => useEvolucionStats())
    await waitFor(() => expect(result.current.isReady).toBe(true))
    expect(result.current.semanas).toHaveLength(2)
    expect(result.current.semanas[0].nuevas).toBe(2)
    expect(result.current.semanas[1].nuevas).toBe(1)
  })

  it('cuenta acumuladas correctamente', async () => {
    const { result } = renderHook(() => useEvolucionStats())
    await waitFor(() => expect(result.current.isReady).toBe(true))
    expect(result.current.semanas[0].acumuladas).toBe(2)
    expect(result.current.semanas[1].acumuladas).toBe(3)
  })

  it('clasifica críticas y cubiertas correctamente en semana 1', async () => {
    const { result } = renderHook(() => useEvolucionStats())
    await waitFor(() => expect(result.current.isReady).toBe(true))
    const s1 = result.current.semanas[0]
    expect(s1.criticas).toBe(1)  // score 0.8 >= 0.65
    expect(s1.cubiertas).toBe(1) // score 0.3 < 0.35
  })

  it('top temas ordenados por frecuencia en datasets_encontrados', async () => {
    const { result } = renderHook(() => useEvolucionStats())
    await waitFor(() => expect(result.current.isReady).toBe(true))
    expect(result.current.topTemas[0].subtema).toBe('Salud reproductiva')
    expect(result.current.topTemas[0].count).toBe(2)
  })

  it('error es null cuando todo está bien', async () => {
    const { result } = renderHook(() => useEvolucionStats())
    await waitFor(() => expect(result.current.isReady).toBe(true))
    expect(result.current.error).toBeNull()
  })

  it('baselinePerAgenda tiene las tres claves de agenda', async () => {
    const { result } = renderHook(() => useEvolucionStats())
    await waitFor(() => expect(result.current.isReady).toBe(true))
    const bpa = result.current.baselinePerAgenda
    expect(typeof bpa.tecnologica).toBe('number')
    expect(typeof bpa.datos).toBe('number')
    expect(typeof bpa.genero).toBe('number')
  })
})
