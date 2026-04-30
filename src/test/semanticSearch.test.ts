import { describe, it, expect } from 'vitest'
import { cosineSimilarity, semanticSearch } from '../services/semanticSearch'
import { buildIndex } from '../services/searchService'
import type { Dataset, Normativa } from '../types'

function makeVec(dims: number, fill: number): Float32Array {
  return new Float32Array(dims).fill(fill)
}

describe('cosineSimilarity', () => {
  it('identical vectors → 1.0', () => {
    const a = makeVec(4, 1)
    expect(cosineSimilarity(a, a)).toBeCloseTo(1.0, 5)
  })

  it('orthogonal vectors → 0', () => {
    const a = new Float32Array([1, 0, 0, 0])
    const b = new Float32Array([0, 1, 0, 0])
    expect(cosineSimilarity(a, b)).toBeCloseTo(0, 5)
  })

  it('opposite vectors → -1', () => {
    const a = new Float32Array([1, 0])
    const b = new Float32Array([-1, 0])
    expect(cosineSimilarity(a, b)).toBeCloseTo(-1, 5)
  })
})

const mockDatasets: Dataset[] = [
  {
    id: 'DS-001', titulo: 'Feminicidio', fuente_organismo: null, pais_iso3: 'MEX',
    anio_publicacion: 2024, subtema: 'violencia-genero', agendas: ['Ag. de Género'],
    calidad: 'Completa', frecuencia: null, desagregacion_geo: null,
    accesibilidad_formato: null, url_descarga: null, url_valida: true,
    descripcion_notas: null, es_sintetico: false, created_at: '2024-01-01T00:00:00Z',
    embedding: Array.from(makeVec(768, 1.0)),
  },
  {
    id: 'DS-002', titulo: 'Salud reproductiva', fuente_organismo: null, pais_iso3: 'MEX',
    anio_publicacion: 2023, subtema: 'salud-reproductiva', agendas: ['Ag. de Datos'],
    calidad: 'Parcial', frecuencia: null, desagregacion_geo: null,
    accesibilidad_formato: null, url_descarga: null, url_valida: false,
    descripcion_notas: null, es_sintetico: false, created_at: '2024-01-01T00:00:00Z',
    embedding: null,
  },
]

const mockNormativas: Normativa[] = [
  {
    id: 'NM-001', nombre: 'NOM-046', organismo_emisor: null, tipo: null,
    pais_alcance: 'MEX', anio_adopcion: 2005, articulo_numeral: null,
    obligacion_datos: null, agendas: ['Ag. de Género'], url_texto_oficial: null,
    descripcion_notas: null, es_sintetico: false, created_at: '2024-01-01T00:00:00Z',
    embedding: Array.from(makeVec(768, 1.0)),
  },
]

describe('semanticSearch', () => {
  it('returns top-k datasets sorted by cosine similarity descending', () => {
    const index = buildIndex(mockDatasets, mockNormativas)
    const queryVec = makeVec(768, 1.0)
    const { datasets } = semanticSearch(queryVec, index, 5)
    expect(datasets.length).toBeGreaterThan(0)
    expect(datasets[0].id).toBe('DS-001')
    expect(datasets[0].tipo).toBe('dataset')
  })

  it('returns top-k normativas sorted by cosine similarity descending', () => {
    const index = buildIndex(mockDatasets, mockNormativas)
    const queryVec = makeVec(768, 1.0)
    const { normativas } = semanticSearch(queryVec, index, 5)
    expect(normativas.length).toBe(1)
    expect(normativas[0].id).toBe('NM-001')
    expect(normativas[0].tipo).toBe('normativa')
  })

  it('returns empty arrays when no embeddings in index', () => {
    const noEmbedDs = mockDatasets.map(d => ({ ...d, embedding: null }))
    const noEmbedNm = mockNormativas.map(n => ({ ...n, embedding: null }))
    const index = buildIndex(noEmbedDs, noEmbedNm)
    const { datasets, normativas } = semanticSearch(makeVec(768, 1.0), index)
    expect(datasets).toHaveLength(0)
    expect(normativas).toHaveLength(0)
  })

  it('respects limit parameter', () => {
    const index = buildIndex(mockDatasets, mockNormativas)
    const { datasets } = semanticSearch(makeVec(768, 1.0), index, 1)
    expect(datasets.length).toBeLessThanOrEqual(1)
  })

  it('similitud is between 0 and 1 (clamped)', () => {
    const index = buildIndex(mockDatasets, mockNormativas)
    const { datasets } = semanticSearch(makeVec(768, 1.0), index)
    for (const hit of datasets) {
      expect(hit.similitud).toBeGreaterThanOrEqual(0)
      expect(hit.similitud).toBeLessThanOrEqual(1)
    }
  })
})
