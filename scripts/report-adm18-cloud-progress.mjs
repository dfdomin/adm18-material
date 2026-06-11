#!/usr/bin/env node
/**
 * Reporte docente: estudiantes ADM18 con XP en Supabase.
 * Uso: node scripts/report-adm18-cloud-progress.mjs [--json|--md]
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SUPABASE_URL = "https://nnrgxuzvjtweyzkdrech.supabase.co";
const SUPABASE_KEY = "sb_publishable_-101J7EEEhv-C5kjosWGTg_657OtsBg";
const OFFERING = process.env.ADM18_OFFERING || "ADM18-2026-2";

async function fetchReport() {
  const headers = { apikey: SUPABASE_KEY, Authorization: "Bearer " + SUPABASE_KEY };
  const studsRes = await fetch(
    SUPABASE_URL + "/rest/v1/v_legacy_students?select=cc,name,grupo,horario&offering_code=eq."
      + encodeURIComponent(OFFERING) + "&order=grupo,name",
    { headers },
  );
  if (!studsRes.ok) throw new Error("students HTTP " + studsRes.status);
  const students = await studsRes.json();

  const progRes = await fetch(
    SUPABASE_URL + "/rest/v1/v_legacy_student_progress?select=student_id,semana,xp,quiz_score,activity_done,updated_at&offering_code=eq."
      + encodeURIComponent(OFFERING) + "&order=student_id,semana",
    { headers },
  );
  if (!progRes.ok) throw new Error("progress HTTP " + progRes.status);
  const progress = await progRes.json();

  const byStudent = new Map();
  for (const s of students) {
    byStudent.set(String(s.cc), {
      cc: s.cc,
      name: s.name,
      grupo: s.grupo || "",
      horario: s.horario || "",
      weeks: {},
      totalXp: 0,
      weeksWithXp: 0,
      lastUpdate: null,
    });
  }
  for (const p of progress) {
    const cc = String(p.student_id);
    let row = byStudent.get(cc);
    if (!row) {
      row = { cc, name: String(p.student_id), grupo: "", horario: "", weeks: {}, totalXp: 0, weeksWithXp: 0, lastUpdate: null };
      byStudent.set(cc, row);
    }
    const xp = Number(p.xp || 0);
    if (xp > 0 || p.activity_done) {
      row.weeks[p.semana] = {
        xp,
        quiz: Number(p.quiz_score || 0),
        activity: !!p.activity_done,
        updated: p.updated_at,
      };
      if (xp > 0) {
        row.totalXp += xp;
        row.weeksWithXp += 1;
      }
      if (p.updated_at && (!row.lastUpdate || p.updated_at > row.lastUpdate)) {
        row.lastUpdate = p.updated_at;
      }
    }
  }

  const rows = [...byStudent.values()].sort((a, b) => b.totalXp - a.totalXp || a.name.localeCompare(b.name));
  const withXp = rows.filter((r) => r.weeksWithXp > 0);
  const withoutXp = rows.filter((r) => r.weeksWithXp === 0);
  const weekCoverage = {};
  for (let w = 1; w <= 14; w++) {
    weekCoverage[w] = progress.filter((p) => p.semana === w && Number(p.xp) > 0).length;
  }

  return {
    generatedAt: new Date().toISOString(),
    offering: OFFERING,
    rosterTotal: rows.length,
    withCloudXp: withXp.length,
    withoutCloudXp: withoutXp.length,
    weekCoverage,
    studentsWithXp: withXp,
    studentsWithoutXp: withoutXp,
    students: rows,
  };
}

function toMarkdown(report) {
  let md = `# ADM18 · Progreso en nube (${report.offering})\n\n`;
  md += `Generado: ${report.generatedAt}\n\n`;
  md += `## Resumen\n\n`;
  md += `- Estudiantes en roster: **${report.rosterTotal}**\n`;
  md += `- Con XP en nube: **${report.withCloudXp}**\n`;
  md += `- Sin XP en nube: **${report.withoutCloudXp}**\n\n`;
  md += `## Cobertura por semana\n\n`;
  md += `| Semana | Estudiantes con XP |\n|--------|--------------------|\n`;
  for (let w = 1; w <= 14; w++) md += `| ${w} | ${report.weekCoverage[w] || 0} |\n`;
  md += `\n## Con progreso en nube\n\n`;
  md += `| Nombre | CC | Grupo | Semanas | XP total | Última actividad |\n`;
  md += `|--------|-----|-------|---------|----------|------------------|\n`;
  for (const r of report.studentsWithXp) {
    const weeks = Object.keys(r.weeks).sort((a, b) => +a - +b).join(", ");
    md += `| ${r.name} | ${r.cc} | ${r.grupo} | ${r.weeksWithXp} (${weeks}) | ${r.totalXp} | ${r.lastUpdate ? r.lastUpdate.slice(0, 10) : "—"} |\n`;
  }
  if (report.studentsWithoutXp.length) {
    md += `\n## Sin XP en nube (${report.studentsWithoutXp.length})\n\n`;
    for (const r of report.studentsWithoutXp) {
      md += `- ${r.name} (${r.cc}) · ${r.grupo || "sin grupo"}\n`;
    }
  }
  return md;
}

async function main() {
  const report = await fetchReport();
  const stamp = new Date().toISOString().slice(0, 10);
  const dir = path.resolve(__dirname, "harness-reports");
  fs.mkdirSync(dir, { recursive: true });
  const jsonPath = path.join(dir, `adm18-docente-nube-${stamp}.json`);
  const mdPath = path.join(dir, `adm18-docente-nube-${stamp}.md`);
  fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2));
  fs.writeFileSync(mdPath, toMarkdown(report));

  console.log("Reporte generado:");
  console.log(" ", jsonPath);
  console.log(" ", mdPath);
  console.log(`\nRoster: ${report.rosterTotal} | Con XP: ${report.withCloudXp} | Sin XP: ${report.withoutCloudXp}`);
  console.log("\nEstudiantes con XP:");
  for (const r of report.studentsWithXp) {
    console.log(`  · ${r.name} — ${r.totalXp} XP (${r.weeksWithXp} semanas) · ${r.grupo}`);
  }
}

main().catch((e) => {
  console.error("Error:", e.message);
  process.exit(1);
});
