import { useState, useEffect } from 'react'
import { getDatasets } from '../services/dataService'
import type { Dataset, DatasetFilters } from '../types'

interface UseDatasetsResult {
  datasets: Dataset[]
  loading: boolean
  error: string | null
  refetch: () => void
}

export function useDatasets(filters?: DatasetFilters): UseDatasetsResult {
  const [datasets, setDatasets] = useState<Dataset[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tick, setTick] = useState(0)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    getDatasets(filters)
      .then((data) => { if (!cancelled) { setDatasets(data); setLoading(false) } })
      .catch((err: Error) => { if (!cancelled) { setError(err.message); setLoading(false) } })

    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters?.agenda, filters?.pais, filters?.calidad, tick])

  return { datasets, loading, error, refetch: () => setTick((t) => t + 1) }
}
