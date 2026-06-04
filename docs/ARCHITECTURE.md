# ARCHITECTURE.md — ADM18 Course Web Application

**Version del documento**: 1.1
**Fecha**: 2026-05-31
**Referencia PRD**: v1.0
**Audiencia**: Desarrolladores, revisores, agentes de IA

> Un desarrollador que lea este documento debe entender el sistema en
> 5 minutos, sin necesidad de leer el PRD ni ningun otro documento.

---

## 1. Descripcion del Sistema

Aplicacion web estatica (sin build step, sin servidor) para el modulo
ADM18 — Procesamiento de la Informacion en la Organizacion de IUB.

**Que es**: 19 paginas HTML + 5 modulos JS + 1 archivo CSS que forman
un curso web completo con 14 semanas de contenido, quizzes autocalificables,
documentos del caso integrador y dashboards de progreso.

**Que NO es**: Una aplicacion con backend. No hay API, no hay base de
datos obligatoria, no hay autenticacion. Todo el estado se guarda en
localStorage del navegador. Supabase es opcional para sync entre
dispositivos.

**Stack**: HTML/CSS/JS vanilla → GitHub Pages
**Infraestructura**: ninguna (hosting estatico gratuito)

---

## 2. Estructura del Repositorio

```
ProcesamientoInformacion/
├── index.html                    # Landing page (hub del curso)
├── progreso.html                 # Dashboard: progreso del estudiante
├── profesor.html                 # Dashboard: panel del docente
├── notas.html                    # Dashboard: calculadora de notas
├── participacion.html            # Dashboard: metricas de participacion
│
├── css/
│   └── iub-tokens.css            # Design system (tokens, layout, componentes)
│
├── js/
│   ├── app.js                    # Core module (IIFE): state, progress, navigation
│   ├── quiz-engine.js            # Quiz engine (IIFE): render, submit, score
│   ├── supabase-client.js        # Supabase client (IIFE): optional sync
│   ├── gtc185-checklist.js       # GTC 185 interactive checklist (IIFE)
│   └── file-naming-simulator.js  # File naming practice tool (IIFE)
│
├── semana-01/ ... semana-14/     # 14 week folders
│   ├── index.html                # Student page (content + quiz)
│   └── guia-docente.html         # Teacher guide (objectives, answers, rubrics)
│
├── docs/                         # Technical documentation
│   ├── PRD.md                    # Product requirements
│   ├── ARCHITECTURE.md           # This file
│   └── ROLE_PERMISSION_MATRIX.md # Access matrix
│
├── memory/                       # Project state (AI context persistence)
│   ├── PROJECT_STATE.md          # Current state, active sprint, metrics
│   ├── DECISIONS.md              # Architecture Decision Records
│   └── NEXT_STEPS.md             # Atomic pending tasks
│
├── instrumentos/                 # Assessment instruments
│   ├── PI1_Rubrica_ADM18.md + .pdf
│   ├── PI2_Rubrica_ADM18.md + .pdf
│   ├── PI3_Rubrica_ADM18.md + .pdf
│   ├── PI4_Rubrica_ADM18.md + .pdf
│   ├── Parcial1_ADM18_EnviosPacifico.md + .pdf
│   ├── Parcial2_ADM18_AndesBox.md + .pdf
│   ├── Final_ADM18_GlobalBox.md + .pdf
│   ├── PLO_Alignment_CE_RA1-5_ADM18.md (5 files)
│   ├── _gen_pdf.py               # PDF generator from .md
│   └── pdf-style.css             # PDF styling
│
├── casos/                        # Case study documents (31 docs × 4 companies)
│   ├── latambox/                  # 12 docs — formativo
│   ├── envios_pacifico/           # 6 docs — Parcial 1
│   ├── andesbox/                  # 5 docs — Parcial 2
│   └── globalbox/                 # 8 docs — Final
│
├── KNOWLEDGE_BASE.md             # AI reference (source of truth)
├── MODULE_CONTEXT.md             # Module identity (loaded at session start)
├── system-prompt-v2.txt          # LLM system prompt (module-agnostic)
├── SKILL-v2.md                   # Workflow skill (module-agnostic)
├── reference.md                  # Architecture/security patterns reference
└── PlanDeClases_ADM18_LatamBox_2026.html  # Detailed class plan
```

---

## 3. Arquitectura de Datos

### 3.1 Flujo de Datos del Estudiante

```
Navegador (localStorage)
  │
  ├── adm18_progress   ← { week_1: {completed, timestamp}, ... }
  ├── adm18_scores     ← { week_1: {score, total, percent, timestamp, synced}, ... }
  ├── adm18_settings   ← { darkMode, fontSize, ... }
  │
  └── (opcional) Supabase
        ├── quiz_scores     ← sync desde localStorage
        └── student_progress ← sync desde localStorage
```

### 3.2 localStorage Keys

| Key | Tipo | Escritura | Lectura |
|-----|------|-----------|---------|
| `adm18_progress` | Object | QuizEngine.submit() | ADM18App, progreso.html, index.html |
| `adm18_scores` | Object | QuizEngine.submit() | ADM18App, progreso.html, notas.html |
| `adm18_settings` | Object | (manual) | ADM18App |
| `adm18_grades` | Object | notas.html | notas.html |
| `adm18_participation` | Object | participacion.html | participacion.html |
| `adm18_groups` | Object | participacion.html | participacion.html |
| `adm18_coeval` | Object | participacion.html | participacion.html |

### 3.3 Sincronizacion con Supabase (opcional)

```
localStorage ──(best effort)──→ Supabase
     ↑                              │
     └──(read on load)──────────────┘

Sync pattern (reference.md §5.2):
1. Save locally first (instant feedback)
2. Try Supabase upsert (best-effort)
3. Mark synced=true on success
4. Retry unsynced on 30s interval
```

### 3.4 Vision objetivo: una BD para multiples modulos/proyectos

El estado actual usa tablas enfocadas en ADM18 (`quiz_scores`,
`student_progress`, `student_participation`). Para no crear un proyecto
Supabase por cada modulo, la arquitectura objetivo debe ser multi-proyecto
en una sola base de datos compartida.

Principio: toda fila debe quedar segmentada por contexto academico.

Campos de segmentacion minimos:
- `tenant_id` (institucion o unidad academica)
- `program_id` (programa academico, ej. Comercio Exterior)
- `module_id` (ej. ADM18)
- `cohort_id` o `group_id` (opcional, para paralelos)
- `student_id`
- `week_number` (cuando aplique)

Regla de arquitectura:
- No crear tablas por modulo (`adm18_*`, `admXX_*`).
- Reusar tablas canonicas con columnas de segmentacion.
- Aplicar RLS por `tenant_id`/`program_id`/`module_id` y usuario.

### 3.5 Modelo de datos canonico (multi-modulo)

Tablas funcionales sugeridas:

| Tabla | Proposito | Claves principales |
|------|-----------|--------------------|
| `tenants` | Institucion/organizacion | `id`, `name` |
| `programs` | Programas academicos | `id`, `tenant_id`, `code`, `name` |
| `modules` | Modulos/materias | `id`, `program_id`, `code`, `name` |
| `module_weeks` | Definicion de semanas | `id`, `module_id`, `week_number`, `title` |
| `students` | Identidad academica | `id`, `tenant_id`, `external_ref`, `display_name` |
| `enrollments` | Estudiante en modulo/cohorte | `id`, `student_id`, `module_id`, `cohort_id` |
| `activities` | Quiz, checklist, taller, parcial | `id`, `module_id`, `week_number`, `activity_type` |
| `questions` | Banco de preguntas por actividad | `id`, `activity_id`, `field_key`, `input_type`, `required` |
| `question_dependencies` | Logica condicional de preguntas | `id`, `question_id`, `depends_on_question_id`, `operator`, `expected_value` |
| `response_sessions` | Intento/sesion de respuesta | `id`, `student_id`, `activity_id`, `status`, `started_at`, `submitted_at` |
| `responses` | Respuesta por campo/pregunta | `id`, `response_session_id`, `question_id`, `field_key`, `value_jsonb` |
| `progress_snapshots` | Avance agregado por estudiante/modulo | `id`, `student_id`, `module_id`, `completion_pct`, `payload_jsonb` |
| `participation_logs` | Participacion, grupos, coevaluacion | `id`, `student_id`, `module_id`, `week_number`, `payload_jsonb` |

Notas:
- `value_jsonb` y `payload_jsonb` permiten flexibilidad sin perder
  estructura principal.
- `field_key` permite mapear respuestas a UI/campos estables.
- `activity_type` permite soportar quiz, participacion y evaluaciones en
  un mismo modelo.

### 3.6 Preguntas dependientes de campos (reglas condicionales)

Objetivo: una pregunta aparece o se valida segun respuestas previas.

Modelo:
- `questions.field_key`: identificador estable (ej. `uso_ia`).
- `question_dependencies` define reglas tipo:
  - `question_id = Q2`
  - `depends_on_question_id = Q1`
  - `operator = '='`
  - `expected_value = "si"`

Semantica recomendada:
- Si una pregunta tiene dependencias, solo es visible/respondible cuando
  todas sus reglas se cumplen.
- En backend, validar que no se persistan respuestas de preguntas ocultas.
- En frontend, recalcular visibilidad al cambiar campos dependientes.

Operadores minimos sugeridos:
- `=`, `!=`, `>`, `>=`, `<`, `<=`, `in`, `not_in`, `contains`,
  `is_true`, `is_false`, `is_null`, `is_not_null`.

### 3.7 Compatibilidad con estado actual

Migracion incremental (sin romper ADM18 actual):
1. Mantener tablas actuales (`quiz_scores`, `student_progress`,
   `student_participation`) para continuidad.
2. Introducir tablas canonicas multi-modulo en paralelo.
3. Escribir nuevos modulos sobre el modelo canonico.
4. Migrar ADM18 gradualmente con jobs de backfill.
5. Desactivar tablas legacy cuando ya no existan consumidores.

Resultado esperado:
- Un solo proyecto Supabase para multiples modulos.
- Menos mantenimiento de infraestructura.
- Reutilizacion de dashboards, reglas y reportes cross-modulo.

---

## 4. Arquitectura del Frontend

### 4.1 Patron de Modulos (IIFE)

Todos los modulos JS usan Immediately Invoked Function Expressions
para evitar contaminacion del scope global:

```javascript
const ModuleName = (function() {
    'use strict';
    const state = { /* ... */ };
    function privateFn() { /* ... */ }
    return { publicFn1, publicFn2 };
})();
```

### 4.2 Dependencias entre Modulos

```
app.js (core — cargado primero)
  ├── quiz-engine.js (depende de app.js para saveQuizScore)
  ├── supabase-client.js (depende de app.js para getScores/getProgress)
  ├── gtc185-checklist.js (independiente, usa localStorage directo)
  └── file-naming-simulator.js (independiente, usa localStorage directo)
```

### 4.3 Orden de Carga en HTML

```html
<!-- 1. CSS -->
<link rel="stylesheet" href="../css/iub-tokens.css">

<!-- 2. Google Fonts -->
<link href="https://fonts.googleapis.com/css2?family=Open+Sans...">

<!-- 3. JS — core first, then dependants -->
<script src="../js/app.js"></script>
<script src="../js/quiz-engine.js"></script>
<!-- Optional: -->
<script src="../js/supabase-client.js"></script>
<script src="../js/gtc185-checklist.js"></script>
```

---

## 5. Diseno y Estilos

### 5.1 Design Tokens

Definidos en `css/iub-tokens.css` como variables CSS nativas en `:root`.
Ver PRD §9 para la lista completa.

### 5.2 Layout

Patron DG-TSI-09-V4 adaptado mobile-first:

```html
<div class="iub-layout">
  <header class="iub-header"><!-- Logo, nav --></header>
  <main class="iub-content"><!-- Contenido, max-width: 1200px --></main>
  <footer class="iub-footer"><!-- IUB branding --></footer>
</div>
```

### 5.3 Breakpoints

| Breakpoint | Target | Comportamiento |
|------------|--------|----------------|
| 320px+ | Smartphones (default) | 1 columna, nav stacked, cards full-width |
| 768px+ | Tablets | 2 columnas en week-grid, nav horizontal |
| 1024px+ | Desktop | 3-4 columnas, header inline |
| 1200px+ | Wide | 4 columnas |

### 5.4 Componentes CSS Reutilizables

- `.card` — contenedor con sombra y borde
- `.badge` + `.badge-ra1` thru `.badge-ra4`, `.badge-eval`
- `.btn` + `.btn-primary`, `.btn-gold`, `.btn-outline`
- `.alert` + `.alert-info`, `.alert-success`, `.alert-warning`, `.alert-error`
- `.quiz-container`, `.quiz-question`, `.quiz-option`
- `.doc-list`, `.doc-item`
- `.checklist`
- `.progress-bar`, `.progress-fill`
- `.week-grid`, `.week-card-link`

---

## 6. Navegacion

### 6.1 Estructura de URLs

```
/                             → index.html (landing)
/semana-NN/                   → semana-NN/index.html (week page)
/progreso.html                → progreso.html (student dashboard)
/profesor.html                → profesor.html (teacher dashboard)
/notas.html                   → notas.html (grade calculator)
/participacion.html           → participacion.html (participation)
```

### 6.2 Rutas Relativas

Todas las paginas dentro de `semana-NN/` usan rutas relativas `../` para
acceder a CSS, JS, casos, e instrumentos desde la raiz.

---

## 7. Guias Docentes

Cada `semana-NN/guia-docente.html` sigue un formato consistente:

1. Cabecera con RA badge y tiempo
2. Objetivos de aprendizaje
3. Materiales necesarios (checklist)
4. Timeline detallado con notas para el docente
5. Respuestas del quiz (si aplica)
6. Criterios de evaluacion y rubricas
7. Problemas inyectados (semanas de examen)
8. Notas "no preparar"
9. Estilo visual: borde dorado izquierdo, fondo crema, print-friendly

---

## 8. Instrumentos de Evaluacion

### 8.1 Formato Dual

Cada instrumento existe en dos formatos:
- `.md` — fuente editable (para IA y docente)
- `.pdf` — version estatica (para impresion y distribucion)

### 8.2 Pipeline de Generacion

```
.md (source) ──[_gen_pdf.py]──→ .pdf (static)
```

El script `_gen_pdf.py` usa fpdf2. Limitacion conocida: no procesa
lineas que empiezan con `>` (blockquotes).

---

## 9. Decisiones Arquitectonicas (Resumen)

| ID | Decision | Razon |
|----|----------|-------|
| ADR-01 | HTML/CSS/JS vanilla (sin framework) | Sin build step, compatible con GitHub Pages |
| ADR-02 | Sin backend obligatorio | Los quizzes son autocalificables, no hay datos sensibles |
| ADR-03 | localStorage como almacen primario | Offline-first, sin dependencia de red |
| ADR-04 | Supabase como sync opcional | Permite compartir progreso entre dispositivos |
| ADR-05 | Mobile-first (prioridad sobre DG-TSI-09-V4) | Por instruccion explicita del docente |
| ADR-06 | Una carpeta por semana | Aisla contenido, facilita navegacion y mantenimiento |
| ADR-07 | Guia docente en HTML (no PDF) | Navegable, enlazable, actualizable sin regenerar |
| ADR-08 | BD compartida multi-modulo | Evita un proyecto Supabase por modulo y permite reuso de datos/modelos |

Ver `memory/DECISIONS.md` para el registro completo con contexto y
alternativas evaluadas.

---

## 10. Restricciones y Reglas

### 10.1 No usar read_file → write_file

`read_file` de hermes_tools devuelve contenido con prefijos de numero
de linea (`     1|contenido`). Nunca pasar esa salida a `write_file`.
Usar `open()` nativo de Python en `execute_code` para transformaciones.

### 10.2 No mezclar stacks entre modulos

ADM18 usa HTML/CSS/JS vanilla. No introducir Python, FastAPI, npm,
webpack, React, ni cualquier tecnologia que no este en el PRD §8.

### 10.3 Verificar despues de cada cambio batch

Despues de modificar multiples archivos, verificar `head -3` en al
menos un archivo para confirmar que no hay contaminacion.

---

> **Archivo generado:** 2026-05-31 · ADM18 · IUB/Unibarranquilla
> **Basado en:** RA-Assessment-App docs/ARCHITECTURE.md v1.0 (patron estructural)
