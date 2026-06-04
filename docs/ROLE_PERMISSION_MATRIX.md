# ROLE_PERMISSION_MATRIX.md — ADM18 Course Web Application

**Version del documento**: 1.0
**Fecha**: 2026-05-31
**Referencia PRD**: §3 (Roles), §5 (Features)
**Audiencia**: Desarrolladores, revisores

> Esta matriz cubre el 100% de las paginas y funcionalidades del sistema.
> Un revisor puede verificar que no haya pagina sin control de acceso
> definido (aunque el sitio es publico).

---

## 1. Definicion de Roles

| Rol | Descripcion | Autenticacion |
|-----|-------------|---------------|
| **Estudiante** | Navega semanas, realiza quizzes, ve su progreso individual | No (localStorage) |
| **Docente** | Accede a guias docentes, rubricas, instrumentos | No (sitio publico) |
| **Visitante** | Usuario sin historial en localStorage | No |

> **Nota**: El sitio es completamente publico. No hay login ni roles
> tecnicos. La separacion "estudiante vs docente" es logica: las guias
> docentes estan en paginas separadas que los estudiantes pueden ver
> pero no estan enlazadas desde su flujo principal de navegacion.

---

## 2. Leyenda de la Matriz

| Simbolo | Significado |
|---------|-------------|
| ✅ | Acceso publico — visible para todos |
| 🔒 | Contenido docente — existe pero no enlazado desde navegacion estudiante |
| 💾 | Requiere localStorage para funcionalidad completa |
| ⚠️ | Funcionalidad degradada sin localStorage (quiz no guarda, progreso no persiste) |

---

## 3. Matriz de Acceso por Pagina

### 3.1 Paginas Principales

| Pagina | Estudiante | Docente | Visitante | Notas |
|--------|------------|---------|-----------|-------|
| `index.html` | ✅ | ✅ | ✅ | Progreso solo visible si hay datos en localStorage |
| `progreso.html` | ✅ 💾 | ✅ 💾 | ⚠️ | Sin localStorage muestra todo pendiente |
| `profesor.html` | ✅ | ✅ | ✅ | 🔒 No enlazado desde nav principal de estudiante |
| `notas.html` | ✅ 💾 | ✅ 💾 | ⚠️ | Calculadora funcional sin localStorage, pierde datos al recargar |
| `participacion.html` | ✅ 💾 | ✅ 💾 | ⚠️ | Checklists requieren localStorage |

### 3.2 Semanas de Clase (1-4, 6-9, 11-13)

| Funcionalidad | Estudiante | Docente | Visitante |
|---------------|------------|---------|-----------|
| Ver contenido de la semana | ✅ | ✅ | ✅ |
| Realizar quiz | ✅ | ✅ | ✅ |
| Quiz guarda puntaje | ✅ 💾 | ✅ 💾 | ⚠️ |
| Ver respuestas correctas (post-submit) | ✅ | ✅ | ✅ |
| Reiniciar quiz | ✅ | ✅ | ✅ |
| Descargar documentos del caso | ✅ | ✅ | ✅ |
| Ver guia-docente.html | 🔒 | ✅ | 🔒 |

### 3.3 Semanas de Evaluacion (5, 10, 14)

| Funcionalidad | Estudiante | Docente | Visitante |
|---------------|------------|---------|-----------|
| Ver contenido de la semana | ✅ | ✅ | ✅ |
| Ver instrucciones del examen | ✅ | ✅ | ✅ |
| Descargar documentos del caso espejo | ✅ | ✅ | ✅ |
| Descargar instrumento de evaluacion (PDF) | 🔒 | ✅ | 🔒 |
| Ver guia-docente.html (con respuestas) | 🔒 | ✅ | 🔒 |
| Ver problemas inyectados y soluciones | 🔒 | ✅ | 🔒 |

### 3.4 Instrumentos (carpeta `instrumentos/`)

| Archivo | Estudiante | Docente | Notas |
|---------|------------|---------|-------|
| Rubricas (PI1-PI4) | ✅ | ✅ | Publicas — el estudiante debe conocer criterios de evaluacion |
| Parcial 1, Parcial 2, Final | 🔒 | ✅ | Contienen guia docente con respuestas |
| PLO Alignments | ✅ | ✅ | Documentos institucionales publicos |
| `_gen_pdf.py`, `pdf-style.css` | N/A | ✅ | Herramientas de generacion |

---

## 4. Funcionalidades por Componente JS

| Funcionalidad | Estudiante | Docente | Persistencia |
|---------------|------------|---------|--------------|
| QuizEngine.submit() | ✅ | ✅ | localStorage `adm18_scores` |
| QuizEngine.reset() | ✅ | ✅ | Limpia respuestas, no el score guardado |
| ADM18App.markWeekComplete() | ✅ | ✅ | localStorage `adm18_progress` |
| ADM18App.saveQuizScore() | ✅ | ✅ | localStorage `adm18_scores` |
| GTC185Checklist.toggle() | ✅ | ✅ | localStorage `gtc185_checks` |
| GTC185Checklist.reset() | ✅ | ✅ | Limpia localStorage |
| FileNamingSim.submit() | ✅ | ✅ | localStorage `filenaming_attempts` |
| SupabaseClient.syncUnsynced() | ✅ | ✅ | Requiere credenciales configuradas |

---

## 5. Datos Almacenados por Rol

### 5.1 localStorage — Estudiante

| Key | Contenido | Ejemplo |
|-----|-----------|---------|
| `adm18_progress` | Semanas completadas | `{"week_1":{"completed":true,"timestamp":1717200000}}` |
| `adm18_scores` | Puntajes de quizzes | `{"week_1":{"score":4,"total":5,"percent":80}}` |
| `adm18_grades` | Notas de parciales | `{"parcial1":85,"parcial2":90,"final":88}` |
| `adm18_participation` | Autoevaluacion semanal | `{"week_1":{"participo":true,"contribui":4}}` |
| `adm18_groups` | Registro de grupos | `{"week_1":["Ana","Carlos","Diana"]}` |
| `adm18_coeval` | Coevaluaciones | `{"week_3":{"yo":4,"comentario":"Buen trabajo"}}` |

### 5.2 localStorage — Docente

Mismas keys que el estudiante. El docente puede usar las mismas
herramientas para verificar funcionalidad. No hay separacion tecnica
de datos entre roles.

---

## 6. Notas de Seguridad

- **No hay datos personales reales**: los quizzes no piden nombre, email,
  ni documento de identidad. Solo guardan puntajes numericos.
- **No aplica Ley 1581/2012**: el sistema no procesa datos personales
  de estudiantes reales. Es material pedagogico estatico.
- **localStorage es por navegador**: los datos no se comparten entre
  dispositivos a menos que se configure Supabase.
- **Supabase RLS**: si se activa Supabase, configurar Row Level Security
  segun patron de reference.md §4.6.

---

> **Archivo generado:** 2026-05-31 · ADM18 · IUB/Unibarranquilla
> **Basado en:** RA-Assessment-App docs/ROLE_PERMISSION_MATRIX.md v1.0
