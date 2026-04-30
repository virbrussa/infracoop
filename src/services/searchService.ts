import MiniSearch from 'minisearch'
import Fuse from 'fuse.js'
import type { Dataset, Normativa, SearchHit } from '../types'

export interface SearchIndex {
  miniDatasets: MiniSearch
  miniNormativas: MiniSearch
  fuseDatasets: Fuse<Dataset>
  fuseNormativas: Fuse<Normativa>
  datasetsMap: Map<string, Dataset>
  normativasMap: Map<string, Normativa>
  datasetEmbeddings: Map<string, Float32Array>
  normativaEmbeddings: Map<string, Float32Array>
}

export function buildIndex(datasets: Dataset[], normativas: Normativa[]): SearchIndex {
  const miniDatasets = new MiniSearch({
    idField: 'id',
    fields: ['titulo', 'descripcion_notas', 'subtema'],
    searchOptions: { boost: { titulo: 2 }, fuzzy: 0.2, prefix: true },
  })
  miniDatasets.addAll(datasets.map(d => ({
    id: d.id,
    titulo: d.titulo,
    descripcion_notas: d.descripcion_notas ?? '',
    subtema: d.subtema ?? '',
  })))

  const miniNormativas = new MiniSearch({
    idField: 'id',
    fields: ['nombre', 'obligacion_datos', 'descripcion_notas'],
    storeFields: ['nombre', 'organismo_emisor', 'pais_alcance', 'anio_adopcion', 'agendas'],
    searchOptions: { boost: { nombre: 2 }, fuzzy: 0.2, prefix: true },
  })
  miniNormativas.addAll(normativas.map(n => ({
    id: n.id,
    nombre: n.nombre,
    obligacion_datos: n.obligacion_datos ?? '',
    descripcion_notas: n.descripcion_notas ?? '',
  })))

  const fuseDatasets = new Fuse(datasets, {
    keys: [{ name: 'titulo', weight: 2 }, 'descripcion_notas', 'subtema'],
    includeScore: true, threshold: 0.6,
  })
  const fuseNormativas = new Fuse(normativas, {
    keys: [{ name: 'nombre', weight: 2 }, 'obligacion_datos', 'descripcion_notas'],
    includeScore: true, threshold: 0.6,
  })

  const datasetEmbeddings = new Map<string, Float32Array>()
  for (const d of datasets) {
    const vec = parseEmbedding(d.embedding)
    if (vec) datasetEmbeddings.set(d.id, vec)
  }

  const normativaEmbeddings = new Map<string, Float32Array>()
  for (const n of normativas) {
    const vec = parseEmbedding(n.embedding)
    if (vec) normativaEmbeddings.set(n.id, vec)
  }

  return {
    miniDatasets, miniNormativas, fuseDatasets, fuseNormativas,
    datasetsMap: new Map(datasets.map(d => [d.id, d])),
    normativasMap: new Map(normativas.map(n => [n.id, n])),
    datasetEmbeddings,
    normativaEmbeddings,
  }
}

function parseEmbedding(raw: number[] | string | null | undefined): Float32Array | null {
  if (!raw) return null
  if (typeof raw === 'string') {
    try { return new Float32Array(JSON.parse(raw)) } catch { return null }
  }
  return new Float32Array(raw)
}

function normalize(score: number, max: number): number {
  if (max === 0) return 0
  return Math.round((score / max) * 100) / 100
}

export function search(
  query: string,
  index: SearchIndex,
  limit = 5
): { datasets: SearchHit[]; normativas: SearchHit[] } {
  const dsRaw = index.miniDatasets.search(query).slice(0, limit)
  let datasets: SearchHit[]

  if (dsRaw.length > 0) {
    const maxScore = Math.max(...dsRaw.map(r => r.score))
    datasets = dsRaw
      .map(r => {
        const doc = index.datasetsMap.get(String(r.id))
        if (!doc) return null
        return {
          id: doc.id, titulo: doc.titulo, fuente: doc.fuente_organismo,
          pais: doc.pais_iso3, anio: doc.anio_publicacion, calidad: doc.calidad,
          similitud: normalize(r.score, maxScore), tipo: 'dataset' as const,
          agendas: doc.agendas ?? [],
        } as SearchHit
      })
      .filter((h): h is SearchHit => h !== null)
  } else {
    datasets = index.fuseDatasets.search(query, { limit }).map(r => ({
      id: r.item.id, titulo: r.item.titulo, fuente: r.item.fuente_organismo,
      pais: r.item.pais_iso3, anio: r.item.anio_publicacion, calidad: r.item.calidad,
      similitud: Math.round((1 - (r.score ?? 1)) * 100) / 100, tipo: 'dataset' as const,
      agendas: r.item.agendas ?? [],
    }))
  }

  const nmRaw = index.miniNormativas.search(query).slice(0, limit)
  let normativas: SearchHit[]

  if (nmRaw.length > 0) {
    const maxScore = Math.max(...nmRaw.map(r => r.score))
    normativas = nmRaw
      .map(r => {
        const doc = index.normativasMap.get(String(r.id))
        if (!doc) return null
        return {
          id: doc.id, titulo: doc.nombre, fuente: doc.organismo_emisor,
          pais: doc.pais_alcance, anio: doc.anio_adopcion, calidad: null,
          similitud: normalize(r.score, maxScore), tipo: 'normativa' as const,
          agendas: doc.agendas ?? [],
        } as SearchHit
      })
      .filter((h): h is SearchHit => h !== null)
  } else {
    normativas = index.fuseNormativas.search(query, { limit }).map(r => ({
      id: r.item.id, titulo: r.item.nombre, fuente: r.item.organismo_emisor,
      pais: r.item.pais_alcance, anio: r.item.anio_adopcion, calidad: null,
      similitud: Math.round((1 - (r.score ?? 1)) * 100) / 100, tipo: 'normativa' as const,
      agendas: r.item.agendas ?? [],
    }))
  }

  return { datasets, normativas }
}
