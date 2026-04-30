import { describe, it, expect } from 'vitest'
import { calcularScore, calcularAgendas, generarTitulo } from '../services/scoreService'
import type { SearchHit } from '../types'

const makeHit = (similitud: number, tipo: 'dataset' | 'normativa', agendas: string[] = []): SearchHit => ({
  id: 'test', titulo: 'Dataset de prueba', fuente: 'INEGI', pais: 'MEX',
  anio: 2023, calidad: 'Completa', similitud, tipo, agendas,
})

describe('calcularScore', () => {
  it('retorna score 1.0 y categoría crítica cuando no hay hits', () => {
    const { score, categoria } = calcularScore([], [])
    expect(score).toBe(1.0)
    expect(categoria).toBe('critica')
  })

  it('retorna categoría crítica cuando score >= 0.65', () => {
    const { categoria } = calcularScore([makeHit(0.1, 'dataset')], [makeHit(0.1, 'normativa')])
    expect(categoria).toBe('critica')
  })

  it('retorna categoría cubierta cuando datasets tienen alta similitud y hay normativa', () => {
    const { score, categoria } = calcularScore(
      [makeHit(0.95, 'dataset')],
      [makeHit(0.95, 'normativa')]
    )
    expect(score).toBeLessThan(0.35)
    expect(categoria).toBe('cubierta')
  })

  it('retorna categoría parcial para scores intermedios', () => {
    const { categoria } = calcularScore([makeHit(0.5, 'dataset')], [makeHit(0.5, 'normativa')])
    expect(categoria).toBe('parcial')
  })

  it('aplica la fórmula: (1 - maxSimDs) * 0.6 + (1 - maxSimNm) * 0.4', () => {
    const maxSimDs = 0.8
    const maxSimNm = 0.6
    const expected = (1 - maxSimDs) * 0.6 + (1 - maxSimNm) * 0.4
    const { score } = calcularScore([makeHit(maxSimDs, 'dataset')], [makeHit(maxSimNm, 'normativa')])
    expect(score).toBeCloseTo(expected, 2)
  })
})

describe('calcularAgendas', () => {
  it('usa scoreGlobal cuando no hay hits con agenda específica', () => {
    const scores = calcularAgendas([], [], 0.8)
    expect(scores.tecnologica).toBe(80)
    expect(scores.datos).toBe(80)
    expect(scores.genero).toBe(80)
  })

  it('calcula score de género a partir de hits con "género" en agendas', () => {
    const hitGenero = makeHit(0.9, 'dataset', ['Ag. de Género'])
    const scores = calcularAgendas([hitGenero], [], 0.5)
    expect(scores.genero).toBeLessThan(50)
  })
})

describe('generarTitulo', () => {
  it('retorna "Brecha crítica detectada" con hit de dataset', () => {
    const hit = makeHit(0.8, 'dataset')
    hit.titulo = 'ENDIREH 2021'
    const titulo = generarTitulo('critica', [hit], [])
    expect(titulo).toContain('Brecha crítica')
    expect(titulo).toContain('ENDIREH 2021')
  })

  it('retorna mensaje de sin datos cuando no hay hits', () => {
    const titulo = generarTitulo('critica', [], [])
    expect(titulo).toContain('sin datos')
  })
})
