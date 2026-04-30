# Diagnóstico técnico — Infra.Coop Motor de Brechas v4

**Fecha:** Abril 2026  
**Archivo analizado:** `DOCTYPE html v4.html` (123.8 KB, ~1,710 líneas)  
**Estado:** Prototipo funcional de alta fidelidad — cero conexión real a datos

---

## Resumen ejecutivo

El archivo es un prototipo interactivo de una sola página que **simula completamente** el comportamiento de un sistema real. Tiene buena factura visual y una lógica cooperativa bien pensada. El problema es que no hay ninguna infraestructura real detrás: ni API, ni base de datos, ni autenticación, ni persistencia. Todo lo que el dashboard "hace" es teatro controlado por datos ficticios hardcodeados. Esto está bien para un prototipo de validación, pero hay que ser muy explícito sobre dónde termina la ficción y dónde debería empezar el sistema real.

---

## 1. Problemas estructurales del archivo

### 1.1 Todo en un solo archivo de 1.710 líneas
El archivo mezcla CSS (~300 líneas), HTML (~400 líneas) y JavaScript (~900 líneas) sin separación alguna. Esto hace que:
- Cualquier edición rompa accidentalmente otra sección
- Sea imposible trabajar en paralelo (dos personas editando el mismo archivo = conflictos constantes)
- El archivo sea ilegible para una persona no técnica que intente entender qué hace qué

**Para v4 producción:** Separar en al menos tres archivos (`styles.css`, `index.html`, `app.js`).

### 1.2 El nombre del archivo es técnicamente inválido
`DOCTYPE html v4.html` — tiene espacios, empieza con una palabra reservada de HTML, y no describe el contenido. Cualquier script o herramienta que lo procese necesita comillas escapadas. Renombrar a `infracoop-motor-v4.html` o mejor aún, `index.html` dentro de un directorio `infracoop/`.

### 1.3 Inline styles mezclados con clases CSS
El HTML mezcla `style="..."` directamente en los elementos con clases de la hoja de estilos. Esto crea dos sistemas de estilo en paralelo que se pisan entre sí. Hay bloques como:

```html
<div style="display:flex;gap:12px;background:white;border:1px solid var(--ink-faint);...">
```

con decenas de propiedades inline que deberían ser clases reutilizables. La mitad del mantenimiento visual de este archivo consiste en buscar esas cadenas de texto en el HTML.

### 1.4 Los colores están hardcodeados en JavaScript
Los valores hexadecimales del design system (`#0C447C`, `#72243E`, `#3C3489`, `#D4537E`, etc.) están duplicados en al menos 4 objetos JS distintos (`AGENDA_MONITOR_MOCK`, `agColors`, `INCIDENCIA_CONFIG`, `renderCapa3`). Si el diseño cambia un color, hay que encontrarlo y actualizarlo en múltiples lugares. Los colores están definidos correctamente como variables CSS en `:root` — el JS debería leerlos desde ahí con `getComputedStyle`.

---

## 2. El problema central: todo es simulación

### 2.1 La búsqueda de brechas es un `setTimeout` de 2.6 segundos

```javascript
await new Promise(r => setTimeout(r, 2600));
// ...
renderResults(matchQuery(pregunta));
```

La función `buscarBrecha()` espera 2.6 segundos (para simular latencia de red) y luego llama a `matchQuery()`, que es un `if/else` de 5 ramas basado en palabras clave:

```javascript
function matchQuery(q) {
  if (q.includes('abort') || q.includes('rural')) return DATOS_MOCK["aborto seguro..."];
  if (q.includes('ausencia') || q.includes('gestante')...) return DATOS_MOCK["ausencias..."];
  if (q.includes('nom') || q.includes('046')) return DATOS_MOCK["nom 046"];
  if (q.includes('barrio') || ...) return DATOS_MOCK["servicios salud barrio"];
  if (q.includes('feminicidio') || q.includes('estado')) return DATOS_MOCK["feminicidio estados"];
  // Si no matchea nada → resultado ALEATORIO
  const keys = Object.keys(DATOS_MOCK);
  return DATOS_MOCK[keys[Math.floor(Math.random() * keys.length)]];
}
```

**Esto significa:** cualquier pregunta que no contenga esas palabras exactas devuelve un resultado al azar. Una pregunta sobre "desempleo femenino" puede devolver el análisis de "aborto seguro en municipios rurales". El score, los datasets y los marcos normativos que aparecen no tienen ninguna relación con la pregunta ingresada.

### 2.2 Los 5 escenarios mock están sesgados hacia México
Todos los datasets y frameworks en `DATOS_MOCK` son exclusivamente mexicanos (INEGI, SEDESA, DGIS, SSA México, SESNSP, etc.). El dashboard promete cobertura latinoamericana y permite filtrar por Argentina, Colombia, Chile, Guatemala y Perú — pero ningunos de esos países aparecen en los resultados reales.

### 2.3 Los scores por agenda son generados aleatoriamente

```javascript
const agendaScores = {
  tecnologica: Math.min(100, Math.round(pct * (0.75 + Math.random() * 0.35))),
  datos:        Math.min(100, Math.round(pct * (0.80 + Math.random() * 0.30))),
  genero:       Math.min(100, Math.round(pct * (0.90 + Math.random() * 0.20)))
};
```

Los tres scores de agenda (Tecnológica, Datos, Género) que aparecen en la tarjeta de resultado son multiplicaciones del score total por un número aleatorio. Cada vez que se hace la misma búsqueda, los scores cambian. Esto es profundamente engañoso en una herramienta que pretende evidenciar datos.

### 2.4 El Monitor Colectivo es estático
`MAPA_MOCK` y `AGENDA_MONITOR_MOCK` son arrays hardcodeados con números fijos. El "+8 preguntas esta semana" en la Agenda Tecnológica siempre dice 8. No cambia aunque el usuario ingrese 50 preguntas. La única variable que sí se actualiza es el contador de sesión (`contadorPreguntas`), pero ese no está conectado a los números del monitor colectivo.

### 2.5 La evolución semanal (Capa3) es inventada

`EVOLUCION_MOCK` contiene 5 semanas de datos completamente fabricados:
- Semana 1: 18 preguntas, 47 brechas críticas
- Semana 4: 90 preguntas, 71 brechas críticas

Estos números no tienen ninguna relación con las preguntas que el usuario ingresó. El gráfico de barras siempre muestra la misma progresión independientemente de lo que haya pasado en la sesión.

---

## 3. Funciones que no funcionan (o no hacen lo que dicen)

### 3.1 Los filtros son decorativos
Los tres `<select>` de filtros (Agenda, País, Calidad) están en el HTML y se ven funcionales, pero **no están conectados a ninguna función**. No afectan los resultados de `buscarBrecha()` ni filtran los datasets mostrados. Sus valores nunca son leídos por ningún código.

### 3.2 "Descargar PDF" y "Descargar JPG" abren una ventana de impresión
```javascript
function capturarYDescargar(elemento, nombre, tipo) {
  const w = window.open('', '_blank');
  w.document.write(`...${elemento.innerHTML}...`);
  setTimeout(() => { w.print(); }, 600);
  showToast('Abriendo vista de impresión — guardá como PDF o imagen');
}

function descargarComoPDF(elemento, nombre) {
  capturarYDescargar(elemento, nombre + '.pdf', 'application/pdf'); // el tipo MIME es ignorado
}
```

Ambas funciones hacen lo mismo: abrir un popup con el HTML del elemento y llamar a `window.print()`. No se genera ningún archivo. El parámetro `tipo` (que sería `'image/jpeg'` o `'application/pdf'`) nunca se usa. El nombre de archivo pasado tampoco. **En browsers con popups bloqueados, la función simplemente muestra un toast de error y no hace nada.**

### 3.3 `exportarBrecha()` es un stub vacío
```javascript
function exportarBrecha() {
  showToast('Brecha exportada como JSON para incidencia OGP');
}
```
Solo muestra un toast. No exporta nada.

### 3.4 La clasificación manual usa `prompt()`
```javascript
function clasificarManualmente() {
  const calidad = prompt('Clasificá manualmente:\n\n1 → Completa\n2 → Parcial\n3 → Nula', '2');
```
El diálogo nativo del browser (`prompt()`) es inapropiado para una herramienta con ambiciones de producción. No sigue el design system, es bloqueado por algunos browsers en contextos no-HTTPS, y tiene accesibilidad muy pobre.

### 3.5 La nota de auditoría está oculta
```html
<div class="audit-note" style="display:none;">
```
La nota en Capa3 que explica cómo funciona la auditoría diaria (tabla `audit_eventos`, `fn_generar_snapshot_diario()`, etc.) está intencionalmente oculta con `display:none`. Probablemente fue ocultada "temporalmente" para el prototipo y olvidada.

---

## 4. El "Backend" panel — riesgos y problemas

### 4.1 Sin autenticación ni protección de ningún tipo
El panel de backend está accesible para cualquier persona que navegue al tab. La alerta dice "solo accesible por el equipo de curación" pero no hay código que lo proteja. En producción esto expone el formulario de carga de datos a cualquier usuario.

### 4.2 Toda la data ingresada se pierde al recargar
`registrosDB` es una variable JavaScript en memoria. Todo lo que se cargue mediante los formularios desaparece al cerrar o recargar el tab. El botón "Exportar JSON" genera un descargable que sí es un workaround válido para el prototipo, pero no es persistencia real.

### 4.3 El flujo cooperativo de revisión es teatro
El sistema de 3 revisores colectivos que deben alcanzar consenso unánime es la pieza más elaborada del backend. Está bien implementado como simulación de UX. Sin embargo:
- Los "revisores" no son personas reales — cualquier usuario puede simular los 3 votos desde el mismo browser
- No hay validación de identidad ni roles
- El "Revisor Principal" es un campo de texto libre — no hay autenticación
- Al publicar, el registro va a `registrosDB` en memoria, no a ningún backend real

### 4.4 La clasificación automática de calidad sí es real y está bien
`calcularCalidadAuto()` implementa una lógica genuina con 4 señales ponderadas (metadatos 20%, frecuencia 30%, desagregación geográfica 30%, accesibilidad 20%). Tiene reglas de bloqueo coherentes (>3 años → Nula) y su análisis del fundamento textual (`analizarPostFundamento()`) es un análisis semántico por palabras clave razonable para un prototipo. **Esta lógica debe preservarse y portarse al backend real.**

---

## 5. Vulnerabilidades y riesgos técnicos

### 5.1 XSS potencial en `innerHTML`
El código inyecta datos directamente en el DOM vía `innerHTML`:
```javascript
document.getElementById('infografia-canvas').innerHTML = `...${data.titulo}...${data.sintesis}...`;
```
Con mock data hardcodeada esto es seguro. Cuando se conecte a datos reales de usuarios o de una API, cualquier string no sanitizado se convierte en un vector de XSS. Antes de conectar datos reales, todos los valores deben pasar por `textContent` o una función de escape de HTML.

### 5.2 `window.open()` bloqueado en contextos seguros
Las funciones de descarga dependen de `window.open()`. Browsers modernos bloquean popups no iniciados directamente por un click del usuario. Si hay algún `await` o `setTimeout` entre el click y el `window.open()`, el popup es bloqueado. Esto ya ocurre en la función de descarga.

### 5.3 Dependencia de Google Fonts sin fallback de carga
```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=DM+Serif+Display...">
```
Si Google Fonts está bloqueado (redes corporativas, VPNs, países con restricciones) o está caído, el dashboard carga con fuentes del sistema. Los fallbacks definidos en CSS (`Georgia`, `system-ui`) son adecuados pero el cambio visual es notable, especialmente para los números grandes en DM Serif Display.

### 5.4 Sin manejo de errores en ninguna función asíncrona
No hay `try/catch` en ninguna parte del código. En producción, cualquier falla de red, timeout de API, o error de parseo de JSON haría que el dashboard se congele silenciosamente sin mostrar ningún mensaje al usuario.

---

## 6. Problemas de UX y accesibilidad

### 6.1 Sin ARIA labels
Ningún elemento interactivo tiene `aria-label`, `role`, o atributos de accesibilidad. Los botones de icono SVG no tienen texto alternativo. Un usuario con lector de pantalla no puede usar el dashboard.

### 6.2 El modal no tiene trampa de foco
El modal de clasificación se abre pero el foco del teclado no está atrapado dentro de él. Un usuario navegando con Tab puede interactuar con elementos detrás del modal.

### 6.3 El texto de "editar" del panel About no es descubrible
El botón de edición del panel About aparece solo en hover. No hay indicación visual de que el texto es editable. Además, cualquier edición se pierde al recargar.

### 6.4 El dashboard dice "gpt-4o-mini" en los resultados
```javascript
<span>gpt-4o-mini</span>
```
El modelo LLM está hardcodeado como `gpt-4o-mini` en la tarjeta de resultados. No es un modelo de Anthropic/Claude. Si el proyecto tiene alianza con Anthropic (Mozilla Fellowship), esto debería revisarse. Y si se usa gpt-4o-mini real en producción, debe documentarse la decisión.

---

## 7. Organización de archivos — problemas actuales

```
D:/Documents/Infra.Coop/
├── DOCTYPE html v4.html          ← Nombre inválido con espacios
├── infracoop_motor_brechas_v2 (16).html  ← ¿Por qué está aquí? ¿Es referencia?
├── doc.html.txt                  ← Archivo vacío, propósito desconocido
├── Nota Concepto.docx            ← Documento de concepto (no código)
└── Documentación/
    ├── infracoop_schema (2).sql  ← ¿Por qué el "(2)"? ¿Hay otro schema?
    ├── infracoop_metricas_backup.sql  ← "backup" en el nombre es confuso
    ├── infracoop_datasets_normativas.xlsx  ← Datos de seed sin proceso de carga
    ├── infracoop_metodologia.pdf  ← Documento de metodología
    ├── infra_coop_prototype_workflow.svg  ← Diagrama de flujo
    ├── mapa_mental_pipeline_pregunta_resultado.svg
    ├── pipeline_anonimizacion_preguntas.svg
    ├── motor_brechas_20dias_tablero (5).html  ← ¿Qué es el "(5)"?
    └── Código/
        └── DOCTYPE html v4.docx  ← Word del HTML (se desactualiza solo)
```

**Problemas:**
- Archivos con números entre paréntesis en el nombre (`(2)`, `(5)`, `(16)`) son rastros de ediciones en Google Drive o OneDrive. Indican que no hay control de versiones.
- El `.docx` del código no tiene ningún valor técnico y se va a desactualizar inmediatamente.
- `doc.html.txt` está vacío y no tiene propósito identificable.
- Los SVG de documentación son activos valiosos pero no están referenciados desde ningún documento.
- El Excel de datasets/normativas es el seed data real pero no hay ningún script que lo importe a la base de datos.

---

## 8. Cabos sueltos explícitos

| Elemento | Estado | Descripción |
|---|---|---|
| Filtros de búsqueda (Agenda, País, Calidad) | ❌ Sin función | Los selects no están conectados a ningún código |
| Descargar JPG / PDF | ⚠️ Parcial | Abre print dialog, no descarga un archivo real |
| Exportar brecha para OGP | ❌ Stub | Solo muestra un toast |
| Edición del texto About | ⚠️ Sin persistencia | Se pierde al recargar |
| Nota de auditoría | ❌ Oculta | `display:none` hardcodeado |
| Counter de preguntas en Capa3 | ⚠️ Solo sesión | No conectado al mock de evolución semanal |
| Scores por agenda en resultados | ❌ Aleatorios | Se recalculan con `Math.random()` en cada búsqueda |
| MAPA_MOCK | ❌ Estático | No cambia con preguntas ingresadas |
| EVOLUCION_MOCK | ❌ Estático | Siempre muestra las mismas 4 semanas |
| Backend → base de datos | ❌ No existe | Datos van a memoria del browser |
| Autenticación en Backend panel | ❌ No existe | Cualquier usuario puede acceder |
| Embedding / pgvector | ❌ No implementado | El schema SQL existe pero sin backend real |
| Anonimización de preguntas | ❌ No implementado | El pipeline SVG existe pero sin código real |
| Clasificación manual de dataset | ⚠️ Usa `prompt()` | Reemplazar con modal propio |

---

## 9. Lo que sí funciona bien y debe preservarse

- **`calcularCalidadAuto()`** — La lógica de clasificación por señales ponderadas (S1-S4) es sólida y bien documentada. Portar al backend sin cambios.
- **El flujo cooperativo de 3 revisores** — La UX del proceso de consenso (auto → revisor principal → escalado al nodo → consenso unánime → confirmación final) está bien diseñada. El código JS que lo implementa es el punto de partida para el backend real.
- **El design system CSS** — Las variables `:root` son coherentes, el sistema de tipografía es consistente, y los componentes visuales están bien estructurados. Es una base sólida.
- **El schema SQL** — `infracoop_schema (2).sql` e `infracoop_metricas_backup.sql` están bien escritos y son producción-ready. La lógica de triggers de auditoría es especialmente valiosa.
- **`INCIDENCIA_CONFIG`** — Los 4 tipos de incidencia (OGP, DDHH, Digital, Cooperativa) con sus marcos normativos son contenido real bien curado que debe preservarse en la base de datos.
- **`DATOS_MOCK`** — Los 5 escenarios mock son ejemplos cualitativos de alta calidad que sirven para testing y demos. Deben convertirse en fixtures de prueba del backend real.

---

## 10. Recomendaciones para v4 producción

### Estructura de proyecto sugerida

```
infracoop/
├── index.html               ← Solo estructura HTML, sin estilos ni scripts inline
├── assets/
│   ├── styles/
│   │   ├── tokens.css       ← Variables CSS (:root)
│   │   ├── components.css   ← Clases de componentes
│   │   └── layouts.css      ← Estructuras de página
│   ├── scripts/
│   │   ├── motor.js         ← Lógica del motor de brechas (API calls reales)
│   │   ├── backend.js       ← Formularios y flujo de curación
│   │   ├── monitor.js       ← Monitor colectivo y Capa3
│   │   └── utils.js         ← Helpers compartidos
│   └── icons/               ← SVGs extraídos como archivos propios
├── api/                     ← Backend (FastAPI / Python)
│   ├── main.py
│   ├── routes/
│   │   ├── gaps.py          ← POST /gaps (buscarBrecha real)
│   │   ├── datasets.py      ← CRUD datasets
│   │   └── frameworks.py    ← CRUD frameworks
│   └── services/
│       ├── embeddings.py    ← sentence-transformers
│       ├── classifier.py    ← calcularCalidadAuto portado a Python
│       └── anonymizer.py    ← Pipeline de anonimización (spaCy)
├── db/
│   ├── schema.sql           ← Renombrado desde infracoop_schema (2).sql
│   ├── metrics.sql          ← Renombrado desde infracoop_metricas_backup.sql
│   └── seeds/
│       ├── topics.sql       ← Ya incluido en schema
│       └── datasets.py      ← Script para importar el .xlsx
└── docs/
    ├── metodologia.pdf
    ├── workflows/           ← Los SVGs de pipeline
    └── DIAGNÓSTICO v4.md   ← Este archivo
```

### Prioridades de desarrollo (orden sugerido)

1. **Conectar la búsqueda a una API real** — Reemplazar `matchQuery()` + `setTimeout()` por un `fetch()` a un endpoint FastAPI que use pgvector. Sin esto, el resto del dashboard no tiene valor de datos.

2. **Eliminar `Math.random()` de los scores** — Los scores por agenda deben calcularse en el backend con la misma fórmula ponderada que el score principal.

3. **Separar el CSS y JS del HTML** — Prerequisito para que cualquier desarrollador pueda trabajar en el proyecto sin riesgo de romper todo.

4. **Conectar los filtros** — Los selects de Agenda, País y Calidad deben pasar parámetros al endpoint de búsqueda.

5. **Autenticación básica en el backend panel** — Al menos HTTP Basic Auth o un token compartido antes de cualquier despliegue público.

6. **Reemplazar `window.open()` + `print()` por exportación real** — Integrar `html2canvas` (para JPG) y `jsPDF` (para PDF). Ambas son librerías client-side sin dependencias de servidor.

7. **Sanitizar datos antes de `innerHTML`** — Crear una función `escapeHTML()` y usarla en todos los puntos donde se insertan datos dinámicos.

8. **Script de importación del .xlsx** — El Excel de datasets/normativas es el seed data real. Necesita un script Python que lo lea y popule la base de datos.

9. **Eliminar los archivos con nombres inválidos** — Renombrar `DOCTYPE html v4.html` → `index.html`, los SQL con `(2)` y `(5)` → nombres limpios, y borrar `doc.html.txt` y el `.docx` del código.

10. **Inicializar git** — El proyecto no tiene control de versiones. Los `(16)`, `(5)`, `(2)` en los nombres de archivo son síntoma de esto. Un repositorio git con `.gitignore` apropiado es la primera infraestructura que necesita este proyecto antes que cualquier código nuevo.
