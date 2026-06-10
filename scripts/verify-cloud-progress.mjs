#!/usr/bin/env node
/**
 * Playwright + Supabase: simula actividad del estudiante Dany Perez (CC 12345)
 * en los 4 módulos y verifica persistencia en v_legacy_student_progress.
 *
 * Uso: node scripts/verify-cloud-progress.mjs [--local|--pages]
 */
import { chromium } from "playwright";
import { spawn } from "child_process";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const SUPABASE_URL = "https://nnrgxuzvjtweyzkdrech.supabase.co";
const SUPABASE_KEY = "sb_publishable_-101J7EEEhv-C5kjosWGTg_657OtsBg";

const STUDENT = {
  nombre: "Dany Perez",
  cc: "12345",
  grupo: "Playwright",
  horario: "Test",
};

const MODULES = [
  {
    name: "ADM18",
    offering: "ADM18-2026-2",
    semana: 1,
    testXp: 41,
    marker: "pw-adm18-" + Date.now(),
    local: { root: path.resolve(__dirname, ".."), port: 8771, weekPath: "/semana-01/index.html" },
    pages: "https://dfdomin.github.io/adm18-material/semana-01/",
  },
  {
    name: "TGA04",
    offering: "TGA04-2026-2",
    semana: 1,
    testXp: 42,
    marker: "pw-tga04-" + Date.now(),
    local: { root: "/Users/diegodomingueztapia/code/tga04-neurobiz", port: 8772, weekPath: "/semana1/index.html" },
    pages: "https://dfdomin.github.io/tga04-neurobiz/semana1/",
  },
  {
    name: "TGA05",
    offering: "TGA05-2026-2",
    semana: 1,
    testXp: 43,
    marker: "pw-tga05-" + Date.now(),
    local: { root: "/Users/diegodomingueztapia/code/tga05-neurobiz", port: 8773, weekPath: "/semana1/index.html" },
    pages: "https://dfdomin.github.io/tga05-neurobiz/semana1/",
  },
  {
    name: "TD",
    offering: "TD-2026-2",
    semana: 1,
    testXp: 44,
    marker: "pw-td-" + Date.now(),
    local: { root: "/Users/diegodomingueztapia/Library/CloudStorage/OneDrive-Unibarranquilla/DiegoIcloud/2026/copilot/TD", port: 8774, weekPath: "/semana1/index.html" },
    pages: "https://dfdomin.github.io/td-inteligencia-negocios/semana1/",
  },
];

function startServer(root, port) {
  return new Promise((resolve, reject) => {
    const proc = spawn("python3", ["-m", "http.server", String(port)], { cwd: root, stdio: "ignore" });
    proc.on("error", reject);
    setTimeout(() => resolve(proc), 700);
  });
}

async function fetchCloudRow(offering, semana, studentId) {
  const q =
    SUPABASE_URL + "/rest/v1/v_legacy_student_progress?select=*"
    + "&student_id=eq." + encodeURIComponent(studentId)
    + "&offering_code=eq." + encodeURIComponent(offering)
    + "&semana=eq." + semana;
  const res = await fetch(q, {
    headers: { apikey: SUPABASE_KEY, Authorization: "Bearer " + SUPABASE_KEY },
  });
  if (!res.ok) {
    const text = await res.text();
    return { error: "query_failed", status: res.status, body: text };
  }
  const rows = await res.json();
  return { row: rows[0] || null, rows };
}

async function simulateActivity(page, mod) {
  return page.evaluate(
    async ({ student, semana, testXp, marker }) => {
      if (!window.GamifSDK) {
        return { ok: false, reason: "GamifSDK no cargó" };
      }
      const cfg = GamifSDK.getConfig();
      GamifSDK.saveProfile({
        nombre: student.nombre,
        cc: student.cc,
        id_estudiante: student.cc,
        grupo: student.grupo,
        horario: student.horario,
      });

      const state = {
        semana,
        xp: testXp,
        nombre: student.nombre,
        cc: student.cc,
        id_estudiante: student.cc,
        grupo: student.grupo,
        horario: student.horario,
        quiz_puntaje: 4,
        quiz_respuestas: { _playwright_marker: marker, activity: "playwright_simulation" },
        actividad_completada: true,
        activity_done: true,
      };

      if (typeof GamifSDK.createPT === "function") {
        try {
          const pt = GamifSDK.createPT({ semana, xpMax: 100, autoVisitXp: false });
          Object.assign(pt.state(), state);
          pt.save();
          if (pt.completeActivity) {
            await pt.completeActivity("Actividad Playwright ✅", 0);
          }
        } catch (e) { /* fallback RPC below */ }
      }

      const sync = GamifSDK.syncWeekProgress
        ? await GamifSDK.syncWeekProgress(state, cfg, semana)
        : await GamifSDK.upsertWeeklyProgress({
            p_offering_code: cfg.offeringCode,
            p_student_id: student.cc,
            p_student_name: student.nombre,
            p_grupo: student.grupo,
            p_horario: student.horario,
            p_semana: semana,
            p_xp: testXp,
            p_quiz_score: 4,
            p_quiz_answers: { _playwright_marker: marker, activity: "playwright_simulation" },
            p_hti_done: false,
            p_activity_done: true,
          });

      return {
        ok: !!sync.ok,
        status: sync.status,
        reason: sync.reason,
        module: cfg.moduleCode,
        offering: cfg.offeringCode,
        marker,
        testXp,
      };
    },
    { student: STUDENT, semana: mod.semana, testXp: mod.testXp, marker: mod.marker }
  );
}

async function run(mode) {
  const servers = [];
  const results = { pass: [], fail: [] };

  if (mode === "local") {
    for (const mod of MODULES) {
      if (fs.existsSync(mod.local.root)) {
        servers.push(await startServer(mod.local.root, mod.local.port));
      }
    }
  }

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  for (const mod of MODULES) {
    const url =
      mode === "local" && fs.existsSync(mod.local.root)
        ? "http://127.0.0.1:" + mod.local.port + mod.local.weekPath
        : mod.pages;

    console.log("\n▶ " + mod.name + " → " + url);

    try {
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
      await page.waitForFunction(() => !!window.GamifSDK, null, { timeout: 15000 });
    } catch (e) {
      results.fail.push(mod.name + ": no cargó la página o GamifSDK (" + e.message + ")");
      continue;
    }

    const sim = await simulateActivity(page, mod);
    if (!sim.ok) {
      results.fail.push(
        mod.name + ": sync falló (status=" + (sim.status || "?") + ", reason=" + (sim.reason || "?") + ")"
      );
      continue;
    }

    await new Promise((r) => setTimeout(r, 1500));

    const cloud = await fetchCloudRow(mod.offering, mod.semana, STUDENT.cc);
    if (cloud.error) {
      results.fail.push(mod.name + ": consulta Supabase falló " + cloud.status + " " + cloud.body);
      continue;
    }
    if (!cloud.row) {
      results.fail.push(mod.name + ": sin fila en v_legacy_student_progress para CC " + STUDENT.cc);
      continue;
    }

    const xpOk = Number(cloud.row.xp) >= mod.testXp;
    const activityOk = cloud.row.activity_done === true;
    const markerOk = cloud.row.quiz_answers && cloud.row.quiz_answers._playwright_marker === mod.marker;

    if (xpOk && activityOk) {
      results.pass.push(
        mod.name + ": ☁️ OK — xp=" + cloud.row.xp + ", activity_done=" + cloud.row.activity_done
        + (markerOk ? ", marker verificado" : ", marker no en payload (xp OK)")
      );
    } else {
      results.fail.push(
        mod.name + ": fila incompleta — xp=" + cloud.row.xp + " (esperado>=" + mod.testXp
        + "), activity_done=" + cloud.row.activity_done
      );
    }
  }

  await browser.close();
  servers.forEach((s) => s.kill());
  return results;
}

const mode = process.argv.includes("--pages") ? "pages" : "local";
const results = await run(mode);

console.log("\n=== VERIFICACIÓN NUBE · Dany Perez CC 12345 (" + mode + ") ===\n");
results.pass.forEach((p) => console.log("✅", p));
results.fail.forEach((f) => console.log("❌", f));

if (results.fail.length) process.exit(1);
console.log("\n🎉 Progreso guardado en Supabase en los " + results.pass.length + " módulos.\n");
