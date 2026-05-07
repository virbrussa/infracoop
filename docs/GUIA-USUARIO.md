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

### 8. Administración de usuarias — solo admin

Esta sección explica cómo crear, configurar y gestionar cuentas de acceso al sistema. Todo se hace desde el **dashboard de Supabase** del proyecto.

---

#### Cómo funciona el sistema de autenticación

Infra.Coop usa **Supabase Auth** para la autenticación. Cuando una usuaria inicia sesión, el sistema:

1. Valida email y contraseña contra la tabla interna `auth.users` de Supabase.
2. Recupera el perfil de la tabla `profiles` (que contiene el rol).
3. Expone esos datos a la app via `AuthContext`.

La tabla `profiles` tiene esta estructura:

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | `uuid` | Mismo `id` que en `auth.users` (clave foránea) |
| `email` | `text` | Email de la usuaria |
| `rol` | `text` | `'admin'` o `'curadora'` (default: `'curadora'`) |
| `created_at` | `timestamptz` | Fecha de creación del perfil |

**Regla clave:** hay un trigger en la base de datos (`on_auth_user_created`) que inserta automáticamente un registro en `profiles` cada vez que se crea una usuaria nueva en Supabase Auth, asignándole siempre el rol `'curadora'` por defecto. Para otorgar rol `'admin'` hay que hacer un `UPDATE` manual después.

---

#### Paso a paso: crear una nueva usuaria

##### 1. Ir al dashboard de Supabase

Ingresá a [supabase.com](https://supabase.com), iniciá sesión y abrí el proyecto de Infra.Coop.

##### 2. Ir a Authentication → Users

En el menú lateral izquierdo, hacé clic en **"Authentication"** y luego en **"Users"**.

##### 3. Crear la usuaria

Hacé clic en el botón **"Add user"** (esquina superior derecha) y luego en **"Create new user"**.

Completá los campos:
- **Email:** la dirección de email de la nueva usuaria.
- **Password:** elegí una contraseña temporal segura. La usuaria debería cambiarla en su primer ingreso.
- Dejá **"Auto Confirm User"** activado para que la cuenta quede activa inmediatamente sin necesidad de confirmar por email.

Hacé clic en **"Create user"**.

##### 4. Verificar que el perfil se creó automáticamente

El trigger `on_auth_user_created` debería haber insertado un registro en `profiles` con `rol = 'curadora'`. Para verificarlo:

1. En el menú lateral, ir a **Table Editor → profiles**.
2. Buscar el registro con el email de la nueva usuaria.
3. Confirmar que aparece con `rol = 'curadora'`.

Si el registro **no aparece** (el trigger puede fallar en casos raros de conectividad), crearlo manualmente con el SQL del paso siguiente.

---

#### Paso a paso: otorgar rol admin

Por defecto toda usuaria nueva tiene `rol = 'curadora'`. Para promoverla a `admin`:

##### 1. Ir al SQL Editor

En el menú lateral, hacé clic en **"SQL Editor"** y luego en **"New query"**.

##### 2. Obtener el UUID de la usuaria

```sql
SELECT id, email, rol FROM profiles WHERE email = 'email-de-la-usuaria@ejemplo.com';
```

Copiá el `id` que devuelve (es un UUID como `a1b2c3d4-...`).

##### 3. Hacer el UPDATE de rol

```sql
UPDATE profiles
SET rol = 'admin'
WHERE email = 'email-de-la-usuaria@ejemplo.com';
```

Hacé clic en **"Run"**. Debería devolver `1 row affected`.

##### 4. Verificar el cambio

```sql
SELECT id, email, rol FROM profiles WHERE email = 'email-de-la-usuaria@ejemplo.com';
```

Confirmar que `rol` ahora dice `'admin'`.

---

#### Paso a paso: crear perfil manualmente (si el trigger falló)

Si verificaste que no hay registro en `profiles` después de crear la usuaria:

##### 1. Obtener el UUID de auth.users

```sql
SELECT id, email FROM auth.users WHERE email = 'email-de-la-usuaria@ejemplo.com';
```

##### 2. Insertar el perfil

```sql
INSERT INTO profiles (id, email, rol)
VALUES (
  'uuid-copiado-del-paso-anterior',
  'email-de-la-usuaria@ejemplo.com',
  'curadora'   -- o 'admin' si querés otorgarle ese rol directamente
);
```

---

#### Cómo resetear la contraseña de una usuaria

##### Opción A — Desde el dashboard (recomendado)

1. Ir a **Authentication → Users**.
2. Buscar la usuaria por email.
3. Hacer clic en los tres puntos `⋯` al final de la fila.
4. Seleccionar **"Send password recovery"**. Supabase envía un email con un link para que la usuaria establezca su nueva contraseña.

##### Opción B — Desde el SQL Editor (si el email no llega)

```sql
-- Esto solo actualiza el hash de la contraseña directamente (usar con cuidado)
-- Reemplazá 'nueva-contraseña-temporal' con la contraseña deseada
UPDATE auth.users
SET encrypted_password = crypt('nueva-contraseña-temporal', gen_salt('bf'))
WHERE email = 'email-de-la-usuaria@ejemplo.com';
```

> Después de hacer este cambio, informá a la usuaria por un canal seguro y pedile que la cambie en su primer ingreso.

---

#### Cómo desactivar o eliminar una usuaria

##### Desactivar (recomendado — no borra datos)

1. Ir a **Authentication → Users**.
2. Hacer clic en los tres puntos `⋯` al final de la fila.
3. Seleccionar **"Ban user"**. La usuaria no podrá iniciar sesión pero sus datos históricos se conservan.

Para reactivarla: misma ruta, seleccionar **"Unban user"**.

##### Eliminar permanentemente

1. Ir a **Authentication → Users**.
2. Hacer clic en los tres puntos `⋯` al final de la fila.
3. Seleccionar **"Delete user"**.

> La tabla `profiles` tiene `ON DELETE CASCADE`, por lo que el registro en `profiles` se elimina automáticamente junto con el usuario de `auth.users`. Esta acción **no se puede deshacer**.

---

#### Cómo ver todas las usuarias del sistema

Desde el **SQL Editor**:

```sql
SELECT
  u.email,
  p.rol,
  u.last_sign_in_at,
  u.created_at
FROM auth.users u
LEFT JOIN profiles p ON p.id = u.id
ORDER BY u.created_at DESC;
```

Esto muestra todas las usuarias, su rol y la última vez que iniciaron sesión.

---

#### Resumen de roles y permisos

| Permiso | Sin cuenta | `curadora` | `admin` |
|---------|-----------|-----------|--------|
| Usar el monitor (`/brechas`, `/colectivo`, `/datos`) | ✓ | ✓ | ✓ |
| Enviar formularios a revisión (`/ingresar`) | ✓ | ✓ | ✓ |
| Publicar directo sin revisión (`/ingresar`) | — | — | ✓ |
| Ver y gestionar cola de revisión (`/revisar`) | — | — | ✓ |
| Aprobar / rechazar formularios | — | — | ✓ |
| Insertar / eliminar en `datasets` y `normativas` | — | — | ✓ |
| Ver todos los perfiles en `profiles` | — | — | ✓ |

---

#### Consideraciones de seguridad

- **Las contraseñas nunca se almacenan en texto plano.** Supabase usa bcrypt para el hash de contraseñas.
- **RLS (Row Level Security) está habilitado** en todas las tablas críticas. Una usuaria sin rol `admin` no puede leer la cola de revisión ni insertar en el corpus aunque tenga sesión activa.
- **El token de sesión** dura por defecto 1 hora en Supabase. Después de ese tiempo la app renueva automáticamente la sesión si la usuaria sigue activa.
- **No compartir `SUPABASE_SERVICE_ROLE_KEY`** con usuarias de la plataforma. Esa clave bypasea todas las políticas RLS y solo debe usarse en scripts de backend (como `npm run embed`).

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
