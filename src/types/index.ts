export interface Dataset {
  id: string
  titulo: string
  fuente_organismo: string | null
  pais_iso3: string | null
  anio_publicacion: number | null
  subtema: string | null
  agendas: string[]
  calidad: 'Completa' | 'Parcial' | 'Nula' | null
  frecuencia: string | null
  desagregacion_geo: string | null
  accesibilidad_formato: string | null
  url_descarga: string | null
  url_valida: boolean
  descripcion_notas: string | null
  es_sintetico: boolean
  created_at: string
  embedding: number[] | string | null
}

export interface Normativa {
  id: string
  nombre: string
  organismo_emisor: string | null
  tipo: string | null
  pais_alcance: string | null
  anio_adopcion: number | null
  articulo_numeral: string | null
  obligacion_datos: string | null
  agendas: string[]
  url_texto_oficial: string | null
  descripcion_notas: string | null
  es_sintetico: boolean
  created_at: string
  embedding: number[] | string | null
}

export interface Pregunta {
  id: string
  texto: string
  fecha: string
  agenda_clasificada: string | null
  resultado_score: number | null
  datasets_encontrados: string[]
  es_sintetico: boolean
}

export interface FormularioData {
  titulo: string
  fuente_organismo: string
  pais_iso3: string
  anio_publicacion: number | null
  subtema: string
  agendas: string[]
  frecuencia: string
  desagregacion_geo: string
  accesibilidad_formato: string
  url_descarga: string
  descripcion_notas: string
  ingresado_por: string
}

export interface NormativaFormData {
  nombre: string
  organismo_emisor: string
  tipo: string
  pais_alcance: string
  anio_adopcion: number | null
  articulo_numeral: string
  obligacion_datos: string
  agendas: string[]
  url_texto_oficial: string
  descripcion_notas: string
  ingresado_por: string
}

export interface DatasetFilters {
  agenda?: string
  pais?: string
  calidad?: 'Completa' | 'Parcial' | 'Nula'
  sintetico?: boolean
}

export interface NormativaFilters {
  agenda?: string
  pais_alcance?: string
  sintetico?: boolean
}

export interface SearchHit {
  id: string
  titulo: string
  fuente: string | null
  pais: string | null
  anio: number | null
  calidad: string | null
  similitud: number
  tipo: 'dataset' | 'normativa'
  agendas: string[]
}

export interface AgendaScores {
  tecnologica: number
  datos: number
  genero: number
}

export interface GapResult {
  score: number
  categoria: 'critica' | 'parcial' | 'cubierta'
  titulo: string
  datasets: SearchHit[]
  normativas: SearchHit[]
  agendas: AgendaScores
}

// ── Monitor stats (¿Qué tenemos?) ───────────────────────────────────────────

export interface AgendaStat {
  id: 'tecnologica' | 'datos' | 'genero'
  label: string
  color: string
  colorBg: string
  barColor: string
  total: number
  criticas: number
  parciales: number
  cubiertas: number
  top_subtemas: { subtema: string; count: number }[]
  datasets_en_agenda: number
  calidad_dist: { Completa: number; Parcial: number; Nula: number }
}

export interface TopicStat {
  id: string
  label: string
  gap_score: number
  categoria: 'critica' | 'parcial' | 'cubierta'
  datasets_cubriendo: number
  normativas_cubriendo: number
  preguntas_relacionadas: number
}

export interface ColectivoFiltros {
  agenda: 'todas' | 'tecnologica' | 'datos' | 'genero'
  pais: string
  calidad: 'todas' | 'Completa' | 'Parcial' | 'Nula'
}

export interface MonitorStats {
  agendas: AgendaStat[]
  topics: TopicStat[]
  totalPreguntas: number
  totalDatasets: number
  totalNormativas: number
  paises: string[]
  isReady: boolean
  error: string | null
}

// ── Evolucion stats (¿Qué queremos?) ────────────────────────────────────────

export interface SemanaStats {
  isoWeek: string
  label: string
  nuevas: number
  acumuladas: number
  score_promedio: number
  criticas: number
  parciales: number
  cubiertas: number
  por_agenda: {
    tecnologica: { nuevas: number; score_avg: number }
    datos: { nuevas: number; score_avg: number }
    genero: { nuevas: number; score_avg: number }
  }
}

export interface EvolucionStats {
  semanas: SemanaStats[]
  topTemas: { subtema: string; count: number }[]
  baseline: { score: number; criticas: number; parciales: number; cubiertas: number }
  baselinePerAgenda: { tecnologica: number; datos: number; genero: number }
  isReady: boolean
  error: string | null
}
