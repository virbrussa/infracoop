import { pipeline, env, type FeatureExtractionPipeline } from '@huggingface/transformers'

env.useBrowserCache = true
env.allowLocalModels = false

type InboundMessage =
  | { type: 'embed'; id: string; text: string }

type OutboundMessage =
  | { type: 'progress'; message: string; percent: number }
  | { type: 'ready' }
  | { type: 'result'; id: string; vector: number[] }
  | { type: 'error'; message: string }

let embedder: FeatureExtractionPipeline | null = null

async function loadModel() {
  embedder = await pipeline(
    'feature-extraction' as const,
    'Xenova/paraphrase-multilingual-mpnet-base-v2',
    {
      progress_callback: (info: { status: string; progress?: number; file?: string }) => {
        if (info.status === 'progress') {
          const percent = Math.round(info.progress ?? 0)
          const msg = info.file
            ? `Descargando modelo… ${percent}%`
            : `Cargando modelo… ${percent}%`
          postMessage({ type: 'progress', message: msg, percent } satisfies OutboundMessage)
        }
      },
    }
  )
  postMessage({ type: 'ready' } satisfies OutboundMessage)
}

loadModel().catch(err => {
  postMessage({ type: 'error', message: String(err) } satisfies OutboundMessage)
})

self.onmessage = async (e: MessageEvent<InboundMessage>) => {
  const { type, id, text } = e.data
  if (type !== 'embed') return
  if (!embedder) {
    postMessage({ type: 'error', message: 'Modelo no listo' } satisfies OutboundMessage)
    return
  }
  try {
    const output = await embedder(text, { pooling: 'mean', normalize: true })
    postMessage({ type: 'result', id, vector: Array.from(output.data as Float32Array) } satisfies OutboundMessage)
  } catch (err) {
    postMessage({ type: 'error', message: String(err) } satisfies OutboundMessage)
  }
}
