-- Limpieza de estudiantes ficticios (Harness) y progreso de pruebas automáticas.
-- Ejecutar en Supabase SQL Editor antes de usar el panel docente o scripts/purge-harness-data.mjs

create or replace function public.is_harness_person(p_cc text, p_grupo text, p_name text)
returns boolean
language sql
immutable
as $$
  select
    coalesce(p_cc, '') = '12345'
    or coalesce(p_cc, '') like 'MANUAL\_%' escape '\'
    or lower(coalesce(p_grupo, '')) = 'harness'
    or (
      coalesce(p_cc, '') ~ '^88[0-9]{5,}$'
      and (
        coalesce(p_name, '') ilike '%harness%'
        or coalesce(p_name, '') ilike 'PW %'
      )
    );
$$;

create or replace function public.preview_test_data_cleanup(p_offering_code text default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_harness jsonb;
  v_progress jsonb;
begin
  select coalesce(jsonb_agg(jsonb_build_object(
    'cc', p.cc,
    'name', p.name,
    'grupo', e.grupo,
    'offering_code', co.code
  ) order by co.code, p.name), '[]'::jsonb)
  into v_harness
  from public.enrollments e
  join public.people p on p.id = e.person_id
  join public.course_offerings co on co.id = e.offering_id
  where public.is_harness_person(p.cc, e.grupo, p.name)
    and (p_offering_code is null or co.code = p_offering_code);

  select coalesce(jsonb_agg(jsonb_build_object(
    'cc', r.student_id,
    'name', r.student_name,
    'grupo', r.grupo,
    'offering_code', r.offering_code,
    'xp_total', r.xp_total,
    'semanas_visitadas', r.semanas_visitadas
  ) order by r.offering_code, r.xp_total desc), '[]'::jsonb)
  into v_progress
  from public.v_legacy_resumen_docente r
  where r.xp_total > 0
    and (p_offering_code is null or r.offering_code = p_offering_code)
    and (
      r.student_id = '12345'
      or r.student_id in (
        '1042856266', '1043448681',
        '1050544752', '1043663975', '1007890090', '1007971817'
      )
      or exists (
        select 1
        from public.v_legacy_student_progress pr
        where pr.student_id = r.student_id
          and pr.offering_code = r.offering_code
          and (pr.quiz_answers ? '_harness_marker')
      )
    );

  return jsonb_build_object(
    'harness_students', v_harness,
    'test_progress', v_progress,
    'default_progress_cc', jsonb_build_object(
      'ADM18-2026-2', jsonb_build_array('1042856266', '1043448681', '12345'),
      'TD-2026-2', jsonb_build_array('1050544752', '1043663975', '1007890090', '1007971817', '12345')
    )
  );
end;
$$;

create or replace function public.purge_harness_students(p_offering_code text default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_deleted_enrollments int := 0;
  v_deleted_people int := 0;
  v_ccs text[];
begin
  select coalesce(array_agg(distinct p.cc), '{}')
  into v_ccs
  from public.enrollments e
  join public.people p on p.id = e.person_id
  join public.course_offerings co on co.id = e.offering_id
  where public.is_harness_person(p.cc, e.grupo, p.name)
    and (p_offering_code is null or co.code = p_offering_code);

  delete from public.enrollments e
  using public.people p, public.course_offerings co
  where e.person_id = p.id
    and e.offering_id = co.id
    and public.is_harness_person(p.cc, e.grupo, p.name)
    and (p_offering_code is null or co.code = p_offering_code);

  get diagnostics v_deleted_enrollments = row_count;

  delete from public.people p
  where public.is_harness_person(p.cc, '', p.name)
    and not exists (
      select 1 from public.enrollments e where e.person_id = p.id
    );

  get diagnostics v_deleted_people = row_count;

  return jsonb_build_object(
    'ok', true,
    'offering_filter', p_offering_code,
    'deleted_enrollments', v_deleted_enrollments,
    'deleted_people', v_deleted_people,
    'ccs', v_ccs
  );
end;
$$;

create or replace function public.purge_student_progress(
  p_offering_code text,
  p_cc_list text[]
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_offering_id uuid;
  v_enrollment_ids uuid[];
  v_participation int := 0;
  v_attendance int := 0;
  v_attempts int := 0;
  v_completions int := 0;
  v_xp int := 0;
begin
  if p_offering_code is null or trim(p_offering_code) = '' then
    raise exception 'offering_code required';
  end if;
  if p_cc_list is null or cardinality(p_cc_list) = 0 then
    raise exception 'cc_list required';
  end if;

  select id into v_offering_id
  from public.course_offerings
  where code = p_offering_code;

  if v_offering_id is null then
    raise exception 'offering not found: %', p_offering_code;
  end if;

  select coalesce(array_agg(e.id), '{}')
  into v_enrollment_ids
  from public.enrollments e
  join public.people p on p.id = e.person_id
  where e.offering_id = v_offering_id
    and p.cc = any(p_cc_list);

  if cardinality(v_enrollment_ids) = 0 then
    return jsonb_build_object(
      'ok', true,
      'offering', p_offering_code,
      'ccs', p_cc_list,
      'enrollments_touched', 0
    );
  end if;

  delete from public.participation_events where enrollment_id = any(v_enrollment_ids);
  get diagnostics v_participation = row_count;

  delete from public.enrollment_attendance where enrollment_id = any(v_enrollment_ids);
  get diagnostics v_attendance = row_count;

  delete from public.exercise_attempts where enrollment_id = any(v_enrollment_ids);
  get diagnostics v_attempts = row_count;

  delete from public.activity_completions where enrollment_id = any(v_enrollment_ids);
  get diagnostics v_completions = row_count;

  delete from public.xp_ledger where enrollment_id = any(v_enrollment_ids);
  get diagnostics v_xp = row_count;

  return jsonb_build_object(
    'ok', true,
    'offering', p_offering_code,
    'ccs', p_cc_list,
    'enrollments_touched', cardinality(v_enrollment_ids),
    'deleted', jsonb_build_object(
      'participation_events', v_participation,
      'attendance', v_attendance,
      'exercise_attempts', v_attempts,
      'activity_completions', v_completions,
      'xp_ledger', v_xp
    )
  );
end;
$$;

create or replace function public.purge_all_test_data()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_harness jsonb;
  v_adm18 jsonb;
  v_td jsonb;
begin
  v_harness := public.purge_harness_students(null);

  v_adm18 := public.purge_student_progress(
    'ADM18-2026-2',
    array['1042856266', '1043448681', '12345']
  );

  v_td := public.purge_student_progress(
    'TD-2026-2',
    array['1050544752', '1043663975', '1007890090', '1007971817', '12345']
  );

  return jsonb_build_object(
    'ok', true,
    'harness_students', v_harness,
    'adm18_progress', v_adm18,
    'td_progress', v_td
  );
end;
$$;

grant execute on function public.preview_test_data_cleanup(text) to anon;
grant execute on function public.purge_harness_students(text) to anon;
grant execute on function public.purge_student_progress(text, text[]) to anon;
grant execute on function public.purge_all_test_data() to anon;
