---
title: Plan de Mejoras — PLAN_DESARROLLO_INFRACOOP.md (Option B)
date: 2026-04-25
status: approved
---

# Diseño de Correcciones al Plan de Desarrollo Infra.Coop

## Contexto

El `PLAN_DESARROLLO_INFRACOOP.md` es el plan técnico para migrar el prototipo HTML monolítico a un sistema React + TypeScript + Supabase. Se encontraron cuatro categorías de inconsistencias que deben corregirse antes de ejecutar el plan.

## Decisiones Tomadas (Decision Log)

| Decisión | Opción elegida | Razón |
|----------|---------------|-------|
| Arquitectura NLP | Client-side (Opción B) | Despliegue más simple en HF Spaces; pgvector queda para v2 |
| Autenticación backend | Fuera de alcance (Opción A) | Fase inicial; panel de curación accesible por URL |
| NLP library | MiniSearch + Fuse.js | MiniSearch: full-text, español, ~7KB. Fuse.js: fuzzy fallback |
| Ubicación del repo | Repo existente, rama `dev` | No se crea repo nuevo; todo en `InfraCoopDashboard` |
| Ubicación del app Vite | Raíz del repo (Opción A) | Más simple para deploy estático en HF Spaces |

## Correcciones Aplicadas

### 1. db/schema.sql — Reescritura completa

**Problema:** El schema existente usa pgvector (extensión PostgreSQL de vectores), PKs UUID, tabla `frameworks` (en lugar de `normativas`), y no tiene las tablas `preguntas`, `formularios_publicados`, `formularios_en_revision`.

**Corrección:** Reescribir `db/schema.sql` para que coincida exactamente con la Story 1.1 del plan:
- Eliminar `CREATE EXTENSION vector` y todos los campos `embedding vector(768)`
- Renombrar `frameworks` → `normativas`
- PKs de tipo `TEXT` (formato DS-001, NM-001)
- Agregar tablas faltantes: `preguntas`, `formularios_publicados`, `formularios_en_revision`
- Mantener índices de filtro relevantes (por agenda, país, calidad)

### 2. Epic 0 Story 0.1 — Repo existente + rama dev

**Problema:** Story 0.1 asume crear un repositorio GitHub nuevo desde cero.

**Corrección:**
- Eliminar subtarea de creación de nuevo repo en GitHub
- Reemplazar por: crear rama `dev` desde `main` en el repo existente `InfraCoopDashboard`
- Scaffoldear Vite + React + TypeScript en la raíz del repo (no en subcarpeta)
- Agregar nota de workflow Git al inicio del plan

### 3. Epic 2 Story 2.1 — Eliminación del spike de evaluación NLP

**Problema:** Story 2.1 es un spike de investigación que bloquea toda la Épica 2. Con la librería ya decidida, no tiene sentido.

**Corrección:**
- Eliminar Story 2.1 completa
- Incorporar la decisión de librería en Story 2.2 como prerequisito resuelto:
  - MiniSearch indexa `titulo`, `descripcion_notas`, `subtema`, `obligacion_datos`
  - Fuse.js como fallback para queries cortas/con errores
  - Criterio de aceptación: 5 queries de prueba contra datos reales devuelven resultados relevantes

### 4. Story 1.3 — Aclaración de dos archivos Excel

**Problema:** El plan menciona `infracoop_bd.xlsx` pero existe también `datasets-normativas.xlsx`.

**Corrección:** Agregar nota en Story 1.3 aclarando que en `data/` coexisten dos archivos:
- `infracoop_bd.xlsx` — archivo principal de seed (42 datasets + 35 normativas), el que importa el script
- `datasets-normativas.xlsx` — versión anterior, conservada como referencia

### 5. Workflow Git — Nota nueva al inicio del plan

**Adición:** Sección corta al inicio del documento documentando:
- Toda la implementación ocurre en la rama `dev`
- Cada Épica genera un PR de `dev` a `main` cuando está estable y probada
- No se hace push directo a `main`

## Archivos Modificados

| Archivo | Tipo de cambio |
|---------|---------------|
| `db/schema.sql` | Reescritura completa |
| `PLAN_DESARROLLO_INFRACOOP.md` | Correcciones en Story 0.1, 1.3, eliminación Story 2.1, adición workflow Git |
