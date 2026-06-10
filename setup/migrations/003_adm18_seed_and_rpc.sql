-- ADM18 · Catálogo + RPC de sincronización semanal
-- Ejecutar DESPUÉS de setup/gamification_unified.sql

insert into public.modules (code, name, narrative_theme)
values (
  'ADM18',
  'Procesamiento de la Información en la Organización',
  'LatamBox'
)
on conflict (code) do update set
  name = excluded.name,
  narrative_theme = excluded.narrative_theme;

insert into public.course_offerings (module_id, term, year, code)
select m.id, '2026-2', 2026, 'ADM18-2026-2'
from public.modules m where m.code = 'ADM18'
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
where m.code = 'ADM18'
on conflict (module_id, min_xp) do nothing;

do $$
declare
  v_offering_id uuid;
  v_period_id uuid;
  v_ord int;
begin
  select id into v_offering_id from public.course_offerings where code = 'ADM18-2026-2';
  if v_offering_id is null then return; end if;

  for v_ord in 1..14 loop
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
      (v_period_id, 'quiz', 'quiz', 100, 'Quiz semanal'),
      (v_period_id, 'mission', 'mission', 100, 'Actividad semanal'),
      (v_period_id, 'weekly_summary', 'mission', 100, 'Resumen semanal')
    on conflict (period_id, slug) do nothing;
  end loop;
end;
$$;

create or replace function public.upsert_weekly_progress(
  p_offering_code text,
  p_student_id text,
  p_semana int,
  p_xp int default 0,
  p_quiz_score numeric default 0,
  p_quiz_answers jsonb default '{}'::jsonb,
  p_hti_done boolean default false,
  p_activity_done boolean default false,
  p_student_name text default '',
  p_grupo text default '',
  p_horario text default ''
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_offering_id uuid;
  v_enrollment_id uuid;
  v_period_id uuid;
  v_activity_id uuid;
  v_completion_id uuid;
begin
  if p_student_id is null or trim(p_student_id) = '' then
    raise exception 'student_id required';
  end if;

  select id into v_offering_id
  from public.course_offerings
  where code = p_offering_code;

  if v_offering_id is null then
    raise exception 'offering not found: %', p_offering_code;
  end if;

  insert into public.people (cc, name)
  values (p_student_id, coalesce(nullif(trim(p_student_name), ''), 'Sin nombre'))
  on conflict (cc) do update set
    name = case
      when excluded.name <> 'Sin nombre' then excluded.name
      else public.people.name
    end;

  insert into public.enrollments (person_id, offering_id, grupo, horario)
  select p.id, v_offering_id, coalesce(p_grupo, ''), coalesce(p_horario, '')
  from public.people p where p.cc = p_student_id
  on conflict (person_id, offering_id) do update set
    grupo = case when excluded.grupo <> '' then excluded.grupo else public.enrollments.grupo end,
    horario = case when excluded.horario <> '' then excluded.horario else public.enrollments.horario end;

  select e.id into v_enrollment_id
  from public.enrollments e
  join public.people p on p.id = e.person_id
  where p.cc = p_student_id and e.offering_id = v_offering_id;

  select per.id into v_period_id
  from public.periods per
  where per.offering_id = v_offering_id and per.ordinal = p_semana;

  if v_period_id is null then
    raise exception 'period not found for offering=% semana=%', p_offering_code, p_semana;
  end if;

  select a.id into v_activity_id
  from public.activities a
  where a.period_id = v_period_id and a.slug = 'weekly_summary';

  insert into public.activity_completions (
    enrollment_id, activity_id, offering_id,
    score, xp_earned, payload, updated_at
  ) values (
    v_enrollment_id, v_activity_id, v_offering_id,
    coalesce(p_quiz_score, 0),
    coalesce(p_xp, 0),
    jsonb_build_object(
      'quiz_score', coalesce(p_quiz_score, 0),
      'quiz_answers', coalesce(p_quiz_answers, '{}'::jsonb),
      'hti_done', coalesce(p_hti_done, false),
      'activity_done', coalesce(p_activity_done, false),
      'student_name', coalesce(p_student_name, '')
    ),
    now()
  )
  on conflict (enrollment_id, activity_id) do update set
    score = excluded.score,
    xp_earned = excluded.xp_earned,
    payload = excluded.payload,
    updated_at = excluded.updated_at
  returning id into v_completion_id;

  if coalesce(p_xp, 0) > 0 then
    perform public.award_xp(
      v_enrollment_id,
      p_xp,
      'weekly_summary',
      v_completion_id::text,
      'ADM18 semana ' || p_semana,
      p_semana,
      'adm18:' || p_offering_code || ':' || p_student_id || ':' || p_semana
    );
  end if;

  return v_completion_id;
end;
$$;

grant execute on function public.upsert_weekly_progress to anon;
