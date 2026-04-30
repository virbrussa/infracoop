import { describe, it, expectTypeOf } from 'vitest'
import type { Dataset, Normativa, Pregunta, DatasetFilters } from '../types'

describe('Dataset type', () => {
  it('has required fields', () => {
    const d: Dataset = {
      id: 'DS-001',
      titulo: 'Test',
      fuente_organismo: null,
      pais_iso3: 'MEX',
      anio_publicacion: 2024,
      subtema: null,
      agendas: ['Ag. Género'],
      calidad: 'Completa',
      frecuencia: null,
      desagregacion_geo: null,
      accesibilidad_formato: null,
      url_descarga: null,
      url_valida: true,
      descripcion_notas: null,
      es_sintetico: false,
      created_at: '2024-01-01T00:00:00Z',
      embedding: null,
    }
    expectTypeOf(d.id).toBeString()
    expectTypeOf(d.agendas).toEqualTypeOf<string[]>()
  })
})

describe('Normativa type', () => {
  it('has required fields', () => {
    const n: Normativa = {
      id: 'NM-001',
      nombre: 'CEDAW',
      organismo_emisor: null,
      tipo: null,
      pais_alcance: 'Internacional',
      anio_adopcion: 1979,
      articulo_numeral: null,
      obligacion_datos: null,
      agendas: ['Ag. Género'],
      url_texto_oficial: null,
      descripcion_notas: null,
      es_sintetico: false,
      created_at: '2024-01-01T00:00:00Z',
      embedding: null,
    }
    expectTypeOf(n.id).toBeString()
  })
})

describe('DatasetFilters type', () => {
  it('has optional filter fields', () => {
    const f: DatasetFilters = {}
    expectTypeOf(f.agenda).toEqualTypeOf<string | undefined>()
  })
})

describe('Pregunta type', () => {
  it('has required fields', () => {
    const p: Pregunta = {
      id: 'uuid-1',
      texto: 'datos femicidio',
      fecha: '2026-01-01T00:00:00Z',
      agenda_clasificada: null,
      resultado_score: null,
      datasets_encontrados: [],
      es_sintetico: false,
    }
    expectTypeOf(p.texto).toBeString()
  })
})

describe('embedding field', () => {
  it('Dataset has embedding field', () => {
    expectTypeOf<Dataset['embedding']>().toEqualTypeOf<number[] | string | null>()
  })
  it('Normativa has embedding field', () => {
    expectTypeOf<Normativa['embedding']>().toEqualTypeOf<number[] | string | null>()
  })
})
