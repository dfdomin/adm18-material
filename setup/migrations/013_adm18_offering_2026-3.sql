-- ADM18 · Periodo 2026-3: alta de la oferta, sus 14 semanas y el roster inicial
-- Fuente: Lista Asistencia 2026-3.xlsx (19 estudiantes con documento registrado)
-- Idempotente: se puede ejecutar varias veces sin duplicar.
-- Ejecutar DESPUES de gamification_unified.sql, 003 y 004.
--
-- Grupo asumido para 2026-3: 1_CE_G2 (el mismo del periodo 2026-2). Ajustar si cambio.

-- 1) Oferta del periodo nuevo -----------------------------------
insert into public.course_offerings (module_id, term, year, code)
select m.id, '2026-3', 2026, 'ADM18-2026-3'
from public.modules m where m.code = 'ADM18'
on conflict (code) do nothing;

-- 2) 14 semanas + actividades (mismo patron que 003) ------------
do $$
declare
  v_offering_id uuid;
  v_period_id uuid;
  v_ord int;
begin
  select id into v_offering_id from public.course_offerings where code = 'ADM18-2026-3';
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

-- 3) Roster: estudiantes con documento de identidad ya registrado
select public.upsert_roster_students(
  'ADM18-2026-3',
  '[
  {
    "cc": "1045716858",
    "name": "AHUMADA BUSTAMANTE CARLOS FABIAN",
    "grupo": "1_CE_G2",
    "horario": ""
  },
  {
    "cc": "1002156496",
    "name": "CABALLERO MASCO MAURO ENRIQUE",
    "grupo": "1_CE_G2",
    "horario": ""
  },
  {
    "cc": "1192796559",
    "name": "CABARCAS DEL CASTILLO MARIAM ELIZABETH",
    "grupo": "1_CE_G2",
    "horario": ""
  },
  {
    "cc": "1143161118",
    "name": "CARDENAS VELEZ PAULA ANDREA",
    "grupo": "1_CE_G2",
    "horario": ""
  },
  {
    "cc": "1044635593",
    "name": "CASTILLO VASQUEZ CINDY",
    "grupo": "1_CE_G2",
    "horario": ""
  },
  {
    "cc": "1129524754",
    "name": "CERVANTES ALANDETE KEVIN ANDRES",
    "grupo": "1_CE_G2",
    "horario": ""
  },
  {
    "cc": "1001824919",
    "name": "DE LA ROSA GONZALEZ KEVIN ANDRES",
    "grupo": "1_CE_G2",
    "horario": ""
  },
  {
    "cc": "1043678174",
    "name": "DOMINGUEZ GONZALEZ SANTIAGO MIGUEL",
    "grupo": "1_CE_G2",
    "horario": ""
  },
  {
    "cc": "1143261269",
    "name": "JIMÉNEZ DE LA CRUZ LUIS FERNANDO",
    "grupo": "1_CE_G2",
    "horario": ""
  },
  {
    "cc": "1002036761",
    "name": "MONTENEGRO GUERRA JESUS ALEXANDER",
    "grupo": "1_CE_G2",
    "horario": ""
  },
  {
    "cc": "1143130606",
    "name": "MUÑOZ CORREA KATHERINE PAOLA",
    "grupo": "1_CE_G2",
    "horario": ""
  },
  {
    "cc": "1193524265",
    "name": "NATERA FONSECA DILAN ENRIQUE",
    "grupo": "1_CE_G2",
    "horario": ""
  },
  {
    "cc": "1045689173",
    "name": "ORTEGA BEDOYA LUIS LEONARDO",
    "grupo": "1_CE_G2",
    "horario": ""
  },
  {
    "cc": "1045736960",
    "name": "ORTEGA OLIVERO BEQUERLEY MARIA",
    "grupo": "1_CE_G2",
    "horario": ""
  },
  {
    "cc": "22740661",
    "name": "ROLONG NAVARRO KAREN MARGARITA",
    "grupo": "1_CE_G2",
    "horario": ""
  },
  {
    "cc": "1192767187",
    "name": "RUIZ FRANCO CAMILA ANDREA MARIA",
    "grupo": "1_CE_G2",
    "horario": ""
  },
  {
    "cc": "55224455",
    "name": "SALAS FERNANDEZ TATIANA SIRLE",
    "grupo": "1_CE_G2",
    "horario": ""
  },
  {
    "cc": "1044616859",
    "name": "SIADO LOZANO DANNA VANESA",
    "grupo": "1_CE_G2",
    "horario": ""
  },
  {
    "cc": "1043678634",
    "name": "VASQUEZ GUZMAN ANDRES CAMILO",
    "grupo": "1_CE_G2",
    "horario": ""
  }
]'::jsonb
) as estudiantes_registrados;