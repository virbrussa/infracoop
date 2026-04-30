import { supabase } from './supabase'
import type { Dataset, Normativa, Pregunta, FormularioData, NormativaFormData, DatasetFilters, NormativaFilters } from '../types'

const useSynthetic = import.meta.env.VITE_USE_SYNTHETIC_DATA === 'true'

export async function getDatasets(filters?: DatasetFilters): Promise<Dataset[]> {
  let query = supabase.from('datasets').select('*')

  if (!useSynthetic) {
    query = query.eq('es_sintetico', false)
  }
  if (filters?.agenda) {
    query = query.contains('agendas', [filters.agenda])
  }
  if (filters?.pais) {
    query = query.eq('pais_iso3', filters.pais)
  }
  if (filters?.calidad) {
    query = query.eq('calidad', filters.calidad)
  }

  const { data, error } = await query
  if (error) throw new Error(error.message)
  return (data as Dataset[]) ?? []
}

export async function getNormativas(filters?: NormativaFilters): Promise<Normativa[]> {
  let query = supabase.from('normativas').select('*')

  if (!useSynthetic) {
    query = query.eq('es_sintetico', false)
  }
  if (filters?.agenda) {
    query = query.contains('agendas', [filters.agenda])
  }
  if (filters?.pais_alcance) {
    query = query.eq('pais_alcance', filters.pais_alcance)
  }

  const { data, error } = await query
  if (error) throw new Error(error.message)
  return (data as Normativa[]) ?? []
}

export async function getPreguntas(desde?: string): Promise<Pregunta[]> {
  let query = supabase.from('preguntas').select('*').order('fecha', { ascending: false })

  if (!useSynthetic) {
    query = query.eq('es_sintetico', false)
  }
  if (desde) {
    query = query.gte('fecha', desde)
  }

  const { data, error } = await query
  if (error) throw new Error(error.message)
  return (data as Pregunta[]) ?? []
}

export async function insertPregunta(
  texto: string,
  score?: number,
  datasetsEncontrados?: string[]
): Promise<Pregunta> {
  const { data, error } = await supabase
    .from('preguntas')
    .insert({
      texto,
      ...(score != null && { resultado_score: score }),
      ...(datasetsEncontrados?.length && { datasets_encontrados: datasetsEncontrados }),
    })
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data as Pregunta
}

export async function submitFormulario(
  formulario: FormularioData,
  modo: 'directo' | 'revision'
): Promise<string | null> {
  if (modo === 'revision') {
    const { error } = await supabase
      .from('formularios_en_revision')
      .insert({ ...formulario, status: 'pendiente' })
    if (error) throw new Error(error.message)
    return null
  }

  // directo: strip form-only field, write straight to datasets
  const { ingresado_por: _ip, ...rest } = formulario
  const payload = { ...rest, es_sintetico: false }
  const { data, error } = await supabase
    .from('datasets').insert(payload).select('id').single()
  if (error) throw new Error(error.message)
  return (data as { id: string }).id
}

export async function submitNormativa(
  normativa: NormativaFormData,
  modo: 'directo' | 'revision'
): Promise<string | null> {
  if (modo === 'revision') {
    const { error } = await supabase
      .from('normativas_en_revision')
      .insert({ ...normativa, status: 'pendiente' })
    if (error) throw new Error(error.message)
    return null
  }

  // directo: strip form-only field, write straight to normativas
  const { ingresado_por: _ip, ...rest } = normativa
  const { data, error } = await supabase
    .from('normativas').insert(rest).select('id').single()
  if (error) throw new Error(error.message)
  return (data as { id: string }).id
}

export async function updateEmbedding(
  tabla: 'datasets' | 'normativas',
  id: string,
  embedding: number[]
): Promise<void> {
  const { error } = await supabase
    .from(tabla)
    .update({ embedding })
    .eq('id', id)
  if (error) throw new Error(error.message)
}

export async function aprobarFormulario(id: string): Promise<string> {
  const { data, error: readErr } = await supabase
    .from('formularios_en_revision').select('*').eq('id', id).single()
  if (readErr || !data) throw new Error(readErr?.message ?? 'No encontrado')

  const { id: _id, status: _s, fecha_revision: _fr, ingresado_por: _ip, created_at: _ca, ...rest } = data as Record<string, unknown>
  const newId = `DS-C${Date.now()}`
  const payload = { id: newId, ...rest, es_sintetico: false }

  const { data: inserted, error: insErr } = await supabase
    .from('datasets').insert(payload).select('id').single()
  if (insErr || !inserted) throw new Error(insErr?.message ?? 'Error insertando')

  await supabase.from('formularios_en_revision').delete().eq('id', id)
  return (inserted as { id: string }).id
}

export async function rechazarFormulario(id: string): Promise<void> {
  const { error } = await supabase
    .from('formularios_en_revision').update({ status: 'rechazado' }).eq('id', id)
  if (error) throw new Error(error.message)
}

export async function aprobarNormativa(id: string): Promise<string> {
  const { data, error: readErr } = await supabase
    .from('normativas_en_revision').select('*').eq('id', id).single()
  if (readErr || !data) throw new Error(readErr?.message ?? 'No encontrado')

  const { id: _id, status: _s, fecha_revision: _fr, ingresado_por: _ip, created_at: _ca, ...rest } = data as Record<string, unknown>
  const newId = `NM-C${Date.now()}`
  const payload = { id: newId, ...rest }

  const { data: inserted, error: insErr } = await supabase
    .from('normativas').insert(payload).select('id').single()
  if (insErr || !inserted) throw new Error(insErr?.message ?? 'Error insertando')

  await supabase.from('normativas_en_revision').delete().eq('id', id)
  return (inserted as { id: string }).id
}

export async function rechazarNormativa(id: string): Promise<void> {
  const { error } = await supabase
    .from('normativas_en_revision').update({ status: 'rechazado' }).eq('id', id)
  if (error) throw new Error(error.message)
}
