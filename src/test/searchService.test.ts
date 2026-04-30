import { describe, it, expect } from 'vitest'
import { buildIndex, search } from '../services/searchService'
import type { Dataset, Normativa } from '../types'

const mockDatasets: Dataset[] = [
  {
    id: 'DS-001', titulo: 'Estadísticas de feminicidio por estado',
    fuente_organismo: 'SESNSP', pais_iso3: 'MEX', anio_publicacion: 2024,
    subtema: 'violencia-genero', agendas: ['Ag. de Género'],
    calidad: 'Completa', frecuencia: 'Mensual', desagregacion_geo: 'Estatal',
    accesibilidad_formato: 'CSV', url_descarga: 'https://example.com',
    url_valida: true, descripcion_notas: 'Registro mensual de feminicidios por entidad federativa',
    es_sintetico: false, created_at: '2024-01-01T00:00:00Z', embedding: null,
  },
  {
    id: 'DS-002', titulo: 'Encuesta Nacional de Salud Reproductiva',
    fuente_organismo: 'INEGI', pais_iso3: 'MEX', anio_publicacion: 2023,
    subtema: 'salud-reproductiva', agendas: ['Ag. de Género', 'Ag. de Datos'],
    calidad: 'Completa', frecuencia: 'Quinquenal', desagregacion_geo: 'Municipal',
    accesibilidad_formato: 'CSV', url_descarga: 'https://example.com',
    url_valida: true, descripcion_notas: 'Estadísticas de salud reproductiva a nivel municipal',
    es_sintetico: false, created_at: '2024-01-01T00:00:00Z', embedding: null,
  },
]

const mockNormativas: Normativa[] = [
  {
    id: 'NM-001', nombre: 'NOM-046-SSA2-2005 Violencia familiar y sexual',
    organismo_emisor: 'Secretaría de Salud', tipo: 'norma_oficial',
    pais_alcance: 'MEX', anio_adopcion: 2005,
    articulo_numeral: 'Numeral 6.4',
    obligacion_datos: 'Registro y reporte de casos de violencia sexual con desagregación territorial',
    agendas: ['Ag. de Género'], url_texto_oficial: null,
    descripcion_notas: null, es_sintetico: false, created_at: '2024-01-01T00:00:00Z', embedding: null,
  },
]

describe('buildIndex', () => {
  it('construye un índice sin errores', () => {
    expect(() => buildIndex(mockDatasets, mockNormativas)).not.toThrow()
  })

  it('retorna un índice con las colecciones indexadas', () => {
    const index = buildIndex(mockDatasets, mockNormativas)
    expect(index).toHaveProperty('miniDatasets')
    expect(index).toHaveProperty('miniNormativas')
    expect(index).toHaveProperty('fuseDatasets')
    expect(index).toHaveProperty('fuseNormativas')
    expect(index.datasetsMap.size).toBe(mockDatasets.length)
    expect(index.normativasMap.size).toBe(mockNormativas.length)
  })
})

describe('search', () => {
  it('retorna hits de datasets con similitud > 0 para query relevante', () => {
    const index = buildIndex(mockDatasets, mockNormativas)
    const { datasets } = search('feminicidio estadísticas', index)
    expect(datasets.length).toBeGreaterThan(0)
    expect(datasets[0].similitud).toBeGreaterThan(0)
    expect(datasets[0].tipo).toBe('dataset')
  })

  it('retorna hits de normativas con similitud > 0 para query relevante', () => {
    const index = buildIndex(mockDatasets, mockNormativas)
    const { normativas } = search('violencia sexual registro', index)
    expect(normativas.length).toBeGreaterThan(0)
    expect(normativas[0].similitud).toBeGreaterThan(0)
    expect(normativas[0].tipo).toBe('normativa')
  })

  it('el hit más relevante tiene similitud 1.0 (normalizado)', () => {
    const index = buildIndex(mockDatasets, mockNormativas)
    const { datasets } = search('feminicidio', index)
    expect(datasets[0].similitud).toBe(1.0)
  })

  it('los hits incluyen agendas del documento original', () => {
    const index = buildIndex(mockDatasets, mockNormativas)
    const { datasets } = search('salud reproductiva', index)
    expect(datasets[0].agendas).toContain('Ag. de Género')
  })

  it('respeta el límite de resultados (default 5)', () => {
    const index = buildIndex(mockDatasets, mockNormativas)
    const { datasets } = search('estadísticas datos', index)
    expect(datasets.length).toBeLessThanOrEqual(5)
  })
})

describe('buildIndex with embeddings', () => {
  it('populates datasetEmbeddings map for items that have an embedding', () => {
    const vec = Array.from({ length: 768 }, (_, i) => i / 768)
    const dsWithEmbed: Dataset[] = [
      { ...mockDatasets[0], embedding: vec },
      { ...mockDatasets[1], embedding: null },
    ]
    const normWithEmbed: Normativa[] = [{ ...mockNormativas[0], embedding: null }]
    const index = buildIndex(dsWithEmbed, normWithEmbed)
    expect(index.datasetEmbeddings.size).toBe(1)
    expect(index.datasetEmbeddings.get('DS-001')).toBeInstanceOf(Float32Array)
    expect(index.datasetEmbeddings.get('DS-002')).toBeUndefined()
  })

  it('populates normativaEmbeddings map for items that have an embedding', () => {
    const vec = Array.from({ length: 768 }, (_, i) => i / 768)
    const normWithEmbed: Normativa[] = [{ ...mockNormativas[0], embedding: vec }]
    const dsWithEmbed: Dataset[] = mockDatasets.map(d => ({ ...d, embedding: null }))
    const index = buildIndex(dsWithEmbed, normWithEmbed)
    expect(index.normativaEmbeddings.size).toBe(1)
    expect(index.normativaEmbeddings.get('NM-001')).toBeInstanceOf(Float32Array)
  })

  it('returns empty maps when no embeddings provided', () => {
    const dsNoEmbed = mockDatasets.map(d => ({ ...d, embedding: null }))
    const nmNoEmbed = mockNormativas.map(n => ({ ...n, embedding: null }))
    const index = buildIndex(dsNoEmbed, nmNoEmbed)
    expect(index.datasetEmbeddings.size).toBe(0)
    expect(index.normativaEmbeddings.size).toBe(0)
  })
})
