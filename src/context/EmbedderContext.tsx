import { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react'

export interface EmbedderContextType {
  status: 'loading' | 'ready' | 'error'
  progress: string
  embed: (text: string) => Promise<Float32Array>
  error: string | null
}

const EmbedderContext = createContext<EmbedderContextType>({
  status: 'loading',
  progress: 'Iniciando modelo…',
  embed: () => Promise.reject(new Error('EmbedderContext not mounted')),
  error: null,
})

export function useEmbedder() {
  return useContext(EmbedderContext)
}

type PendingResolve = (vec: Float32Array) => void
type PendingReject = (err: Error) => void

export function EmbedderProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [progress, setProgress] = useState('Iniciando modelo…')
  const [error, setError] = useState<string | null>(null)

  const workerRef = useRef<Worker | null>(null)
  const pendingRef = useRef<Map<string, [PendingResolve, PendingReject]>>(new Map())

  useEffect(() => {
    const worker = new Worker(
      new URL('../workers/embedder.worker.ts', import.meta.url),
      { type: 'module' }
    )
    workerRef.current = worker

    worker.onmessage = (e) => {
      const msg = e.data
      if (msg.type === 'progress') {
        setProgress(msg.message)
      } else if (msg.type === 'ready') {
        setStatus('ready')
        setProgress('Modelo listo')
      } else if (msg.type === 'result') {
        const pending = pendingRef.current.get(msg.id)
        if (pending) {
          pendingRef.current.delete(msg.id)
          pending[0](new Float32Array(msg.vector))
        }
      } else if (msg.type === 'error') {
        setStatus('error')
        setError(msg.message)
        for (const [, [, reject]] of pendingRef.current) {
          reject(new Error(msg.message))
        }
        pendingRef.current.clear()
      }
    }

    worker.onerror = (e) => {
      setStatus('error')
      setError(e.message)
      for (const [, [, reject]] of pendingRef.current) {
        reject(new Error(e.message))
      }
      pendingRef.current.clear()
    }

    return () => { worker.terminate() }
  }, [])

  const embed = useCallback((text: string): Promise<Float32Array> => {
    return new Promise((resolve, reject) => {
      if (!workerRef.current) { reject(new Error('Worker not initialized')); return }
      const id = crypto.randomUUID()
      pendingRef.current.set(id, [resolve, reject])
      workerRef.current.postMessage({ type: 'embed', id, text })
    })
  }, [])

  return (
    <EmbedderContext.Provider value={{ status, progress, embed, error }}>
      {children}
    </EmbedderContext.Provider>
  )
}
