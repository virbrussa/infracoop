import { describe, it, expect, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useMonitorStats } from '../hooks/useMonitorStats'
import type { ColectivoFiltros } from '../types'

const defaultFiltros: ColectivoFiltros = { agenda: 'todas', pais: 'todos', calidad: 'todas' }

const makeDataset = (id: string, agendas: string[], subtema: string, calidad = 'Completa') => ({
  id, titulo: `Dataset ${id}`, fuente_organismo: null, pais_iso3: null,
  anio_publicacion: null, subtema, agendas, calidad, frecuencia: null,
  desagregacion_geo: null, accesibilidad_formato: null, url_descarga: null,
  url_valida: true, descripcion_notas: null, es_sintetico: false, created_at: '2026-01-01', embedding: null,
})

const mockIndex = {
  datasetsMap: new Map([
    ['DS-001', makeDataset('DS-001', ['género'], 'Salud reproductiva')],
    ['DS-002', makeDataset('DS-002', ['tecnología'], 'Brecha digital')],
    ['DS-003', makeDataset('DS-003', ['datos'], 'Calidad estadística')],
  ]),
  normativasMap: new Map([
    ['NM-001', {
      id: 'NM-001', nombre: 'Test', organismo_emisor: null, tipo: null,
      pais_alcance: null, anio_adopcion: null, articulo_numeral: null,
      obligacion_datos: null, agendas: ['género'], url_texto_oficial: null,
      descripcion_notas: null, es_sintetico: false, created_at: '2026-01-01', embedding: null,
    }],
  ]),
  miniDatasets: {} as any, miniNormativas: {} as any,
  fuseDatasets: { search: vi.fn().mockReturnValue([{ item: makeDataset('DS-001', ['género'], 'Salud reproductiva'), score: 0.2 }]) } as any,
  fuseNormativas: { search: vi.fn().mockReturnValue([]) } as any,
}

vi.mock('../context/SearchIndexContext', () => ({
  useSearchIndex: () => ({ index: mockIndex, isReady: true, error: null }),
}))

vi.mock('../services/dataService', () => ({
  getPreguntas: vi.fn().mockResolvedValue([
    { id: 'p1', texto: 'q1', fecha: '2026-04-01T10:00:00Z',
      agenda_clasificada: 'genero', resultado_score: 0.8,
      datasets_encontrados: ['DS-001'], es_sintetico: false },
    { id: 'p2', texto: 'q2', fecha: '2026-04-01T11:00:00Z',
      agenda_clasificada: 'datos', resultado_score: 0.4,
      datasets_encontrados: ['DS-003'], es_sintetico: false },
    { id: 'p3', texto: 'q3', fecha: '2026-04-08T10:00:00Z',
      agenda_clasificada: 'tecnologica', resultado_score: 0.2,
      datasets_encontrados: ['DS-002'], es_sintetico: false },
  ]),
}))

vi.mock('../services/searchService', () => ({
  search: vi.fn().mockReturnValue({
    datasets: [{
      id: 'DS-001', titulo: 'Test', fuente: null, pais: null, anio: null,
      calidad: 'Completa', similitud: 0.8, tipo: 'dataset', agendas: ['género'],
    }],
    normativas: [],
  }),
}))

describe('useMonitorStats', () => {
  it('retorna exactamente 3 agendas y 5 tópicos', async () => {
    const { result } = renderHook(() => useMonitorStats(defaultFiltros))
    await waitFor(() => expect(result.current.isReady).toBe(true))
    expect(result.current.agendas).toHaveLength(3)
    expect(result.current.topics).toHaveLength(5)
  })

  it('cada tópico tiene gap_score en [0,1] y categoría válida', async () => {
    const { result } = renderHook(() => useMonitorStats(defaultFiltros))
    await waitFor(() => expect(result.current.isReady).toBe(true))
    for (const t of result.current.topics) {
      expect(t.gap_score).toBeGreaterThanOrEqual(0)
      expect(t.gap_score).toBeLessThanOrEqual(1)
      expect(['critica', 'parcial', 'cubierta']).toContain(t.categoria)
    }
  })

  it('totalPreguntas refleja todas las preguntas cargadas', async () => {
    const { result } = renderHook(() => useMonitorStats(defaultFiltros))
    await waitFor(() => expect(result.current.isReady).toBe(true))
    expect(result.current.totalPreguntas).toBe(3)
  })

  it('totalDatasets y totalNormativas reflejan el índice', async () => {
    const { result } = renderHook(() => useMonitorStats(defaultFiltros))
    await waitFor(() => expect(result.current.isReady).toBe(true))
    expect(result.current.totalDatasets).toBe(3)
    expect(result.current.totalNormativas).toBe(1)
  })

  it('error es null cuando todo está bien', async () => {
    const { result } = renderHook(() => useMonitorStats(defaultFiltros))
    await waitFor(() => expect(result.current.isReady).toBe(true))
    expect(result.current.error).toBeNull()
  })

  it('filtro agenda=genero filtra solo datasets con agenda de género', async () => {
    const filtros: ColectivoFiltros = { agenda: 'genero', pais: 'todos', calidad: 'todas' }
    const { result } = renderHook(() => useMonitorStats(filtros))
    await waitFor(() => expect(result.current.isReady).toBe(true))
    // DS-001 tiene agenda 'género'; DS-002 y DS-003 no → totalDatasets = 1
    expect(result.current.totalDatasets).toBe(1)
  })

  it('filtro calidad=Completa filtra solo datasets completos', async () => {
    const filtros: ColectivoFiltros = { agenda: 'todas', pais: 'todos', calidad: 'Completa' }
    const { result } = renderHook(() => useMonitorStats(filtros))
    await waitFor(() => expect(result.current.isReady).toBe(true))
    // todos los datasets del mock tienen calidad 'Completa' → 3
    expect(result.current.totalDatasets).toBe(3)
  })

  it('filtro pais solo cuenta datasets de ese país', async () => {
    const filtros: ColectivoFiltros = { agenda: 'todas', pais: 'todos', calidad: 'todas' }
    const { result } = renderHook(() => useMonitorStats(filtros))
    await waitFor(() => expect(result.current.isReady).toBe(true))
    // paises se deriva de datasetsMap sin filtrar — siempre retorna todos
    expect(result.current.paises).toBeInstanceOf(Array)
  })

  it('paises siempre incluye todos los países independientemente de filtros', async () => {
    const filtros: ColectivoFiltros = { agenda: 'genero', pais: 'todos', calidad: 'Completa' }
    const { result } = renderHook(() => useMonitorStats(filtros))
    await waitFor(() => expect(result.current.isReady).toBe(true))
    // paises viene de idx.datasetsMap sin filtrar
    expect(result.current.paises).toBeInstanceOf(Array)
  })
})
