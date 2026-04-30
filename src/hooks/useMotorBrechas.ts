import { useState, useCallback } from 'react'
import { useSearchIndex } from '../context/SearchIndexContext'
import { useEmbedder } from '../context/EmbedderContext'
import { semanticSearch } from '../services/semanticSearch'
import { search as textSearch } from '../services/searchService'
import { calcularScore, calcularAgendas, generarTitulo } from '../services/scoreService'
import { insertPregunta } from '../services/dataService'
import type { GapResult } from '../types'

const SEMANTIC_MIN_SIM = 0.05

interface MotorState {
  resultado: GapResult | null
  isLoading: boolean
  error: string | null
}

export function useMotorBrechas() {
  const { index } = useSearchIndex()
  const { embed } = useEmbedder()
  const [state, setState] = useState<MotorState>({
    resultado: null,
    isLoading: false,
    error: null,
  })

  const buscar = useCallback(async (query: string) => {
    if (!index) return
    setState(s => ({ ...s, isLoading: true, error: null }))

    try {
      const queryVector = await embed(query)
      const semHits = semanticSearch(queryVector, index)
      const maxSemSim = Math.max(
        ...semHits.datasets.map(h => h.similitud),
        ...semHits.normativas.map(h => h.similitud),
        0,
      )
      const hits = maxSemSim >= SEMANTIC_MIN_SIM
        ? semHits
        : textSearch(query, index)
      const { score, categoria } = calcularScore(hits.datasets, hits.normativas)
      const agendas = calcularAgendas(hits.datasets, hits.normativas, score)
      const titulo = generarTitulo(categoria, hits.datasets, hits.normativas)

      const resultado: GapResult = {
        score, categoria, titulo, agendas,
        datasets: hits.datasets,
        normativas: hits.normativas,
      }

      setState({ resultado, isLoading: false, error: null })

      insertPregunta(query, score, hits.datasets.map(h => h.id)).catch(() => {})
    } catch (err) {
      setState({
        resultado: null,
        isLoading: false,
        error: err instanceof Error ? err.message : 'Error al buscar',
      })
    }
  }, [index, embed])

  const limpiar = useCallback(() => {
    setState({ resultado: null, isLoading: false, error: null })
  }, [])

  return { ...state, buscar, limpiar }
}
