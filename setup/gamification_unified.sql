-- Gamificación unificada multi-módulo · IUB NeuroBiz
-- Ejecutar en el Supabase CONSOLIDADO (una vez).
-- No elimina tablas legacy (students, student_progress, attendance).
-- Requiere: pgcrypto

create extension if not exists pgcrypto;

-- ============================================================
-- Catálogo académico
-- ============================================================

create table if not exists public.modules (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  name text not null default '',
  narrative_theme text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.course_offerings (
  id uuid primary key default gen_random_uuid(),
  module_id uuid not null references public.modules(id) on delete restrict,
  term text not null default '',
  year int not null default extract(year from now()),
  code text unique not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.periods (
  id uuid primary key default gen_random_uuid(),
  offering_id uuid not null references public.course_offerings(id) on delete cascade,
  ordinal int not null check (ordinal between 1 and 20),
  label text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (offering_id, ordinal)
);

create table if not exists public.activities (
  id uuid primary key default gen_random_uuid(),
  period_id uuid not null references public.periods(id) on delete cascade,
  slug text not null,
  activity_type text not null check (
    activity_type in ('attendance', 'quiz', 'hti', 'mission', 'exercise', 'participation')
  ),
  xp_max int not null default 0,
  title text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (period_id, slug)
);

-- ============================================================
-- Personas e inscripciones
-- ============================================================

create table if not exists public.people (
  id uuid primary key default gen_random_uuid(),
  cc text unique not null,
  name text not null default '',
  is_anonymized boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.enrollments (
  id uuid primary key default gen_random_uuid(),
  person_id uuid not null references public.people(id) on delete cascade,
  offering_id uuid not null references public.course_offerings(id) on delete cascade,
  grupo text not null default '',
  horario text not null default '',
  legacy_migrated boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (person_id, offering_id)
);

-- ============================================================
-- Gamificación
-- ============================================================

create table if not exists public.gamification_ranks (
  id uuid primary key default gen_random_uuid(),
  module_id uuid not null references public.modules(id) on delete cascade,
  min_xp int not null default 0,
  rank_name text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  unique (module_id, min_xp)
);

create table if not exists public.xp_ledger (
  id uuid primary key default gen_random_uuid(),
  enrollment_id uuid not null references public.enrollments(id) on delete cascade,
  offering_id uuid not null references public.course_offerings(id) on delete cascade,
  source_type text not null,
  source_id text not null default '',
  points int not null check (points >= 0),
  reason text not null default '',
  period_ordinal int,
  legacy_key text,
  created_at timestamptz not null default now()
);

create unique index if not exists idx_xp_ledger_legacy_key
  on public.xp_ledger (legacy_key)
  where legacy_key is not null;

create table if not exists public.activity_completions (
  id uuid primary key default gen_random_uuid(),
  enrollment_id uuid not null references public.enrollments(id) on delete cascade,
  activity_id uuid not null references public.activities(id) on delete cascade,
  offering_id uuid not null references public.course_offerings(id) on delete cascade,
  score numeric not null default 0,
  xp_earned int not null default 0,
  payload jsonb not null default '{}'::jsonb,
  completed_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (enrollment_id, activity_id)
);

create table if not exists public.exercise_attempts (
  id uuid primary key default gen_random_uuid(),
  enrollment_id uuid not null references public.enrollments(id) on delete cascade,
  activity_id uuid not null references public.activities(id) on delete cascade,
  offering_id uuid not null references public.course_offerings(id) on delete cascade,
  attempt_no int not null default 1 check (attempt_no >= 1),
  result jsonb not null default '{}'::jsonb,
  xp_earned int not null default 0,
  created_at timestamptz not null default now(),
  unique (enrollment_id, activity_id, attempt_no)
);

create table if not exists public.participation_events (
  id uuid primary key default gen_random_uuid(),
  enrollment_id uuid not null references public.enrollments(id) on delete cascade,
  offering_id uuid not null references public.course_offerings(id) on delete cascade,
  points int not null check (points > 0),
  event_type text not null default 'participation',
  session_date date not null default current_date,
  note text not null default '',
  legacy_ts timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.enrollment_attendance (
  id uuid primary key default gen_random_uuid(),
  enrollment_id uuid not null references public.enrollments(id) on delete cascade,
  offering_id uuid not null references public.course_offerings(id) on delete cascade,
  fecha date not null,
  estado text not null check (estado in ('P', 'T', 'F')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (enrollment_id, fecha)
);

-- ============================================================
-- Timestamps
-- ============================================================

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
declare
  t text;
begin
  foreach t in array array[
    'modules', 'course_offerings', 'periods', 'activities',
    'people', 'enrollments', 'activity_completions', 'enrollment_attendance'
  ] loop
    execute format('drop trigger if exists trg_%s_updated_at on public.%I', t, t);
    execute format(
      'create trigger trg_%s_updated_at before update on public.%I
       for each row execute function public.set_updated_at()',
      t, t
    );
  end loop;
end;
$$;

-- ============================================================
-- Índices
-- ============================================================

create index if not exists idx_offerings_module on public.course_offerings(module_id);
create index if not exists idx_periods_offering on public.periods(offering_id);
create index if not exists idx_activities_period on public.activities(period_id);
create index if not exists idx_enrollments_offering on public.enrollments(offering_id);
create index if not exists idx_enrollments_person on public.enrollments(person_id);
create index if not exists idx_xp_ledger_enrollment on public.xp_ledger(enrollment_id);
create index if not exists idx_xp_ledger_offering on public.xp_ledger(offering_id);
create index if not exists idx_completions_offering on public.activity_completions(offering_id);
create index if not exists idx_participation_offering on public.participation_events(offering_id);
create index if not exists idx_attendance_offering on public.enrollment_attendance(offering_id);

-- ============================================================
-- RPC: otorgar XP de forma atómica
-- ============================================================

create or replace function public.award_xp(
  p_enrollment_id uuid,
  p_points int,
  p_source_type text,
  p_source_id text default '',
  p_reason text default '',
  p_period_ordinal int default null,
  p_legacy_key text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_offering_id uuid;
  v_ledger_id uuid;
begin
  if p_points < 0 then
    raise exception 'points must be non-negative';
  end if;

  select offering_id into v_offering_id
  from public.enrollments
  where id = p_enrollment_id;

  if v_offering_id is null then
    raise exception 'enrollment not found: %', p_enrollment_id;
  end if;

  if p_legacy_key is not null then
    select id into v_ledger_id
    from public.xp_ledger
    where legacy_key = p_legacy_key;
    if v_ledger_id is not null then
      return v_ledger_id;
    end if;
  end if;

  insert into public.xp_ledger (
    enrollment_id, offering_id, source_type, source_id,
    points, reason, period_ordinal, legacy_key
  ) values (
    p_enrollment_id, v_offering_id, p_source_type, p_source_id,
    p_points, p_reason, p_period_ordinal, p_legacy_key
  )
  returning id into v_ledger_id;

  return v_ledger_id;
end;
$$;

-- ============================================================
-- Vistas agregadas y legacy
-- ============================================================

create or replace view public.v_enrollment_stats
  with (security_invoker = true)
as
select
  e.id as enrollment_id,
  co.code as offering_code,
  p.cc,
  p.name,
  e.grupo,
  e.horario,
  coalesce(sum(xl.points), 0) as xp_total,
  count(distinct xl.period_ordinal) filter (where xl.period_ordinal is not null) as semanas_visitadas,
  max(xl.created_at) as ultima_actualizacion
from public.enrollments e
join public.people p on p.id = e.person_id
join public.course_offerings co on co.id = e.offering_id
left join public.xp_ledger xl on xl.enrollment_id = e.id
group by e.id, co.code, p.cc, p.name, e.grupo, e.horario;

create or replace view public.v_legacy_students
  with (security_invoker = true)
as
select
  p.id,
  p.cc,
  p.name,
  e.grupo,
  e.horario,
  co.code as offering_code,
  e.created_at,
  e.updated_at
from public.enrollments e
join public.people p on p.id = e.person_id
join public.course_offerings co on co.id = e.offering_id
where p.is_anonymized = false;

create or replace view public.v_legacy_student_progress
  with (security_invoker = true)
as
select
  ac.id,
  p.cc as student_id,
  p.name as student_name,
  e.grupo,
  e.horario,
  per.ordinal as semana,
  ac.xp_earned as xp,
  coalesce((ac.payload->>'quiz_score')::numeric, ac.score, 0) as quiz_score,
  coalesce(ac.payload->'quiz_answers', '{}'::jsonb) as quiz_answers,
  coalesce((ac.payload->>'hti_done')::boolean, false) as hti_done,
  coalesce((ac.payload->>'activity_done')::boolean, false) as activity_done,
  co.code as offering_code,
  ac.updated_at
from public.activity_completions ac
join public.activities a on a.id = ac.activity_id and a.slug = 'weekly_summary'
join public.periods per on per.id = a.period_id
join public.enrollments e on e.id = ac.enrollment_id
join public.people p on p.id = e.person_id
join public.course_offerings co on co.id = e.offering_id;

create or replace view public.v_legacy_resumen_docente
  with (security_invoker = true)
as
select
  p.cc as student_id,
  max(p.name) as student_name,
  max(e.grupo) as grupo,
  max(e.horario) as horario,
  co.code as offering_code,
  count(distinct per.ordinal) as semanas_visitadas,
  coalesce(sum(ac.xp_earned), 0) as xp_total,
  avg(coalesce((ac.payload->>'quiz_score')::numeric, ac.score, 0)) as quiz_promedio,
  sum(
    case
      when coalesce((ac.payload->>'hti_done')::boolean, false)
        or coalesce((ac.payload->>'activity_done')::boolean, false)
      then 1 else 0
    end
  ) as actividades,
  max(ac.updated_at) as ultima_actualizacion
from public.activity_completions ac
join public.activities a on a.id = ac.activity_id and a.slug = 'weekly_summary'
join public.periods per on per.id = a.period_id
join public.enrollments e on e.id = ac.enrollment_id
join public.people p on p.id = e.person_id
join public.course_offerings co on co.id = e.offering_id
group by p.cc, co.code;

create or replace view public.v_legacy_attendance
  with (security_invoker = true)
as
select
  ea.id,
  p.cc,
  ea.fecha,
  ea.estado,
  e.grupo,
  co.code as offering_code,
  ea.created_at,
  ea.updated_at
from public.enrollment_attendance ea
join public.enrollments e on e.id = ea.enrollment_id
join public.people p on p.id = e.person_id
join public.course_offerings co on co.id = e.offering_id;

-- ============================================================
-- Seed catálogo TGA04 / TGA05
-- ============================================================

insert into public.modules (code, name, narrative_theme)
values
  ('TGA04', 'Fundamentos de Computación para los Negocios', 'NeuroBiz S.A.S.'),
  ('TGA05', 'Estructura de Datos', 'DataLab IUB')
on conflict (code) do update set
  name = excluded.name,
  narrative_theme = excluded.narrative_theme;

insert into public.course_offerings (module_id, term, year, code)
select m.id, '2026-2', 2026, 'TGA04-2026-2'
from public.modules m where m.code = 'TGA04'
on conflict (code) do nothing;

insert into public.course_offerings (module_id, term, year, code)
select m.id, '2026-2', 2026, 'TGA05-2026-2'
from public.modules m where m.code = 'TGA05'
on conflict (code) do nothing;

insert into public.gamification_ranks (module_id, min_xp, rank_name, sort_order)
select m.id, v.min_xp, v.rank_name, v.sort_order
from public.modules m
cross join (values
  (0,   'Aprendiz',         1),
  (100, 'Analista Junior',  2),
  (250, 'Consultor',        3),
  (450, 'Arquitecto',       4),
  (650, 'CTO',              5)
) as v(min_xp, rank_name, sort_order)
where m.code = 'TGA04'
on conflict (module_id, min_xp) do nothing;

-- Periodos y actividades TGA04 (semanas activas del curso)
do $$
declare
  v_offering_id uuid;
  v_period_id uuid;
  v_ord int;
  v_weeks int[] := array[1,2,3,4,6,7,8,9,11,12,13,14,15];
begin
  select id into v_offering_id from public.course_offerings where code = 'TGA04-2026-2';
  if v_offering_id is null then return; end if;

  foreach v_ord in array v_weeks loop
    insert into public.periods (offering_id, ordinal, label)
    values (v_offering_id, v_ord, 'Semana ' || v_ord)
    on conflict (offering_id, ordinal) do nothing
    returning id into v_period_id;

    if v_period_id is null then
      select id into v_period_id from public.periods
      where offering_id = v_offering_id and ordinal = v_ord;
    end if;

    insert into public.activities (period_id, slug, activity_type, xp_max, title)
    values
      (v_period_id, 'attendance', 'attendance', 10, 'Asistencia'),
      (v_period_id, 'quiz', 'quiz', 25, 'Quiz semanal'),
      (v_period_id, 'mission', 'mission', 45, 'Misión presencial'),
      (v_period_id, 'weekly_summary', 'mission', 95, 'Resumen semanal')
    on conflict (period_id, slug) do nothing;
  end loop;
end;
$$;

-- ============================================================
-- RLS (mismo modelo anon abierto que legacy; refinar en fase 2)
-- ============================================================

alter table public.modules enable row level security;
alter table public.course_offerings enable row level security;
alter table public.periods enable row level security;
alter table public.activities enable row level security;
alter table public.people enable row level security;
alter table public.enrollments enable row level security;
alter table public.gamification_ranks enable row level security;
alter table public.xp_ledger enable row level security;
alter table public.activity_completions enable row level security;
alter table public.exercise_attempts enable row level security;
alter table public.participation_events enable row level security;
alter table public.enrollment_attendance enable row level security;

do $$
declare
  t text;
begin
  foreach t in array array[
    'modules', 'course_offerings', 'periods', 'activities',
    'people', 'enrollments', 'gamification_ranks', 'xp_ledger',
    'activity_completions', 'exercise_attempts',
    'participation_events', 'enrollment_attendance'
  ] loop
    execute format('drop policy if exists %I on public.%I', t || '_anon_select', t);
    execute format('drop policy if exists %I on public.%I', t || '_anon_insert', t);
    execute format('drop policy if exists %I on public.%I', t || '_anon_update', t);
    execute format(
      'create policy %I on public.%I for select to anon using (true)',
      t || '_anon_select', t
    );
    execute format(
      'create policy %I on public.%I for insert to anon with check (true)',
      t || '_anon_insert', t
    );
    execute format(
      'create policy %I on public.%I for update to anon using (true) with check (true)',
      t || '_anon_update', t
    );
  end loop;
end;
$$;

grant usage on schema public to anon;
grant select, insert, update on public.modules to anon;
grant select, insert, update on public.course_offerings to anon;
grant select, insert, update on public.periods to anon;
grant select, insert, update on public.activities to anon;
grant select, insert, update on public.people to anon;
grant select, insert, update on public.enrollments to anon;
grant select on public.gamification_ranks to anon;
grant select, insert on public.xp_ledger to anon;
grant select, insert, update on public.activity_completions to anon;
grant select, insert on public.exercise_attempts to anon;
grant select, insert on public.participation_events to anon;
grant select, insert, update on public.enrollment_attendance to anon;
grant select on public.v_enrollment_stats to anon;
grant select on public.v_legacy_students to anon;
grant select on public.v_legacy_student_progress to anon;
grant select on public.v_legacy_resumen_docente to anon;
grant select on public.v_legacy_attendance to anon;
grant execute on function public.award_xp to anon;

-- ============================================================
-- RPC: participación y asistencia desde frontend (por CC)
-- ============================================================

create or replace function public.record_participation(
  p_cc text,
  p_offering_code text,
  p_points int,
  p_event_type text default 'participation',
  p_session_date date default current_date,
  p_note text default ''
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_enrollment_id uuid;
  v_offering_id uuid;
  v_id uuid;
begin
  select co.id into v_offering_id
  from public.course_offerings co
  where co.code = p_offering_code;

  if v_offering_id is null then
    raise exception 'offering not found: %', p_offering_code;
  end if;

  select e.id into v_enrollment_id
  from public.enrollments e
  join public.people p on p.id = e.person_id
  where p.cc = p_cc and e.offering_id = v_offering_id;

  if v_enrollment_id is null then
    insert into public.people (cc, name)
    values (p_cc, coalesce(nullif(p_note, ''), 'Sin nombre'))
    on conflict (cc) do nothing;

    insert into public.enrollments (person_id, offering_id)
    select p.id, v_offering_id
    from public.people p where p.cc = p_cc
    on conflict (person_id, offering_id) do nothing;

    select e.id into v_enrollment_id
    from public.enrollments e
    join public.people p on p.id = e.person_id
    where p.cc = p_cc and e.offering_id = v_offering_id;
  end if;

  insert into public.participation_events (
    enrollment_id, offering_id, points, event_type, session_date, note
  ) values (
    v_enrollment_id, v_offering_id, p_points, p_event_type, p_session_date, p_note
  )
  returning id into v_id;

  perform public.award_xp(
    v_enrollment_id, p_points, 'participation', v_id::text,
    p_event_type, null, 'participation:' || v_id::text
  );

  return v_id;
end;
$$;

create or replace function public.record_attendance(
  p_cc text,
  p_offering_code text,
  p_fecha date,
  p_estado text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_enrollment_id uuid;
  v_offering_id uuid;
  v_id uuid;
begin
  select co.id into v_offering_id
  from public.course_offerings co where co.code = p_offering_code;

  select e.id into v_enrollment_id
  from public.enrollments e
  join public.people p on p.id = e.person_id
  where p.cc = p_cc and e.offering_id = v_offering_id;

  if v_enrollment_id is null then
    raise exception 'enrollment not found for cc=% offering=%', p_cc, p_offering_code;
  end if;

  insert into public.enrollment_attendance (enrollment_id, offering_id, fecha, estado)
  values (v_enrollment_id, v_offering_id, p_fecha, p_estado)
  on conflict (enrollment_id, fecha) do update set
    estado = excluded.estado,
    updated_at = now()
  returning id into v_id;

  return v_id;
end;
$$;

grant execute on function public.record_participation to anon;
grant execute on function public.record_attendance to anon;

-- ============================================================
-- Dual-write: legacy student_progress → unificado
-- ============================================================

create or replace function public.sync_legacy_student_progress()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_offering_id uuid;
  v_enrollment_id uuid;
  v_period_id uuid;
  v_activity_id uuid;
begin
  select id into v_offering_id
  from public.course_offerings
  where code = coalesce(
    current_setting('app.offering_code', true),
    'TGA04-2026-2'
  );

  if v_offering_id is null then
    return new;
  end if;

  insert into public.people (cc, name)
  values (new.student_id, coalesce(nullif(new.student_name, ''), 'Sin nombre'))
  on conflict (cc) do update set
    name = case when excluded.name <> 'Sin nombre' then excluded.name else public.people.name end;

  insert into public.enrollments (person_id, offering_id, grupo, horario)
  select p.id, v_offering_id, coalesce(new.grupo, ''), coalesce(new.horario, '')
  from public.people p where p.cc = new.student_id
  on conflict (person_id, offering_id) do update set
    grupo = case when excluded.grupo <> '' then excluded.grupo else public.enrollments.grupo end,
    horario = case when excluded.horario <> '' then excluded.horario else public.enrollments.horario end;

  select e.id into v_enrollment_id
  from public.enrollments e
  join public.people p on p.id = e.person_id
  where p.cc = new.student_id and e.offering_id = v_offering_id;

  select per.id into v_period_id
  from public.periods per
  where per.offering_id = v_offering_id and per.ordinal = new.semana;

  if v_period_id is null or v_enrollment_id is null then
    return new;
  end if;

  select a.id into v_activity_id
  from public.activities a
  where a.period_id = v_period_id and a.slug = 'weekly_summary';

  if v_activity_id is null then
    return new;
  end if;

  insert into public.activity_completions (
    enrollment_id, activity_id, offering_id, score, xp_earned, payload, updated_at
  ) values (
    v_enrollment_id, v_activity_id, v_offering_id,
    coalesce(new.quiz_score, 0), coalesce(new.xp, 0),
    jsonb_build_object(
      'quiz_score', coalesce(new.quiz_score, 0),
      'quiz_answers', coalesce(new.quiz_answers, '{}'::jsonb),
      'hti_done', coalesce(new.hti_done, false),
      'activity_done', coalesce(new.activity_done, false),
      'student_name', coalesce(new.student_name, '')
    ),
    coalesce(new.updated_at, now())
  )
  on conflict (enrollment_id, activity_id) do update set
    score = excluded.score,
    xp_earned = excluded.xp_earned,
    payload = excluded.payload,
    updated_at = excluded.updated_at;

  if coalesce(new.xp, 0) > 0 then
    perform public.award_xp(
      v_enrollment_id,
      new.xp,
      'weekly_summary',
      new.id::text,
      'Dual-write legacy semana ' || new.semana,
      new.semana,
      'legacy:sp:' || new.student_id || ':' || new.semana
    );
  end if;

  return new;
end;
$$;

do $$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'student_progress'
  ) then
    drop trigger if exists trg_sync_legacy_progress on public.student_progress;
    create trigger trg_sync_legacy_progress
    after insert or update on public.student_progress
    for each row execute function public.sync_legacy_student_progress();
  end if;
end;
$$;
