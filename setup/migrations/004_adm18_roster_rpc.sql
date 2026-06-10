-- ADM18 · Importar roster de estudiantes al esquema unificado (people + enrollments)
-- Ejecutar DESPUÉS de 003_adm18_seed_and_rpc.sql

create or replace function public.upsert_roster_students(
  p_offering_code text,
  p_students jsonb
)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_offering_id uuid;
  v_student jsonb;
  v_count int := 0;
begin
  if p_students is null or jsonb_typeof(p_students) <> 'array' then
    raise exception 'p_students must be a json array';
  end if;

  select id into v_offering_id
  from public.course_offerings
  where code = p_offering_code;

  if v_offering_id is null then
    raise exception 'offering not found: %', p_offering_code;
  end if;

  for v_student in select value from jsonb_array_elements(p_students)
  loop
    if coalesce(v_student->>'cc', '') = '' then
      continue;
    end if;

    insert into public.people (cc, name)
    values (
      trim(v_student->>'cc'),
      coalesce(nullif(trim(v_student->>'name'), ''), 'Sin nombre')
    )
    on conflict (cc) do update set
      name = case
        when excluded.name <> 'Sin nombre' then excluded.name
        else public.people.name
      end;

    insert into public.enrollments (person_id, offering_id, grupo, horario)
    select
      p.id,
      v_offering_id,
      coalesce(v_student->>'grupo', ''),
      coalesce(v_student->>'horario', '')
    from public.people p
    where p.cc = trim(v_student->>'cc')
    on conflict (person_id, offering_id) do update set
      grupo = case when excluded.grupo <> '' then excluded.grupo else public.enrollments.grupo end,
      horario = case when excluded.horario <> '' then excluded.horario else public.enrollments.horario end;

    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;

grant execute on function public.upsert_roster_students(text, jsonb) to anon;
