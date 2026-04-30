import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { normalizeSimToMax, MonitorBrechas } from '../pages/MonitorBrechas'

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockUseMotorBrechas = vi.fn()

vi.mock('../hooks/useMotorBrechas', () => ({
  useMotorBrechas: () => mockUseMotorBrechas(),
}))

vi.mock('../context/SearchIndexContext', () => ({
  useSearchIndex: () => ({ index: null, isReady: true, error: null }),
  SearchIndexProvider: ({ children }: { children: React.ReactNode }) => children,
}))

vi.mock('../context/EmbedderContext', () => ({
  useEmbedder: () => ({
    status: 'ready',
    progress: 'Modelo listo',
    embed: vi.fn(),
    error: null,
  }),
  EmbedderProvider: ({ children }: { children: React.ReactNode }) => children,
}))

function AllProviders({ children }: { children: React.ReactNode }) {
  return <MemoryRouter>{children}</MemoryRouter>
}

beforeEach(() => {
  vi.clearAllMocks()
  mockUseMotorBrechas.mockReturnValue({
    resultado: null,
    isLoading: false,
    error: null,
    buscar: vi.fn(),
    limpiar: vi.fn(),
  })
})

// ── normalizeSimToMax unit tests ───────────────────────────────────────────────

describe('normalizeSimToMax', () => {
  it('maps the highest value to 1.0', () => {
    const hits = [{ similitud: 0.12 }, { similitud: 0.08 }, { similitud: 0.04 }]
    const norm = normalizeSimToMax(hits)
    expect(norm[0]).toBeCloseTo(1.0)
  })

  it('preserves relative ordering', () => {
    const hits = [{ similitud: 0.12 }, { similitud: 0.06 }, { similitud: 0.03 }]
    const norm = normalizeSimToMax(hits)
    expect(norm[0]).toBeGreaterThan(norm[1])
    expect(norm[1]).toBeGreaterThan(norm[2])
  })

  it('scales correctly: 0.06 / 0.12 = 0.5', () => {
    const hits = [{ similitud: 0.12 }, { similitud: 0.06 }]
    const norm = normalizeSimToMax(hits)
    expect(norm[1]).toBeCloseTo(0.5)
  })

  it('handles all-zero similitudes without dividing by zero', () => {
    const hits = [{ similitud: 0 }, { similitud: 0 }]
    const norm = normalizeSimToMax(hits)
    expect(norm[0]).toBe(0)
    expect(norm[1]).toBe(0)
  })

  it('handles empty array', () => {
    expect(normalizeSimToMax([])).toEqual([])
  })
})

// ── MonitorBrechas empty state ─────────────────────────────────────────────────

describe('MonitorBrechas empty state', () => {
  it('shows example questions when no resultado and not loading', async () => {
    render(<MonitorBrechas />, { wrapper: AllProviders })

    await waitFor(() => {
      expect(screen.getByText(/¿Existen datos sobre feminicidio/i)).toBeInTheDocument()
    })
  })

  it('does not show example questions after a search result', async () => {
    const mockResult = {
      score: 0.7, categoria: 'critica' as const,
      titulo: 'Brecha crítica detectada',
      datasets: [], normativas: [],
      agendas: { tecnologica: 0, datos: 0, genero: 0 },
    }
    mockUseMotorBrechas.mockReturnValue({
      resultado: mockResult,
      isLoading: false,
      error: null,
      buscar: vi.fn(),
      limpiar: vi.fn(),
    })

    render(<MonitorBrechas />, { wrapper: AllProviders })

    await waitFor(() => {
      expect(screen.queryByText(/¿Existen datos sobre feminicidio/i)).not.toBeInTheDocument()
    })
  })

  it('does not show example questions when there is a search error', async () => {
    mockUseMotorBrechas.mockReturnValue({
      resultado: null,
      isLoading: false,
      error: 'Error al buscar',
      buscar: vi.fn(),
      limpiar: vi.fn(),
    })

    render(<MonitorBrechas />, { wrapper: AllProviders })

    await waitFor(() => {
      expect(screen.queryByText(/¿Existen datos sobre feminicidio/i)).not.toBeInTheDocument()
    })
  })
})
