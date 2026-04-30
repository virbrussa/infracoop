import { createContext, useContext, useEffect, useState } from 'react'
import { buildIndex, type SearchIndex } from '../services/searchService'
import { getDatasets, getNormativas } from '../services/dataService'

interface SearchIndexContextType {
  index: SearchIndex | null
  isReady: boolean
  error: string | null
}

const SearchIndexContext = createContext<SearchIndexContextType>({
  index: null,
  isReady: false,
  error: null,
})

export function useSearchIndex() {
  return useContext(SearchIndexContext)
}

export function SearchIndexProvider({ children }: { children: React.ReactNode }) {
  const [index, setIndex] = useState<SearchIndex | null>(null)
  const [isReady, setIsReady] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const [datasets, normativas] = await Promise.all([getDatasets(), getNormativas()])
        if (cancelled) return
        setIndex(buildIndex(datasets, normativas))
        setIsReady(true)
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Error al cargar el motor')
      }
    }

    load()
    return () => { cancelled = true }
  }, [])

  return (
    <SearchIndexContext.Provider value={{ index, isReady, error }}>
      {children}
    </SearchIndexContext.Provider>
  )
}
