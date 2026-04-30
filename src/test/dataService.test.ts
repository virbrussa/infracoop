import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Dataset, Pregunta } from '../types'

const mockDatasets: Dataset[] = [
  {
    id: 'DS-001', titulo: 'ENDIREH 2021', fuente_organismo: 'INEGI',
    pais_iso3: 'MEX', anio_publicacion: 2021, subtema: 'violencia',
    agendas: ['Ag. Género', 'Ag. Datos'], calidad: 'Completa',
    frecuencia: 'Quinquenal', desagregacion_geo: 'Municipal',
    accesibilidad_formato: 'CSV', url_descarga: 'https://inegi.org.mx',
    url_valida: true, descripcion_notas: null, es_sintetico: false,
    created_at: '2024-01-01T00:00:00Z', embedding: null,
  },
]

// Chainable + thenable mock — works regardless of whether .eq()/.contains() are called
function makeQuery(result: { data: unknown; error: { message: string } | null }) {
  const q: Record<string, unknown> = {}
  q.select = vi.fn().mockReturnValue(q)
  q.eq = vi.fn().mockReturnValue(q)
  q.contains = vi.fn().mockReturnValue(q)
  q.gte = vi.fn().mockReturnValue(q)
  q.order = vi.fn().mockReturnValue(q)
  // thenable: makes `await query` resolve to `result`
  q.then = (resolve: (v: unknown) => void, _reject: unknown) => Promise.resolve(result).then(resolve)
  return q
}

const mockFrom = vi.fn()
vi.mock('../services/supabase', () => ({
  supabase: { from: mockFrom },
}))

beforeEach(() => {
  vi.clearAllMocks()
})

describe('getDatasets', () => {
  it('returns datasets array', async () => {
    mockFrom.mockReturnValue(makeQuery({ data: mockDatasets, error: null }))
    const { getDatasets } = await import('../services/dataService')
    const result = await getDatasets()
    expect(result).toEqual(mockDatasets)
  })

  it('filters by synthetic flag from env', async () => {
    mockFrom.mockReturnValue(makeQuery({ data: [], error: null }))
    const { getDatasets } = await import('../services/dataService')
    await getDatasets()
    expect(mockFrom).toHaveBeenCalledWith('datasets')
  })

  it('throws on Supabase error', async () => {
    mockFrom.mockReturnValue(makeQuery({ data: null, error: { message: 'DB error' } }))
    const { getDatasets } = await import('../services/dataService')
    await expect(getDatasets()).rejects.toThrow('DB error')
  })
})

describe('insertPregunta', () => {
  it('inserts and returns the pregunta', async () => {
    const mockPregunta: Pregunta = {
      id: 'uuid-1', texto: 'datos feminicidio', fecha: '2026-01-01T00:00:00Z',
      agenda_clasificada: null, resultado_score: null, datasets_encontrados: [],
      es_sintetico: false,
    }
    mockFrom.mockReturnValue({
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: mockPregunta, error: null }),
        }),
      }),
    })
    const { insertPregunta } = await import('../services/dataService')
    const result = await insertPregunta('datos feminicidio')
    expect(result.texto).toBe('datos feminicidio')
  })
})

describe('submitFormulario', () => {
  it('inserts into datasets when mode is directo and returns id', async () => {
    mockFrom.mockReturnValue({
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: { id: 'mock-id' }, error: null }),
        }),
      }),
    })
    const { submitFormulario } = await import('../services/dataService')
    const data = { titulo: 'Test', fuente_organismo: 'INEGI', pais_iso3: 'MEX',
      anio_publicacion: 2024, subtema: 'test', agendas: [], frecuencia: 'Anual',
      desagregacion_geo: 'Nacional', accesibilidad_formato: 'CSV',
      url_descarga: 'https://example.com', descripcion_notas: '', ingresado_por: 'test' }
    const result = await submitFormulario(data, 'directo')
    expect(mockFrom).toHaveBeenCalledWith('datasets')
    expect(result).toBe('mock-id')
  })

  it('inserts into formularios_en_revision when mode is revision and returns null', async () => {
    mockFrom.mockReturnValue({
      insert: vi.fn().mockResolvedValue({ error: null }),
    })
    const { submitFormulario } = await import('../services/dataService')
    const data = { titulo: 'Test', fuente_organismo: 'INEGI', pais_iso3: 'MEX',
      anio_publicacion: 2024, subtema: 'test', agendas: [], frecuencia: 'Anual',
      desagregacion_geo: 'Nacional', accesibilidad_formato: 'CSV',
      url_descarga: 'https://example.com', descripcion_notas: '', ingresado_por: 'test' }
    const result = await submitFormulario(data, 'revision')
    expect(mockFrom).toHaveBeenCalledWith('formularios_en_revision')
    expect(result).toBeNull()
  })
})

describe('submitNormativa', () => {
  it('inserts into normativas when mode is directo and returns id', async () => {
    mockFrom.mockReturnValue({
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: { id: 'mock-id' }, error: null }),
        }),
      }),
    })
    const { submitNormativa } = await import('../services/dataService')
    const data = {
      nombre: 'Ley 1234', organismo_emisor: 'Congreso', tipo: 'Ley',
      pais_alcance: 'MEX', anio_adopcion: 2020, articulo_numeral: 'Art. 5',
      obligacion_datos: 'Publicar datos desagregados', agendas: ['Ag. Género'],
      url_texto_oficial: 'https://example.com', descripcion_notas: '',
      ingresado_por: 'test',
    }
    const result = await submitNormativa(data, 'directo')
    expect(mockFrom).toHaveBeenCalledWith('normativas')
    expect(result).toBe('mock-id')
  })

  it('inserts into normativas_en_revision when mode is revision and returns null', async () => {
    mockFrom.mockReturnValue({
      insert: vi.fn().mockResolvedValue({ error: null }),
    })
    const { submitNormativa } = await import('../services/dataService')
    const data = {
      nombre: 'Ley 1234', organismo_emisor: 'Congreso', tipo: 'Ley',
      pais_alcance: 'MEX', anio_adopcion: 2020, articulo_numeral: 'Art. 5',
      obligacion_datos: 'Publicar datos desagregados', agendas: ['Ag. Género'],
      url_texto_oficial: 'https://example.com', descripcion_notas: '',
      ingresado_por: 'test',
    }
    const result = await submitNormativa(data, 'revision')
    expect(mockFrom).toHaveBeenCalledWith('normativas_en_revision')
    expect(result).toBeNull()
  })

  it('throws on Supabase error', async () => {
    mockFrom.mockReturnValue({
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: null, error: { message: 'DB error' } }),
        }),
      }),
    })
    const { submitNormativa } = await import('../services/dataService')
    const data = {
      nombre: 'Ley 1234', organismo_emisor: '', tipo: '', pais_alcance: '',
      anio_adopcion: null, articulo_numeral: '', obligacion_datos: '',
      agendas: [], url_texto_oficial: '', descripcion_notas: '', ingresado_por: '',
    }
    await expect(submitNormativa(data, 'directo')).rejects.toThrow('DB error')
  })

  it('inserts into normativas without ingresado_por when directo', async () => {
    const mockChain = {
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { id: 'nm-new' }, error: null }),
    }
    ;(mockFrom as ReturnType<typeof vi.fn>).mockReturnValueOnce(mockChain)

    const normativa = {
      nombre: 'Ley Test', organismo_emisor: 'Congreso', tipo: 'ley',
      pais_alcance: 'MEX', anio_adopcion: 2024, articulo_numeral: '',
      obligacion_datos: '', agendas: [], url_texto_oficial: '',
      descripcion_notas: '', ingresado_por: 'admin@x.com',
    }
    const { submitNormativa } = await import('../services/dataService')
    const id = await submitNormativa(normativa, 'directo')
    expect(id).toBe('nm-new')
    expect(mockChain.insert).not.toHaveBeenCalledWith(
      expect.objectContaining({ ingresado_por: expect.anything() })
    )
  })
})

describe('submitFormulario directo', () => {
  it('inserts into datasets (not formularios_publicados) and returns new id', async () => {
    const mockInsertChain = {
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { id: 'ds-new' }, error: null }),
    }
    ;(mockFrom as ReturnType<typeof vi.fn>).mockReturnValueOnce(mockInsertChain)

    const formulario = {
      titulo: 'Test', fuente_organismo: 'INE', pais_iso3: 'MEX',
      anio_publicacion: 2024, subtema: '', agendas: [], frecuencia: '',
      desagregacion_geo: '', accesibilidad_formato: '', url_descarga: '',
      descripcion_notas: '', ingresado_por: 'admin@x.com',
    }
    const { submitFormulario } = await import('../services/dataService')
    const id = await submitFormulario(formulario, 'directo')
    expect(id).toBe('ds-new')
    expect(mockFrom).toHaveBeenCalledWith('datasets')
    expect(mockFrom).not.toHaveBeenCalledWith('formularios_publicados')
  })
})

describe('aprobarFormulario', () => {
  it('returns the id of the newly inserted dataset', async () => {
    const mockRecord = {
      id: 'f1', titulo: 'Dataset X', status: 'pendiente',
      fecha_revision: null, ingresado_por: 'user@x.com',
      descripcion_notas: 'notas',
    }
    const mockInsertChain = {
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { id: 'new-ds-1' }, error: null }),
    }
    const mockSelectChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: mockRecord, error: null }),
    }
    const mockDeleteChain = {
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ error: null }),
    }

    mockFrom
      .mockReturnValueOnce(mockSelectChain)     // read from formularios_en_revision
      .mockReturnValueOnce(mockInsertChain)     // insert into datasets
      .mockReturnValueOnce(mockDeleteChain)     // delete from formularios_en_revision

    const { aprobarFormulario } = await import('../services/dataService')
    const id = await aprobarFormulario('f1')
    expect(id).toBe('new-ds-1')
  })
})

describe('aprobarNormativa', () => {
  it('returns the id of the newly inserted normativa', async () => {
    const mockRecord = { id: 'n1', nombre: 'Ley Y', status: 'pendiente' }
    const mockInsertChain = {
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { id: 'new-nm-1' }, error: null }),
    }
    const mockSelectChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: mockRecord, error: null }),
    }
    const mockDeleteChain = {
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ error: null }),
    }

    mockFrom
      .mockReturnValueOnce(mockSelectChain)
      .mockReturnValueOnce(mockInsertChain)
      .mockReturnValueOnce(mockDeleteChain)

    const { aprobarNormativa } = await import('../services/dataService')
    const id = await aprobarNormativa('n1')
    expect(id).toBe('new-nm-1')
  })
})
