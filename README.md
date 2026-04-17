# Infra.Coop — Motor de Brechas

Prototipo de dashboard desarrollado por **Data Cooperativas Latinas** en el marco del Mozilla Fellowship 2024–2026.

## ¿Qué es?

Infra.Coop es la dimensión tecnosocial de Data Cooperativas Latinas: una infraestructura digital para evidenciar brechas en datos de género en América Latina. El motor contrasta preguntas ciudadanas con dos bases de referencia —datasets de género regionales y marcos normativos vigentes— para calcular dónde están los datos que faltan y qué tan crítica es esa ausencia.

## Estado actual

**Versión 0.3 — prototipo funcional de alta fidelidad.**

El dashboard es completamente estático: toda la lógica corre en el browser, sin backend ni base de datos conectada. Los resultados de búsqueda, el monitor colectivo y la evolución semanal están simulados con datos de ejemplo. El objetivo de esta versión es validar la experiencia de uso y el flujo cooperativo de curación antes de construir la infraestructura real.

## Estructura

```
index.html          ← El dashboard completo
db/                 ← Schema PostgreSQL + pgvector (diseño de la DB real)
docs/               ← Metodología, diagnóstico técnico y diagramas de pipeline
data/               ← Datos semilla para datasets y marcos normativos
archive/            ← Versiones anteriores del prototipo
```

## Qué viene

- Conexión a API real (FastAPI + PostgreSQL + pgvector)
- Búsqueda semántica con embeddings multilingües
- Autenticación para el panel de curación
- Pipeline de anonimización de preguntas
- Exportación real de diagnósticos en PDF

## Créditos

Desarrollado por [Data Cooperativas Latinas](https://datacooperativaslatinas.org) con el apoyo del Mozilla Fellowship.
