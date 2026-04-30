import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../services/supabase'
import { aprobarFormulario, rechazarFormulario, aprobarNormativa, rechazarNormativa } from '../services/dataService'

export interface ItemRevision {
  id: string
  tipo: 'dataset' | 'normativa'
  titulo: string
  fuente: string | null
  pais: string | null
  status: string
  created_at: string
}

interface RevisionQueue {
  items: ItemRevision[]
  rawItems: Record<string, Record<string, unknown>>
  isLoading: boolean
  error: string | null
  aprobar: (item: ItemRevision) => Promise<string>
  rechazar: (item: ItemRevision) => Promise<void>
}

export function useRevisionQueue(): RevisionQueue {
  const [items, setItems]       = useState<ItemRevision[]>([])
  const [rawItems, setRawItems] = useState<Record<string, Record<string, unknown>>>({})
  const [isLoading, setLoading] = useState(true)
  const [error, setError]       = useState<string | null>(null)
  const isMounted = useRef(false)

  const fetchQueue = useCallback(async () => {
    setLoading(true)
    try {
      const [{ data: ds }, { data: nm }] = await Promise.all([
        supabase.from('formularios_en_revision')
          .select('*')
          .neq('status', 'rechazado').order('created_at'),
        supabase.from('normativas_en_revision')
          .select('*')
          .neq('status', 'rechazado').order('created_at'),
      ])
      if (!isMounted.current) return
      const raw: Record<string, Record<string, unknown>> = {}
      const mapped: ItemRevision[] = [
        ...(ds ?? []).map(r => {
          raw[r.id] = r as Record<string, unknown>
          return {
            id: r.id, tipo: 'dataset' as const,
            titulo: r.titulo, fuente: r.fuente_organismo,
            pais: r.pais_iso3, status: r.status, created_at: r.created_at,
          }
        }),
        ...(nm ?? []).map(r => {
          raw[r.id] = r as Record<string, unknown>
          return {
            id: r.id, tipo: 'normativa' as const,
            titulo: r.nombre, fuente: r.organismo_emisor,
            pais: r.pais_alcance, status: r.status, created_at: r.created_at,
          }
        }),
      ]
      setRawItems(raw)
      setItems(mapped.sort((a, b) => a.created_at.localeCompare(b.created_at)))
    } catch (err) {
      if (isMounted.current) setError(err instanceof Error ? err.message : 'Error cargando cola')
    } finally {
      if (isMounted.current) setLoading(false)
    }
  }, [])

  useEffect(() => {
    isMounted.current = true
    fetchQueue()

    const channel = supabase
      .channel('revision-queue')
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'formularios_en_revision' },
        () => fetchQueue()
      )
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'normativas_en_revision' },
        () => fetchQueue()
      )
      .subscribe()

    return () => {
      isMounted.current = false
      supabase.removeChannel(channel)
    }
  }, [fetchQueue])

  const aprobar = useCallback(async (item: ItemRevision): Promise<string> => {
    const newId = item.tipo === 'dataset'
      ? await aprobarFormulario(item.id)
      : await aprobarNormativa(item.id)
    setItems(prev => prev.filter(i => i.id !== item.id))
    setRawItems(prev => { const n = { ...prev }; delete n[item.id]; return n })
    return newId
  }, [])

  const rechazar = useCallback(async (item: ItemRevision): Promise<void> => {
    if (item.tipo === 'dataset') await rechazarFormulario(item.id)
    else await rechazarNormativa(item.id)
    setItems(prev => prev.filter(i => i.id !== item.id))
    setRawItems(prev => { const n = { ...prev }; delete n[item.id]; return n })
  }, [])

  return { items, rawItems, isLoading, error, aprobar, rechazar }
}
