import type { SearchIndex } from './searchService'
import type { SearchHit } from '../types'

export function cosineSimilarity(a: Float32Array, b: Float32Array): number {
  if (a.length !== b.length) return 0
  let dot = 0, normA = 0, normB = 0
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i]
    normA += a[i] * a[i]
    normB += b[i] * b[i]
  }
  if (normA === 0 || normB === 0) return 0
  return dot / (Math.sqrt(normA) * Math.sqrt(normB))
}

export function semanticSearch(
  queryVector: Float32Array,
  index: SearchIndex,
  limit = 5
): { datasets: SearchHit[]; normativas: SearchHit[] } {
  const datasets: SearchHit[] = []
  for (const [id, vec] of index.datasetEmbeddings) {
    const doc = index.datasetsMap.get(id)
    if (!doc) continue
    const sim = cosineSimilarity(queryVector, vec)
    datasets.push({
      id: doc.id, titulo: doc.titulo, fuente: doc.fuente_organismo,
      pais: doc.pais_iso3, anio: doc.anio_publicacion, calidad: doc.calidad,
      similitud: Math.min(1, Math.max(0, sim)),
      tipo: 'dataset', agendas: doc.agendas ?? [],
    })
  }
  datasets.sort((a, b) => b.similitud - a.similitud)

  const normativas: SearchHit[] = []
  for (const [id, vec] of index.normativaEmbeddings) {
    const doc = index.normativasMap.get(id)
    if (!doc) continue
    const sim = cosineSimilarity(queryVector, vec)
    normativas.push({
      id: doc.id, titulo: doc.nombre, fuente: doc.organismo_emisor,
      pais: doc.pais_alcance, anio: doc.anio_adopcion, calidad: null,
      similitud: Math.min(1, Math.max(0, sim)),
      tipo: 'normativa', agendas: doc.agendas ?? [],
    })
  }
  normativas.sort((a, b) => b.similitud - a.similitud)

  return {
    datasets: datasets.slice(0, limit),
    normativas: normativas.slice(0, limit),
  }
}
