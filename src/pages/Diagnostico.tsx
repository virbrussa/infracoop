import { useEffect } from 'react'
import { useLocation, Link } from 'react-router-dom'
import type { GapResult } from '../types'

interface DiagnosticoState {
  resultado: GapResult
  query: string
  chips: string[]
}

interface Marco {
  principio: string
  cita: string
  fuente: string
}

interface ChipContext {
  titulo: string
  framing: string
  marcos: Marco[]
  acciones: string[]
  keywords: string[]
}

const CHIP_CONTEXT: Record<string, ChipContext> = {
  'Gobierno Abierto': {
    titulo: 'Diagnóstico para Gobierno Abierto',
    framing: 'En el marco de la transparencia pública y la rendición de cuentas, esta brecha señala datos que el Estado debería producir y publicar abiertamente. La ausencia de estadísticas oficiales de calidad sobre este tema compromete la capacidad ciudadana de monitorear el cumplimiento de compromisos públicos y ejercer su derecho a la información.',
    marcos: [
      {
        principio: 'Transparencia en la gobernanza de datos',
        cita: 'Governance processes, methodologies, and rationales are open, understandable, and accessible to relevant stakeholders — essential for upholding the human right to seek, receive, and impart information.',
        fuente: 'Data Governance Toolkit, UNESCO/ITU/UNDP, 2025',
      },
      {
        principio: 'Calidad y accesibilidad estadística',
        cita: 'Los marcos de aseguramiento de calidad establecen que los datos oficiales deben ser relevantes, precisos, oportunos y accesibles para fundamentar políticas públicas y garantizar la rendición de cuentas democrática.',
        fuente: 'UN National Quality Assurance Frameworks Manual, ONU DESA, 2019',
      },
      {
        principio: 'Propósito definido y responsabilidad',
        cita: 'All governance decisions should be made with a clear, legitimate, and specific purpose in mind, and decision-makers should be clearly identified and held answerable for outcomes and impacts.',
        fuente: 'Data Governance Toolkit, UNESCO/ITU/UNDP, 2025',
      },
    ],
    acciones: [
      'Identificar qué institución pública tiene la obligación de producir estos datos y solicitar formalmente su publicación bajo marcos de datos abiertos.',
      'Documentar la brecha en informes de cumplimiento de los ODS para fortalecer la rendición de cuentas ante organismos internacionales.',
      'Solicitar microdatos desagregados por género bajo licencias FAIR/CARE para habilitar análisis independiente de la sociedad civil.',
    ],
    keywords: ['estadística', 'oficial', 'gobierno', 'abierto', 'transparencia', 'rendición', 'público', 'nacional', 'ministerio', 'instituto', 'censos', 'registro', 'administrativo'],
  },

  'DDHH': {
    titulo: 'Diagnóstico desde Derechos Humanos',
    framing: 'Desde una perspectiva de derechos humanos, la ausencia de estos datos compromete la capacidad del Estado de cumplir sus obligaciones de producir evidencia sobre el goce efectivo de derechos. Las brechas de datos no son neutras: invisibilizan a personas y comunidades, impiden el diseño de políticas reparadoras y debilitan los mecanismos de supervisión internacional.',
    marcos: [
      {
        principio: 'Participación e consentimiento informado',
        cita: 'All groups of interest should be involved, including those that are vulnerable and marginalized, and participation should be free, open, equitable, accessible, and transparent. Individuals should provide informed and voluntary consent before their data are collected.',
        fuente: 'Copenhagen Framework on Citizen Data, UN Statistical Commission, 2024',
      },
      {
        principio: 'Producción ética y segura',
        cita: 'Protection of human rights, safety and wellbeing should be a primary concern throughout the data value chain. Data producers are accountable for upholding human rights in their operations and for the impact of their data collection operations.',
        fuente: 'Copenhagen Framework on Citizen Data, UN Statistical Commission, 2024',
      },
      {
        principio: 'Gobernanza centrada en las personas',
        cita: 'Prioritizing the needs, rights, well-being, and interests of individuals and communities throughout the governance process explicitly places human dignity and fundamental freedoms at the core of data governance design.',
        fuente: 'Data Governance Toolkit, UNESCO/ITU/UNDP, 2025',
      },
    ],
    acciones: [
      'Vincular esta brecha con obligaciones específicas del Estado bajo tratados internacionales de DDHH (CEDAW, Protocolo de Montevideo u otros aplicables).',
      'Proponer protocolos de recolección de datos con participación de comunidades afectadas y garantías de consentimiento informado libre y previo.',
      'Documentar el impacto de la ausencia de datos en el goce efectivo de derechos para mecanismos de supervisión como el EPU o los comités CEDAW.',
    ],
    keywords: ['género', 'violencia', 'salud', 'reproductiva', 'discriminación', 'derechos', 'mujeres', 'interseccionalidad', 'comunidad', 'vulnerabilidad', 'migrante', 'indígena', 'justicia', 'litigios', 'femicidio'],
  },

  'Cooperación Digital': {
    titulo: 'Diagnóstico para Cooperación Digital',
    framing: 'En el contexto de la cooperación internacional para la gobernanza digital y los datos, esta brecha identifica áreas prioritarias donde se requiere apoyo técnico y financiero. Los Principios para el Desarrollo Digital 2024, avalados por más de 300 organizaciones, ofrecen un marco compartido para orientar estas inversiones hacia impactos equitativos y sostenibles.',
    marcos: [
      {
        principio: 'P6: Establecer prácticas de datos que prioricen a las personas',
        cita: 'Las prácticas de datos centradas en las personas priorizan la transparencia, el consentimiento y los espacios de debate, y permiten que las personas y las comunidades conserven el control de sus propios datos y obtengan valor de ellos.',
        fuente: 'Principios para el Desarrollo Digital, 2024',
      },
      {
        principio: 'P4: Diseñar para la inclusión',
        cita: 'Considerar todo el rango de diversidad humana para maximizar el impacto y mitigar el daño. Aprovechar la oportunidad de que las iniciativas digitales impulsen el progreso social desmantelando barreras sistémicas relacionadas con el género, la discapacidad, los ingresos y la geografía.',
        fuente: 'Principios para el Desarrollo Digital, 2024',
      },
      {
        principio: 'P9: Usar evidencia para mejorar los resultados',
        cita: 'Usar evidencia para informar el diseño, la implementación, el seguimiento y la evaluación de los programas, y compartir los resultados para que otros puedan aprender e iterar a partir de ellos.',
        fuente: 'Principios para el Desarrollo Digital, 2024',
      },
    ],
    acciones: [
      'Incorporar esta brecha en el mapeo de necesidades para iniciativas de cooperación técnica regional y financiamiento de donantes.',
      'Compartir la metodología de identificación de brechas con organizaciones cooperantes bajo el Principio 2: Compartir, reutilizar y mejorar.',
      'Usar los datos identificados como evidencia base para propuestas de co-diseño de soluciones con comunidades (Principio 3: Diseñar junto con la gente).',
    ],
    keywords: ['tecnología', 'digital', 'sistema', 'plataforma', 'datos', 'interoperabilidad', 'infraestructura', 'algoritmo', 'software', 'TIC', 'conectividad', 'inteligencia artificial', 'cooperación'],
  },

  'Gobernanza Cooperativa': {
    titulo: 'Diagnóstico para Gobernanza Cooperativa',
    framing: 'Bajo un modelo de datos cooperativos y gobernanza ciudadana, esta brecha señala la oportunidad de que las propias comunidades produzcan y controlen los datos que las representan. El Marco de Copenhague sobre Datos Ciudadanos reconoce que cuando las comunidades lideran la recolección con plena agencia colectiva, generan evidencia que los sistemas oficiales raramente producen.',
    marcos: [
      {
        principio: 'Autodeterminación de las comunidades en los datos',
        cita: 'Communities initiate and lead decision-making in design and data collection, showcasing collective agency. They actively control the entire data process with grassroots-level influence, avoiding imposition from above.',
        fuente: 'Copenhagen Framework on Citizen Data — Nivel 5 de participación ciudadana, UN Statistical Commission, 2024',
      },
      {
        principio: 'Relevancia comunitaria',
        cita: 'Data collected should directly respond to the issues identified or valued by the citizens or the organizations (community level and/or CSO) representing them.',
        fuente: 'Copenhagen Framework on Citizen Data, Principio 2, UN Statistical Commission, 2024',
      },
      {
        principio: 'Acción cívica y datos comunitarios',
        cita: 'Civic action initiatives are fully driven, generated and owned by the citizens/communities/CSOs, with citizen engagement at the highest level: self determination of citizens and communities.',
        fuente: 'Copenhagen Framework on Citizen Data, UN Statistical Commission, 2024',
      },
    ],
    acciones: [
      'Organizar un proceso participativo de recolección de datos liderado por la comunidad afectada, alcanzando el Nivel 4–5 de la escala de participación ciudadana del Marco de Copenhague.',
      'Establecer acuerdos de gobernanza que garanticen que la comunidad controle el acceso y uso de los datos recolectados bajo principios cooperativos.',
      'Publicar los resultados como datos abiertos bajo licencias que reconozcan la autoría colectiva y protejan los derechos de las comunidades productoras.',
    ],
    keywords: ['comunidad', 'cooperativa', 'colectivo', 'organización', 'sociedad civil', 'participación', 'ciudadana', 'gobernanza', 'OSC', 'cooperativismo', 'autogestión', 'barrio', 'territorial'],
  },
}

function scoreDataset(titulo: string, subtema: string | undefined, keywords: string[]): number {
  const text = `${titulo} ${subtema ?? ''}`.toLowerCase()
  return keywords.reduce((acc, kw) => acc + (text.includes(kw.toLowerCase()) ? 1 : 0), 0)
}

export function Diagnostico() {
  const location = useLocation()
  const state = location.state as DiagnosticoState | null

  useEffect(() => {
    if (state) {
      const t = setTimeout(() => window.print(), 600)
      return () => clearTimeout(t)
    }
  }, [state])

  if (!state) {
    return (
      <div className="diagnostico-page">
        <Link to="/brechas" className="diagnostico-back">← Volver al motor</Link>
        <p style={{ fontFamily: 'var(--mono)', fontSize: 13, color: 'var(--ink-light)' }}>
          No hay diagnóstico para mostrar.
        </p>
      </div>
    )
  }

  const { resultado, query, chips } = state
  const pct = Math.round(resultado.score * 100)

  const reportTitulo = chips.length === 1
    ? CHIP_CONTEXT[chips[0]]?.titulo ?? 'Diagnóstico de incidencia'
    : chips.length > 1
      ? `Diagnóstico de incidencia — ${chips.join(', ')}`
      : 'Diagnóstico de incidencia'

  const chipContexts = chips.map(c => CHIP_CONTEXT[c]).filter(Boolean) as ChipContext[]

  const combinedKeywords = [...new Set(chipContexts.flatMap(c => c.keywords))]

  const sortedDatasets = combinedKeywords.length > 0
    ? [...resultado.datasets].sort((a, b) =>
        scoreDataset(b.titulo, (b as { subtema?: string }).subtema, combinedKeywords)
        - scoreDataset(a.titulo, (a as { subtema?: string }).subtema, combinedKeywords)
      )
    : resultado.datasets

  const allMarcos = chipContexts.flatMap(c => c.marcos)
  const allAcciones = chipContexts.flatMap(c => c.acciones)

  const colorMap: Record<string, string> = {
    critica: 'var(--gap-crit)',
    parcial: 'var(--gap-part)',
    cubierta: 'var(--gap-cov)',
  }
  const color = colorMap[resultado.categoria]

  return (
    <div className="diagnostico-page">
      <Link to="/brechas" className="diagnostico-back">← Volver al motor</Link>

      <div className="diagnostico-logo">
        Infra<span>.</span>Coop
      </div>
      <h1 style={{ fontFamily: 'var(--serif)', fontSize: '1.6rem', marginBottom: '0.25rem', color: 'var(--ink)' }}>
        {reportTitulo}
      </h1>
      <p style={{ fontFamily: 'var(--mono)', fontSize: '11px', color: 'var(--ink-light)', marginBottom: '1.5rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
        Diagnóstico · {chips.join(' · ')}
      </p>

      <div className="diagnostico-query">"{query}"</div>

      <div className="diagnostico-score-row">
        <div>
          <div className="diagnostico-score-num" style={{ color }}>{pct}</div>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--ink-light)', textTransform: 'uppercase', letterSpacing: '.08em' }}>
            score de brecha
          </div>
        </div>
        <span className={`gap-category-badge ${resultado.categoria}`} style={{ alignSelf: 'flex-start' }}>
          ● {resultado.categoria}
        </span>
        <div style={{ marginLeft: 'auto', fontFamily: 'var(--mono)', fontSize: 13, color: 'var(--ink-light)', lineHeight: 1.6 }}>
          <div>Ag. Tecnológica: <strong style={{ color: 'var(--agenda-tec)' }}>{resultado.agendas.tecnologica}</strong></div>
          <div>Ag. de Datos: <strong style={{ color: 'var(--agenda-datos)' }}>{resultado.agendas.datos}</strong></div>
          <div>Ag. de Género: <strong style={{ color: 'var(--agenda-genero)' }}>{resultado.agendas.genero}</strong></div>
        </div>
      </div>

      {chips.length > 0 && (
        <div style={{ marginBottom: '1.75rem', padding: '1rem 1.25rem', background: 'var(--accent-bg, #EEEDFE)', borderRadius: 'var(--r)', borderLeft: '3px solid var(--accent)' }}>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 12, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--accent)', marginBottom: '.6rem' }}>
            Agenda de incidencia
          </div>
          <div className="diagnostico-chips-row" style={{ marginBottom: chipContexts.length > 0 ? '.75rem' : 0 }}>
            {chips.map(c => <span key={c} className="diagnostico-chip">{c}</span>)}
          </div>
          {chipContexts.map((ctx, i) => (
            <p key={i} style={{ fontSize: 15, lineHeight: 1.65, color: 'var(--ink-mid)', marginTop: i > 0 ? '.5rem' : 0 }}>
              {ctx.framing}
            </p>
          ))}
        </div>
      )}

      {allMarcos.length > 0 && (
        <>
          <hr style={{ border: 'none', borderTop: '1px solid var(--ink-faint)', margin: '1.5rem 0' }} />
          <div className="diagnostico-section-title">Marcos de referencia</div>
          {allMarcos.map((m, i) => (
            <div key={i} className="diagnostico-marco">
              <div className="diagnostico-marco-principio">{m.principio}</div>
              <blockquote className="diagnostico-marco-cita">"{m.cita}"</blockquote>
              <div className="diagnostico-marco-fuente">{m.fuente}</div>
            </div>
          ))}
        </>
      )}

      <hr style={{ border: 'none', borderTop: '1px solid var(--ink-faint)', margin: '1.5rem 0' }} />
      <div className="diagnostico-section-title">Datasets disponibles</div>
      {sortedDatasets.length === 0
        ? <p style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--ink-light)' }}>Sin datasets relacionados</p>
        : sortedDatasets.map(hit => (
          <div key={hit.id} className="diagnostico-hit">
            <div className="diagnostico-hit-title">{hit.titulo}</div>
            <div className="diagnostico-hit-meta">
              {[hit.fuente, hit.pais, hit.anio].filter(Boolean).join(' · ')}
            </div>
          </div>
        ))
      }

      <hr style={{ border: 'none', borderTop: '1px solid var(--ink-faint)', margin: '1.5rem 0' }} />
      <div className="diagnostico-section-title">Marcos normativos</div>
      {resultado.normativas.length === 0
        ? <p style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--ink-light)' }}>Sin normativas relacionadas</p>
        : resultado.normativas.map(hit => (
          <div key={hit.id} className="diagnostico-hit">
            <div className="diagnostico-hit-title">{hit.titulo}</div>
            <div className="diagnostico-hit-meta">
              {[hit.fuente, hit.pais].filter(Boolean).join(' · ')}
            </div>
          </div>
        ))
      }

      {allAcciones.length > 0 && (
        <>
          <hr style={{ border: 'none', borderTop: '1px solid var(--ink-faint)', margin: '1.5rem 0' }} />
          <div className="diagnostico-section-title">Acciones recomendadas</div>
          <ol className="diagnostico-acciones">
            {allAcciones.map((a, i) => (
              <li key={i} className="diagnostico-accion">{a}</li>
            ))}
          </ol>
        </>
      )}

      <div className="diagnostico-footer">
        <span>Data Cooperativas Latinas · Mozilla Fellowship 2024–2026</span>
        <span>Infra.Coop Motor de Brechas v0.4</span>
      </div>
    </div>
  )
}
