import { useState, useEffect } from 'react'
import { getNormativas } from '../services/dataService'
import type { Normativa, NormativaFilters } from '../types'

interface UseNormativasResult {
  normativas: Normativa[]
  loading: boolean
  error: string | null
  refetch: () => void
}

export function useNormativas(filters?: NormativaFilters): UseNormativasResult {
  const [normativas, setNormativas] = useState<Normativa[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tick, setTick] = useState(0)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    getNormativas(filters)
      .then((data) => { if (!cancelled) { setNormativas(data); setLoading(false) } })
      .catch((err: Error) => { if (!cancelled) { setError(err.message); setLoading(false) } })

    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters?.agenda, filters?.pais_alcance, tick])

  return { normativas, loading, error, refetch: () => setTick((t) => t + 1) }
}
