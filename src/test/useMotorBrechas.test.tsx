import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useMotorBrechas } from '../hooks/useMotorBrechas'
import { SearchIndexProvider } from '../context/SearchIndexContext'
vi.mock('../context/EmbedderContext', () => ({
  useEmbedder: () => ({
    status: 'ready',
    embed: vi.fn().mockResolvedValue(new Float32Array(768).fill(0.5)),
    progress: 'Modelo listo',
    error: null,
  }),
}))

vi.mock('../services/semanticSearch', () => ({
  semanticSearch: vi.fn().mockReturnValue({
    datasets: [{ id: 'DS-001', titulo: 'ENDIREH 2021', fuente: 'INEGI', pais: 'MEX', anio: 2021,
      calidad: 'Completa', similitud: 0.85, tipo: 'dataset', agendas: ['Ag. de Género'] }],
    normativas: [],
  }),
}))

vi.mock('../services/dataService', () => ({
  getDatasets: vi.fn().mockResolvedValue([]),
  getNormativas: vi.fn().mockResolvedValue([]),
  insertPregunta: vi.fn().mockResolvedValue({
    id: 'pq-1', texto: 'test', fecha: '2026-01-01T00:00:00Z',
    agenda_clasificada: null, resultado_score: null, datasets_encontrados: [],
    es_sintetico: false,
  }),
}))

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <SearchIndexProvider>{children}</SearchIndexProvider>
)

beforeEach(() => { vi.clearAllMocks() })

async function flushContext() {
  await act(async () => { await Promise.resolve() })
}

describe('useMotorBrechas', () => {
  it('empieza en estado idle', () => {
    const { result } = renderHook(() => useMotorBrechas(), { wrapper })
    expect(result.current.resultado).toBeNull()
    expect(result.current.isLoading).toBe(false)
    expect(result.current.error).toBeNull()
  })

  it('retorna GapResult después de buscar', async () => {
    const { result } = renderHook(() => useMotorBrechas(), { wrapper })
    await flushContext()
    await act(async () => { await result.current.buscar('feminicidio datos') })
    expect(result.current.resultado).not.toBeNull()
    expect(result.current.resultado?.score).toBeGreaterThan(0)
    expect(result.current.resultado?.datasets).toHaveLength(1)
  })

  it('isLoading es false después de completar la búsqueda', async () => {
    const { result } = renderHook(() => useMotorBrechas(), { wrapper })
    await flushContext()
    await act(async () => { await result.current.buscar('datos feminicidio') })
    expect(result.current.isLoading).toBe(false)
  })

  it('llama insertPregunta automáticamente al buscar', async () => {
    const { insertPregunta } = await import('../services/dataService')
    const { result } = renderHook(() => useMotorBrechas(), { wrapper })
    await flushContext()
    await act(async () => { await result.current.buscar('datos feminicidio') })
    expect(insertPregunta).toHaveBeenCalledWith(
      'datos feminicidio',
      expect.any(Number),
      expect.any(Array)
    )
  })

  it('limpiar resetea el resultado', async () => {
    const { result } = renderHook(() => useMotorBrechas(), { wrapper })
    await flushContext()
    await act(async () => { await result.current.buscar('feminicidio') })
    act(() => { result.current.limpiar() })
    expect(result.current.resultado).toBeNull()
  })
})
