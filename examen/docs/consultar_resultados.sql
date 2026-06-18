-- ══════════════════════════════════════════════════════════════
--  ADM18 · Examen Parcial 1
--  CONSULTA DE RESULTADOS POR ESTUDIANTE
--  Úsalo en el SQL Editor de Supabase
-- ══════════════════════════════════════════════════════════════

-- CAMBIA '1042856266' POR LA CÉDULA DEL ESTUDIANTE
-- CAMBIA 'parcial1' POR EL TIPO DE EXAMEN (si cambia)

-- ── 1. RESUMEN DE INTENTOS ──────────────────────────────────
-- Muestra todos los intentos del estudiante, su nota y estado

WITH intentos AS (
    SELECT 
        a.id AS attempt_id,
        a.student_cc,
        p.name AS estudiante,
        a.status,
        a.current_step,
        a.correct_count,
        a.score,
        a.tab_switches,
        a.started_at,
        a.finished_at,
        ROW_NUMBER() OVER (ORDER BY a.started_at) AS intento_nro
    FROM public.exam_attempts a
    JOIN public.people p ON p.cc = a.student_cc
    WHERE a.student_cc = '1042856266'  -- ← CÉDULA DEL ESTUDIANTE
      AND a.exam_type = 'parcial1'
)
SELECT 
    i.intento_nro                                          AS "#Intento",
    i.estudiante                                           AS "Estudiante",
    INITCAP(i.status)                                      AS "Estado",
    i.correct_count || ' / 12'                             AS "Correctas",
    ROUND(i.score::numeric, 2)                             AS "Nota",
    i.tab_switches                                         AS "Ausencias >10s",
    TO_CHAR(i.started_at AT TIME ZONE 'America/Bogota', 
            'DD/MM/YYYY HH24:MI')                          AS "Inicio",
    TO_CHAR(i.finished_at AT TIME ZONE 'America/Bogota', 
            'DD/MM/YYYY HH24:MI')                          AS "Fin"
FROM intentos i
ORDER BY i.intento_nro;

-- ── 2. RESPUESTAS DEL ÚLTIMO INTENTO ────────────────────────
-- Muestra pregunta por pregunta qué respondió el estudiante,
-- cuál era la respuesta correcta, y la justificación

WITH ultimo_intento AS (
    SELECT id AS attempt_id
    FROM public.exam_attempts
    WHERE student_cc = '1042856266'  -- ← CÉDULA DEL ESTUDIANTE
      AND exam_type = 'parcial1'
    ORDER BY started_at DESC
    LIMIT 1
)
SELECT 
    ea.step_number                                          AS "#Preg",
    q.category_code || ' — ' || q.category_name            AS "Categoría",
    q.question_text                                         AS "Pregunta",
    ea.selected_option                                      AS "Resp. Est.",
    q.correct_option                                        AS "Resp. Correcta",
    CASE WHEN ea.is_correct 
         THEN '✅ CORRECTA' 
         ELSE '❌ INCORRECTA' 
    END                                                     AS "Resultado",
    CASE ea.selected_option
        WHEN 'A' THEN q.option_a
        WHEN 'B' THEN q.option_b
        WHEN 'C' THEN q.option_c
        WHEN 'D' THEN q.option_d
        ELSE 'Sin responder'
    END                                                     AS "Texto de su respuesta",
    CASE q.correct_option
        WHEN 'A' THEN q.option_a
        WHEN 'B' THEN q.option_b
        WHEN 'C' THEN q.option_c
        WHEN 'D' THEN q.option_d
    END                                                     AS "Texto respuesta correcta",
    q.reference                                             AS "Fuente / Referencia"
FROM public.exam_answers ea
JOIN public.exam_questions q ON q.id = ea.question_id
CROSS JOIN ultimo_intento u
WHERE ea.attempt_id = u.attempt_id
ORDER BY ea.step_number;

-- ── 3. PROMEDIO GENERAL ─────────────────────────────────────
-- Calcula el promedio de todos los intentos (nota definitiva)

SELECT 
    p.name                                                  AS "Estudiante",
    COUNT(a.id)                                             AS "Intentos realizados",
    ROUND(AVG(a.score)::numeric, 2)                         AS "Nota definitiva (promedio)",
    ROUND(SUM(a.tab_switches)::numeric, 0)                  AS "Total ausencias >10s",
    MIN(a.started_at AT TIME ZONE 'America/Bogota')         AS "Primer intento",
    MAX(a.finished_at AT TIME ZONE 'America/Bogota')        AS "Último intento"
FROM public.exam_attempts a
JOIN public.people p ON p.cc = a.student_cc
WHERE a.student_cc = '1042856266'  -- ← CÉDULA DEL ESTUDIANTE
  AND a.exam_type = 'parcial1'
  AND a.status = 'finished'
GROUP BY p.name;
