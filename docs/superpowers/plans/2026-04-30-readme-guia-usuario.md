# README + Guía de Usuario — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Actualizar el README con un inicio rápido y, crear `docs/GUIA-USUARIO.md` completa organizada por perfil de usuaria (Monitor + Curadora/Admin).

**Architecture:** Dos archivos Markdown independientes. El README recibe una nueva sección `## Inicio rápido` al principio y un enlace a la guía al final. La guía vive en `docs/GUIA-USUARIO.md` con dos partes: Parte I (usuaria del monitor) y Parte II (curadora/admin).

**Tech Stack:** Markdown, repositorio git existente.

---

## Archivos

| Acción | Archivo |
|--------|---------|
| Modificar | `README.md` |
| Crear | `docs/GUIA-USUARIO.md` |

---

### Task 1: Actualizar README.md

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Agregar sección `## Inicio rápido` después de la descripción inicial**

Insertar el siguiente bloque después del primer `---` (línea 7) y antes de `## Stack técnico`:

```markdown
## Inicio rápido

```bash
# 1. Clonar el repositorio
git clone https://github.com/tu-org/InfraCoopDashboard.git
cd InfraCoopDashboard

# 2. Instalar dependencias
npm install

# 3. Configurar variables de entorno
cp .env.example .env.local
# Editar .env.local con tus credenciales de Supabase (ver abajo)

# 4. Levantar el servidor de desarrollo
npm run dev
# → http://localhost:5173
```

### Variables de entorno mínimas (`.env.local`)

```
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

> Para generar embeddings del corpus necesitás además `SUPABASE_SERVICE_ROLE_KEY`. Ver sección [Base de datos](#base-de-datos).

---
```

- [ ] **Step 2: Agregar enlace a la guía de usuario al final del README**

Agregar al final del archivo (después de la última línea):

```markdown

---

## Guía de usuario

Para instrucciones de uso del Monitor de Brechas, ingreso de datos y administración curatorial, ver la **[Guía de usuario completa](docs/GUIA-USUARIO.md)**.
```

- [ ] **Step 3: Verificar que el README renderiza correctamente**

```bash
# Verificar que no hay líneas rotas ni secciones duplicadas
grep -n "^## " README.md
```

Salida esperada (orden correcto):
```
## Inicio rápido
## Stack técnico
## Estructura del proyecto
## Rutas de la aplicación
## Páginas — funcionamiento detallado
## Base de datos
## Modelo de embeddings
## Sistema de diseño
## Desarrollo local
## Tests
## Roles de usuario
## Arquitectura de contextos React
## Guía de usuario
```

- [ ] **Step 4: Commit**

```bash
git add README.md
git commit -m "docs: add quick start section and user guide link to README"
```

---

### Task 2: Crear `docs/GUIA-USUARIO.md` — Parte I (Usuaria del Monitor)

**Files:**
- Create: `docs/GUIA-USUARIO.md`

- [ ] **Step 1: Crear el archivo con introducción y Parte I completa**

Crear `docs/GUIA-USUARIO.md` con el siguiente contenido:

```markdown
# Guía de usuario — Infra.Coop

**Data Cooperativas Latinas · Mozilla Fellowship 2024–2026**

Esta guía explica cómo usar el Motor de Brechas de Infra.Coop. Está organizada en dos partes:

- **Parte I** — para cualquier persona que quiera consultar el monitor, explorar el corpus o descargar un diagnóstico.
- **Parte II** — para curadoras y administradoras que ingresan datos, revisan formularios o gestionan el corpus.

No necesitás cuenta para usar la Parte I. La Parte II requiere credenciales según el nivel de acceso.

---

## Parte I — Usuaria del Monitor

### 1. Monitor de Brechas (`/brechas`)

El núcleo de la plataforma. Escribís una pregunta sobre datos de género y el sistema calcula qué tan grande es la brecha en el corpus actual.

#### Cómo escribir una pregunta efectiva

- Usá preguntas concretas sobre datos que necesitás: *"¿Existen datos sobre violencia obstétrica en Bolivia?"*, *"¿Hay estadísticas de brecha salarial por género en México?"*
- Mínimo 5 caracteres. Cuanto más específica la pregunta, más preciso el resultado.
- El motor entiende español de cualquier variante latinoamericana.
- No hace falta usar sintaxis especial ni palabras clave exactas — es búsqueda semántica.

#### Cómo leer el score de brecha

El resultado muestra un número entre 0 y 1 con una etiqueta de color:

| Etiqueta | Rango | Color | Significado |
|----------|-------|-------|-------------|
| **Brecha crítica** | ≥ 0.65 | Púrpura | No se encontraron datos relacionados en el corpus |
| **Brecha parcial** | 0.35–0.65 | Lila | Hay algunos datos pero con cobertura incompleta |
| **Dato cubierto** | < 0.35 | Verde | El corpus tiene datos relevantes para esta pregunta |

> El score no mide si el dato existe en el mundo — mide si está representado en el corpus actual de Infra.Coop.

#### Qué significan los resultados

El panel de resultados tiene dos columnas:

- **Datasets encontrados** — conjuntos de datos del corpus que tienen relación con tu pregunta. Cada uno muestra título, fuente, país, año y una barra de relevancia relativa (el más relevante siempre aparece al 100%).
- **Normativas encontradas** — marcos legales, tratados o políticas públicas relacionadas con la temática.

Las barras de relevancia son **relativas entre sí**, no porcentajes absolutos. El tooltip sobre cada barra muestra el valor exacto de similitud coseno si necesitás el número preciso.

#### Agenda de incidencia

Después de obtener resultados aparece una barra con 4 chips seleccionables:

- **Gobierno Abierto**
- **DDHH**
- **Cooperación Digital**
- **Gobernanza Cooperativa**

Seleccioná uno o más chips para indicar en qué marco político querés enmarcar esta brecha. La selección se incluye en el diagnóstico descargable.

#### Cómo descargar el diagnóstico

1. Realizá una búsqueda y esperá los resultados.
2. (Opcional) Seleccioná chips de agenda de incidencia.
3. Hacé clic en **"Descargar diagnóstico →"**.
4. Se abre la página de diagnóstico y se dispara automáticamente el diálogo de impresión del navegador.
5. En el diálogo de impresión, seleccioná **"Guardar como PDF"** como destino.

> El botón "← Volver al motor" no aparece en la versión impresa.

---

### 2. Monitor Colectivo (`/colectivo`)

Visualiza el estado general del corpus: cuántos datos hay, qué temas tienen mayor cobertura, y dónde están las brechas sistémicas.

#### Cómo usar los filtros

En la parte superior hay tres selectores en estilo píldora:

| Filtro | Qué hace |
|--------|----------|
| **Agenda** | Muestra solo datasets de la agenda seleccionada (Tecnológica / Datos / Género) |
| **País** | Filtra por país de origen del dataset (`pais_iso3`) |
| **Calidad** | Filtra por nivel de calidad declarado (Completa / Parcial / Nula) |

Los filtros se combinan entre sí. Cuando hay algún filtro activo aparece el botón **"Limpiar filtros"**. El selector de País siempre muestra todos los países del corpus, incluso al filtrar por otros campos.

#### Banda de métricas

Cuatro tarjetas en la parte superior del monitor:

1. **Total entradas** — suma de datasets y normativas en el corpus filtrado.
2. **Agendas activas** — siempre 3 (Tecnológica, Datos, Género).
3. **Tópicos críticos** — cantidad de tópicos con score de brecha ≥ 0.65.
4. **Cobertura media** — porcentaje promedio de cobertura del corpus filtrado (`(1 - score_promedio) × 100`).

#### Tarjetas de agenda

Una tarjeta por cada agenda. Muestra:
- Número de datasets en esa agenda
- Barra de calidad (proporción Completa / Parcial / Nula)
- Top 3 subtemas más frecuentes
- Número de preguntas que exploraron esa agenda

#### Tarjetas de tópico

Cinco tópicos predefinidos: **Salud reproductiva**, **Violencia de género**, **Justicia y litigios**, **Interseccionalidad**, **Tecnologías y datos**.

Cada tarjeta muestra el score de brecha para ese tópico. Score alto = poca cobertura en el corpus actual. Las tarjetas se colorean según la misma escala que el motor (púrpura / lila / verde).

---

### 3. ¿Qué datos queremos? (`/datos`)

Muestra la evolución temporal de las preguntas ingresadas al motor. Permite ver cómo crece la demanda de datos a lo largo del tiempo y qué tipo de brechas predominan.

#### Cómo usar el selector de mes/año

Dos selectores **Desde** / **Hasta** en la parte superior. Cada uno tiene un desplegable de año y otro de mes. Los valores disponibles se derivan automáticamente de los meses con preguntas registradas en la base de datos.

El gráfico siempre muestra las últimas **24 semanas** dentro del rango seleccionado.

#### Cómo leer el gráfico de barras apiladas

Cada columna representa una semana. Los segmentos apilados corresponden a las categorías de brecha:

| Segmento | Color | Categoría |
|----------|-------|-----------|
| Inferior | Verde | Preguntas con dato cubierto (score < 0.35) |
| Medio | Lila | Preguntas con brecha parcial (0.35–0.65) |
| Superior | Púrpura | Preguntas con brecha crítica (≥ 0.65) |

La altura de las barras es proporcional al máximo de preguntas en el rango. Cuando hay más de 16 semanas visibles, las etiquetas del eje X se muestran cada 4 semanas.

#### Tarjetas de agenda

Debajo del gráfico hay tres tarjetas (Tecnológica, Datos, Género). Cada una compara:
- **Cobertura baseline** — proporción del corpus inicial que pertenece a esa agenda
- **Demanda observada** — proporción de preguntas de la semana seleccionada que activaron esa agenda

Una diferencia grande entre baseline y demanda indica una agenda con alta demanda pero baja representación en el corpus.

---

### 4. Diagnóstico (`/diagnostico`)

Página de impresión limpia, sin barra de navegación. Solo accesible desde el botón "Descargar diagnóstico →" en el Monitor de Brechas.

#### Qué contiene el documento

- Logo Infra.Coop y subtítulo del proyecto
- La pregunta original (en cursiva con borde izquierdo púrpura)
- Score de brecha (número grande) + badge de categoría + scores por agenda
- Chips de agenda de incidencia seleccionados (si los hay)
- Lista de datasets encontrados (título · fuente · país · año)
- Lista de normativas encontradas (título · fuente · país)
- Footer con créditos y licencia

#### Cómo imprimir o guardar como PDF

El diálogo de impresión se abre automáticamente 600ms después de cargar la página. Si lo cerraste, usá `Ctrl+P` (Windows/Linux) o `Cmd+P` (macOS) para reabrirlo.

Para guardar como PDF: en el diálogo de impresión, en **Destino** seleccioná **"Guardar como PDF"**.

> Si accedés directamente a la URL `/diagnostico` sin haber realizado una búsqueda antes, verás un mensaje de error con un link de vuelta al motor.

---
```

- [ ] **Step 2: Verificar que el archivo se creó correctamente**

```bash
wc -l docs/GUIA-USUARIO.md
grep -n "^### " docs/GUIA-USUARIO.md
```

Salida esperada de `grep`:
```
### 1. Monitor de Brechas (`/brechas`)
### 2. Monitor Colectivo (`/colectivo`)
### 3. ¿Qué datos queremos? (`/datos`)
### 4. Diagnóstico (`/diagnostico`)
```

- [ ] **Step 3: Commit parcial**

```bash
git add docs/GUIA-USUARIO.md
git commit -m "docs: add user guide Part I — Monitor sections"
```

---

### Task 3: Completar `docs/GUIA-USUARIO.md` — Parte II (Curadora / Administradora)

**Files:**
- Modify: `docs/GUIA-USUARIO.md`

- [ ] **Step 1: Agregar Parte II al final del archivo**

Agregar el siguiente bloque al final de `docs/GUIA-USUARIO.md`:

```markdown
## Parte II — Curadora y Administradora

Esta sección es para personas con acceso al sistema de ingreso y revisión de datos.

| Rol | Qué puede hacer |
|-----|----------------|
| Sin cuenta | Usar todo el monitor + enviar formularios (quedan en revisión) |
| `curadora` | Igual que sin cuenta + sesión iniciada |
| `admin` | Todo lo anterior + aprobar/rechazar en la cola + publicar directamente |

> Los admins se crean manualmente insertando en la tabla `profiles` con `rol = 'admin'` desde el dashboard de Supabase.

---

### 5. Ingresar datos al corpus (`/ingresar`)

Formulario público para contribuir datasets o marcos normativos. **No requiere cuenta**.

#### Campos obligatorios

**Para datasets:**
- Título
- Fuente (organización o entidad que publica el dato)
- País (código ISO)
- Año de publicación
- Temática / tópico
- URL o referencia

**Para normativas:**
- Título
- Fuente
- País
- Año
- Tipo (tratado / ley / política pública / otro)

Los campos de contacto y atribución son opcionales pero recomendados para el proceso de verificación.

#### Diferencia entre modo sin cuenta y modo admin

**Sin cuenta / curadora:**
- El formulario se envía a la cola de revisión (`formularios_en_revision` o `normativas_en_revision`) con estado `pendiente`.
- No se publica inmediatamente — requiere aprobación de una administradora.
- Recibís un mensaje de confirmación al enviar.

**Admin:**
- El formulario va directamente a las tablas definitivas (`datasets` / `normativas`).
- Si el modelo de embeddings ya está cargado en el navegador, se genera automáticamente el embedding del nuevo registro.
- Aparece un botón flotante **"Cola de revisión →"** en la esquina inferior derecha para acceder rápidamente a `/revisar`.

#### Qué pasa con el formulario después de enviarlo

- **Sin cuenta**: queda en espera. Una administradora lo revisará y lo aprobará o rechazará.
- **Admin**: el registro queda disponible inmediatamente en el motor de búsqueda (el índice de búsqueda se actualiza en la próxima carga de la app).

---

### 6. Login (`/login`)

Formulario de autenticación para curadoras y administradoras.

#### Cómo iniciar sesión

1. Navegá a `/login`.
2. Ingresá tu email y contraseña (credenciales provistas por la administración del proyecto).
3. Hacé clic en **"Ingresar"**.

Si las credenciales son correctas, serás redirigida automáticamente a la página anterior o a `/brechas`.

#### Qué cambia en la interfaz al estar autenticada

- Tu email aparece en el header junto a un botón **"Salir"**.
- En `/ingresar`: los formularios se publican directamente (si sos admin) y aparece el botón flotante de la cola.
- En `/revisar`: la página carga correctamente (sin sesión muestra un redirect a `/login`).

Para cerrar sesión hacé clic en **"Salir"** en el header.

---

### 7. Cola de revisión (`/revisar`) — solo admin

Panel de moderación de contenidos enviados por la comunidad. Solo accesible para usuarias con `rol = 'admin'`.

#### Cómo revisar formularios pendientes

La página lista todos los formularios y normativas con estado distinto de `rechazado`, ordenados por fecha de creación (más antiguos primero).

Cada ítem muestra:
- Tipo (Dataset / Normativa)
- Título y fuente
- País y año
- Temática
- Fecha de envío
- Datos de contacto (si fueron provistos)

#### Aprobar un formulario

1. Revisá los datos del ítem.
2. Hacé clic en **"Aprobar"**.
3. El sistema copia el registro a su tabla definitiva (`datasets` o `normativas`) y lo elimina de la cola.
4. Los botones del ítem se deshabilitan durante la operación para evitar doble clic.

El nuevo registro estará disponible en el motor de búsqueda en la próxima carga de la app.

#### Rechazar un formulario

1. Hacé clic en **"Rechazar"**.
2. El sistema actualiza el estado a `rechazado` y oculta el ítem de la lista.
3. El registro permanece en la tabla de revisión con estado `rechazado` (no se elimina).

#### Acceso rápido desde `/ingresar`

Cuando estás autenticada como admin en `/ingresar`, aparece un botón flotante **"Cola de revisión →"** en la esquina inferior derecha de la pantalla. Hacé clic para ir directamente a `/revisar`.

---

## Preguntas frecuentes

**¿El motor funciona sin internet?**
No. Requiere conexión para acceder a Supabase (corpus de datos) y para descargar el modelo de embeddings la primera vez (~330MB). Una vez descargado, el modelo queda cacheado en el navegador.

**¿Por qué tarda la primera búsqueda?**
El modelo de lenguaje (`paraphrase-multilingual-mpnet-base-v2`) se descarga desde HuggingFace la primera vez que usás el motor en ese navegador. Las búsquedas siguientes son instantáneas.

**¿Qué pasa si el modelo no carga?**
El sistema hace fallback automático a búsqueda por texto (BM25 + fuzzy). Los resultados son menos precisos semánticamente pero siempre se muestran resultados.

**¿En qué idiomas funciona la búsqueda?**
El modelo es multilingüe. Podés escribir en español de cualquier variante latinoamericana. El corpus actual está principalmente en español.

**¿Puedo contribuir datos sin cuenta?**
Sí. Cualquier persona puede enviar datasets o normativas desde `/ingresar`. Los formularios quedan en revisión hasta que una administradora los apruebe.

---

*Infra.Coop — Motor de Brechas v0.4 · Data Cooperativas Latinas · Mozilla Fellowship 2024–2026*
*Licencia [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/)*
```

- [ ] **Step 2: Verificar que la Parte II tiene todas las secciones**

```bash
grep -n "^### " docs/GUIA-USUARIO.md
```

Salida esperada:
```
### 1. Monitor de Brechas (`/brechas`)
### 2. Monitor Colectivo (`/colectivo`)
### 3. ¿Qué datos queremos? (`/datos`)
### 4. Diagnóstico (`/diagnostico`)
### 5. Ingresar datos al corpus (`/ingresar`)
### 6. Login (`/login`)
### 7. Cola de revisión (`/revisar`) — solo admin
```

- [ ] **Step 3: Commit final**

```bash
git add docs/GUIA-USUARIO.md
git commit -m "docs: add user guide Part II — curadora and admin sections"
```

---

## Self-Review

**Spec coverage:**
- ✅ README: sección Inicio rápido → Task 1
- ✅ README: link a guía → Task 1
- ✅ Parte I / Monitor de Brechas → Task 2
- ✅ Parte I / Monitor Colectivo → Task 2
- ✅ Parte I / ¿Qué datos queremos? → Task 2
- ✅ Parte I / Diagnóstico → Task 2
- ✅ Parte II / Ingresar datos → Task 3
- ✅ Parte II / Login → Task 3
- ✅ Parte II / Cola de revisión → Task 3

**Placeholders:** Ninguno detectado. Todo el contenido de la guía está escrito completamente.

**Consistencia:** No hay referencias cruzadas a funciones o tipos de código. Los nombres de rutas y botones son consistentes con el README y el código fuente.
