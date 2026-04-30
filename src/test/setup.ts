import '@testing-library/jest-dom'
import { vi } from 'vitest'

// ResizeObserver no existe en jsdom — Recharts lo requiere
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

// Mock global de recharts para tests — evita errores de SVG en jsdom
vi.mock('recharts', async () => {
  const actual = await vi.importActual<typeof import('recharts')>('recharts')
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: import('react').ReactNode }) =>
      children,
  }
})
