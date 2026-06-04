# PROJECT_STATE.md — ADM18 Course Web Application

**Ultima actualizacion**: 2026-05-31
**Sprint activo**: S7 — Correcciones post-revision + mobile-first + deploy
**S0**: ✅ | **S1**: ✅ | **S2**: ✅ | **S3**: ✅ | **S4**: ✅ |
**S5**: ✅ | **S6**: ✅ | **S7**: ⬜ Pendiente

> Este archivo puede copiarse directamente al contexto de una nueva
> sesion de Claude, Codex o Hermes para retomar el trabajo sin perdida
> de contexto.

---

## 1. Que Es Este Proyecto

Aplicacion web estatica para el modulo ADM18 — Procesamiento de la
Informacion en la Organizacion de IUB/Unibarranquilla.

**Stack**: HTML/CSS/JS vanilla + Supabase (opcional) + GitHub Pages
**Fuente de verdad**: KNOWLEDGE_BASE.md + docs/PRD.md
**Instrucciones**: system-prompt-v2.txt, SKILL-v2.md

---

## 2. Estado por Capa

| Capa | Estado | Detalle |
|------|--------|---------|
| **Documentacion** | ✅ | PRD.md, ARCHITECTURE.md, ROLE_PERMISSION_MATRIX.md en docs/ |
| **Memoria del proyecto** | ✅ | PROJECT_STATE, DECISIONS, NEXT_STEPS en memory/ |
| **Design system** | ✅ | css/iub-tokens.css con todos los tokens y componentes |
| **JS modules** | ✅ | 5 modulos IIFE: app, quiz-engine, supabase-client, gtc185-checklist, file-naming-simulator |
| **Landing page** | ⚠️ | index.html existe pero tiene 2 issues (ver §6) |
| **14 week pages** | ✅ | Cada semana-NN/ tiene index.html + guia-docente.html |
| **Dashboards** | ✅ | progreso, profesor, notas, participacion |
| **Instrumentos** | ✅ | 4 rubricas + 3 examenes + 5 PLO alignments (12 .md total) |
| **PDFs de instrumentos** | ⚠️ | _gen_pdf.py tiene bug con lineas '>' — no se generaron los PDFs nuevos |
| **Casos** | ✅ | 31 documentos en 4 carpetas, cada uno con .md + formato nativo + .pdf |
| **Supabase** | ❌ | No configurado — credenciales placeholder |
| **GitHub Pages** | ❌ | No desplegado |
| **mobile-first verificacion** | ❌ | No auditado |

---

## 3. Que Existe en el Repositorio

```
docs/
  PRD.md                    ← v1.0 — fuente de verdad del producto
  ARCHITECTURE.md            ← v1.0 — arquitectura del sistema
  ROLE_PERMISSION_MATRIX.md  ← v1.0 — matriz de acceso

memory/
  PROJECT_STATE.md           ← Este archivo
  DECISIONS.md               ← Registro de decisiones
  NEXT_STEPS.md              ← Tareas pendientes atomicas

css/
  iub-tokens.css             ← Design system completo (11461 bytes)

js/
  app.js                     ← Core module (4351 bytes)
  quiz-engine.js             ← Quiz engine (5347 bytes)
  supabase-client.js         ← Supabase client (4301 bytes)
  gtc185-checklist.js        ← GTC 185 checklist (4920 bytes)
  file-naming-simulator.js   ← File naming practice (7744 bytes)

HTML principal:
  index.html                 ← Landing (⚠️ ver issues)
  progreso.html              ← Student progress
  profesor.html              ← Teacher dashboard
  notas.html                 ← Grade calculator
  participacion.html         ← Participation metrics

14 week folders:
  semana-01/ a semana-14/
    index.html               ← Student page
    guia-docente.html        ← Teacher guide

instrumentos/ (12 .md + 3 .pdf heredados):
  PI1, PI2, PI3, PI4_Rubrica_ADM18.md
  Parcial1_ADM18_EnviosPacifico.md
  Parcial2_ADM18_AndesBox.md
  Final_ADM18_GlobalBox.md
  PLO_Alignment_CE_RA1-5_ADM18.md

casos/ (31 documentos en 4 carpetas):
  latambox/ (12), envios_pacifico/ (6),
  andesbox/ (5), globalbox/ (8)

Archivos de instruccion v2:
  system-prompt-v2.txt       ← LLM prompt abstracto
  SKILL-v2.md                ← Workflows genericos
  MODULE_CONTEXT.md          ← Plantilla de identidad del modulo
```

---

## 4. Decisiones Tomadas

| Decision | Fecha | Detalle |
|----------|-------|---------|
| Stack vanilla | 2026-05-31 | HTML/CSS/JS sin build step |
| Mobile-first | 2026-05-31 | Prioridad sobre DG-TSI-09-V4 por instruccion docente |
| Sin backend obligatorio | 2026-05-31 | localStorage + Supabase opcional |
| 14 carpetas independientes | 2026-05-31 | Una por semana con index.html + guia-docente.html |
| Guias docentes en HTML | 2026-05-31 | Navegables, no PDF |
| IIFE modules | 2026-05-31 | Patron TGA04 NeuroBiz, sin scope global |
| Dual format .md+.pdf | 2026-05-31 | Instrumentos y KB |
| Module isolation v2 | 2026-05-31 | Archivos de instruccion abstractos, confirman modulo |

Ver `memory/DECISIONS.md` para ADRs completos.

---

## 5. Sprints

| Sprint | Estado | Contenido |
|--------|--------|-----------|
| **S0** | ✅ | Documentacion + design system + scaffolding |
| **S1** | ✅ | Semanas 1-4 + quiz engine |
| **S2** | ✅ | Semanas 5-7 + Parcial 1 + GTC185 widget |
| **S3** | ✅ | Semanas 8-10 + Parcial 2 + profesor dashboard |
| **S4** | ✅ | Semanas 11-14 + Final + file-naming simulator |
| **S5** | ✅ | Dashboards (progreso, notas, participacion) + guias docentes 14 semanas |
| **S6** | ✅ | Instrumentos faltantes (PI1, PI2, PI4, Parcial1, Final, PLOs) |
| **S7** | ⬜ | Correcciones + mobile-first + deploy |

---

## 6. Issues Activos (Bloqueantes para S7)

| # | Issue | Severidad | Archivo(s) |
|---|-------|-----------|------------|
| 1 | Progress bar es una barra simple, no 14 pills individuales | Alta | index.html |
| 2 | index.html no tiene seccion "Material de Estudio" | Alta | index.html |
| 3 | Imagen de referencia no analizada ("Falta seguir ese estilo.png") | Alta | index.html |
| 4 | PDFs de instrumentos nuevos no generados | Media | instrumentos/*.md |
| 5 | Supabase no configurado | Baja | js/supabase-client.js |
| 6 | Mobile-first no auditado en todas las paginas | Media | *.html |
| 7 | WCAG 2.1 AA no verificado | Media | css/iub-tokens.css |
| 8 | GitHub Pages no configurado | Baja | Repo |

---

## 7. Metricas de Progreso

| Metrica | Estado | Meta |
|---------|--------|------|
| Semanas construidas | 14/14 (100%) | 14/14 |
| Quizzes funcionales | 11/11 (100%) | 11/11 |
| Guias docentes | 14/14 (100%) | 14/14 |
| Instrumentos .md | 12/12 (100%) | 12/12 |
| Instrumentos .pdf | 3/12 (25%) | 12/12 |
| Dashboards | 4/4 (100%) | 4/4 |
| Documentos del caso enlazados | 31/31 (100%) | 31/31 |
| Issues corregidos | 0/8 (0%) | 8/8 |

---

## 8. Contexto para Agente de IA

1. **La fuente de verdad es `docs/PRD.md` v1.0** — leer antes de implementar.
2. **NUNCA usar read_file → write_file** — usar Python open() en execute_code.
3. **Mobile-first es prioridad** — 320px es el punto de partida, no 1024px.
4. **Las guias docentes tienen estilo propio** — borde dorado, fondo crema, print-friendly.
5. **Los quizzes usan QuizEngine.init(weekNum, questions)** — ver js/quiz-engine.js.
6. **El progreso usa localStorage keys** — ver ARCHITECTURE.md §3.2.
7. **No introducir tecnologias no listadas en PRD §8**.
8. **Las semanas de examen (5,10,14) NO llevan quiz** — llevan mensaje de evaluacion.
9. **MODULE_CONTEXT.md debe cargarse al iniciar sesion** — si no existe, preguntar.
10. **La imagen "Falta seguir ese estilo.png" es la referencia visual para el landing.**

---

> **Archivo generado:** 2026-05-31 · ADM18 · IUB/Unibarranquilla
