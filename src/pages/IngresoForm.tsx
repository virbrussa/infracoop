import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Layout } from '../components/Layout'
import { submitFormulario, submitNormativa, updateEmbedding } from '../services/dataService'
import { useEmbedder } from '../context/EmbedderContext'
import { useAuth } from '../context/AuthContext'
import type { FormularioData, NormativaFormData } from '../types'

type TipoIngreso = 'dataset' | 'normativa'
type FormStatus = 'idle' | 'loading' | 'success' | 'error'
type FieldErrors = Record<string, string>

const AGENDAS = ['Ag. Tecnológica', 'Ag. Datos', 'Ag. Género']
const CURRENT_YEAR = new Date().getFullYear()

const EMPTY_DATASET: FormularioData = {
  titulo: '', fuente_organismo: '', pais_iso3: '', anio_publicacion: null,
  subtema: '', agendas: [], frecuencia: '', desagregacion_geo: '',
  accesibilidad_formato: '', url_descarga: '', descripcion_notas: '', ingresado_por: '',
}

const EMPTY_NORMATIVA: NormativaFormData = {
  nombre: '', organismo_emisor: '', tipo: '', pais_alcance: '', anio_adopcion: null,
  articulo_numeral: '', obligacion_datos: '', agendas: [],
  url_texto_oficial: '', descripcion_notas: '', ingresado_por: '',
}

export function IngresoForm() {
  const [tipo, setTipo] = useState<TipoIngreso>('dataset')
  const [datasetData, setDatasetData] = useState<FormularioData>(EMPTY_DATASET)
  const [normativaData, setNormativaData] = useState<NormativaFormData>(EMPTY_NORMATIVA)
  const [status, setStatus] = useState<FormStatus>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [errors, setErrors] = useState<FieldErrors>({})
  const [emailContacto, setEmailContacto] = useState('')
  const [aportadoPor, setAportadoPor] = useState('')
  const { status: embedderStatus, embed } = useEmbedder()
  const { perfil } = useAuth()
  const navigate = useNavigate()
  const modo: 'directo' | 'revision' = perfil?.rol === 'admin' ? 'directo' : 'revision'

  function clearError(field: string) {
    setErrors(prev => { const next = { ...prev }; delete next[field]; return next })
  }

  function validate(): boolean {
    const errs: FieldErrors = {}
    if (tipo === 'dataset') {
      if (datasetData.titulo.trim().length < 5) errs.titulo = 'Mínimo 5 caracteres'
      if (datasetData.fuente_organismo && datasetData.fuente_organismo.trim().length < 3) errs.fuente_organismo = 'Mínimo 3 caracteres'
      if (datasetData.pais_iso3 && !/^[A-Z]{3}$/.test(datasetData.pais_iso3)) errs.pais_iso3 = '3 letras mayúsculas (ej. ARG)'
      if (datasetData.anio_publicacion != null && (datasetData.anio_publicacion < 1900 || datasetData.anio_publicacion > CURRENT_YEAR))
        errs.anio_publicacion = `Entre 1900 y ${CURRENT_YEAR}`
      if (datasetData.subtema && datasetData.subtema.trim().length < 3) errs.subtema = 'Mínimo 3 caracteres'
    } else {
      if (normativaData.nombre.trim().length < 5) errs.nombre = 'Mínimo 5 caracteres'
      if (normativaData.organismo_emisor && normativaData.organismo_emisor.trim().length < 3) errs.organismo_emisor = 'Mínimo 3 caracteres'
      if (normativaData.anio_adopcion != null && (normativaData.anio_adopcion < 1900 || normativaData.anio_adopcion > CURRENT_YEAR))
        errs.anio_adopcion = `Entre 1900 y ${CURRENT_YEAR}`
    }
    if (!emailContacto.trim()) {
      errs.emailContacto = 'El email de contacto es obligatorio'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailContacto.trim())) {
      errs.emailContacto = 'Ingresa un email válido'
    }
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  function handleAgendasChange(agenda: string, checked: boolean, isDataset: boolean) {
    if (isDataset) {
      setDatasetData(prev => ({
        ...prev,
        agendas: checked ? [...prev.agendas, agenda] : prev.agendas.filter(a => a !== agenda),
      }))
    } else {
      setNormativaData(prev => ({
        ...prev,
        agendas: checked ? [...prev.agendas, agenda] : prev.agendas.filter(a => a !== agenda),
      }))
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return
    const ingresadoPorCompuesto = aportadoPor.trim()
      ? `${emailContacto.trim()} | ${aportadoPor.trim()}`
      : emailContacto.trim()
    setStatus('loading')
    setErrorMsg('')
    try {
      let insertedId: string | null = null
      if (tipo === 'dataset') {
        insertedId = await submitFormulario(
          { ...datasetData, ingresado_por: ingresadoPorCompuesto },
          modo
        )
      } else {
        insertedId = await submitNormativa(
          { ...normativaData, ingresado_por: ingresadoPorCompuesto },
          modo
        )
      }
      setStatus('success')

      if (modo === 'directo' && insertedId && embedderStatus === 'ready') {
        const tabla = tipo === 'dataset' ? 'datasets' : 'normativas'
        const text = tipo === 'dataset'
          ? `${datasetData.titulo} ${datasetData.subtema} ${datasetData.descripcion_notas}`
          : `${normativaData.nombre} ${normativaData.obligacion_datos} ${normativaData.descripcion_notas}`
        embed(text)
          .then(vec => updateEmbedding(tabla, insertedId!, Array.from(vec)))
          .catch(() => {})
      }
    } catch (err) {
      setStatus('error')
      setErrorMsg(err instanceof Error ? err.message : 'Error desconocido')
    }
  }

  function handleReset() {
    setDatasetData(EMPTY_DATASET)
    setNormativaData(EMPTY_NORMATIVA)
    setStatus('idle')
    setErrorMsg('')
    setErrors({})
    setEmailContacto('')
    setAportadoPor('')
  }

  const currentAgendas = tipo === 'dataset' ? datasetData.agendas : normativaData.agendas

  return (
    <Layout>
      <div style={{ maxWidth: 680, margin: '0 auto', padding: '2rem 1rem' }}>
        <div className="section-label" style={{ marginBottom: '1.5rem' }}>
          <span>05 · Ingresar datos</span>
        </div>
        <h1 style={{ fontFamily: 'var(--serif)', fontSize: '2rem', marginBottom: '0.5rem' }}>
          Sube tu aporte a Infra.Coop
        </h1>
        <p style={{ color: 'var(--ink-mid)', fontSize: '14px', marginBottom: '2rem', lineHeight: 1.65 }}>
          Puedes colaborar compartiendo un enlace a un dataset (datos abiertos, estadísticos u otros)
          o una normativa perteneciente a la temática del proyecto.
          Los envíos pasarán por una instancia de curaduría antes de ser parte de la Base de Datos.
        </p>

        {/* Type selector */}
        <div style={{ display: 'flex', gap: 8, marginBottom: '2rem' }}>
          {(['dataset', 'normativa'] as TipoIngreso[]).map(t => (
            <button
              key={t}
              type="button"
              className={tipo === t ? 'btn-primary' : 'btn-ghost'}
              onClick={() => { setTipo(t); setStatus('idle'); setErrorMsg(''); setErrors({}) }}
              style={{ textTransform: 'capitalize' }}
            >
              {t === 'dataset' ? 'Dataset' : 'Normativa'}
            </button>
          ))}
        </div>

        {status === 'success' ? (
          <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
            <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>✓</div>
            <p style={{ fontFamily: 'var(--serif)', fontSize: '1.25rem', marginBottom: '0.5rem' }}>
              {tipo === 'dataset' ? 'Dataset' : 'Normativa'} recibido
            </p>
            <p style={{ color: 'var(--ink-mid)', fontSize: '14px', marginBottom: '1.5rem' }}>
              {modo === 'revision'
                ? 'Está en cola de revisión. El equipo curatorial lo evaluará pronto.'
                : 'Se publicó directamente en el corpus.'}
            </p>
            <button className="btn-ghost" onClick={handleReset}>Ingresar otro</button>
          </div>
        ) : (
          <form className="card" onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {tipo === 'dataset' ? (
              <DatasetFields data={datasetData} onChange={setDatasetData} agendas={currentAgendas} onAgendasChange={(a, c) => handleAgendasChange(a, c, true)} errors={errors} clearError={clearError} />
            ) : (
              <NormativaFields data={normativaData} onChange={setNormativaData} agendas={currentAgendas} onAgendasChange={(a, c) => handleAgendasChange(a, c, false)} errors={errors} clearError={clearError} />
            )}

            {/* Campos de contacto y atribución — shared */}
            <Field label="Información de contacto (Email)" required error={errors.emailContacto}>
              <input
                style={errors.emailContacto ? inputErrorStyle : inputStyle}
                type="email"
                placeholder="tu@email.com"
                value={emailContacto}
                onChange={e => { setEmailContacto(e.target.value); clearError('emailContacto') }}
              />
            </Field>

            <Field label="Dataset aportado por (alias, organización o nombre — opcional)">
              <input
                style={inputStyle}
                type="text"
                placeholder="Ej. Mi Organización"
                value={aportadoPor}
                onChange={e => setAportadoPor(e.target.value)}
              />
            </Field>

            <p style={{ fontSize: 12, color: 'var(--ink-light)', fontFamily: 'var(--mono)', marginTop: '-0.5rem' }}>
              Todas las contribuciones serán debidamente reconocidas.
            </p>

            {status === 'error' && (
              <p style={{ color: 'var(--gap-crit)', fontSize: '13px', fontFamily: 'var(--mono)' }}>
                Error: {errorMsg}
              </p>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button type="submit" className="btn-primary" disabled={status === 'loading'}>
                {status === 'loading' ? 'Enviando…' : 'Enviar'}
              </button>
            </div>
          </form>
        )}
      </div>
      {!perfil && (
        <button
          onClick={() => navigate('/login')}
          style={{
            position: 'fixed', bottom: '2rem', right: '2rem',
            background: 'white', color: 'var(--ink-light)',
            border: '1px solid var(--ink-faint)', borderRadius: '9999px',
            padding: '8px 16px',
            fontFamily: 'var(--mono)', fontSize: '11px',
            cursor: 'pointer', zIndex: 100,
          }}
        >
          Acceso admin →
        </button>
      )}
      {perfil?.rol === 'admin' && (
        <button
          onClick={() => navigate('/revisar')}
          style={{
            position: 'fixed', bottom: '2rem', right: '2rem',
            background: 'var(--accent)', color: 'white',
            border: 'none', borderRadius: '9999px',
            padding: '10px 20px',
            fontFamily: 'var(--mono)', fontSize: '12px', fontWeight: 500,
            cursor: 'pointer', zIndex: 100,
            boxShadow: '0 2px 12px rgba(83,74,183,.35)',
          }}
        >
          Cola de revisión →
        </button>
      )}
    </Layout>
  )
}

// ── Sub-components ───────────────────────────────────────────────────────────

interface FieldProps {
  label: string
  required?: boolean
  error?: string
  children: React.ReactNode
}

function Field({ label, required, error, children }: FieldProps) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <span style={{ fontSize: '11px', fontFamily: 'var(--mono)', color: 'var(--ink-mid)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
        {label}{required && <span style={{ color: 'var(--gap-crit)' }}> *</span>}
      </span>
      {children}
      {error && (
        <span style={{ fontSize: '11px', color: 'var(--gap-crit)', fontFamily: 'var(--mono)' }}>
          {error}
        </span>
      )}
    </label>
  )
}

const inputStyle: React.CSSProperties = {
  fontFamily: 'var(--sans)',
  fontSize: '14px',
  background: 'var(--paper-warm)',
  border: '1px solid var(--ink-faint)',
  borderRadius: 'var(--r)',
  padding: '8px 12px',
  color: 'var(--ink)',
  width: '100%',
}

const inputErrorStyle: React.CSSProperties = {
  ...inputStyle,
  border: '1px solid var(--gap-crit)',
}

interface DatasetFieldsProps {
  data: FormularioData
  onChange: React.Dispatch<React.SetStateAction<FormularioData>>
  agendas: string[]
  onAgendasChange: (agenda: string, checked: boolean) => void
  errors: FieldErrors
  clearError: (field: string) => void
}

function DatasetFields({ data, onChange, agendas, onAgendasChange, errors, clearError }: DatasetFieldsProps) {
  function set(field: keyof FormularioData) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      onChange(prev => ({ ...prev, [field]: e.target.value }))
      clearError(field)
    }
  }

  return (
    <>
      <Field label="Título" required error={errors.titulo}>
        <input style={errors.titulo ? inputErrorStyle : inputStyle} type="text" value={data.titulo} onChange={set('titulo')} />
      </Field>
      <Field label="Fuente / Organismo" error={errors.fuente_organismo}>
        <input style={errors.fuente_organismo ? inputErrorStyle : inputStyle} type="text" value={data.fuente_organismo} onChange={set('fuente_organismo')} />
      </Field>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <Field label="País (ISO3)" error={errors.pais_iso3}>
          <input
            style={errors.pais_iso3 ? inputErrorStyle : inputStyle}
            type="text"
            maxLength={3}
            placeholder="ARG"
            value={data.pais_iso3}
            onChange={e => {
              onChange(prev => ({ ...prev, pais_iso3: e.target.value.toUpperCase().replace(/[^A-Z]/g, '') }))
              clearError('pais_iso3')
            }}
          />
        </Field>
        <Field label="Año publicación" error={errors.anio_publicacion}>
          <input
            style={errors.anio_publicacion ? inputErrorStyle : inputStyle}
            type="number" min={1900} max={CURRENT_YEAR}
            value={data.anio_publicacion ?? ''}
            onChange={e => {
              onChange(prev => ({ ...prev, anio_publicacion: e.target.value ? parseInt(e.target.value) : null }))
              clearError('anio_publicacion')
            }}
          />
        </Field>
      </div>
      <Field label="Subtema" error={errors.subtema}>
        <input style={errors.subtema ? inputErrorStyle : inputStyle} type="text" value={data.subtema} onChange={set('subtema')} />
      </Field>
      <AgendasCheckboxes selected={agendas} onChange={onAgendasChange} />
      <Field label="Frecuencia">
        <input style={inputStyle} type="text" value={data.frecuencia} onChange={set('frecuencia')} />
      </Field>
      <Field label="Desagregación geográfica">
        <input style={inputStyle} type="text" value={data.desagregacion_geo} onChange={set('desagregacion_geo')} />
      </Field>
      <Field label="Accesibilidad / Formato">
        <input style={inputStyle} type="text" value={data.accesibilidad_formato} onChange={set('accesibilidad_formato')} />
      </Field>
      <Field label="URL de descarga">
        <input style={inputStyle} type="url" value={data.url_descarga} onChange={set('url_descarga')} />
      </Field>
      <Field label="Descripción / Notas">
        <textarea style={{ ...inputStyle, minHeight: 80, resize: 'vertical' }} value={data.descripcion_notas} onChange={set('descripcion_notas')} />
      </Field>
    </>
  )
}

interface NormativaFieldsProps {
  data: NormativaFormData
  onChange: React.Dispatch<React.SetStateAction<NormativaFormData>>
  agendas: string[]
  onAgendasChange: (agenda: string, checked: boolean) => void
  errors: FieldErrors
  clearError: (field: string) => void
}

function NormativaFields({ data, onChange, agendas, onAgendasChange, errors, clearError }: NormativaFieldsProps) {
  function set(field: keyof NormativaFormData) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      onChange(prev => ({ ...prev, [field]: e.target.value }))
      clearError(field)
    }
  }

  return (
    <>
      <Field label="Nombre" required error={errors.nombre}>
        <input style={errors.nombre ? inputErrorStyle : inputStyle} type="text" value={data.nombre} onChange={set('nombre')} />
      </Field>
      <Field label="Organismo emisor" error={errors.organismo_emisor}>
        <input style={errors.organismo_emisor ? inputErrorStyle : inputStyle} type="text" value={data.organismo_emisor} onChange={set('organismo_emisor')} />
      </Field>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <Field label="Tipo">
          <input style={inputStyle} type="text" value={data.tipo} onChange={set('tipo')} />
        </Field>
        <Field label="País de alcance">
          <input style={inputStyle} type="text" value={data.pais_alcance} onChange={set('pais_alcance')} />
        </Field>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <Field label="Año adopción" error={errors.anio_adopcion}>
          <input
            style={errors.anio_adopcion ? inputErrorStyle : inputStyle}
            type="number" min={1900} max={CURRENT_YEAR}
            value={data.anio_adopcion ?? ''}
            onChange={e => {
              onChange(prev => ({ ...prev, anio_adopcion: e.target.value ? parseInt(e.target.value) : null }))
              clearError('anio_adopcion')
            }}
          />
        </Field>
        <Field label="Artículo / Numeral">
          <input style={inputStyle} type="text" value={data.articulo_numeral} onChange={set('articulo_numeral')} />
        </Field>
      </div>
      <Field label="Obligación de datos">
        <textarea style={{ ...inputStyle, minHeight: 80, resize: 'vertical' }} value={data.obligacion_datos} onChange={set('obligacion_datos')} />
      </Field>
      <AgendasCheckboxes selected={agendas} onChange={onAgendasChange} />
      <Field label="URL texto oficial">
        <input style={inputStyle} type="url" value={data.url_texto_oficial} onChange={set('url_texto_oficial')} />
      </Field>
      <Field label="Descripción / Notas">
        <textarea style={{ ...inputStyle, minHeight: 80, resize: 'vertical' }} value={data.descripcion_notas} onChange={set('descripcion_notas')} />
      </Field>
    </>
  )
}

interface AgendasCheckboxesProps {
  selected: string[]
  onChange: (agenda: string, checked: boolean) => void
}

function AgendasCheckboxes({ selected, onChange }: AgendasCheckboxesProps) {
  return (
    <Field label="Agendas">
      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', paddingTop: 4 }}>
        {AGENDAS.map(ag => (
          <label key={ag} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '13px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={selected.includes(ag)}
              onChange={e => onChange(ag, e.target.checked)}
            />
            {ag}
          </label>
        ))}
      </div>
    </Field>
  )
}
