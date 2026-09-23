# Roster ADM18 por periodo

Fuente de verdad de los **documentos de identidad registrados** de cada
estudiante del módulo. La app identifica al estudiante por su cédula
(banner «Identificarme» en cada semana) y contra este roster resuelve
nombre, grupo y horario para guardar sus respuestas en Supabase.

## Archivos

| Archivo | Periodo | Estado |
|---------|---------|--------|
| `ADM18-2026-3.json` | 2026-3 | 19 estudiantes con documento · 10 pendientes |

## Estructura del JSON

```json
{
  "offering_code": "ADM18-2026-3",
  "module_code": "ADM18",
  "term": "2026-3",
  "grupo": "1_CE_G2",
  "horario": "",
  "estudiantes": [
    { "cc": "1045716858", "name": "AHUMADA BUSTAMANTE CARLOS FABIAN", "tipo_doc": "CC", "grupo": "1_CE_G2", "horario": "" }
  ],
  "pendientes_sin_documento": [
    { "name": "AGÁMEZ PAEZ JOSÉ DAVID", "nota": "sin numero de documento en la lista 2026-3" }
  ]
}
```

- `estudiantes` → tienen número de documento en la lista: se cargan al roster.
- `pendientes_sin_documento` → aparecen en la lista de asistencia sin
  documento. Van pasando a `estudiantes` cuando se consigue su cédula.

## Cómo agregar los estudiantes que faltan

1. Agregar la entrada a `estudiantes` (y quitarla de `pendientes_sin_documento`).
2. `node scripts/import-roster-adm18-2026-3.mjs --dry-run` para revisar.
3. `node scripts/import-roster-adm18-2026-3.mjs` para cargar en Supabase.
4. Verificar en `dashboard/participacion.html` → Configuración que el conteo subió.

El RPC `upsert_roster_students` es idempotente: repetir la carga no duplica.

## SQL equivalente

`setup/migrations/013_adm18_offering_2026-3.sql` — crea la oferta
`ADM18-2026-3`, sus 14 semanas y sus actividades, y carga este mismo roster
en una sola ejecución (alternativa al script cuando se trabaja desde el SQL
Editor o con `supabase db query`).
