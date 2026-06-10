# PRD genérico · Módulo académico gamificado IUB

**Versión:** 1.0 · 2026-06-09  
**Ámbito:** Nuevos módulos (ADM18, TGA04, TGA05, TD y futuros) sobre **un solo Supabase** y **GitHub Pages**.  
**Audiencia principal:** Agentes de IA y desarrolladores que extienden o crean repos de materiales.

---

## Instrucción obligatoria para la IA

> **No improvises funcionalidades.** Este PRD es la fuente de verdad. Si un requisito no está aquí ni en los artefactos referenciados, **no lo implementes** — pregunta o documenta una propuesta en `setup/adr/` antes de codificar.

Debes seguir **en este orden** y **sin saltar fases**:

| Metodología | Qué significa en este proyecto |
|-------------|-------------------------------|
| **SDD** (Specification-Driven Development) | Especificación → contrato → implementación. Cada fase termina con un artefacto verificable (SQL aplicado, script harness en verde, checklist marcado). No escribir UI hasta tener `supabase-config`, SDK y reglas académicas definidos. |
| **TDD** (Test-Driven Development) | Escribir o actualizar **primero** el harness Playwright (`scripts/`) que define el comportamiento esperado; luego implementar hasta que pase. Los tests validan **comportamiento observable** (HTTP 200, fila en Supabase, texto en DOM), no detalles internos. |
| **Harness engineering** | Los scripts en `scripts/` son el **sistema nervioso** del proyecto: `verify-all-modules.mjs`, `verify-cloud-progress.mjs`, `simulate-student-flow.mjs`. Toda entrega debe ejecutarlos en `--local` y, antes de cerrar, en `--pages`. Reportes JSON en `scripts/harness-reports/`. |

**Repos canónicos de referencia (no inventar patrones nuevos):**

- ADM18: `dfdomin/adm18-material` — SDK, dashboards, migraciones base
- TGA04: `dfdomin/tga04-neurobiz` — semanas `semanaN/`
- TGA05: `dfdomin/tga05-neurobiz` — reading-tracker semana 1
- TD: `dfdomin/td-inteligencia-negocios` — rama `gh-pages`

---

## Problem Statement

Los módulos IUB necesitan gamificación, asistencia, participación docente y dashboards de estudiante **unificados** en un Supabase compartido, publicados en GitHub Pages, sin enlaces rotos ni sincronización local-only. Hoy, módulos nuevos o parciales repiten errores: rutas legacy (`progreso.html`, `../profesor.html`), sync a tablas obsoletas, conteo de asistencia sin cédula, y semanas 404.

## Solution

Plantilla de construcción por fases con JS compartido, un offering por módulo, dashboards bajo `dashboard/`, harness Playwright obligatorio, y RPC `upsert_weekly_progress` como **única** vía de persistencia de progreso semanal en nube.

---

## User Stories

1. Como **estudiante**, quiero ver mi progreso en 14 semanas agrupadas por cortes, para ubicar primer/segundo/tercer corte y final.
2. Como **estudiante**, quiero que mi XP y actividades se guarden en la nube al completar quiz o actividad, para no perder avance al cambiar de dispositivo.
3. Como **estudiante**, quiero configurar mi cédula una vez, para que asistencia y progreso sean personales.
4. Como **estudiante**, quiero ver barra fija con regla 40% formativa / 60% evaluación y estado de asistencia (52 h, máx. 10,4 h perdidas), para conocer riesgo de perder el módulo.
5. Como **docente**, quiero entrar con usuario/contraseña (no PIN), para gestionar participación y asistencia.
6. Como **docente**, quiero importar estudiantes y registrar asistencia F/T/P/M/I, para generar reporte por grupo.
7. Como **docente**, quiero panel en `dashboard/participacion.html` y `dashboard/profesor.html`, para XP y asistencia consolidados.
8. Como **equipo técnico**, quiero un solo Supabase (`nnrgxuzvjtweyzkdrech`), para cruzar datos entre módulos sin duplicar proyectos.
9. Como **equipo técnico**, quiero harness automatizado que falle el CI si hay enlaces rotos o sync roto, para no regresar bugs ya corregidos.
10. Como **agente IA**, quiero checklist por fase, para no omitir migraciones SQL ni scripts académicos en semanas.

---

## Reglas de negocio (inmutables salvo ADR)

| Regla | Valor |
|-------|--------|
| Horas módulo | 4 h × 13 sesiones = **52 h** |
| Máx. inasistencia | **20%** → **10,4 h** |
| Pérdida por estado | F=4 h, T=1 h, P/M/I=0 h |
| Nota por corte | **40%** formativa + **60%** evaluación/caso |
| Cortes | Sem 5 (1.er), Sem 10 (2.º), Sem 14 (final) |
| Bloques dashboard | 1–4, 5, 6–9, 10, 11–13, 14 |
| Login docente | usuario `docente`, contraseña `sasadfgh2019` (RPC `verify_teacher_login`) |
| Estudiante de prueba harness | **Dany Perez**, CC **12345** |

---

## Supabase compartido

| Campo | Valor |
|-------|--------|
| URL | `https://nnrgxuzvjtweyzkdrech.supabase.co` |
| Publishable key | `sb_publishable_-101J7EEEhv-C5kjosWGTg_657OtsBg` |
| Proyecto | `adm18-latambox` / ref `nnrgxuzvjtweyzkdrech` |

**Nuevo módulo `MODULO`:** crear offering `MODULO-2026-2`, migración seed de 14 `periods`, actividad `weekly_summary` por periodo, y RPC ya existente `upsert_weekly_progress`.

---

## Implementation Decisions

### Módulos JS obligatorios (copiar desde ADM18, adaptar solo `supabase-config.js`)

| Archivo | Responsabilidad |
|---------|-----------------|
| `js/supabase-config.js` | `MODULE_CODE`, `OFFERING_CODE`, `IUB_DASHBOARD` (`availableWeeks`, `weekUrl`) |
| `js/gamification-sdk.js` | XP, perfiles, **`syncWeekProgress` → RPC `upsert_weekly_progress`** |
| `js/student-dashboard.js` | 6 bloques de cortes, semanas “Próximamente” si no hay carpeta |
| `js/academic-rules.js` | Asistencia, 40/60, reporte docente; **requiere cédula** |
| `js/academic-status-bar.js` | Barra fija; muestra h perdidas vs h asistidas por separado |
| `js/celebration.js` | Globos al completar actividad |
| `js/teacher-auth.js` | Login docente usuario/contraseña |
| `js/reading-tracker.js` | Solo si hay lectura larga con XP por tiempo |
| `js/supabase-client.js` | ADM18: sync quiz → `syncAdm18Scores` |

**Prohibido:** sync exclusivo a `student_progress` sin RPC. **Prohibido:** prefijo hardcodeado `tga04_` en SDK; usar `GAMIF_PREFIX` dinámico.

### Navegación canónica

| Destino | Ruta |
|---------|------|
| Progreso estudiante | `dashboard/index.html` |
| Participación docente | `dashboard/participacion.html` |
| Panel docente XP | `dashboard/profesor.html` |
| Legacy | `progreso.html` → redirect a `dashboard/index.html` |

**Prohibido:** `../profesor.html`, `../progreso.html` desde semanas o participación.

### Convención semanas

| Familia | Patrón URL | Ejemplo |
|---------|------------|---------|
| ADM18 | `semana-NN/index.html` | `semana-01/` |
| TGA04/05/TD | `semanaN/index.html` | `semana1/` |

Si una semana no existe: placeholder HTML **o** `availableWeeks` sin enlace (estado “Próximamente”).

### Inyección en cada `semana*/index.html`

```html
<script src="../js/supabase-config.js"></script>
<script src="../js/gamification-sdk.js"></script>
<script src="../js/academic-rules.js"></script>
<script src="../js/academic-status-bar.js"></script>
<script src="../js/celebration.js"></script>
```

ADM18 además: `supabase-client.js` en semanas con quiz.

### Dashboards mínimos

- `dashboard/index.html` — `#student-dashboard`, `#academic-panels`
- `dashboard/participacion.html` — tabs clase, asistencia, importar, reporte
- `dashboard/profesor.html` — XP + asistencia por grupo

---

## Fases de construcción (SDD — orden estricto)

### Fase 0 · Especificación (sin código)

- [ ] Definir `MODULE_CODE`, `OFFERING_CODE`, narrativa, `availableWeeks`
- [ ] Listar semanas con contenido real vs placeholder
- [ ] Registrar desviaciones en `setup/adr/NNN-<tema>.md`

**Salida:** checklist completado en issue o comentario de PR.

### Fase 1 · Supabase (TDD: consulta SQL)

- [ ] Aplicar `setup/gamification_unified.sql` si proyecto nuevo
- [ ] Crear `setup/migrations/NNN_<modulo>_seed_and_periods.sql` (14 periods + activities)
- [ ] Verificar: `select code from course_offerings where code = '<OFFERING>'`
- [ ] Verificar: 14 filas en `periods` para el offering

**No avanzar** sin offering y periodos.

### Fase 2 · Config + SDK (TDD: `verify-cloud-progress.mjs`)

- [ ] `js/supabase-config.js` con `IUB_DASHBOARD`
- [ ] Copiar SDK y academic bundle desde ADM18
- [ ] Confirmar `GamifSDK.syncWeekProgress` llama RPC
- [ ] Ejecutar: `node scripts/verify-cloud-progress.mjs --local`

### Fase 3 · Dashboards (TDD: `verify-all-modules.mjs`)

- [ ] Crear los 3 HTML en `dashboard/`
- [ ] Nav coherente en `index.html` raíz
- [ ] Ejecutar: `node scripts/verify-all-modules.mjs --local`

### Fase 4 · Semanas (TDD: harness por semana disponible)

- [ ] Scripts académicos en cada semana
- [ ] Nav a `../dashboard/index.html`
- [ ] Placeholders para semanas de corte sin contenido (5, 10, 14 si aplica)

### Fase 5 · Enlaces globales (TDD: `verify-all-modules.mjs --pages`)

- [ ] Corregir Ahorcado, notas, legacy pages
- [ ] `git push` y esperar Pages
- [ ] `node scripts/verify-all-modules.mjs --pages`

### Fase 6 · Simulación estudiante (Harness engineering)

- [ ] `node scripts/simulate-student-flow.mjs --local`
- [ ] `node scripts/simulate-student-flow.mjs --pages`
- [ ] Revisar `scripts/harness-reports/<runId>.json`
- [ ] Confirmar en Supabase: `v_legacy_student_progress` para CC 12345

---

## Testing Decisions (TDD + Harness)

### Qué es un buen test aquí

- Navega URL real (local o Pages) y assert HTTP + DOM + API Supabase
- No mockea Supabase en harness de integración (usa proyecto compartido de prueba)
- Usa estudiante fijo **Dany Perez / 12345** para idempotencia
- Falla con mensaje accionable (`sync falló status=403`, `sin fila en v_legacy_student_progress`)

### Scripts harness (ejecutar en este orden)

```bash
node scripts/verify-all-modules.mjs --local
node scripts/verify-cloud-progress.mjs --local
node scripts/simulate-student-flow.mjs --local

# Tras push a GitHub Pages:
node scripts/verify-all-modules.mjs --pages
node scripts/simulate-student-flow.mjs --pages
```

### Simulación sin tiempo humano (`simulate-student-flow.mjs`)

Por módulo automatiza:

1. Perfil Dany Perez CC 12345 en `localStorage`
2. **ADM18:** responde quiz UI + `syncAdm18Scores`
3. **TGA/TD:** click quiz + botón ☁️ Guardar + `syncWeekProgress`
4. Consulta Supabase y escribe reporte JSON

---

## Out of Scope

- Nuevas mecánicas de gamificación no usadas en los 4 módulos actuales
- Segundo proyecto Supabase por módulo
- Live Server como destino de producción
- Login estudiante con contraseña (solo cédula/perfil local)
- PIN docente (reemplazado por usuario/contraseña)

---

## Prompt semilla para agente IA (copiar al iniciar módulo nuevo)

```
Construye el módulo <MODULO> siguiendo setup/PRD_MODULO_IUB_GENERICO.md.

Metodología obligatoria: SDD → TDD → Harness engineering.
- No implementes nada que no esté en el PRD o en ADM18 canónico.
- Fase actual: <N>. No avances de fase hasta que el harness de esa fase pase en verde.
- Supabase: offering <MODULO-2026-2>, mismo URL/key que IUB_SUPABASE_COMPARTIDO.md.
- Al terminar cada fase, ejecuta los scripts en scripts/ y adjunta salida.
- Estudiante de prueba: Dany Perez, CC 12345.
```

---

## Further Notes

- Correcciones del 2026-06-09 incorporadas: sync RPC, asistencia con cédula, títulos ADM18 semana 1, semanas placeholder TGA04 5/10, TD 9–14 como “Próximamente”, prefijos SDK dinámicos.
- Documentación Supabase: `setup/IUB_SUPABASE_COMPARTIDO.md`, `setup/iub-supabase-shared.json`.
