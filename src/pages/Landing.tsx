import { Layout } from '../components/Layout'
import { useLandingStats } from '../hooks/useLandingStats'

function Section({ eyebrow, title, children }: {
  eyebrow: string
  title: string
  children: React.ReactNode
}) {
  return (
    <section style={{ borderTop: '1px solid var(--ink-faint)', paddingTop: '2rem', marginTop: '2rem' }}>
      <p style={{ fontFamily: 'var(--mono)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--ink-light)', marginBottom: '.5rem' }}>
        {eyebrow}
      </p>
      <h2 style={{ fontFamily: 'var(--serif)', fontSize: 'clamp(1.4rem,3vw,1.9rem)', lineHeight: 1.15, letterSpacing: '-.02em', marginBottom: '1rem', color: 'var(--ink)' }}>
        {title}
      </h2>
      <div style={{ fontSize: 15, lineHeight: 1.85, color: 'var(--ink-mid)', maxWidth: 640 }}>
        {children}
      </div>
    </section>
  )
}

function FutureLayer({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '1.25rem' }}>
      <p style={{ fontFamily: 'var(--mono)', fontSize: 12, fontWeight: 600, color: 'var(--accent)', letterSpacing: '.04em', marginBottom: '.35rem' }}>
        ✦ {title}
      </p>
      <div style={{ paddingLeft: '1.25rem', fontSize: 14, color: 'var(--ink-mid)', lineHeight: 1.7 }}>
        {children}
      </div>
    </div>
  )
}

function StatsStrip({ datasets, normativas, preguntas, isLoading, error }: {
  datasets: number; normativas: number; preguntas: number; isLoading: boolean; error?: string | null
}) {
  if (error) {
    return (
      <div style={{ padding: '1.25rem 0', borderTop: '1px solid var(--ink-faint)', borderBottom: '1px solid var(--ink-faint)', marginBottom: '2rem' }}>
        <p style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-light)' }}>
          — estadísticas no disponibles —
        </p>
      </div>
    )
  }

  const items = [
    { num: datasets,   label: 'datasets en el corpus' },
    { num: normativas, label: 'marcos normativos' },
    { num: preguntas,  label: 'preguntas registradas' },
  ]
  return (
    <div style={{
      display: 'flex',
      gap: '2rem',
      flexWrap: 'wrap',
      padding: '1.25rem 0',
      borderTop: '1px solid var(--ink-faint)',
      borderBottom: '1px solid var(--ink-faint)',
      marginBottom: '2rem',
    }}>
      {items.map(({ num, label }) => (
        <div key={label}>
          <div style={{
            fontFamily: 'var(--serif)',
            fontSize: 'clamp(1.6rem, 4vw, 2.2rem)',
            lineHeight: 1,
            letterSpacing: '-0.03em',
            color: isLoading ? 'var(--ink-faint)' : 'var(--ink)',
            transition: 'color .3s',
          }}>
            {isLoading ? '—' : num.toLocaleString('es-MX')}
          </div>
          <div style={{
            fontFamily: 'var(--mono)',
            fontSize: 10,
            textTransform: 'uppercase',
            letterSpacing: '.1em',
            color: 'var(--ink-light)',
            marginTop: 4,
          }}>
            {label}
          </div>
        </div>
      ))}
    </div>
  )
}

export function Landing() {
  const { datasets, normativas, preguntas, isLoading, error: statsError } = useLandingStats()

  return (
    <Layout>
      <div style={{ maxWidth: 740, margin: '0 auto', padding: '3rem 1rem 6rem' }}>

        {/* Hero */}
        <div style={{ marginBottom: '2rem', paddingBottom: '2rem', borderBottom: '1px solid var(--ink-faint)' }}>
          <p style={{ fontFamily: 'var(--mono)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--ink-light)', marginBottom: '.75rem' }}>
            Infra.Coop
          </p>
          <h1 style={{ fontFamily: 'var(--serif)', fontSize: 'clamp(2rem,5vw,3rem)', lineHeight: 1.1, letterSpacing: '-.03em', marginBottom: '1rem' }}>
            ¿Qué es <em style={{ color: 'var(--accent)' }}>Infra.Coop</em>?
          </h1>
          <p style={{ fontSize: 16, lineHeight: 1.75, color: 'var(--ink)', maxWidth: 600 }}>
            Infra.Coop es la dimensión tecnosocial de{' '}
            <a
              href="https://datacooperativas.lat/"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: 'var(--accent)', textDecoration: 'underline', fontWeight: 600 }}
            >
              Data Cooperativas Latinas
            </a>
            . Una infraestructura digital inclusiva basada en los conceptos y modelo de gobernanza de datos cooperativos.
          </p>
        </div>

        {/* Live stats */}
        <StatsStrip
          datasets={datasets}
          normativas={normativas}
          preguntas={preguntas}
          isLoading={isLoading}
          error={statsError}
        />

        {/* Monitor de Brechas */}
        <Section eyebrow="01 · Monitor de Brechas" title="La pregunta como evidencia">
          <p style={{ marginBottom: '1rem' }}>
            El propósito es evidenciar el rol que juega la problematización situada, oportuna y real en el estado actual y futuro de los datos de género que queremos.
          </p>
          <p style={{ marginBottom: '1rem' }}>
            La pregunta como elemento inicial de un proceso que podemos llamar el Ciclo de Datos es vital para cambiar el estado de situación de las brechas, pero también para demostrar cómo —al integrar el conocimiento territorial, los problemas situados e interseccionales— el criterio de calidad de un dato se torna otro. Uno más acorde con los datos que necesitamos para visibilizar lo que falta, fortalecer lo que ya es un derecho o incidir en el devenir de la agenda pública.
          </p>
          <p>
            <strong>La(s) pregunta(s)</strong> como inquietud-acción disparadora enfatiza la urgencia, pertinencia y oportunidad de los datos cooperativos para contar con los <strong>datos que queremos</strong>.
          </p>
        </Section>

        {/* ¿Qué datos tenemos? */}
        <Section eyebrow="02 · Monitor Colectivo" title="¿Qué datos tenemos?">
          <p style={{ marginBottom: '1rem' }}>
            Al ingresar <strong>tu pregunta</strong> contribuyes a crear evidencia colectiva sobre el estado actual de la agenda común de datos de género, tecnología y de datos propiamente dichos.
          </p>
          <p style={{ marginBottom: '1rem' }}>
            En esta instancia se contrasta el aporte colectivo con dos elementos de la Base de Datos de Infra.Coop:
          </p>
          <p style={{ marginBottom: '.5rem', paddingLeft: '1rem', borderLeft: '2px solid var(--ink-faint)' }}>
            <strong>a)</strong> Por un lado sistematizamos datasets temáticos.
          </p>
          <p style={{ marginBottom: '1rem', paddingLeft: '1rem', borderLeft: '2px solid var(--ink-faint)' }}>
            <strong>b)</strong> Por otro lado curamos distintos marcos normativos vigentes a nivel nacional, regional e internacional inherentes a dicha agenda.
          </p>
          <p>
            A medida que se suman preguntas, el monitor colectivo visualizará los cambios en el estado de situación de los datos disponibles identificando brechas de distinta naturaleza.
          </p>
        </Section>

        {/* Los datos que queremos */}
        <Section eyebrow="03 · ¿Qué datos queremos?" title="Evolución de la demanda colectiva">
          <p style={{ marginBottom: '1rem' }}>
            La lupa está puesta en visibilizar la evolución desde los datos que tenemos a los datos que queremos.
          </p>
          <p>
            En esa evolución —giro— no sólo se exploran con evidencia las brechas, también se pone en debate qué es por tanto un dato de calidad. Ello en el contexto de evidencia disponible respecto a la fragmentación, escasez, falta de apertura y/o pertinencia de datos en la agenda de género.
          </p>
        </Section>

        {/* Futuras capas */}
        <Section eyebrow="En proceso" title="Las capas que vienen">
          <p style={{ marginBottom: '1.5rem' }}>
            Infracoop está pensada en capas de intervención-acción. El monitor es la primera capa pública del prototipo ideado en el marco de Data Cooperativas Latinas. A futuro se buscarán implementar otras capas tales como:
          </p>

          <FutureLayer title="Capa federada de nodos">
            <p>Comunidad de práctica y activación de Ciclos de Datos temáticos.</p>
          </FutureLayer>

          <FutureLayer title="Capa cooperativa de datos">
            <p>Espacio seguro para el intercambio de nuevos datos ciudadanos. Protocolo de gobernanza y niveles de cooperación.</p>
          </FutureLayer>
        </Section>

        {/* Otras ideas */}
        <section style={{ borderTop: '1px solid var(--ink-faint)', paddingTop: '2rem', marginTop: '2rem' }}>
          <p style={{ fontFamily: 'var(--mono)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--ink-light)', marginBottom: '1rem' }}>
            Otras ideas para Infra.Coop
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '.5rem' }}>
            {[
              'Simulador de intervenciones en el ciclo de datos de tu elección (OSC)',
              'Explorador de diagnósticos de incidencia para OSC, funcionarios públicos, organismos y activistas',
              'Sistematizador de evidencia: útil para áreas de litigio estratégico',
              'Creación de cuenta en la plataforma',
            ].map(idea => (
              <p key={idea} style={{ fontSize: 13, color: 'var(--ink-light)', fontFamily: 'var(--mono)', paddingLeft: '1rem', borderLeft: '1px solid var(--ink-faint)' }}>
                — {idea}
              </p>
            ))}
          </div>
          <p style={{ marginTop: '1.5rem', fontSize: 13, color: 'var(--ink-mid)', lineHeight: 1.7 }}>
            ¿Te interesa aportar o sugerir otras ideas?{' '}
            <a
              href="mailto:datacooperativas@gmail.com"
              style={{ color: 'var(--accent)', textDecoration: 'underline' }}
            >
              datacooperativas@gmail.com
            </a>
          </p>
        </section>

      </div>
    </Layout>
  )
}
