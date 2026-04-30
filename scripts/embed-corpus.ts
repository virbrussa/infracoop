import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'
import { pipeline } from '@huggingface/transformers'

const FORCE = process.argv.includes('--force')
const BATCH = 10

const supabaseUrl = process.env.VITE_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceKey) {
  console.error('Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceKey)

async function fetchRows(tabla: string) {
  const fields = tabla === 'datasets'
    ? 'id, titulo, subtema, descripcion_notas'
    : 'id, nombre, obligacion_datos, descripcion_notas'
  let q = supabase.from(tabla).select(fields)
  if (!FORCE) q = (q as typeof q).is('embedding', null)
  const { data, error } = await q
  if (error) throw new Error(`${tabla}: ${error.message}`)
  return data ?? []
}

async function updateRow(tabla: string, id: string, embedding: number[]) {
  const { error } = await supabase.from(tabla).update({ embedding }).eq('id', id)
  if (error) throw new Error(`UPDATE ${tabla} ${id}: ${error.message}`)
}

function embedText(row: Record<string, string | null>, tabla: string): string {
  if (tabla === 'datasets') {
    return [row.titulo, row.subtema, row.descripcion_notas].filter(Boolean).join(' ')
  }
  return [row.nombre, row.obligacion_datos, row.descripcion_notas].filter(Boolean).join(' ')
}

async function main() {
  console.log('Loading model…')
  const embedder = await pipeline(
    'feature-extraction',
    'Xenova/paraphrase-multilingual-mpnet-base-v2'
  )
  console.log('Model ready.')

  for (const tabla of ['datasets', 'normativas'] as const) {
    const rows = await fetchRows(tabla)
    console.log(`${tabla}: ${rows.length} rows to embed${FORCE ? ' (--force)' : ''}`)

    for (let i = 0; i < rows.length; i += BATCH) {
      const batch = rows.slice(i, i + BATCH)
      for (const row of batch) {
        const text = embedText(row as Record<string, string | null>, tabla)
        const output = await embedder(text, { pooling: 'mean', normalize: true })
        const vec = Array.from(output.data as Float32Array)
        await updateRow(tabla, row.id as string, vec)
        const label = (row.titulo ?? row.nombre) as string
        console.log(`${tabla} ${i + batch.indexOf(row) + 1}/${rows.length} — ${label}`)
      }
    }
  }
  console.log('Done.')
}

main().catch(err => { console.error(err); process.exit(1) })
