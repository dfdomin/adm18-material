-- ADM18 · Ampliar estados de asistencia: Motivo (M) e Incapacitado (I)
-- Ejecutar en Supabase SQL Editor después de los scripts anteriores.

alter table public.enrollment_attendance
  drop constraint if exists enrollment_attendance_estado_check;

alter table public.enrollment_attendance
  add constraint enrollment_attendance_estado_check
  check (estado in ('P', 'T', 'F', 'M', 'I'));

comment on column public.enrollment_attendance.estado is
  'P=Presente, T=Tardanza, F=Ausente, M=Motivo justificado, I=Incapacitado';
