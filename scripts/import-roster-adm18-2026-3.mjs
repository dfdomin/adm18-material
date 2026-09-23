#!/usr/bin/env node
/**
 * ADM18 · Registra un periodo completo en Supabase (esquema unificado IUB).
 *
 * Hace tres cosas, todas idempotentes:
 *   1. Asegura la oferta del módulo (course_offerings) para el periodo del roster.
 *   2. Asegura las 14 semanas (periods) y sus 4 actividades (activities).
 *   3. Carga el roster de estudiantes con documento (RPC upsert_roster_students).
 *
 * Uso:
 *   node scripts/import-roster-adm18-2026-3.mjs --dry-run     # muestra el plan
 *   node scripts/import-roster-adm18-2026-3.mjs               # aplica
 *   node scripts/import-roster-adm18-2026-3.mjs --file <ruta> # otro roster JSON
 *   node scripts/import-roster-adm18-2026-3.mjs --skip-offering  # solo roster
 *
 * Funciona con la publishable key (rol anon): el esquema unificado da
 * select/insert/update sobre course_offerings, periods y activities, y el
 * RPC upsert_roster_students está concedido a anon. No requiere contraseña
 * de base de datos ni el CLI de Supabase.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(__dirname, "..");

const SUPABASE_URL = "https://nnrgxuzvjtweyzkdrech.supabase.co";
const SUPABASE_KEY = "sb_publishable_-101J7EEEhv-C5kjosWGTg_657OtsBg";

const SEMANAS = 14;
const ACTIVIDADES = [
  { slug: "attendance", activity_type: "attendance", xp_max: 10, title: "Asistencia" },
  { slug: "quiz", activity_type: "quiz", xp_max: 100, title: "Quiz semanal" },
  { slug: "mission", activity_type: "mission", xp_max: 100, title: "Actividad semanal" },
  { slug: "weekly_summary", activity_type: "mission", xp_max: 100, title: "Resumen semanal" },
];

function arg(name, fallback) {
  const i = process.argv.indexOf(name);
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}

const dryRun = process.argv.includes("--dry-run");
const skipOffering = process.argv.includes("--skip-offering");
const file = resolve(REPO, arg("--file", "setup/roster/ADM18-2026-3.json"));
const roster = JSON.parse(readFileSync(file, "utf8"));

const headers = {
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${SUPABASE_KEY}`,
  "Content-Type": "application/json",
};

async function rest(path, init = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { headers, ...init });
  const text = await res.text();
  if (!res.ok) throw new Error(`${init.method || "GET"} ${path} → HTTP ${res.status}: ${text}`);
  return text ? JSON.parse(text) : null;
}

// ── 1. Oferta ────────────────────────────────────────────────
async function ensureOffering() {
  const mods = await rest(`modules?code=eq.${encodeURIComponent(roster.module_code)}&select=id,name`);
  if (!mods || !mods.length) throw new Error(`Módulo ${roster.module_code} no existe en public.modules`);
  const moduleId = mods[0].id;

  const found = await rest(`course_offerings?code=eq.${encodeURIComponent(roster.offering_code)}&select=id`);
  if (found && found.length) {
    console.log(`  · oferta ${roster.offering_code} ya existe (${found[0].id})`);
    return found[0].id;
  }
  if (dryRun) {
    console.log(`  · [dry-run] crearía la oferta ${roster.offering_code} (term ${roster.term})`);
    return null;
  }
  const created = await rest("course_offerings?select=id", {
    method: "POST",
    headers: { ...headers, Prefer: "return=representation" },
    body: JSON.stringify({
      module_id: moduleId,
      term: roster.term,
      year: roster.year,
      code: roster.offering_code,
    }),
  });
  console.log(`  · oferta ${roster.offering_code} creada (${created[0].id})`);
  return created[0].id;
}

// ── 2. Semanas y actividades ─────────────────────────────────
async function ensurePeriodsAndActivities(offeringId) {
  if (!offeringId) {
    console.log(`  · [dry-run] crearía ${SEMANAS} semanas × ${ACTIVIDADES.length} actividades`);
    return { periodos: 0, actividades: 0 };
  }
  const periods = await rest(`periods?offering_id=eq.${offeringId}&select=id,ordinal`);
  const byOrdinal = new Map(periods.map((p) => [p.ordinal, p.id]));

  const faltan = [];
  for (let o = 1; o <= SEMANAS; o += 1) if (!byOrdinal.has(o)) faltan.push(o);
  if (faltan.length && !dryRun) {
    const nuevas = await rest("periods?select=id,ordinal", {
      method: "POST",
      headers: { ...headers, Prefer: "return=representation" },
      body: JSON.stringify(faltan.map((o) => ({ offering_id: offeringId, ordinal: o, label: `Semana ${o}` }))),
    });
    nuevas.forEach((p) => byOrdinal.set(p.ordinal, p.id));
    console.log(`  · semanas creadas: ${faltan.join(", ")}`);
  }

  let actCreadas = 0;
  for (const [, periodId] of byOrdinal) {
    const acts = await rest(`activities?period_id=eq.${periodId}&select=slug`);
    const slugs = new Set(acts.map((a) => a.slug));
    const nuevas = ACTIVIDADES.filter((a) => !slugs.has(a.slug));
    if (!nuevas.length) continue;
    if (dryRun) { actCreadas += nuevas.length; continue; }
    await rest("activities", {
      method: "POST",
      headers: { ...headers, Prefer: "return=minimal" },
      body: JSON.stringify(nuevas.map((a) => ({ ...a, period_id: periodId }))),
    });
    actCreadas += nuevas.length;
  }
  return { periodos: byOrdinal.size, actividades: actCreadas };
}

// ── 3. Roster ────────────────────────────────────────────────
function normalize() {
  const students = (roster.estudiantes || []).map((s) => ({
    cc: String(s.cc).trim(),
    name: String(s.name || "").trim(),
    grupo: String(s.grupo || "").trim(),
    horario: String(s.horario || "").trim(),
  }));
  if (!students.length) throw new Error("El roster no tiene estudiantes con documento.");
  const dup = students.map((s) => s.cc).filter((cc, i, arr) => arr.indexOf(cc) !== i);
  if (dup.length) throw new Error(`Documentos duplicados en el roster: ${dup.join(", ")}`);
  const sinNombre = students.filter((s) => !s.name).map((s) => s.cc);
  if (sinNombre.length) throw new Error(`Estudiantes sin nombre: ${sinNombre.join(", ")}`);
  return students;
}

async function importRoster(students) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/upsert_roster_students`, {
    method: "POST",
    headers,
    body: JSON.stringify({ p_offering_code: roster.offering_code, p_students: students }),
  });
  const body = await res.text();
  if (!res.ok) throw new Error(`RPC upsert_roster_students → HTTP ${res.status}: ${body}`);
  return JSON.parse(body);
}

async function verify() {
  const rows = await rest(
    `v_legacy_students?select=cc,name,grupo,horario&offering_code=eq.${encodeURIComponent(roster.offering_code)}`,
  );
  const ccs = new Set(rows.map((r) => r.cc));
  console.log(`\n── Verificación (v_legacy_students · ${roster.offering_code}) ──`);
  console.log(`  Estudiantes en la nube: ${rows.length}`);
  return { total: rows.length, ccs };
}

// ── Main ─────────────────────────────────────────────────────
const students = normalize();

console.log(`Roster      : ${roster.offering_code} (${roster.term})`);
console.log(`Archivo     : ${file}`);
console.log(`Estudiantes : ${students.length} con documento · ${(roster.pendientes_sin_documento || []).length} pendientes sin documento`);
console.log(`Grupo       : ${roster.grupo || "(vacío)"} · Horario: ${roster.horario || "(vacío)"}`);
console.log(dryRun ? "\n── DRY RUN: nada se escribe en Supabase ──\n" : "\n── Aplicando cambios ──\n");

let offeringId = null;
if (!skipOffering) {
  console.log("1) Oferta");
  offeringId = await ensureOffering();
  console.log("2) Semanas y actividades");
  const { periodos, actividades } = await ensurePeriodsAndActivities(offeringId);
  console.log(`  · semanas presentes: ${periodos} · actividades nuevas: ${actividades}`);
} else {
  console.log("1-2) Omitidos (--skip-offering)");
}

console.log("3) Roster");
if (dryRun) {
  console.log(`  · [dry-run] registraría ${students.length} estudiantes vía upsert_roster_students`);
  console.log(JSON.stringify({ p_offering_code: roster.offering_code, p_students: students.slice(0, 3) }, null, 2), "\n  …");
  process.exit(0);
}

if (skipOffering) {
  const offers = await rest(`course_offerings?code=eq.${encodeURIComponent(roster.offering_code)}&select=id`);
  if (!offers.length) {
    console.error(`✗ La oferta ${roster.offering_code} no existe. Corre el script sin --skip-offering.`);
    process.exit(1);
  }
}

const count = await importRoster(students);
console.log(`  · RPC devolvió: ${count} estudiantes`);
const { total, ccs } = await verify();
const faltan = students.filter((s) => !ccs.has(s.cc)).map((s) => s.cc);
if (faltan.length) {
  console.error(`\n✗ No aparecen en la nube tras la carga: ${faltan.join(", ")}`);
  process.exit(1);
}
console.log(`  Los ${students.length} estudiantes del roster están registrados ✓`);
