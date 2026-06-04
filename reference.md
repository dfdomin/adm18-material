# Reference: IUB Assessment Architecture & Patterns

> Long-form reference for IUB course web applications and assessment systems.
> Load only when the task explicitly involves ABET, Ley 1581, traceability,
> sprint gates, DG-TSI-09-V4, or deep architecture questions.
> For daily workflows, use `SKILL-v2.md` and `system-prompt-v2.txt`.
>
> **MODULE ISOLATION: Each IUB module is independent.** This reference
> contains patterns from multiple projects (RA-Assessment-App, TGA04 NeuroBiz).
> Before applying any pattern, confirm it's appropriate for the CURRENT module.
> Don't import Python patterns into a business module, or administrative
> norms into a programming module. When using a pattern from another module,
> state it as structural analogy, not direct application.

---

## Table of Contents

1. [Architectural Patterns Deep-Dive](#1-architectural-patterns-deep-dive)
2. [ABET & Ley 1581/2012 Decisions](#2-abet--ley-15812012-decisions)
3. [IUB Design Tokens & DG-TSI-09-V4](#3-iub-design-tokens--dg-tsi-09-v4)
4. [Security Patterns Detailed](#4-security-patterns-detailed)
5. [Code Examples](#5-code-examples)
6. [Sprint Structure & Security Gates](#6-sprint-structure--security-gates)
7. [Traceability: PRD → Implementation → Tests](#7-traceability-prd--implementation--tests)
8. [Lessons Learned: AI-Assisted Programming](#8-lessons-learned-ai-assisted-programming)
9. [Academic References](#9-academic-references)

---

## 1. Architectural Patterns Deep-Dive

### 1.1 Hexagonal Architecture (Ports & Adapters)

Both projects embrace Ports & Adapters but at different scales:

**RA-Assessment-App** — Full hexagonal:
```
[Web UI (HTML/JS)] → [FastAPI REST] → [Service Layer] → [Ports] → [Adapters]
                                                                   ├── PostgreSQL
                                                                   ├── File export
                                                                   └── (Oracle, REST future)
```

Adapters live in `src/integration/`. Each adapter implements a port interface.
Swap adapters by changing a config key — no service-layer changes needed.

**TGA04 NeuroBiz** — Lightweight hexagonal:
```
[HTML/JS UI] → [Supabase client (js)] → [Supabase (PostgreSQL + RLS)]
                                         [localStorage (offline sync)]
```

The Supabase client IS the adapter. localStorage acts as a secondary adapter
for offline-first patterns with eventual consistency to Supabase.

### 1.2 SyncPayload — Universal Contract

`SyncPayload` is the canonical data shape for all inter-layer communication
in RA-Assessment-App:

```python
class SyncPayload(BaseModel):
    """Universal contract for data exchange between layers."""
    source: str          # "file", "oracle", "rest", "form"
    entity: str          # "assessment", "student", "module"
    operation: str       # "create", "update", "delete", "query"
    data: dict           # Entity-specific payload
    metadata: dict       # trace_id, timestamp, user_id
```

Benefits:
- Single validation point at the boundary.
- All adapters speak the same language.
- New adapters need only implement `send(SyncPayload) → SyncPayload`.

### 1.3 Adapter Swappability

Current adapters (RA-Assessment-App):

| Adapter | Port | Status | Swappable |
|---------|------|--------|-----------|
| PostgreSQL (asyncpg) | DatabasePort | Production | Yes, to Oracle |
| FileSystem | ExportPort | Production | Yes, to S3 |
| REST (httpx) | ExternalPort | Pending | Yes, to gRPC |

Each adapter is injected via FastAPI's dependency system:

```python
def get_db_adapter() -> DatabasePort:
    return PostgresAdapter(settings.database_url)
```

### 1.4 Factory + Lifespan Pattern

```python
def create_app() -> FastAPI:
    app = FastAPI(lifespan=lifespan)

    @asynccontextmanager
    async def lifespan(app: FastAPI):
        # Startup: init pools, load config, warm caches
        await init_db_pool()
        yield
        # Shutdown: close pools, flush logs
        await close_db_pool()

    return app
```

### 1.5 TGA04 IIFE Module Pattern

All TGA04 JavaScript uses Immediately Invoked Function Expressions
to avoid global scope pollution:

```javascript
const DashboardModule = (function() {
    const state = { students: [], filters: {} };

    async function loadStudents() { /* ... */ }

    return { init, render, loadStudents };
})();
```

### 1.6 Data Flow — TGA04 localStorage Sync

11 localStorage keys documented in KNOWLEDGE_BASE.md:

| Key | Purpose | Sync Strategy |
|-----|---------|---------------|
| `nb_user` | User profile (PIN, name) | Local-first, optional Supabase |
| `nb_xp` | Experience points | Local-only, computed |
| `nb_progress` | Week completion status | Synced on save |
| `nb_scores` | Quiz scores | Synced on save |
| `nb_settings` | UI preferences | Local-only |
| `nb_cache` | API response cache | TTL-based invalidation |

---

## 2. ABET & Ley 1581/2012 Decisions

### 2.1 ABET — Learning Outcome Assessment

The RA-Assessment-App replaces an Excel/VBA workflow used for ABET
accreditation. Key requirements:

**Assessment flow**:
1. Admin defines "Resultados de Aprendizaje" (RAs) per program.
2. Lider assigns RAs to modules and docentes.
3. Docentes assess students per RA using rubrics.
4. System aggregates scores and generates ABET reports.

**Data model**:
```
Programa (1) ──→ (N) Modulo (1) ──→ (N) ResultadoAprendizaje
                                        │
                                        └──→ (N) Assessment (1) ──→ (1) Estudiante
```

**ABET reporting**:
- Criterion 3: Student Outcomes → mapped to RAs.
- Criterion 4: Continuous Improvement → assessment cycles.
- Criterion 5: Curriculum → RA-to-module mapping.

### 2.2 ABET-Aligned Decision: 404-not-403 for IDOR

ABET Criterion 3 requires secure systems. The 404-not-403 pattern ensures:
- An attacker cannot enumerate resources ("does module X exist?").
- An attacker cannot distinguish "no access" from "doesn't exist."
- This supports FERPA-style data privacy in an educational context.

### 2.3 Ley 1581/2012 — Colombian Data Protection

Ley 1581/2012 (Habeas Data) governs personal data in Colombia.
Key compliance points in RA-Assessment-App:

**Consent (Art. 9)**:
- Student import requires explicit consent checkbox.
- Consent text: "Autorizo el tratamiento de mis datos personales..."
- Consent timestamp logged in `consent_log` table.

**Purpose limitation (Art. 4)**:
- Data used ONLY for academic assessment.
- No marketing, no third-party sharing, no analytics beyond ABET.

**Right to deletion (Art. 15)**:
- Implemented as anonymization, not physical deletion.
- `is_deleted = true` + PII fields overwritten with `[REDACTED]`.

**Security (Art. 17)**:
- Documented in `docs/SECURITY.md`.
- RLS policies at database level.
- Encrypted at rest (Hetzner volume encryption) and in transit (TLS).

**International transfer (Art. 26)**:
- Hetzner data centers in Germany → EU adequacy decision applies.
- Documented in privacy notice.

### 2.4 Anonymization-over-Deletion Pattern

```python
async def delete_student(student_id: int) -> None:
    """Anonymize, never physically delete."""
    await db.execute(
        update(Student)
        .where(Student.id == student_id)
        .values(
            is_deleted=True,
            name="[REDACTED]",
            email=f"deleted_{student_id}@redacted.iub.edu.co",
            cc_number="[REDACTED]",
            phone="[REDACTED]",
            deleted_at=func.now()
        )
    )
```

---

## 3. IUB Design Tokens & DG-TSI-09-V4

### 3.1 Design Tokens

```css
:root {
    /* === BRAND === */
    --primary:       #1E2843;     /* IUB navy — headers, nav, primary buttons */
    --primary-hover: #2A3A5E;     /* Darker hover state */
    --accent:        #2d3a5e;     /* Sidebar, secondary surfaces */
    --accent-light:  #3E4F7A;     /* Hover/active on accent surfaces */
    --gold:          #FFDF2D;     /* IUB gold — highlights, badges, CTAs */
    --gold-hover:    #E6C800;     /* Darker gold for hover */

    /* === TEXT === */
    --text-primary:    #1a1a1a;   /* Body text — high contrast */
    --text-secondary:  #4a4a4a;   /* Subtitles, metadata */
    --text-on-dark:    #ffffff;   /* Text on primary/accent backgrounds */
    --text-on-gold:    #1E2843;   /* Text on gold background */

    /* === SURFACES === */
    --bg-page:       #f5f6fa;     /* Page background */
    --bg-card:       #ffffff;     /* Card/panel background */
    --border:        #d0d5dd;     /* Borders, dividers */

    /* === SEMANTIC === */
    --success:       #16a34a;     /* Pass, complete, submitted */
    --warning:       #f59e0b;     /* Pending, in-progress */
    --error:         #dc2626;     /* Fail, error, blocked */
    --info:          #3b82f6;     /* Info, help, tips */

    /* === TYPOGRAPHY === */
    --font-family:   'Open Sans', Arial, sans-serif;
    --font-mono:     'Source Code Pro', 'Courier New', monospace;
    --font-size-sm:  0.875rem;
    --font-size-md:  1rem;
    --font-size-lg:  1.25rem;
    --font-size-xl:  1.5rem;

    /* === SPACING === */
    --space-xs:  0.25rem;
    --space-sm:  0.5rem;
    --space-md:  1rem;
    --space-lg:  1.5rem;
    --space-xl:  2rem;

    /* === RADIUS === */
    --radius-sm:  4px;
    --radius-md:  8px;
    --radius-lg:  12px;

    /* === SHADOWS === */
    --shadow-sm:  0 1px 3px rgba(0,0,0,0.08);
    --shadow-md:  0 4px 12px rgba(0,0,0,0.1);
    --shadow-lg:  0 8px 24px rgba(0,0,0,0.12);
}
```

### 3.2 DG-TSI-09-V4 Layout Guidelines

DG-TSI-09-V4 is IUB's institutional web standard. Key rules:

**Layout**: Header → Content → Footer, never side-scroll at 1024×768.

```html
<div class="iub-layout">
  <header class="iub-header">
    <!-- Logo, nav, user menu -->
  </header>
  <main class="iub-content">
    <!-- Single-column content area, max-width: 1200px, centered -->
  </main>
  <footer class="iub-footer">
    <!-- IUB branding, legal links -->
  </footer>
</div>
```

```css
.iub-layout {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
}

.iub-header {
    background: var(--primary);
    color: var(--text-on-dark);
    padding: var(--space-md) var(--space-xl);
}

.iub-content {
    flex: 1;
    max-width: 1200px;
    width: 100%;
    margin: 0 auto;
    padding: var(--space-lg);
    overflow-x: hidden; /* CRITICAL: no horizontal scroll */
}

.iub-footer {
    background: var(--primary);
    color: var(--text-on-dark);
    padding: var(--space-md) var(--space-xl);
    text-align: center;
    font-size: var(--font-size-sm);
}
```

**Resolution rules**:
- Minimum: 1024×768 (no horizontal scroll, all content visible).
- Recommended: 1366×768 (optimal for IUB classroom projectors).
- Mobile: responsive but NOT the primary target; IUB classrooms use
  desktop browsers.

**Contrast**: WCAG 2.1 AA minimum on all text.
- `--text-primary` on `--bg-page`: ratio ≥ 4.5:1 ✓
- `--text-on-dark` on `--primary`: ratio ≥ 4.5:1 ✓
- `--text-on-gold` on `--gold`: ratio ≥ 4.5:1 ✓

---

## 4. Security Patterns Detailed

### 4.1 IDOR Prevention — verify_module_ownership

This is the most important security pattern in RA-Assessment-App.

```python
async def verify_module_ownership(
    modulo_id: int,
    docente_id: int,
    db: AsyncSession
) -> bool:
    """
    Verify that a docente owns a module.

    Returns True if ownership confirmed.
    Raises HTTPException(404) if not — NEVER 403.
    """
    result = await db.execute(
        select(ModuloDocente)
        .where(
            ModuloDocente.modulo_id == modulo_id,
            ModuloDocente.docente_id == docente_id,
            ModuloDocente.is_active == True
        )
    )
    if not result.scalar_one_or_none():
        raise HTTPException(
            status_code=404,
            detail="Module not found"
        )
    return True
```

**Usage**: Every module-scoped endpoint must call this:

```python
@router.get("/modulos/{modulo_id}/assessments")
async def get_assessments(
    modulo_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    await verify_module_ownership(modulo_id, current_user.id, db)
    # ... proceed with fetching assessments
```

**Why 404, not 403**: A 403 tells the attacker "this resource exists but
you can't access it." A 404 tells them nothing — it's ambiguous whether
the module exists at all. This prevents enumeration attacks.

### 4.2 Sanitization Pipeline

All user-supplied text flows through this pipeline:

```
User Input → bleach.clean() → validate_length() → DB persist
                                            ↓
                              safe_cell_value() → export (Excel/DOCX/CSV)
```

```python
import bleach

ALLOWED_TAGS = []  # No HTML in student names, module descriptions
ALLOWED_ATTRS = {}

def sanitize_text(value: str | None) -> str:
    """Strip all HTML from user input."""
    if value is None:
        return ""
    return bleach.clean(
        value,
        tags=ALLOWED_TAGS,
        attributes=ALLOWED_ATTRS,
        strip=True
    )

def safe_cell_value(value: str | None) -> str:
    """Prevent CSV/Excel formula injection."""
    if value is None:
        return ""
    dangerous_prefixes = ('=', '+', '-', '@', '\t', '\r')
    if value.startswith(dangerous_prefixes):
        return "'" + value  # Single-quote prefix neutralizes formula
    return value
```

### 4.3 JWT Auth Flow

```
Login Request
  ↓
Validate credentials (bcrypt)
  ↓
Generate JWT (access + refresh)
  ↓
Set httpOnly cookie:
  - access_token: JWT, httpOnly, Secure, SameSite=Strict, 15min
  - refresh_token: opaque, httpOnly, Secure, SameSite=Strict, 7d
  ↓
Every request:
  ↓
Extract JWT from cookie
  ↓
Validate signature + expiry
  ↓
Check JTI against blocklist (Redis/postgres)
  ↓
Inject current_user into request state
```

**Logout**: Add JTI to blocklist, clear cookies.

```python
@router.post("/auth/logout")
async def logout(
    response: Response,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Immediate logout via JTI blocklist."""
    jti = current_user.token_jti
    await add_to_blocklist(jti, db)  # JTI blocked immediately
    response.delete_cookie("access_token")
    response.delete_cookie("refresh_token")
    return {"message": "Logged out"}
```

### 4.4 Rate Limiting — Layered

**Layer 1 — Application (slowapi)**:
```python
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)

@router.post("/auth/login")
@limiter.limit("5/minute")  # Brute-force protection
async def login(...): ...
```

**Layer 2 — OS (fail2ban)**:
Monitors Caddy access logs for 401/404 patterns. Bans IPs at firewall
level after 10 auth failures in 60 seconds.

### 4.5 Consent Tracking (Ley 1581)

```python
class ConsentLog(Base):
    __tablename__ = "consent_log"

    id: int
    student_id: int          # FK to Student
    consent_given: bool
    consent_text: str        # The exact text shown to user
    ip_address: str          # For audit trail
    user_agent: str
    created_at: datetime

    # Index for quick lookups by student
    __table_args__ = (
        Index("idx_consent_student", "student_id"),
    )
```

### 4.6 Supabase RLS Policies (TGA04)

```sql
-- Students can only read their own data
CREATE POLICY "students_read_own"
ON public.student_data
FOR SELECT
USING (auth.uid() = user_id);

-- Teachers can read all students in their courses
CREATE POLICY "teachers_read_course"
ON public.student_data
FOR SELECT
USING (
    auth.uid() IN (
        SELECT teacher_id FROM course_assignments
        WHERE course_id = student_data.course_id
    )
);

-- Only teachers can insert/update scores
CREATE POLICY "teachers_insert_scores"
ON public.student_data
FOR INSERT
WITH CHECK (
    auth.uid() IN (
        SELECT teacher_id FROM course_assignments
        WHERE course_id = student_data.course_id
    )
);
```

---

## 5. Code Examples

### 5.1 FastAPI Endpoint with Full Security Stack

```python
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from slowapi import Limiter
from slowapi.util import get_remote_address

router = APIRouter(prefix="/api/modulos", tags=["modules"])
limiter = Limiter(key_func=get_remote_address)


@router.get("/{modulo_id}/assessments/export")
@limiter.limit("10/minute")
async def export_assessments(
    modulo_id: int,
    format: str = "excel",
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Export assessments for a module.

    Security: verify_module_ownership, rate limited,
    output sanitized via safe_cell_value.
    """
    # 1. IDOR check — 404 on failure
    await verify_module_ownership(modulo_id, current_user.id, db)

    # 2. Fetch data
    assessments = await fetch_assessments(modulo_id, db)

    # 3. Sanitize output cells
    safe_rows = []
    for a in assessments:
        safe_rows.append({
            "student": safe_cell_value(a.student_name),
            "score": a.score,  # Numeric, no sanitization needed
            "comments": safe_cell_value(a.comments),
        })

    # 4. Return sanitized export
    if format == "excel":
        return build_excel_response(safe_rows)
    elif format == "csv":
        return build_csv_response(safe_rows)
    else:
        raise HTTPException(400, "Unsupported format")
```

### 5.2 TGA04 Quiz with localStorage Sync

```javascript
const QuizModule = (function() {
    const STORAGE_KEY = 'nb_scores';
    const SUPABASE_SYNC_INTERVAL = 30000; // 30s

    async function submitScore(week, score) {
        // 1. Save locally (instant feedback)
        const scores = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
        scores[`week_${week}`] = {
            score,
            timestamp: Date.now(),
            synced: false
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(scores));

        // 2. Try Supabase sync (best-effort)
        try {
            await supabase.from('scores').upsert({
                user_id: getCurrentUserId(),
                week,
                score,
                updated_at: new Date().toISOString()
            });
            scores[`week_${week}`].synced = true;
            localStorage.setItem(STORAGE_KEY, JSON.stringify(scores));
        } catch (err) {
            console.warn('Sync deferred:', err.message);
            // Will retry on next interval
        }

        // 3. Update XP
        XPModule.addXP(week, score);
    }

    // Background sync for unsynced scores
    setInterval(syncUnsyncedScores, SUPABASE_SYNC_INTERVAL);

    return { submitScore };
})();
```

### 5.3 Alembic Migration with Rollback

```python
"""Add consent_log table for Ley 1581/2012 compliance

Revision ID: a1b2c3d4e5f6
Revises: g7h8i9j0k1l2
Create Date: 2025-11-15
"""
from alembic import op
import sqlalchemy as sa

revision = 'a1b2c3d4e5f6'
down_revision = 'g7h8i9j0k1l2'


def upgrade():
    op.create_table(
        'consent_log',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('student_id', sa.Integer(), nullable=False),
        sa.Column('consent_given', sa.Boolean(), nullable=False),
        sa.Column('consent_text', sa.Text(), nullable=False),
        sa.Column('ip_address', sa.String(45), nullable=False),
        sa.Column('user_agent', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now()),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['student_id'], ['students.id']),
    )
    op.create_index('idx_consent_student', 'consent_log', ['student_id'])


def downgrade():
    op.drop_index('idx_consent_student')
    op.drop_table('consent_log')
```

---

## 6. Sprint Structure & Security Gates

### 6.1 Sprint Lifecycle

Each sprint in RA-Assessment-App follows this structure:

```
┌─────────────────────────────────────────────────────────┐
│ SPRINT N                                                 │
├──────────┬──────────────────────────────────────────────┤
│ Phase 0  │ Planning: PRD review, scope, ADRs            │
│ Phase 1  │ BDD: Gherkin scenarios written & reviewed    │
│ Phase 2  │ TDD: Test cases written (RED)                │
│ Phase 3  │ Implementation (GREEN + REFACTOR)            │
│ Phase 4  │ Security gate (checklist from SKILL.md)      │
│ Phase 5  │ Human review (memory/HUMAN_REVIEW.md)        │
│ Phase 6  │ Merge → Deploy → Monitor                     │
└──────────┴──────────────────────────────────────────────┘
```

### 6.2 Security Gate Checklist

Before ANY PR merge, these gates must pass:

| Gate | Check | Automated |
|------|-------|-----------|
| G1 | Full test suite green | pytest |
| G2 | No new lint errors | ruff/mypy |
| G3 | verify_module_ownership on new endpoints | grep audit |
| G4 | bleach.clean() on new text inputs | grep audit |
| G5 | safe_cell_value() on new exports | grep audit |
| G6 | No PII in logs | grep audit |
| G7 | Consent check on new student data flows | manual |
| G8 | Alembic migration has downgrade | manual |
| G9 | API docs updated (OpenAPI auto) | FastAPI |
| G10 | HUMAN_REVIEW.md updated | manual |

### 6.3 Sprints Status (RA-Assessment-App)

| Sprint | Status | Key Deliverable |
|--------|--------|-----------------|
| S0 | Done | Scaffold, CI, auth skeleton |
| S1 | Done | User CRUD, JWT flow |
| S2 | Done | Module management, ownership |
| S3 | Done | Assessment CRUD, scoring |
| S4 | Done | Export (Excel, CSV, PDF) |
| S5 | Done | Rate limiting, security hardening |
| S6 | Pending | Dashboard analytics, charts |
| S7 | Pending | ABET report generation |

### 6.4 TGA04 Week Structure

13 weeks of content (1-15, skipping Semana 5 and Semana 10 for
partial exams), each with:
- `index.html` — Content page
- Inline quiz at bottom
- localStorage-backed score persistence
- XP awarded on completion

Dashboards: `index.html` (student), `profesor.html`, `notas.html`,
`participacion.html`, `revision.html`.

---

## 7. Traceability: PRD → Implementation → Tests

### 7.1 Traceability Matrix Format

Every PRD requirement maps to implementation and tests:

```
PRD-RQ-003: System shall prevent IDOR on module endpoints
  ├── Implementation: src/api/deps.py → verify_module_ownership()
  ├── Test (BDD): docs/BDD/security.feature → Scenario: Docente denied access to other's module
  ├── Test (TDD): tests/test_security.py → test_verify_ownership_404_not_403()
  ├── Test (Security): tests/test_security.py → test_enumeration_attack_always_404()
  └── SDD: docs/SDD.md → Section 4.2 "Authorization Layer"
```

### 7.2 Traceability Document

Full matrix at `docs/TRACEABILITY_MATRIX.md` (generated, not manually
maintained). Each row links:
- PRD requirement ID
- ADR number (if applicable)
- Source file(s)
- BDD scenario(s)
- TDD test case(s)
- Security test case(s)
- SDD section
- Sprint delivered
- Verification status

### 7.3 Automated Traceability

A script in `scripts/trace.py` scans the codebase and generates the
traceability matrix by:
1. Parsing PRD.md for requirement IDs.
2. Grepping for requirement IDs in test docstrings.
3. Matching test files to source files.
4. Flagging requirements with no tests (coverage gap).
5. Flagging tests with no requirement (orphan test).

---

## 8. Lessons Learned: AI-Assisted Programming

Extracted from `docs/AI_ASSISTED_PROGRAMMING_EXPERIENCE_LOG.md`
and 5 sprints of AI-assisted development.

### 8.1 What Worked

**Spec-first development**: Writing the PRD completely before any code
was the single highest-leverage decision. The PRD served as:
- Prompt context for every AI session.
- Contract for what "done" means.
- Reference for test generation.
- Onboarding document for new contributors (human and AI).

**BDD as AI prompt**: Gherkin scenarios proved more effective than
prose descriptions for AI code generation. The structured Given/When/Then
format maps directly to test setup/action/assert patterns.

**Memory files as state**: `PROJECT_STATE.md` and `NEXT_STEPS.md`
eliminated the "what was I doing?" problem across sessions. Each
session starts by reading these files — no re-explanation needed.

**ADR logging**: Writing ADRs for every architectural decision created
a searchable decision history. When an AI suggested a contradictory
approach, pointing to the relevant ADR resolved the conflict instantly.

**Hexagonal architecture + AI**: The clear boundary between ports and
adapters made it easy to tell the AI "add a new adapter implementing
this interface" — the contract was already defined.

### 8.2 What Didn't Work

**Overly broad prompts**: "Build the assessment module" produced
unreviewable code dumps. Narrow, test-first prompts ("write a test
for X, then implement it") produced verifiable increments.

**AI inventing configuration**: Multiple sessions wasted on debugging
AI-fabricated Supabase config values. The rule "never trust, always
verify with real output" emerged from this pain.

**Context pollution**: Loading every project file into every session
caused the AI to mix concerns from different sprints. Lazy-load
architecture (SKILL.md) solved this.

**Untestable code from AI**: AI sometimes generates code that's hard
to test (tight coupling, no dependency injection). The RED-GREEN-SUITE
rule caught this early — if you can't write a test first, the design
is wrong.

### 8.3 Prompt Engineering Insights

1. **Be the spec, not the solver**: Tell the AI WHAT to build and
   HOW to verify it; let it figure out the implementation.
2. **Negative examples work**: "Never return 403 for ownership
   failures" is more effective than "use 404 for security."
3. **Token budgets matter**: Spec files (PRD.md, KNOWLEDGE_BASE.md)
   are compressed using semantic compression — every word earns
   its place.
4. **State is prompt**: PROJECT_STATE.md and NEXT_STEPS.md are
   effectively part of the system prompt. Update them religiously.

### 8.4 Transparency Log

Per ABET Criterion on pedagogical transparency, every AI-generated
contribution is logged:

```markdown
| Date | Tool | Model | Prompt Summary | Files Changed | Human Review |
|------|------|-------|---------------|---------------|-------------|
| 2025-11-10 | Claude | Sonnet 4 | Add verify_module_ownership | deps.py, test_security.py | Approved |
| 2025-11-12 | Codex | GPT-5 | Export to Excel with sanitization | export.py, test_export.py | Rejected (missing safe_cell_value) |
```

Full log: `docs/AI_ASSISTED_PROGRAMMING_EXPERIENCE_LOG.md`.

---

## 9. Academic References

### 9.1 Prompt Engineering & AI-Assisted Development

- White, J. et al. (2023). "A Prompt Pattern Catalog to Enhance
  Prompt Engineering with ChatGPT." Vanderbilt University.
  — Source of the "Persona Pattern" used in system-prompt.txt.

- Chen, M. et al. (2021). "Evaluating Large Language Models Trained
  on Code." arXiv:2107.03374.
  — Codex/HumanEval benchmarks referenced for AI code quality.

### 9.2 Software Engineering Education

- ACM/IEEE-CS (2020). "Computing Curricula 2020 (CC2020)."
  — ABET-aligned competency framework.

- ABET (2024). "Criteria for Accrediting Computing Programs."
  — Criterion 3 (Student Outcomes) and Criterion 5 (Curriculum).

### 9.3 Security

- OWASP (2021). "API Security Top 10."
  — API1:2023 (Broken Object Level Authorization) maps to IDOR patterns.

- OWASP (2021). "Injection Prevention Cheat Sheet."
  — Formula injection references for safe_cell_value().

### 9.4 Colombian Legal Framework

- Ley 1581 de 2012. "Por la cual se dictan disposiciones generales
  para la protección de datos personales."
  — Habeas Data law governing all student data handling.

- Decreto 1377 de 2013. "Por el cual se reglamenta parcialmente la
  Ley 1581 de 2012."
  — Consent and privacy notice requirements.

### 9.5 Architecture

- Cockburn, A. (2005). "Hexagonal Architecture (Ports and Adapters)."
  — Architectural pattern used in RA-Assessment-App.

- Fowler, M. (2002). "Patterns of Enterprise Application Architecture."
  — Service Layer, Repository, and Dependency Injection patterns.

---

## Appendix: Quick Reference Card

```
┌─────────────────────────────────────────────────────────────┐
│ IUB ASSESSMENT PROJECTS — QUICK REFERENCE                    │
├─────────────────────────────────────────────────────────────┤
│ Stack (RA):   FastAPI + PG16 + HTML/JS + Caddy              │
│ Stack (TGA04): HTML/CSS/JS + Supabase + GitHub Pages        │
│ Auth:         JWT httpOnly + JTI blocklist                  │
│ Security:     404-not-403, bleach, safe_cell_value, slowapi │
│ Tests (RA):   201/201 + 5/5 PG                              │
│ Tests (TGA04): 35 HTML, Python compile, Node .mjs           │
│ Design:       #1E2843, #FFDF2D, Open Sans, 1024×768 min     │
│ Compliance:   ABET Criteria 3-5, Ley 1581/2012              │
│ Methodology:  BDD → TDD → SDD                               │
│ Memory:       PROJECT_STATE.md, NEXT_STEPS.md, DECISIONS.md  │
│ AI Log:       docs/AI_ASSISTED_PROGRAMMING_EXPERIENCE_LOG.md │
└─────────────────────────────────────────────────────────────┘
```
