import { describe, it, expect } from 'vitest'
import { calcularCalidadAuto } from '../services/qualityService'

describe('calcularCalidadAuto', () => {
  it('clasifica como completa con todos los criterios óptimos', () => {
    const result = calcularCalidadAuto({
      fuente: 'INEGI',
      metodologia: 'si',
      anio: new Date().getFullYear() - 1,
      desagregacion: 'geografica',
      url: 'https://inegi.org.mx/datos.csv',
      formato: 'csv',
    })
    expect(result.calidad).toBe('completa')
    expect(result.score).toBeGreaterThanOrEqual(70)
    expect(result.confianza).toBe('alta')
  })

  it('clasifica como nula cuando el dataset tiene más de 3 años', () => {
    const result = calcularCalidadAuto({
      fuente: 'INEGI',
      metodologia: 'si',
      anio: new Date().getFullYear() - 5,
      desagregacion: 'geografica',
      url: 'https://example.com/data.csv',
      formato: 'csv',
    })
    expect(result.calidad).toBe('nula')
  })

  it('clasifica como parcial con criterios incompletos', () => {
    const result = calcularCalidadAuto({
      fuente: 'Ministerio',
      metodologia: 'parcial',
      anio: new Date().getFullYear() - 2,
      desagregacion: 'nacional',
      url: 'https://example.com',
      formato: 'pdf-no-legible',
    })
    expect(result.calidad).toBe('parcial')
  })

  it('clasifica como nula sin fuente ni URL', () => {
    const result = calcularCalidadAuto({
      fuente: '',
      metodologia: 'no',
      anio: 0,
      desagregacion: 'sin-dato',
      url: '',
      formato: '',
    })
    expect(result.calidad).toBe('nula')
    expect(result.score).toBeLessThan(35)
  })

  it('retorna las cuatro señales con sus pesos', () => {
    const result = calcularCalidadAuto({ fuente: 'X', metodologia: 'si', anio: 2024, desagregacion: 'geografica', url: 'https://x.com/d.json', formato: 'json' })
    expect(result.senales).toHaveLength(4)
    expect(result.senales.map(s => s.peso)).toEqual(['20%', '30%', '30%', '20%'])
  })
})
