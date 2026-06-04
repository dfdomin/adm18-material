# DECISIONS.md — Registro de Decisiones de Arquitectura

**Ultima actualizacion**: 2026-05-31
**Formato**: ADR simplificado — cada decision es independiente y autocontenida.

> Este archivo puede copiarse directamente al contexto de una nueva sesion
> de IA para proporcionar el historial de decisiones sin leer todo el PRD.

---

## ADR-01 — Stack: Vanilla HTML/CSS/JS sin Framework

| Campo | Detalle |
|-------|---------|
| **Decision** | HTML/CSS/JS vanilla + Supabase (opcional) + GitHub Pages. Sin build step, sin npm, sin bundler. |
| **Fecha** | 2026-05-31 |
| **Contexto** | El modulo ADM18 no es de programacion. El contenido es estatico (texto, quizzes, documentos). GitHub Pages ofrece hosting gratuito sin servidor. |
| **Alternativas** | React/Vue (requieren build step, node_modules, no justificables para contenido estatico); WordPress (overkill, requiere hosting PHP); Moodle (requiere servidor, administracion). |
| **Razon** | Cero dependencias de runtime. Cero costo de hosting. Cero mantenimiento de servidor. Compatible con cualquier navegador moderno. |
| **Consecuencias** | Sin componentes reutilizables tipo framework. Hay que escribir CSS vanilla. Los quizzes son manuales (no hay libreria de forms). Pero el alcance es acotado (14 paginas) y el contenido no cambia frecuentemente. |

---

## ADR-02 — Sin Backend Obligatorio (localStorage-first)

| Campo | Detalle |
|-------|---------|
| **Decision** | localStorage como almacen primario. Supabase como sync opcional entre dispositivos. |
| **Fecha** | 2026-05-31 |
| **Contexto** | Los quizzes son autocalificables (respuesta correcta unica). No hay datos personales. No hay necesidad de compartir datos entre estudiantes. |
| **Alternativas** | Supabase obligatorio (requiere que cada estudiante tenga conexion — no garantizado en aulas); backend propio (costo de servidor, overkill). |
| **Razon** | Offline-first: el estudiante puede usar la app sin internet. Los datos persisten en su navegador. Supabase es opcional para el caso de uso "quiero ver mi progreso en otro dispositivo". |
| **Consecuencias** | Los datos se pierden si el estudiante limpia el navegador. Sin analytics de uso (a menos que Supabase este activo). No hay forma de que el docente vea el progreso de todos los estudiantes centralizadamente sin Supabase. |

---

## ADR-03 — Mobile-First (prioridad sobre DG-TSI-09-V4)

| Campo | Detalle |
|-------|---------|
| **Decision** | Diseno mobile-first. Punto de partida: 320px. Desktop es una mejora, no el default. |
| **Fecha** | 2026-05-31 |
| **Contexto** | El docente explico que los estudiantes trabajan desde smartphones. DG-TSI-09-V4 especifica desktop como primary target. |
| **Alternativas** | Seguir DG-TSI-09-V4 estrictamente (desktop-primary) — iria contra la realidad del aula. |
| **Razon** | Instruccion explicita del docente: "students can work from their smartphones, that's priority above this specification". |
| **Consecuencias** | Touch targets >= 44px. Texto legible sin zoom. Navegacion adaptada a dedo. Los breakpoints de DG-TSI-09-V4 se respetan como minimo (1024px sin scroll horizontal). |

---

## ADR-04 — Una Carpeta por Semana

| Campo | Detalle |
|-------|---------|
| **Decision** | Cada semana es una carpeta independiente: `semana-NN/index.html` + `semana-NN/guia-docente.html`. |
| **Fecha** | 2026-05-31 |
| **Contexto** | Las 14 semanas comparten CSS y JS pero tienen contenido unico. |
| **Alternativas** | Un solo HTML con secciones (dificil de navegar, URL unica, no compatible con GitHub Pages routing); SPA con JS routing (requiere framework, rompe la regla vanilla). |
| **Razon** | URLs limpias: `/semana-05/`. Cada semana es autonoma. GitHub Pages soporta carpetas nativamente. El estudiante puede compartir el link de una semana especifica. |
| **Consecuencias** | 14 carpetas con archivos duplicados en estructura (header, footer, nav). Las rutas relativas requieren `../` para acceder a CSS/JS desde las subcarpetas. |

---

## ADR-05 — Guias Docentes en HTML (no PDF)

| Campo | Detalle |
|-------|---------|
| **Decision** | Las guias docentes son archivos HTML separados (`guia-docente.html`), no PDFs. |
| **Fecha** | 2026-05-31 |
| **Contexto** | El docente necesita acceder a objectives, respuestas de quizzes, criterios de evaluacion y problemas inyectados. |
| **Alternativas** | PDF (dificil de actualizar, requiere regeneracion, no tiene links navegables); Markdown (requiere visor, no es amigable para docente no tecnico). |
| **Razon** | Navegable en cualquier navegador. Links funcionales a instrumentos y rubricas. Se actualiza editando el HTML directamente. Print-friendly con @media print. |
| **Consecuencias** | Las guias docentes son visibles para cualquier persona que conozca la URL (el sitio es publico). El contenido "secreto" (respuestas de examenes) esta en los instrumentos PDF, no en las guias. |

---

## ADR-06 — IIFE Modules para JavaScript

| Campo | Detalle |
|-------|---------|
| **Decision** | Todos los modulos JS usan el patron Immediately Invoked Function Expression (IIFE). |
| **Fecha** | 2026-05-31 |
| **Contexto** | Sin build step, sin module bundler. Necesitamos evitar contaminacion del scope global. |
| **Alternativas** | ES6 modules (`import`/`export`) — requieren `type="module"` y no funcionan en `file://` (CORS). Variables globales — contaminan el scope y causan colisiones. |
| **Razon** | IIFE funciona en cualquier navegador, en `file://` y en `https://`. Cada modulo expone un solo objeto global (ej: `QuizEngine`, `ADM18App`). |
| **Consecuencias** | Los modulos deben cargarse en orden (app.js antes que quiz-engine.js). No hay tree-shaking. El acoplamiento entre modulos es explicito via el objeto global expuesto. |

---

## ADR-07 — Documentacion Harness Engineering

| Campo | Detalle |
|-------|---------|
| **Decision** | Adoptar el patron de documentacion de RA-Assessment-App: docs/ (PRD, ARCHITECTURE, ROLE_MATRIX) + memory/ (PROJECT_STATE, DECISIONS, NEXT_STEPS). |
| **Fecha** | 2026-05-31 |
| **Contexto** | El proyecto sera mantenido por multiples agentes de IA (Hermes, Codex, Claude). Necesitan contexto persistente entre sesiones. |
| **Alternativas** | Depender de la memoria interna del agente (volatil, no compartible entre agentes); un solo README (insuficiente para contexto detallado). |
| **Razon** | El patron de RA-Assessment-App probo ser exitoso: 42 sesiones, 201 tests, multiples agentes coordinados. PROJECT_STATE.md permite a cualquier agente retomar en 2 minutos. |
| **Consecuencias** | Hay que mantener 3 archivos de memoria actualizados. El overhead de escritura es bajo (~5 min por sesion). El beneficio es que cualquier agente puede continuar sin re-explicacion. |

---

## ADR-08 — Archivos de Instruccion Abstractos (v2)

| Campo | Detalle |
|-------|---------|
| **Decision** | Crear system-prompt-v2.txt y SKILL-v2.md abstractos (sin referencias a modulos concretos). Los originales especificos de ADM18 se preservan. |
| **Fecha** | 2026-05-31 |
| **Contexto** | system-prompt.txt y SKILL.md originales contenian referencias hardcoded a ADM18, LatamBox, GTC 185. Al usarlos en otro modulo, la IA asumia que estaba en ADM18. |
| **Alternativas** | Un solo par de archivos genericos (pero se perderia la especificidad util para ADM18); archivos por modulo (explosion de archivos). |
| **Razon** | v2 son abstractos y portables entre modulos. Los originales quedan como referencia historica. MODULE_CONTEXT.md se llena por modulo para dar identidad. |
| **Consecuencias** | Coexistencia de v1 (ADM18-especifico) y v2 (generico). Eventualmente migrar todos los modulos a v2 + MODULE_CONTEXT.md. |

---

> **Archivo generado:** 2026-05-31 · ADM18 · IUB/Unibarranquilla
> **Basado en:** RA-Assessment-App memory/DECISIONS.md (formato ADR)
