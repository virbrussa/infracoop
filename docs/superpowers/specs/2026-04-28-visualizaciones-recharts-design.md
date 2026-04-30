# Spec: Upgrade de Visualizaciones — Recharts + CSS mejorado

**Fecha:** 2026-04-28  
**Proyecto:** Infra.Coop — Motor de Brechas v0.3  
**Rama:** dev

---

## Contexto

El dashboard tiene 4 vistas con visualizaciones de datos, todas implementadas con divs CSS sin librería de charts. El objetivo es mejorar la calidad visual e interactividad usando Recharts donde agrega valor real, y CSS mejorado donde ya funciona bien.

**Restricciones:**
- El proyecto no tiene Tailwind — shadcn completo queda descartado
- El componente `chart` de shadcn es un wrapper de Recharts; instalar Recharts directamente es equivalente y más simple
- El sistema CSS existente (tokens en `src/styles/tokens.css`, clases en `src/styles/app.css`) no se toca
- 106 tests deben seguir pasando

---

## Dependencia nueva

```
npm install recharts
```

Una sola dependencia. ~50KB gzip. Sin cambios de bundler ni config.

---

## Cambios por vista

### 1. DatosQueremos (`src/pages/DatosQueremos.tsx`)

**Componente actual:** Barras apiladas CSS por semana (divs con height proporcional).  
**Nuevo:** `ComposedChart` de Recharts.

- `Bar` por cada agenda (Tecnológica, Datos, Género) apiladas (`stackId="a"`)
- `Line` superpuesta con el total semanal
- `Tooltip` nativo con conteo exacto al hover
- `XAxis` con label de semana (abreviado cuando hay muchas semanas)
- Animación de entrada al montar (`isAnimationActive`)
- Colores de agendas: `#0C447C`, `#3C3489`, `#72243E` (tokens existentes)
- El sidebar con métricas y el RangoSelector no cambian

### 2. MonitorBrechas — Gauge (`src/pages/MonitorBrechas.tsx`)

**Componente actual:** Arco CSS semicircular estático.  
**Nuevo:** CSS mejorado — sin Recharts.

- `conic-gradient` con gradiente verde→ámbar→rojo proporcional al score
- Transición CSS `transition: all 0.6s ease` al cambiar el score entre resultados
- Valor numérico y etiqueta de categoría centrados en el arco
- Colores: `#3F7A4E` (cubierta) → `#C77B0E` (parcial) → `#C2185B` (crítica)

### 3. MonitorBrechas — Barras de relevancia (`src/pages/MonitorBrechas.tsx`)

**Componente actual:** Div CSS con etiqueta alta/media/baja.  
**Nuevo:** Mini `BarChart` de Recharts por cada hit en los resultados.

- 4 barras verticales compactas (S1, S2, S3, S4 del score de calidad)
- Altura fija: 40px por chart, ancho: 120px
- Color según nivel: alta = `#6C3FA0`, media = `#C77B0E`, baja = `#C2185B`
- `isAnimationActive` + `animationBegin={index * 80}` para entrada escalonada por resultado
- Sin tooltip (demasiado pequeño) — score numérico como texto al lado

### 4. MonitorColectivo — Cards de agenda (`src/pages/MonitorColectivo.tsx`)

**Componente actual:** Número grande de score + barra CSS de distribución de calidad.  
**Nuevo:** Score + delta semanal + sparkline de tendencia.

- Score promedio grande (ya existe)
- Delta vs semana anterior: `▲ +0.08` o `▼ -0.03` en color según dirección
- `LineChart` mini de Recharts: últimas 8 semanas de evolución del score
  - Tamaño: 120×40px, sin ejes, sin tooltip (decorativo)
  - `dot={false}`, `strokeWidth={2}`, color `#6C3FA0`
- El dato de 8 semanas viene de `useEvolucionStats` (ya disponible)

### 5. Diagnóstico (`src/pages/Diagnostico.tsx`)

**Sin charts.** Solo limpieza CSS de impresión:

- Separadores visuales más claros entre secciones (marco, acciones, datasets, normativas)
- Tipografía más consistente: jerarquía h2/h3/p con `font-family: var(--serif)` para títulos
- `@media print` refinado: márgenes, page-break-avoid en cards de dataset/normativa
- Colores más suaves en los chips del diagnóstico al imprimir (evitar fondos oscuros)

---

## Datos para sparklines

`useEvolucionStats` ya devuelve evolución semanal por agenda. Para el sparkline de MonitorColectivo hay que derivar el score promedio por agenda por semana. Esto se puede calcular en el hook existente o en un selector dentro del componente — no requiere nueva query a Supabase.

---

## No incluido en este spec

- Filtros cruzados entre charts (click en barra filtra otra vista)
- Zoom o brush en DatosQueremos
- Export de charts como imagen
- Tooltips en sparklines de MonitorColectivo

---

## Testing

Los tests existentes no mockean Recharts — los componentes con charts nuevos necesitan un mock básico de Recharts en el setup de Vitest para que no fallen por falta de ResizeObserver. Patrón ya usado en el proyecto para otros contextos.

Checklist de no-regresión:
- 106 tests siguen pasando tras la instalación de Recharts
- Build limpio (`npm run build` sin errores)
- Las 4 vistas renderizan sin errores en dev server
