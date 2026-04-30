import { useState, useEffect } from 'react'
import { getPreguntas } from '../services/dataService'
import type { Pregunta } from '../types'

interface UsePreguntasResult {
  preguntas: Pregunta[]
  loading: boolean
  error: string | null
  refetch: () => void
}

export function usePreguntas(desde?: string): UsePreguntasResult {
  const [preguntas, setPreguntas] = useState<Pregunta[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tick, setTick] = useState(0)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    getPreguntas(desde)
      .then((data) => { if (!cancelled) { setPreguntas(data); setLoading(false) } })
      .catch((err: Error) => { if (!cancelled) { setError(err.message); setLoading(false) } })

    return () => { cancelled = true }
  }, [desde, tick])

  return { preguntas, loading, error, refetch: () => setTick((t) => t + 1) }
}
