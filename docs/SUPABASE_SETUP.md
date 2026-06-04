# Configuración de Supabase (ADM18)

Este proyecto ya tiene cliente en `js/supabase-client.js`.  
Para activarlo debes configurar credenciales y crear las tablas.

## 1) Dónde poner las credenciales

En las páginas que cargan `js/supabase-client.js` (hoy: `index.html` y `participacion.html`) deja estos meta tags en `<head>`:

```html
<meta name="supabase-supabase_url" content="https://TU-PROYECTO.supabase.co">
<meta name="supabase-supabase_anon_key" content="TU_ANON_KEY">
```

Si esos valores quedan en `YOUR_SUPABASE_URL` / `YOUR_SUPABASE_ANON_KEY`, el sitio funciona en modo local/offline.

## 2) Crear tablas en Supabase SQL Editor

Ejecuta este script:

```sql
create extension if not exists pgcrypto;

create table if not exists public.quiz_scores (
  id uuid primary key default gen_random_uuid(),
  week int not null,
  score int not null,
  total int not null,
  percent int not null,
  updated_at timestamptz default now()
);

create table if not exists public.student_progress (
  id uuid primary key default gen_random_uuid(),
  progress jsonb not null default '{}'::jsonb,
  completion_pct int not null default 0,
  updated_at timestamptz default now()
);

create table if not exists public.student_participation (
  id uuid primary key default gen_random_uuid(),
  participation jsonb not null default '{}'::jsonb,
  groups jsonb not null default '{}'::jsonb,
  coeval jsonb not null default '{}'::jsonb,
  completion_pct int not null default 0,
  updated_at timestamptz default now()
);
```

## 3) Políticas RLS mínimas (modo clase/demo)

Si no usarás autenticación todavía:

```sql
alter table public.quiz_scores enable row level security;
alter table public.student_progress enable row level security;
alter table public.student_participation enable row level security;

drop policy if exists "anon_rw_quiz_scores" on public.quiz_scores;
create policy "anon_rw_quiz_scores"
on public.quiz_scores
for all
to anon
using (true)
with check (true);

drop policy if exists "anon_rw_student_progress" on public.student_progress;
create policy "anon_rw_student_progress"
on public.student_progress
for all
to anon
using (true)
with check (true);

drop policy if exists "anon_rw_student_participation" on public.student_participation;
create policy "anon_rw_student_participation"
on public.student_participation
for all
to anon
using (true)
with check (true);
```

## 4) Verificación rápida

1. Abre `index.html` y `participacion.html`.
2. Guarda quiz/progreso/participación.
3. En Supabase, revisa tablas:
   - `quiz_scores`
   - `student_progress`
   - `student_participation`

## 5) Archivos relacionados

- Cliente: `js/supabase-client.js`
- Participación: `participacion.html`
- Landing/progreso: `index.html`
