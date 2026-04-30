import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Button } from '../components/Button'
import { Card } from '../components/Card'
import { Badge } from '../components/Badge'

describe('Button', () => {
  it('renders primary variant with children', () => {
    render(<Button variant="primary">Buscar brecha</Button>)
    expect(screen.getByRole('button', { name: 'Buscar brecha' })).toBeInTheDocument()
    expect(screen.getByRole('button')).toHaveClass('btn-primary')
  })

  it('renders ghost variant', () => {
    render(<Button variant="ghost">Cancelar</Button>)
    expect(screen.getByRole('button')).toHaveClass('btn-ghost')
  })

  it('calls onClick when clicked', () => {
    const onClick = vi.fn()
    render(<Button variant="primary" onClick={onClick}>Click</Button>)
    fireEvent.click(screen.getByRole('button'))
    expect(onClick).toHaveBeenCalledOnce()
  })

  it('is disabled when disabled prop is set', () => {
    render(<Button variant="primary" disabled>Buscar</Button>)
    expect(screen.getByRole('button')).toBeDisabled()
  })
})

describe('Card', () => {
  it('renders children inside card div', () => {
    render(<Card><p>Contenido</p></Card>)
    expect(screen.getByText('Contenido')).toBeInTheDocument()
  })
})

describe('Badge', () => {
  it('renders critica badge', () => {
    render(<Badge type="gap" variant="critica">Brecha Crítica</Badge>)
    const badge = screen.getByText('Brecha Crítica')
    expect(badge).toHaveClass('gap-category-badge', 'critica')
  })

  it('renders agenda badge for tecnologica', () => {
    render(<Badge type="agenda" variant="tecnologica">Ag. Tecnológica</Badge>)
    const badge = screen.getByText('Ag. Tecnológica')
    expect(badge).toHaveClass('agenda-badge', 'tecnologica')
  })
})
