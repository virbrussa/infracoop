export interface QualityInput {
  fuente?: string
  metodologia?: 'si' | 'parcial' | 'no'
  anio?: number
  desagregacion?: 'geografica' | 'nacional' | 'sin-dato'
  url?: string
  formato?: 'csv' | 'json' | 'xlsx' | 'api' | 'pdf-no-legible' | 'sin-descarga' | ''
}

export interface QualitySignal {
  label: string
  valor: string
  score: number
  peso: string
}

export interface QualityResult {
  calidad: 'completa' | 'parcial' | 'nula'
  score: number
  confianza: 'alta' | 'media' | 'baja'
  senales: QualitySignal[]
}

export function calcularCalidadAuto(datos: QualityInput): QualityResult {
  const anioActual = new Date().getFullYear()
  const anio = datos.anio ?? 0
  const antiguedad = anio > 0 ? anioActual - anio : 99
  const formato = datos.formato ?? ''
  const metodologia = datos.metodologia ?? 'no'
  const desagregacion = datos.desagregacion ?? 'sin-dato'
  const tieneUrl = !!(datos.url && datos.url.trim().length > 4)
  const formatoLegible = (['csv', 'json', 'xlsx', 'api'] as string[]).includes(formato)
  const tieneFuente = !!(datos.fuente && datos.fuente.trim())

  let s1 = 0, razonS1 = ''
  if (tieneFuente && metodologia === 'si') { s1 = 1.0; razonS1 = 'Fuente documentada + metodología publicada' }
  else if (tieneFuente && metodologia === 'parcial') { s1 = 0.6; razonS1 = 'Fuente presente, metodología parcial' }
  else if (tieneFuente) { s1 = 0.3; razonS1 = 'Fuente presente, sin metodología' }
  else { s1 = 0; razonS1 = 'Sin fuente identificada' }

  let s2 = 0, razonS2 = ''
  if (anio === 0) { s2 = 0.1; razonS2 = 'Año desconocido' }
  else if (antiguedad > 3) { s2 = 0; razonS2 = `${antiguedad} años sin actualizar → Nula por frecuencia` }
  else if (antiguedad > 2) { s2 = 0.4; razonS2 = `${antiguedad} años sin actualizar → contribuye a Parcial` }
  else { s2 = 1.0; razonS2 = `Publicado hace ${antiguedad} año${antiguedad !== 1 ? 's' : ''} — frecuencia vigente` }

  let s3 = 0, razonS3 = ''
  if (desagregacion === 'geografica') { s3 = 1.0; razonS3 = 'Distribución geográfica presente' }
  else if (desagregacion === 'nacional') { s3 = 0.3; razonS3 = 'Solo totales nacionales' }
  else { s3 = 0; razonS3 = 'Desagregación geográfica desconocida' }

  let s4 = 0, razonS4 = ''
  if (tieneUrl && formatoLegible) { s4 = 1.0; razonS4 = `URL accesible + formato ${formato.toUpperCase()} legible por máquina` }
  else if (tieneUrl && formato === 'pdf-no-legible') { s4 = 0.25; razonS4 = 'URL presente pero PDF no es legible' }
  else if (tieneUrl && formato === 'sin-descarga') { s4 = 0.1; razonS4 = 'URL presente pero sin descarga' }
  else if (tieneUrl) { s4 = 0.4; razonS4 = 'URL presente, formato no especificado' }
  else { s4 = 0; razonS4 = 'Sin URL de descarga registrada' }

  const scoreRaw = s1 * 0.20 + s2 * 0.30 + s3 * 0.30 + s4 * 0.20

  let calidad: 'completa' | 'parcial' | 'nula'
  if (antiguedad > 3) {
    calidad = 'nula'
  } else if (scoreRaw >= 0.70 && antiguedad <= 2 && s3 >= 0.7 && formatoLegible) {
    calidad = 'completa'
  } else if (scoreRaw >= 0.35) {
    calidad = 'parcial'
  } else {
    calidad = 'nula'
  }

  const confianza: 'alta' | 'media' | 'baja' = scoreRaw >= 0.65 ? 'alta' : scoreRaw >= 0.40 ? 'media' : 'baja'

  return {
    calidad,
    score: Math.round(scoreRaw * 100),
    confianza,
    senales: [
      { label: 'Metadatos', valor: razonS1, score: Math.round(s1 * 100), peso: '20%' },
      { label: 'Frecuencia', valor: razonS2, score: Math.round(s2 * 100), peso: '30%' },
      { label: 'Desagregación', valor: razonS3, score: Math.round(s3 * 100), peso: '30%' },
      { label: 'Accesibilidad', valor: razonS4, score: Math.round(s4 * 100), peso: '20%' },
    ],
  }
}
