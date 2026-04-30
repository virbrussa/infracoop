import type { SearchHit, GapResult, AgendaScores } from '../types'

export function calcularScore(
  datasets: SearchHit[],
  normativas: SearchHit[]
): Pick<GapResult, 'score' | 'categoria'> {
  if (datasets.length === 0 && normativas.length === 0) {
    return { score: 1.0, categoria: 'critica' }
  }

  const maxSimDs = datasets.length > 0 ? Math.max(...datasets.map(h => h.similitud)) : 0
  const maxSimNm = normativas.length > 0 ? Math.max(...normativas.map(h => h.similitud)) : 0
  const score = Math.round(((1 - maxSimDs) * 0.6 + (1 - maxSimNm) * 0.4) * 100) / 100

  let categoria: 'critica' | 'parcial' | 'cubierta'
  if (score >= 0.65) categoria = 'critica'
  else if (score >= 0.35) categoria = 'parcial'
  else categoria = 'cubierta'

  return { score, categoria }
}

export function calcularAgendas(
  datasets: SearchHit[],
  normativas: SearchHit[],
  scoreGlobal: number
): AgendaScores {
  const agendaGap = (pattern: RegExp): number => {
    const dsA = datasets.filter(h => h.agendas.some(a => pattern.test(a)))
    const nmA = normativas.filter(h => h.agendas.some(a => pattern.test(a)))
    if (dsA.length === 0 && nmA.length === 0) return Math.round(scoreGlobal * 100)
    const maxDs = dsA.length > 0 ? Math.max(...dsA.map(h => h.similitud)) : 0
    const maxNm = nmA.length > 0 ? Math.max(...nmA.map(h => h.similitud)) : 0
    return Math.round(((1 - maxDs) * 0.6 + (1 - maxNm) * 0.4) * 100)
  }

  return {
    tecnologica: agendaGap(/tecnol/i),
    datos: agendaGap(/dato/i),
    genero: agendaGap(/g[eé]nero/i),
  }
}

export function generarTitulo(
  categoria: 'critica' | 'parcial' | 'cubierta',
  datasets: SearchHit[],
  normativas: SearchHit[]
): string {
  const labels = { critica: 'Brecha crítica', parcial: 'Brecha parcial', cubierta: 'Datos disponibles' }
  const top = datasets[0] ?? normativas[0]
  if (!top) return `${labels[categoria]}: sin datos relacionados`
  const nombre = top.titulo.length > 55 ? top.titulo.slice(0, 55) + '…' : top.titulo
  return `${labels[categoria]} detectada — ${nombre}`
}
