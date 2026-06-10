-- Acceso docente (usuario/contraseña) + resumen por grupo

create extension if not exists pgcrypto;

create table if not exists public.teacher_accounts (
  id uuid primary key default gen_random_uuid(),
  username text not null unique,
  password_hash text not null,
  display_name text not null default '',
  modules text[] not null default array['ADM18','TGA04','TGA05','TD'],
  active boolean not null default true,
  created_at timestamptz not null default now()
);

insert into public.teacher_accounts (username, password_hash, display_name, modules)
values (
  'docente',
  crypt('sasadfgh2019', gen_salt('bf')),
  'Docente IUB',
  array['ADM18','TGA04','TGA05','TD']
)
on conflict (username) do update set
  password_hash = excluded.password_hash,
  display_name = excluded.display_name,
  modules = excluded.modules,
  active = true;

create or replace function public.verify_teacher_login(
  p_username text,
  p_password text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rec public.teacher_accounts%rowtype;
begin
  if p_username is null or p_password is null then
    return jsonb_build_object('ok', false, 'error', 'invalid');
  end if;

  select * into v_rec
  from public.teacher_accounts
  where lower(username) = lower(trim(p_username))
    and active = true;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'invalid');
  end if;

  if v_rec.password_hash = crypt(p_password, v_rec.password_hash) then
    return jsonb_build_object(
      'ok', true,
      'username', v_rec.username,
      'display_name', v_rec.display_name,
      'modules', to_jsonb(v_rec.modules)
    );
  end if;

  return jsonb_build_object('ok', false, 'error', 'invalid');
end;
$$;

grant execute on function public.verify_teacher_login(text, text) to anon;

create or replace view public.v_group_progress
  with (security_invoker = true)
as
select
  co.code as offering_code,
  m.code as module_code,
  m.name as module_name,
  coalesce(nullif(e.grupo, ''), 'Sin grupo') as grupo,
  coalesce(nullif(e.horario, ''), 'Sin horario') as horario,
  count(distinct e.id) as estudiantes,
  coalesce(sum(xl.points), 0) as xp_total,
  coalesce(avg(xl.points), 0) as xp_promedio,
  max(xl.created_at) as ultima_actividad
from public.enrollments e
join public.course_offerings co on co.id = e.offering_id
join public.modules m on m.id = co.module_id
left join public.xp_ledger xl on xl.enrollment_id = e.id
group by co.code, m.code, m.name, e.grupo, e.horario;

grant select on public.v_group_progress to anon;
