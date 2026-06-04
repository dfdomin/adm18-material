---
name: iub-course-workflow-v2
description: >
  Generic workflows for generating and maintaining course materials and web
  applications for any IUB undergraduate module. Covers session startup,
  context loading, document generation for case studies, assessment instrument
  creation, auto-gradable activity design, rubric authoring, and dual-format
  knowledge base maintenance. Module-agnostic — always confirm which module
  is active before executing any workflow.
---

# IUB Course Workflow Skill v2

## Description

This skill provides procedural workflows for working with any IUB
undergraduate module. It is MODULE-AGNOSTIC — it does not assume any
specific course code, case study, standard, or content domain.

Before executing ANY workflow, confirm which module is active:
  1. Read MODULE_CONTEXT.md if it exists.
  2. If not, ask the user: "Que modulo estamos trabajando?"
  3. Load the module's KNOWLEDGE_BASE.md.

---

## Workflow 1: Session Startup

Trigger: beginning a new session working on IUB course materials.

Goal: load the correct module context and be productive immediately.

### Steps

1. **Confirm the module.** Read MODULE_CONTEXT.md. If absent, ask.

2. **Read the source of truth.** KNOWLEDGE_BASE.md — compact AI reference
   containing: module identity, RAs, weekly plan, case study ecosystem,
   rubrics, bibliography, cross-references.

3. **Identify the RA block** the task falls under. Map to weeks.

4. **Load iub-curriculum-design skill** if the task involves assessment
   instruments, PLO alignment, or rubric authoring.

5. **Expand context only as needed.** Don't load all files upfront.
   Lazy-load architecture:
   - Tier 1: MODULE_CONTEXT.md + KNOWLEDGE_BASE.md
   - Tier 2: Plan de clases, microcurriculo (if task involves specific weeks)
   - Tier 3: instrumentos/, casos/ (if task involves assessment or documents)
   - Tier 4: reference.md, deep skills (if task involves architecture/security)

### Pitfalls

- Don't assume the module from the previous session. Always confirm.
- Don't import concepts, standards, or technology stacks from other modules
  unless explicitly told to do so. Each module is independent.
- If the module is about administration/processes, don't introduce programming
  concepts. If it's about programming, don't introduce administrative norms.
- KNOWLEDGE_BASE.md is the source of truth. Never fabricate course data.

### Verification

After startup, you must be able to:
- State the module code, name, and active RA block.
- Identify the case study and relevant documents.
- Know whether to load iub-curriculum-design or other specialized skills.

---

## Workflow 2: Activity Classification — Auto vs Manual

Trigger: designing or implementing any learning activity for the course web app.

Goal: correctly classify each activity as auto-gradable or teacher-reviewed,
and apply the corresponding implementation pattern.

### Steps

1. **Classify the activity type:**

   AUTO-GRADABLE (implement as interactive widget):
   - Multiple-choice quiz → QuizEngine
   - Classification/matching → drag-drop or click-to-select
   - Ordering/sequencing → sortable list
   - Fill-in-blanks → text input with pattern validation
   - Checklist verification → checkbox list with score
   - Interactive simulation → guided steps with validation

   TEACHER-REVIEWED (MAX 2 per module, requires rubric):
   - Open-ended document writing (letters, memos, reports)
   - Case analysis without unique answer
   - Projects or portfolios
   - Oral presentations
   - Debates or discussions

2. **For auto-gradable:** Implement using QuizEngine or equivalent widget.
   Store scores in localStorage. Provide immediate feedback.

3. **For teacher-reviewed:** BEFORE implementing the activity, CREATE the
   rubric. The rubric must exist first. Use iub-curriculum-design skill
   for rubric patterns. Minimum requirements:
   - 3-4 criteria aligned with module RAs
   - 4-5 performance levels with OBSERVABLE indicators
   - Scoring sheet with achievement level conversion
   - Concrete examples per level

### Pitfalls

- Don't make activities teacher-reviewed because "it's easier to code."
  Auto-gradable is the default. Manual review is the exception.
- Don't create a teacher-reviewed activity without a rubric. The rubric
  must exist BEFORE the activity page is built.
- A module with 3+ teacher-reviewed activities is a red flag. Re-examine
  whether some can be converted to auto-gradable.

### Verification

- [ ] Activity type correctly classified (auto vs manual)
- [ ] If auto: QuizEngine or equivalent widget implemented
- [ ] If manual: rubric file exists in instrumentos/ with all 4 requirements
- [ ] Total teacher-reviewed activities in module ≤ 2

---

## Workflow 3: Course Web Application Building

Trigger: user asks to build or update a course web application.

Goal: produce a complete, mobile-first web app for the module.

### Steps

1. **Confirm the module.** Load MODULE_CONTEXT.md + KNOWLEDGE_BASE.md.

2. **Phase 0 — Foundation:**
   - Create css/iub-tokens.css with all design tokens
   - Create js/app.js (IIFE pattern, localStorage state management)
   - Create js/quiz-engine.js (auto-gradable quiz system)
   - Create js/supabase-client.js (optional backend sync)
   - Create index.html as a COMPLETE HUB (not just week nav):
     * Week grid with state indicators (14 pills/circles)
     * Progress bar showing per-week completion
     * "Material de Estudio" section with links to casos/, normas, bibliografia
     * Module identity (hero with code, name, case study)

3. **Phase 1-N — Week pages:**
   - Each week in its own folder: semana-NN/index.html
   - Each with: purpose, activities table, linked case documents, quiz
   - Each with: guia-docente.html (teacher guide)
   - Navigation between weeks

4. **Dashboard pages:**
   - progreso.html (student progress, localStorage)
   - profesor.html (rubrics, instruments, guides)
   - notas.html (grade calculator)
   - participacion.html (group strategies, participation log)

5. **Instrument creation:**
   - All rubrics referenced in KNOWLEDGE_BASE.md must have files
   - All exam instruments must have files
   - All PLO alignments must exist
   - Dual format: .md (editable) + .pdf (static)

6. **Final verification:**
   - All case documents linked from appropriate weeks
   - All instruments linked from appropriate dashboards
   - All quizzes functional (5 questions each)
   - Mobile-first responsive verified
   - No line number contamination (NEVER use read_file + write_file)

### Pitfalls

- DON'T use read_file output as write_file input. Use Python's open() in
  execute_code for content transformations.
- The index.html MUST be a resource hub, not just a week grid. Include
  direct access to study materials.
- Each week folder MUST contain both index.html and guia-docente.html.
- Verify that the module's content domain matches the activities. Don't
    put programming exercises in a non-programming module, or administrative
    document standards in a programming module.

### Verification

- [ ] index.html has: week grid + progress pills + "Material de Estudio"
- [ ] All weeks have index.html + guia-docente.html
- [ ] All case documents referenced from appropriate weeks
- [ ] All rubrics have files in instrumentos/
- [ ] No teacher-reviewed activity lacks a rubric
- [ ] Auto-gradable quizzes functional on all non-exam weeks
- [ ] Mobile-first: scroll works at 320px, touch targets >= 44px

---

## Workflow 4: Assessment Instrument Creation

Trigger: user asks to design or update an exam, rubric, or assessment.

### Steps

1. **Identify the assessment type:**
   - Parcial (mid-term, case mirror)
   - Final (integrative, covers all RAs)
   - Rubrica (analytic, 3-4 criteria x 4-5 levels)
   - PLO Alignment (traceability table)

2. **Apply case-mirror pattern for exams:**
   - Same document types as formative case
   - Different company, countries, data
   - Same logic, different problems to discover
   - MUST have real contextual differences (different countries =
     different regulations = different problems)

3. **Include guia docente section:**
   - List of injected problems with exact document references
   - What the student SHOULD find
   - Scoring key aligned with rubric

4. **Deliver dual format:** .md (editable) + .pdf (static)

5. **Verify rubric alignment.** Every assessment references a rubric.
   If the rubric doesn't exist, create it first.

### Verification
- [ ] Assessment type identified
- [ ] Mirror case is meaningfully different from formative case
- [ ] Rubric referenced and exists
- [ ] Guia docente with injected problems + expected answers
- [ ] Both .md and .pdf delivered

---

## Workflow 5: Knowledge Base Maintenance

Trigger: any change to module structure, case documents, instruments,
bibliography, or weekly plan.

### Steps

1. **Update KNOWLEDGE_BASE.md first.** Source of truth.
2. **Regenerate KNOWLEDGE_BASE.html** if .md changed.
3. **Update cross-reference table** for new/removed/renamed files.
4. **Bump update dates.**

### Pitfalls
- NEVER update only one format (.md or .html).
- Cross-reference table must list every document in the project.
- Don't delete migration history notes.
- Don't mix content from different modules.

### Verification
- [ ] KNOWLEDGE_BASE.md and .html are both updated
- [ ] Cross-reference table reflects current state
- [ ] No broken references

---

## Module Isolation Rules

1. Each IUB module has its own directory, KNOWLEDGE_BASE.md, case study,
   standards, and technology stack.

2. Before importing any concept from another module:
   a. Confirm with the user, OR
   b. Verify against the current module's KNOWLEDGE_BASE.md

3. When using another module as structural reference, say so explicitly:
   "Esto es una analogia estructural de {MODULO_REFERENCIA}."

4. Technology stacks are per-module. Examples of how stacks vary:
   - Modulo de introduccion a tecnologia → lenguaje de programacion, HTML/CSS/JS
   - Modulo de gestion documental → HTML/CSS/JS vanilla
   - Modulo de desarrollo de software → lenguaje de programacion, git, CLI tools
   Confirm the stack from MODULE_CONTEXT.md or KNOWLEDGE_BASE.md.

5. Don't assume a module uses a programming language because another module does.

---

## Memory Patterns

### After every session:
- Update KNOWLEDGE_BASE.md if course facts changed.
- Regenerate KNOWLEDGE_BASE.html if .md changed.
- Update cross-reference table for new files.

### After creating assessment instruments:
- Add entry to instrumentos/ directory.
- Update KNOWLEDGE_BASE.md instrument listing.
- Generate .pdf via instrumentos/_gen_pdf.py.

### After creating case documents:
- Add to casos/{empresa}/ with README.md index.
- Verify internal consistency.
- Update KNOWLEDGE_BASE.md case listing.

### After bibliographic updates:
- Update bibliography file.
- Update KNOWLEDGE_BASE.md bibliography section.

---

## References

### Companion documents (per module):
- MODULE_CONTEXT.md — module identity, loaded at session start
- KNOWLEDGE_BASE.md — compact AI reference, source of truth
- system-prompt-v2.txt — LLM system prompt (module-agnostic)
- KNOWLEDGE_BASE.html — human-readable web version
- Plan de clases — detailed weekly plan

### Subdirectories (per module):
- instrumentos/ — assessment instruments, rubrics, PLO alignments, PDF generator
- casos/ — case study documents

### Related skills:
- iub-curriculum-design — general IUB curriculum design patterns
