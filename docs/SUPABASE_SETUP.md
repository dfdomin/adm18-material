# Configuración de Supabase — Gamificación unificada (ADM18)

ADM18 comparte **un solo proyecto Supabase** con otros módulos (TGA04, TGA05…).
Los puntajes se segmentan por `offering_code = ADM18-2026-2`.

## Paso 1 — Preservar datos actuales (SQL Editor)

1. Abre [Supabase Dashboard](https://supabase.com/dashboard) → proyecto `nnrgxuzvjtweyzkdrech`.
2. Ve a **SQL Editor** → **New query**.
3. Copia y ejecuta el contenido de:

   `setup/migrations/000_preserve_adm18_legacy.sql`

   Esto **renombra** las tablas antiguas (`quiz_scores`, `student_progress`…) a `adm18_*_legacy` **sin borrar filas**.

## Paso 2 — Instalar esquema unificado

En el mismo SQL Editor, ejecuta **en orden**:

1. `setup/gamification_unified.sql` (tablas multi-módulo + vistas legacy)
2. `setup/migrations/003_adm18_seed_and_rpc.sql` (catálogo ADM18 + función `upsert_weekly_progress`)

## Paso 3 — Verificar

Ejecuta en SQL Editor:

```sql
select code from public.modules where code = 'ADM18';
select code from public.course_offerings where code = 'ADM18-2026-2';
select count(*) from public.periods p
join public.course_offerings co on co.id = p.offering_id
where co.code = 'ADM18-2026-2';
```

Debes ver: módulo ADM18, offering ADM18-2026-2, y **14 periodos** (semanas).

## Paso 4 — Frontend (ya configurado en el repo)

| Archivo | Rol |
|---------|-----|
| `js/supabase-config.js` | URL + offering ADM18 |
| `js/gamification-sdk.js` | SDK compartido (mismo que TGA04) |
| `js/supabase-client.js` | Sincroniza `adm18_scores` → nube |

Flujo estudiante:

1. Hace quizzes → se guardan en `localStorage` (`adm18_scores`) — **como antes**.
2. En `index.html` pulsa **Identificarme** e ingresa cédula + nombre.
3. El sitio llama `upsert_weekly_progress` por cada semana con puntaje.
4. Las filas quedan en `activity_completions` filtradas por `ADM18-2026-2`.

## Consultas docente

```sql
-- Resumen por estudiante ADM18
select * from public.v_legacy_resumen_docente
where offering_code = 'ADM18-2026-2';

-- Detalle semanal
select * from public.v_legacy_student_progress
where offering_code = 'ADM18-2026-2'
order by student_id, semana;
```

## Respaldo de tablas legacy

Los datos antiguos siguen en:

- `adm18_quiz_scores_legacy`
- `adm18_student_progress_legacy`
- `adm18_student_participation_legacy`

No se eliminan automáticamente.

## Archivos relacionados

- Cliente: `js/supabase-client.js`
- Config: `js/supabase-config.js`
- SDK: `js/gamification-sdk.js`
- Esquema: `setup/gamification_unified.sql`
