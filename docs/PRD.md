# PRD — ADM18 Course Web Application
**Version**: 1.0
**Fecha**: 2026-05-31
**Modulo**: ADM18 — Procesamiento de la Informacion en la Organizacion
**Institucion**: IUB / Unibarranquilla — Facultad de Ciencias Economicas y Administrativas
**Stack**: HTML/CSS/JS vanilla + Supabase + GitHub Pages
**Fuente de verdad**: KNOWLEDGE_BASE.md, PlanDeClases_ADM18_LatamBox_2026.html

> Este PRD define QUE debe construir la aplicacion web del modulo ADM18.
> Un desarrollador (humano o IA) debe poder leer este documento y saber
> exactamente que paginas crear, que funcionalidad implementar y como
> verificar que esta correcto, sin leer ningun otro archivo.

---

## 1. Contexto y Problema

El modulo ADM18 se dicta en modalidad presencial con 14 semanas. Los
estudiantes necesitan:

1. Acceder al material de cada semana desde cualquier dispositivo
   (prioridad: smartphones)
2. Realizar quizzes autocalificables con retroalimentacion inmediata
3. Descargar los documentos del caso integrador (LatamBox y casos espejo)
4. Ver su progreso semanal (que semanas completaron, puntajes de quizzes)
5. Que el docente tenga guias detalladas para cada semana

Actualmente el material existe como archivos sueltos (.md, .pdf, .docx,
.eml, .xlsx) en carpetas del repositorio, sin una interfaz web unificada.

---

## 2. Objetivo del Producto

Una aplicacion web estatica (sin build step) que:

- Presente 14 semanas de contenido en paginas individuales
- Incluya quizzes autocalificables en cada semana no-examen
- Vincule los 31 documentos del caso desde las semanas correspondientes
- Muestre el progreso del estudiante con indicadores visuales por semana
- Proporcione guias docentes para cada semana
- Funcione en GitHub Pages (hosting gratuito, sin servidor)
- Sea mobile-first (los estudiantes usan smartphones)

---

## 3. Roles de Usuario

| Rol | Descripcion |
|-----|-------------|
| **Estudiante** | Navega semanas, realiza quizzes, ve su progreso |
| **Docente** | Accede a guias docentes, rubricas, instrumentos de evaluacion |

No hay autenticacion (sitio estatico publico). Los quizzes y el progreso
se guardan en localStorage del navegador del estudiante. Opcionalmente,
Supabase puede sincronizar datos si se configuran credenciales.

---

## 4. Estructura de Contenido

El curso tiene 4 bloques de Resultados de Aprendizaje (RA):

| Bloque | RA | Semanas | Tipo de contenido |
|--------|-----|---------|-------------------|
| RA1 | Identificar documentos | 1-3 | Clasificacion, ciclo de vida, componentes |
| RA2 | Construir documentos | 4,6,7 | GTC 185, redaccion profesional, actas |
| RA3 | Analizar documentacion | 8-9 | Extraccion de hallazgos, memo de decision |
| RA4 | Valorar TIC | 11-13 | Organizacion digital, IA etica, portafolio |

Semanas de evaluacion: 5 (Parcial 1), 10 (Parcial 2), 14 (Final).
Estas semanas no tienen quiz — entregan instrumentos de examen.

---

## 5. Features

### F01 — Landing Page (index.html)

**Pagina principal del modulo.** Debe ser un hub completo, no solo
un menu de navegacion.

**Elementos obligatorios:**
- Hero: codigo del modulo, nombre, caso integrador, creditos, institucion
- Barra de progreso: 14 indicadores individuales (pills/circulos numerados)
  con color por estado:
  - Gris: pendiente
  - Dorado: en progreso (quiz iniciado, no completado)
  - Verde con check: completado
  - Rojo (borde): semana de examen
- Grid de semanas agrupadas por RA con badges de color
- Seccion "Material de Estudio" con acceso directo a:
  - Documentos del caso (casos/latambox/)
  - Normas y bibliografia
  - Rubricas (instrumentos/*.pdf)
  - Plan de clases completo
  - KNOWLEDGE_BASE

**Criterios de aceptacion:**
- Un estudiante que abre index.html ve su progreso inmediatamente
- Puede navegar a cualquier semana con un click
- Puede descargar documentos del caso sin navegar a las semanas
- Funciona en 320px de ancho sin scroll horizontal

### F02 — Paginas de Semana (semana-NN/index.html × 14)

**Cada semana tiene su propia carpeta** con:
- `index.html` — pagina del estudiante
- `guia-docente.html` — guia del profesor

**Elementos obligatorios de index.html:**
- Badge del RA correspondiente + tiempo (3.0h o 3.5h)
- Proposito de la semana (alert info)
- Tabla de actividades con minutos, nombre y descripcion
- Lista de evidencias (alert success)
- Documentos del caso vinculados (badges de formato nativo + PDF)
- Quiz autocalificable de 5 preguntas (semanas 1-4, 6-9, 11-13)
- Mensaje de evaluacion (semanas 5, 10, 14)
- Navegacion: semana anterior / siguiente

**Criterios de aceptacion:**
- Todas las semanas enlazan correctamente entre si
- Los quizzes guardan puntaje en localStorage
- Los documentos del caso se abren en pestana nueva
- Las semanas de examen no tienen quiz pero muestran instrucciones

### F03 — Quizzes Autocalificables

**Motor de quizzes inline** que funciona sin backend.

**Especificacion:**
- 5 preguntas de seleccion multiple (A/B/C/D) por semana
- Correccion inmediata al enviar
- Puntaje guardado en localStorage (`adm18_scores`)
- Semana marcada como completada al enviar quiz (`adm18_progress`)
- Boton "Intentar de nuevo" disponible despues de enviar
- Respuestas correctas visibles despues de enviar

**Semanas con quiz:** 1, 2, 3, 4, 6, 7, 8, 9, 11, 12, 13
**Semanas sin quiz:** 5 (Parcial 1), 10 (Parcial 2), 14 (Final)

### F04 — Dashboard de Progreso (progreso.html)

**Vista individual del estudiante** con:
- Barra de progreso general (X/14 semanas)
- Lista de 14 semanas con estado (completada/pendiente) y puntaje
- Promedio de quizzes
- Cada semana enlaza a su pagina

### F05 — Dashboard del Profesor (profesor.html)

**Panel de referencia para el docente** con:
- Pestanas: Rubricas | Instrumentos | PLO Alignment | Guias
- Acceso a todos los PDFs de rubricas e instrumentos
- GTC 185 checklist de referencia
- Calendario de evaluaciones
- Enlaces a guias docentes de cada semana

### F06 — Calculadora de Notas (notas.html)

**Herramienta para calcular nota final** con:
- Pesos: Participacion 30%, Parcial 1 20%, Parcial 2 25%, Final 25%
- Campos de entrada para cada nota
- Calculo automatico del ponderado
- Matriz de cobertura RA por evaluacion

### F07 — Metricas de Participacion (participacion.html)

**Registro de trabajo grupal** con:
- Las 12 estrategias grupales documentadas
- Checklist de autoevaluacion semanal
- Registro de grupos y coevaluacion

---

## 6. Documentos del Caso (31 documentos)

| Carpeta | Empresa | Docs | Uso | Semanas |
|---------|---------|------|-----|---------|
| `casos/latambox/` | LatamBox | 12 | Formativo | 1-13 |
| `casos/envios_pacifico/` | Envios del Pacifico | 6 | Parcial 1 | 5 |
| `casos/andesbox/` | AndesBox | 5 | Parcial 2 | 10 |
| `casos/globalbox/` | GlobalBox Connect | 8 | Final | 14 |

Cada documento existe en 3 formatos: nativo (.eml/.docx/.xlsx), .pdf, .md (fuente).
La aplicacion web enlaza los formatos nativo y PDF. Los .md son para IA/docente.

---

## 7. Instrumentos de Evaluacion

| Instrumento | Formato | Uso |
|-------------|---------|-----|
| PI1_Rubrica_ADM18 | .md + .pdf | Clasificacion documental (RA1) |
| PI2_Rubrica_ADM18 | .md + .pdf | Construccion de documentos (RA2) |
| PI3_Rubrica_ADM18 | .md + .pdf | Analisis y decision (RA3) |
| PI4_Rubrica_ADM18 | .md + .pdf | Uso de TIC (RA4) |
| Parcial1_ADM18_EnviosPacifico | .md + .pdf | Examen semana 5 |
| Parcial2_ADM18_AndesBox | .md + .pdf | Examen semana 10 |
| Final_ADM18_GlobalBox | .md + .pdf | Examen semana 14 |
| PLO_Alignment_CE_RA1-5 | .md + .pdf | Trazabilidad programa-modulo |

---

## 8. Stack Tecnico

| Componente | Tecnologia | Justificacion |
|------------|------------|---------------|
| Frontend | HTML/CSS/JS vanilla | Sin build step, compatible con GitHub Pages |
| CSS | Variables CSS nativas | Design tokens IUB, mobile-first |
| JS | IIFE modules (vanilla) | Sin dependencias, sin node_modules |
| Backend | Supabase (opcional) | Solo para sync de scores; no requerido |
| Storage | localStorage | Progreso y scores offline-first |
| Hosting | GitHub Pages | Gratuito, deploy automático por push |
| Fuentes | Google Fonts CDN | Open Sans (requerida por IUB) |

---

## 9. Diseno y Accesibilidad

### Design Tokens IUB (obligatorio)

```css
--primary: #1E2843; --gold: #FFDF2D;
--font-family: 'Open Sans', Arial, sans-serif;
```

### Layout DG-TSI-09-V4

Header → Content → Footer. Sin scroll horizontal a 1024x768.
WCAG 2.1 AA en todo texto.

### Mobile-First (prioridad sobre DG-TSI-09-V4)

Por instruccion del docente, los estudiantes trabajan desde smartphones:
- Punto de partida: 320px de ancho
- Touch targets >= 44x44px
- Texto legible sin zoom
- Navegacion con dedo (botones grandes, espaciados)

---

## 10. Regla de Actividades Autocalificables

**Principio:** Las actividades del curso web deben ser autocalificables
siempre que sea posible.

**Actividades autocalificables (implementadas):**
- Quizzes de seleccion multiple (11 semanas)
- Checklist GTC 185 interactivo (semana 4)

**Actividades con revision docente (maximo 2 en todo el modulo):**
- Redaccion de correos profesionales (semana 6) — requiere rubrica PI2
- Redaccion de acta individual (semana 7) — requiere rubrica PI2

**Regla:** Cada actividad con revision docente DEBE tener una rubrica
analitica asociada que permita calificar de forma objetiva.

---

## 11. Estructura de Archivos de la Aplicacion

```
ProcesamientoInformacion/
├── index.html                    # F01 — Landing page
├── progreso.html                 # F04 — Progreso del estudiante
├── profesor.html                 # F05 — Panel del docente
├── notas.html                    # F06 — Calculadora de notas
├── participacion.html            # F07 — Metricas de participacion
├── css/
│   └── iub-tokens.css            # Design system completo
├── js/
│   ├── app.js                    # Core: progreso, scores, navegacion
│   ├── quiz-engine.js            # Motor de quizzes
│   ├── supabase-client.js        # Sync opcional con Supabase
│   ├── gtc185-checklist.js       # Checklist interactivo (semana 4)
│   └── file-naming-simulator.js  # Simulador de nombres (semana 11)
├── semana-01/ a semana-14/
│   ├── index.html                # F02 — Pagina del estudiante
│   └── guia-docente.html         # F02 — Guia del profesor
├── docs/
│   ├── PRD.md                    # Este archivo
│   ├── ARCHITECTURE.md           # Arquitectura del sistema
│   └── ROLE_PERMISSION_MATRIX.md # Matriz de acceso por rol
├── memory/
│   ├── PROJECT_STATE.md          # Estado actual del proyecto
│   ├── DECISIONS.md              # Registro de decisiones
│   └── NEXT_STEPS.md             # Tareas pendientes
├── instrumentos/                 # Rubricas, parciales, PLO alignments
└── casos/                        # 31 documentos del caso (4 empresas)
```

---

## 12. Sprints

| Sprint | Contenido | Estado |
|--------|-----------|--------|
| **S0** | Documentacion + design system + scaffolding | ✅ |
| **S1** | Semanas 1-4 (RA1 + inicio RA2) + quiz engine | ✅ |
| **S2** | Semanas 5-7 (Parcial 1 + RA2 continuacion) | ✅ |
| **S3** | Semanas 8-10 (RA3 + Parcial 2) | ✅ |
| **S4** | Semanas 11-14 (RA4 + Final) | ✅ |
| **S5** | Dashboards + guias docentes | ✅ |
| **S6** | Instrumentos faltantes (PI1, PI2, PI4, Parcial1, Final) | ✅ |
| **S7** | Correcciones post-revision + mobile-first + deploy | ⬜ Pendiente |

---

## 13. Issues Conocidos (al 2026-05-31)

| Issue | Impacto | Accion |
|-------|---------|--------|
| Progress bar es una barra simple, no pills individuales | Baja visibilidad de progreso | Reconstruir segun F01 spec |
| index.html no tiene seccion "Material de Estudio" | Estudiante no accede a recursos sin navegar semanas | Agregar seccion |
| PDFs de instrumentos nuevos no generados | _gen_pdf.py tiene bug con lineas '>' | Corregir script o usar pandoc |
| Supabase no configurado | Sync de scores no funciona | Configurar proyecto y credenciales |
| Imagen de referencia no analizada | Estilo visual puede no coincidir | Revisar "Falta seguir ese estilo.png" |
| read_file→write_file contamination en 19 archivos | Corregido pero el patron puede repetirse | Usar solo Python open() en execute_code |
| reference.md mezcla ejemplos Python con patrones genericos | IA puede confundir stack | Separar en reference.md + reference-code-examples.md |

---

## 14. Verificacion de Calidad

- [ ] Todas las semanas navegables desde index.html
- [ ] Todos los quizzes funcionales (11/11)
- [ ] Todos los documentos del caso enlazados (31/31)
- [ ] Todos los instrumentos tienen .md + .pdf
- [ ] Guias docentes existen para las 14 semanas
- [ ] Mobile-first: no scroll horizontal a 320px
- [ ] WCAG 2.1 AA: contraste verificado en todo texto
- [ ] No quedan numeros de linea en archivos HTML
- [ ] Progress bar reconstruida con pills individuales
- [ ] Landing page tiene Material de Estudio

---

> **Archivo generado:** 2026-05-31 · ADM18 · IUB/Unibarranquilla
> **Basado en:** RA-Assessment-App docs/PRD.md v2.3 (patron estructural)
