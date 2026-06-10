-- TD · Transformación Digital — catálogo + semanas (Supabase compartido IUB)
-- Ejecutar en nnrgxuzvjtweyzkdrech (adm18-latambox)

insert into public.modules (code, name, narrative_theme)
values (
  'TD',
  'Transformación Digital en la Empresa',
  'Mercado360'
)
on conflict (code) do update set
  name = excluded.name,
  narrative_theme = excluded.narrative_theme;

insert into public.course_offerings (module_id, term, year, code)
select m.id, '2026-2', 2026, 'TD-2026-2'
from public.modules m where m.code = 'TD'
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
where m.code = 'TD'
on conflict (module_id, min_xp) do nothing;

do $$
declare
  v_offering_id uuid;
  v_period_id uuid;
  v_ord int;
begin
  select id into v_offering_id from public.course_offerings where code = 'TD-2026-2';
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
