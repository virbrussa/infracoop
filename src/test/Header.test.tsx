import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { Header } from '../components/Header'

function renderWithRouter(ui: React.ReactElement) {
  return render(<MemoryRouter>{ui}</MemoryRouter>)
}

describe('Header', () => {
  it('renders the Infra.Coop logo', () => {
    renderWithRouter(<Header />)
    expect(screen.getByLabelText('Infra.Coop inicio')).toBeInTheDocument()
  })

  it('renders all 5 navigation links', () => {
    renderWithRouter(<Header />)
    expect(screen.getByRole('link', { name: /¿Qué es/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Monitor de Brechas/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Monitor Colectivo/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /¿Qué datos/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Ingresar datos/i })).toBeInTheDocument()
  })
})
