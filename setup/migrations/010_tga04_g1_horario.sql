-- TGA04 · Grupo 6_GA_G1: Lunes 2h + Miércoles 2h (corregir horario mal importado con nombre de docente)

update public.enrollments e
set horario = 'LUNES 2h + MIERCOLES 2h'
from public.course_offerings co
where e.offering_id = co.id
  and co.code = 'TGA04-2026-2'
  and e.grupo = '6_GA_G1'
  and (
    e.horario is null
    or e.horario = ''
    or e.horario ilike '%DOMINGO DE LA CRUZ%'
    or not (
      e.horario ilike '%LUNES%'
      or e.horario ilike '%MIERCOLES%'
      or e.horario ilike '%MIÉRCOLES%'
      or e.horario ~ '\d{1,2}:\d{2}'
    )
  );
