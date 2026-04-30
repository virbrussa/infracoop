---
title: README update + Guía de usuario completa
date: 2026-04-30
status: approved
---

# Diseño — README actualizado + Guía de usuario

## Objetivo

Actualizar el README con un inicio rápido y enlace a la guía. Crear `docs/GUIA-USUARIO.md` organizada por perfil de usuaria.

---

## Parte 1 — Cambios al README

### Sección nueva: `## Inicio rápido`

Ubicación: justo después de la descripción inicial, antes de `## Stack técnico`.

Contenido: 4 pasos numerados (clonar, instalar, configurar `.env.local`, correr `npm run dev`). Subsección con las dos variables de entorno mínimas obligatorias (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`).

### Enlace a la guía

Al final del README, línea nueva:

> Ver [Guía de usuario completa](docs/GUIA-USUARIO.md) para instrucciones de uso del Monitor, ingreso de datos y administración.

### Revisión de contenido existente

El README actual es preciso. No requiere cambios estructurales. Solo se verifica que el conteo de tests y las rutas estén al día.

---

## Parte 2 — `docs/GUIA-USUARIO.md`

### Estructura aprobada

```
# Guía de usuario — Infra.Coop

## Introducción

## Parte I — Usuaria del Monitor

### 1. Monitor de Brechas (/brechas)
   - Cómo escribir una pregunta efectiva
   - Cómo leer el score (crítica / parcial / cubierta)
   - Qué significan los resultados (datasets vs normativas)
   - Agenda de incidencia: qué son los chips y para qué sirven
   - Cómo descargar el diagnóstico

### 2. Monitor Colectivo (/colectivo)
   - Cómo usar los filtros (Agenda / País / Calidad)
   - Qué muestra la banda de métricas
   - Tarjetas de agenda y tópico: cómo interpretarlas

### 3. ¿Qué datos queremos? (/datos)
   - Cómo leer el gráfico de barras apiladas
   - Cómo usar el selector de mes/año
   - Tarjetas de agenda: baseline vs demanda observada

### 4. Diagnóstico (/diagnostico)
   - Qué contiene el documento
   - Cómo imprimir o guardar como PDF

## Parte II — Curadora y Administradora

### 5. Ingresar datos al corpus (/ingresar)
   - Qué campos son obligatorios
   - Diferencia entre modo curadora y modo admin
   - Qué pasa con el formulario después de enviarlo

### 6. Login (/login)
   - Cómo iniciar sesión
   - Qué cambia en la interfaz al estar autenticada

### 7. Cola de revisión (/revisar) [solo admin]
   - Cómo revisar formularios pendientes
   - Aprobar vs rechazar: qué ocurre en cada caso
   - El botón flotante desde /ingresar
```

### Tono y convenciones

- Español neutro latinoamericano, segunda persona plural (vos/ustedes según contexto)
- Sin jerga técnica en Parte I; términos técnicos permitidos en Parte II
- Pasos numerados para flujos de acción
- Notas en `> blockquote` para advertencias o aclaraciones importantes

---

## Archivos a crear/modificar

| Acción | Archivo |
|--------|---------|
| Modificar | `README.md` |
| Crear | `docs/GUIA-USUARIO.md` |
