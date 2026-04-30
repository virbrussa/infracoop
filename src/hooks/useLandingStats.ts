import { useState, useEffect } from 'react'
import { supabase } from '../services/supabase'

interface LandingStats {
  datasets: number
  normativas: number
  preguntas: number
  isLoading: boolean
  error: string | null
}

async function fetchCounts(): Promise<{ ds: number; nm: number; pq: number }> {
  const [
    { count: ds, error: e1 },
    { count: nm, error: e2 },
    { count: pq, error: e3 },
  ] = await Promise.all([
    supabase.from('datasets').select('*', { count: 'exact', head: true }).eq('es_sintetico', false),
    supabase.from('normativas').select('*', { count: 'exact', head: true }).eq('es_sintetico', false),
    supabase.from('preguntas').select('*', { count: 'exact', head: true }).eq('es_sintetico', false),
  ])
  const firstError = e1 ?? e2 ?? e3
  if (firstError) throw new Error((firstError as { message: string }).message)
  return { ds: ds ?? 0, nm: nm ?? 0, pq: pq ?? 0 }
}

export function useLandingStats(): LandingStats {
  const [datasets,   setDatasets]   = useState(0)
  const [normativas, setNormativas] = useState(0)
  const [preguntas,  setPreguntas]  = useState(0)
  const [isLoading,  setLoading]    = useState(true)
  const [error,      setError]      = useState<string | null>(null)

  useEffect(() => {
    let mounted = true

    async function load() {
      try {
        const { ds, nm, pq } = await fetchCounts()
        if (!mounted) return
        setDatasets(ds)
        setNormativas(nm)
        setPreguntas(pq)
      } catch (err) {
        if (mounted) setError(err instanceof Error ? err.message : 'Error cargando estadísticas')
      } finally {
        if (mounted) setLoading(false)
      }
    }

    load()

    // Realtime: re-fetch when datasets, normativas, or preguntas change
    const channel = supabase
      .channel('landing-stats')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'datasets' }, () => { load() })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'normativas' }, () => { load() })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'preguntas' }, () => { load() })
      .subscribe()

    return () => {
      mounted = false
      supabase.removeChannel(channel)
    }
  }, [])

  return { datasets, normativas, preguntas, isLoading, error }
}
