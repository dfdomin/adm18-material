---
name: adm18-course-workflow
description: >
  Workflows for generating and maintaining course materials for the ADM18 module
  (Procesamiento de la Información en la Organización) at IUB/Unibarranquilla.
  Covers session startup, context loading, document generation for the LatamBox
  case study, assessment instrument creation, and dual-format Knowledge Base
  maintenance. Complements the iub-curriculum-design skill for general patterns.
---

# ADM18 Course Workflow Skill

## Description

This skill provides procedural workflows for working with the **ADM18 module**:
Procesamiento de la Información en la Organización, a 2-credit undergraduate
course at IUB/Unibarranquilla's Facultad de Ciencias Económicas y
Administrativas. The course serves programs in Comercio Exterior and
Operación de Procesos Empresariales.

The course teaches organizational document processing through the **LatamBox**
case study — a fictional virtual courier service that enables Colombian clients
to buy products in the USA and receive them in Colombia. LatamBox runs through
all 14 weeks, with mirror cases for exams (Envíos del Pacífico, AndesBox,
GlobalBox Connect).

| Aspect | Detail |
|--------|--------|
| Module | ADM18 · Procesamiento de la Información en la Organización |
| Institution | IUB / Unibarranquilla |
| Credits/hours | 2 créditos · 117 h totales (HAD 2 + HP 2 + HTI 5 semanal) |
| Case study | LatamBox — casillero virtual Colombia-USA |
| RAs | RA1 (Identificar), RA2 (Construir), RA3 (Analizar), RA4 (Valorar TIC) |
| Rubrics | PI1, PI2, PI3, PI4 |
| Exams | Parcial 1 (Sem 5), Parcial 2 (Sem 10), Final (Sem 14) |
| Language | Español |

This skill complements the **iub-curriculum-design** skill, which provides
general patterns for PLO alignment, rubric authoring, KB generation, and
case-mirror exam design. Load that skill for the detailed step-by-step
templates; this skill provides the ADM18-specific context and workflows.

---

## Workflow 1: Session Startup

Trigger: beginning a new session working on ADM18 course materials.

Goal: load the course context needed to be productive.

### Steps

1. Read the source of truth: `KNOWLEDGE_BASE.md` — this is the compact AI
   reference for the entire course. It contains the course identity, 4 RAs,
   14-week plan, 12 LatamBox documents, 4 rubrics, 30 bibliographic sources,
   and cross-references to all other documents.

2. If the task involves assessment instruments, load the **iub-curriculum-design**
   skill with `skill_view(name='iub-curriculum-design')`.

3. Identify which RA block the task falls under:
   - **RA1** (Semanas 1-3): Identificar documentos — classification, lifecycle, dissection
   - **RA2** (Semanas 4, 6, 7): Construir documentos — GTC 185, professional writing
   - **RA3** (Semanas 8-9): Analizar documentos — extracting findings, decision memos
   - **RA4** (Semanas 11-13): Valorar TIC — folder organization, AI ethics, digital portfolio

4. For deep context on a specific topic, read the relevant source document:
   - Weekly activities: `PlanDeClases_ADM18_LatamBox_2026.html`
   - Official syllabus: `ADM18_Procesamiento_Informacion.md`
   - Bibliography: `BIBLIOGRAFIA_ACTUALIZADA_ADM18.md`
   - Assessment instruments: `instrumentos/` directory
   - Case documents: `casos/<empresa>/` directory

### Pitfalls

- Don't read all documents upfront. Start with KNOWLEDGE_BASE.md; expand to
  other documents only when the task requires it.
- The PlanDeClases HTML is for detailed weekly activity lookup. Don't load it
  for tasks that only need the summary in KNOWLEDGE_BASE.md.
- ADM18 has 4 module-level RAs (RA1-RA4) which are distinct from the 5
  program-level RAs (CE_RA1-CE_RA5). Never conflate them. KNOWLEDGE_BASE.md
  lines 265-285 explain the relationship.

### Verification

After startup, you must be able to:
- State which RA block(s) the current task targets.
- Identify the relevant LatamBox documents for the task.
- Know whether the task needs iub-curriculum-design patterns or is ADM18-specific.

---

## Workflow 2: Course Material Generation

Trigger: user asks to create or update teaching materials (documents, activities,
slides, quizzes, case documents) for a specific week or RA of ADM18.

Goal: produce materials aligned with the course structure, LatamBox case,
and pedagogical strategies defined in KNOWLEDGE_BASE.md.

### Steps

1. **Confirm the scope.** Which week(s)? Which RA? What type of material?
   - Single document (e.g., a LatamBox invoice, a GTC 185 checklist)
   - Activity plan (e.g., clínica documental, gallery walk)
   - Quiz or diagnostic (e.g., clasificación de documentos)
   - Full week materials (actividad principal + evidencia + rúbrica)

2. **Anchor to LatamBox.** Every material must connect to the LatamBox case
   or its mirror cases. Use the 12-document ecosystem:
   - Docs 1-2: Registration (welcome email, registration form)
   - Doc 3: Purchase (Amazon invoice)
   - Docs 4-5: Miami receipt (arrival notification, value declaration)
   - Doc 6: Flight (AWB air waybill)
   - Docs 7-9: Customs (freight bill, nationalization email, tax receipt)
   - Docs 10-12: Delivery + closure (local delivery guide, confirmation, survey)

3. **Apply the correct pedagogical strategy** from the 12 strategies in
   KNOWLEDGE_BASE.md (lines 138-156):
   - Group work → rotación aleatoria, roles rotativos, reportero aleatorio
   - Peer review → gallery walk, coevaluación anónima
   - Structured time → tiempos 2-2-2, rompecabezas (Jigsaw)
   - Individual accountability → producto individual previo

4. **Apply document standards.** For any generated document:
   - Follow GTC 185 checklist (10 criteria, KNOWLEDGE_BASE.md lines 225-236)
   - Comply with Ley 594/2000 (Ley General de Archivos) and ISO 15489-1:2016
   - Use the file naming convention: `TIPO_Destinatario_Asunto_FECHA_VERSION.ext`
   - Respect the folder structure: 01_Comunicaciones/ 02_Operaciones/ 03_Decisiones/ 04_Archivo/

5. **Generate in appropriate format:**
   - Editable source (`.md` for documents, `.docx` for student-facing forms)
   - Static distribution (`.pdf` via `instrumentos/_gen_pdf.py`)
   - HTML for web viewing if needed (via pandoc)

6. **Update cross-references.** If the material is a new permanent artifact,
   add it to KNOWLEDGE_BASE.md's cross-reference table and regenerate
   KNOWLEDGE_BASE.html.

### Pitfalls

- Don't create materials divorced from LatamBox. The case IS the course.
- Mirror cases (Envíos del Pacífico, AndesBox, GlobalBox) use the SAME logic
  with DIFFERENT data. Don't invent new document types for exams — reuse the
  12 types from LatamBox with different company names, countries, and problems.
- The 12 group strategies are mandatory, not suggestions. Every group activity
  must use at least one of them.
- GTC 185 is the Colombian standard for organizational documents. All generated
  documents must comply with its structure, tone, and formatting rules.

### Verification

- [ ] Material is anchored to a specific LatamBox scenario
- [ ] Pedagogical strategy is explicitly identified
- [ ] GTC 185 checklist applied (for documentos organizacionales)
- [ ] Rubric criteria (PI1-PI4) are referenced if the material is evaluable

---

## Workflow 3: Knowledge Base Maintenance

Trigger: any change to course structure, case documents, assessment instruments,
bibliography, or weekly plan.

Goal: keep KNOWLEDGE_BASE.md and KNOWLEDGE_BASE.html synchronized and accurate.

### Steps

1. **Update KNOWLEDGE_BASE.md first.** This is the source of truth. Make the
   change in the relevant section:
   - Course identity → lines 10-23
   - Structure (UC, EC, RA) → lines 26-49
   - LatamBox documents → lines 61-91
   - Weekly plan → lines 94-133
   - Group strategies → lines 137-156
   - Rubrics → lines 159-167
   - Bibliography → lines 170-203
   - Conventions → lines 207-244
   - Program RA relationships → lines 265-285
   - Cross-references → lines 294-333

2. **Regenerate KNOWLEDGE_BASE.html.** After every .md change, regenerate the
   HTML for human readability. Load the iub-curriculum-design skill for the
   dual-format generation pattern.

3. **Update the cross-reference table** (lines 294-333) if you added, removed,
   or renamed any document in the project directory.

4. **Bump the date** in the cross-reference table's "Actualizado" column for
   the files you changed.

5. **Add the sync rule reminder** if missing: both files carry the warning
   that they must be updated together.

### Pitfalls

- NEVER update only one format (.md or .html). The user's dual-format rule
  is explicit in the memory: "KBs = .md+.html always synced."
- The cross-reference table must list every document in the project directory.
  When you create a new instrument or case file, add its entry immediately.
- Don't delete the TGA04 note (lines 287-291) — it documents the migration
  history. If you're adding content about TGA04, it goes in the
  FundamentosComputacion/ directory, not here.

### Verification

- [ ] KNOWLEDGE_BASE.md and KNOWLEDGE_BASE.html are both updated
- [ ] Cross-reference table reflects the current state of the project
- [ ] No broken references to removed or renamed files

---

## Workflow 4: Assessment Instrument Creation

Trigger: user asks to design or update a Parcial, Final, rúbrica, or any
summative assessment for ADM18.

Goal: produce a case-mirror assessment instrument aligned with the module's
RAs, the program's PLOs, and the LatamBox ecosystem.

### Steps

1. **Load iub-curriculum-design skill.** This general skill provides the
   detailed templates for PLO alignment, rubric authoring, and case-mirror
   exam design. The steps below are ADM18-specific adaptations.

2. **Identify the assessment type:**
   - **Parcial 1** (Sem 5): RA1 + RA2. Mirror case: Envíos del Pacífico (Colombia-Asia)
   - **Parcial 2** (Sem 10): RA2 + RA3. Mirror case: AndesBox (Colombia-Chile-Perú)
   - **Final** (Sem 14): RA1-RA4. Mirror case: GlobalBox Connect (Colombia-Panamá-México)
   - **Rúbrica:** PI1 (RA1), PI2 (RA2), PI3 (RA3), PI4 (RA4)

3. **Apply the case-mirror pattern:**
   - Same document types as LatamBox (12 types)
   - Different company, different countries, different data
   - Same logic, different problems to discover
   - The mirror case must have real regulatory differences (e.g., Asia has
     different customs procedures than USA; Perú has different IVA rates)

4. **Include the guía docente** as a separate section:
   - List of "problemas inyectados" with exact document references
   - What the student SHOULD find in each document
   - Scoring key aligned with the relevant rúbrica (PI1-PI4)

5. **Deliver as dual format:**
   - `instrumentos/<NAME>_ADM18.md` — editable source
   - `instrumentos/<NAME>_ADM18.pdf` — static for printing
   - Use `instrumentos/_gen_pdf.py` for PDF generation (requires fpdf2)

6. **Verify PLO alignment.** If the instrument targets a specific CE RA:
   - Confirm the alignment with the program-level RA (not module-level RA)
   - Update or create the PLO alignment table if needed
   - The table must show: topic → learning activity → evidence → PLO criterion → week

### Pitfalls

- ADM18's module-level RAs (RA1-RA4) are NOT the same as the program-level
  CE_RA1-CE_RA5. The module contributes to program RAs but has its own RAs.
  Always clarify which RA level is being discussed.
- Mirror cases must differ meaningfully, not just by changing company names.
  Different countries = different regulations = different problems.
- The guía docente is for the instructor, not the student. Keep it in a
  separate section clearly marked as instructor-only.

### Verification

- [ ] Assessment type is identified (Parcial 1, Parcial 2, Final, or Rúbrica)
- [ ] Correct mirror case is used for the assessment
- [ ] Rúbrica (PI1-PI4) is referenced with explicit criteria
- [ ] Guía docente lists injected problems with document references
- [ ] Both .md and .pdf formats are delivered
- [ ] KNOWLEDGE_BASE.md cross-reference table is updated

---

## Lazy-Load Architecture

Not every task needs every document. Load in this order:

### Tier 1 — Always load (on session start):
- `KNOWLEDGE_BASE.md` — compact AI reference, source of truth

### Tier 2 — Load when task involves specific weeks or activities:
- `PlanDeClases_ADM18_LatamBox_2026.html` — detailed weekly plan
- `ADM18_Procesamiento_Informacion.md` — official microcurrículo

### Tier 3 — Load when task involves assessment or standards:
- `BIBLIOGRAFIA_ACTUALIZADA_ADM18.md` — 30 bibliographic sources
- `fuentes_curso_ADM18.md` — sources by dimension
- `instrumentos/` — assessment instruments (PI3_Rubrica, PLO_Alignment, Parcial2)
- `casos/<empresa>/` — case study documents

### Tier 4 — Load for deep reference:
- `iub-curriculum-design` skill — general curriculum design patterns
- `instrumentos/pdf-style.css` — PDF styling
- `instrumentos/_gen_pdf.py` — PDF generation script

---

## Verification Rules

### Document generation checklist:
| Criterion | Standard |
|-----------|----------|
| GTC 185 | 10-item checklist applied (KNOWLEDGE_BASE.md lines 225-236) |
| LatamBox anchoring | References specific LatamBox document(s) by number |
| Pedagogical strategy | Identifies which of the 12 strategies is used |
| File naming | Follows TIPO_Destinatario_Asunto_FECHA_VERSION.ext |
| Dual format | .md (editable) + .pdf (static) or .md + .html (KB) |

### Assessment instrument checklist:
| Criterion | Standard |
|-----------|----------|
| Mirror case | Different company, countries, data; same logic |
| RA coverage | Explicitly states which RA(s) are measured |
| Rubric alignment | References PI1-PI4 with criteria |
| Guía docente | Lists injected problems with document references |
| PLO connection | If applicable, maps to program-level CE RA |

### Never:
- Fabricate course data. If the PlanDeClases or KNOWLEDGE_BASE.md doesn't
  specify something, ask the user or mark it as a gap.
- Skip the dual-format rule. Every permanent artifact needs both formats.
- Conflate module RAs with program RAs. They are different levels.
- Create LatamBox documents that contradict the existing ecosystem (wrong
  tracking numbers, inconsistent dates, different document types).

---

## Memory Patterns

### After every session:
- Update `KNOWLEDGE_BASE.md` if any course facts changed.
- Regenerate `KNOWLEDGE_BASE.html` if .md was changed.
- Update cross-reference table if new files were created.

### After creating assessment instruments:
- Add entry to `instrumentos/` directory.
- Update KNOWLEDGE_BASE.md's instrument listing (lines 305-316).
- Generate .pdf version via `instrumentos/_gen_pdf.py`.

### After creating case documents:
- Add to `casos/<empresa>/` with README.md index.
- Verify internal consistency (tracking numbers, dates, amounts).
- Update KNOWLEDGE_BASE.md's case listing (lines 322-333).

### After bibliographic updates:
- Update `BIBLIOGRAFIA_ACTUALIZADA_ADM18.md`.
- Update KNOWLEDGE_BASE.md's bibliography section (lines 170-203).

---

## References

### Companion documents in this directory:
- `KNOWLEDGE_BASE.md` — compact AI reference, source of truth
- `system-prompt.txt` — concise LLM system prompt for this module
- `KNOWLEDGE_BASE.html` — human-readable web version
- `PlanDeClases_ADM18_LatamBox_2026.html` — detailed 14-week plan
- `ADM18_Procesamiento_Informacion.md` — official microcurrículo
- `BIBLIOGRAFIA_ACTUALIZADA_ADM18.md` — updated bibliography (30 sources)
- `fuentes_curso_ADM18.md` — sources by dimension

### Subdirectories:
- `instrumentos/` — assessment instruments, rubrics, PLO alignments, PDF generator
- `casos/` — case study documents (latambox/, envios_pacifico/, andesbox/, globalbox/)

### Related skills:
- `iub-curriculum-design` — general IUB curriculum design patterns (PLO alignment,
  rubric authoring, KB generation, case-mirror exam design)
