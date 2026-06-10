#!/usr/bin/env node
/**
 * Harness · Simulación de flujo estudiante (sin intervención humana)
 * Estudiante: Dany Perez · CC 12345
 *
 * Por módulo:
 *  1. Configura perfil en localStorage (como modal de bienvenida)
 *  2. Simula actividad vía UI (quiz / XP) cuando existe en la página
 *  3. Dispara sincronización a Supabase (botón ☁️ o GamifSDK.syncWeekProgress)
 *  4. Verifica fila en v_legacy_student_progress
 *
 * Uso: node scripts/simulate-student-flow.mjs [--local|--pages]
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
  grupo: "Harness",
  horario: "Sim",
};

const RUN_ID = "sim-" + Date.now();

const MODULES = [
  {
    name: "ADM18",
    offering: "ADM18-2026-2",
    semana: 1,
    minXp: 20,
    marker: RUN_ID + "-adm18",
    local: { root: path.resolve(__dirname, ".."), port: 8781, weekPath: "/semana-01/index.html" },
    pages: "https://dfdomin.github.io/adm18-material/semana-01/",
    ui: "adm18-quiz",
    quizAnswers: [1, 1, 1, 1, 2],
  },
  {
    name: "TGA04",
    offering: "TGA04-2026-2",
    semana: 1,
    minXp: 10,
    marker: RUN_ID + "-tga04",
    local: { root: "/Users/diegodomingueztapia/code/tga04-neurobiz", port: 8782, weekPath: "/semana1/index.html" },
    pages: "https://dfdomin.github.io/tga04-neurobiz/semana1/",
    ui: "tga-quiz-sync",
  },
  {
    name: "TGA05",
    offering: "TGA05-2026-2",
    semana: 1,
    minXp: 10,
    marker: RUN_ID + "-tga05",
    local: { root: "/Users/diegodomingueztapia/code/tga05-neurobiz", port: 8783, weekPath: "/semana1/index.html" },
    pages: "https://dfdomin.github.io/tga05-neurobiz/semana1/",
    ui: "tga-quiz-sync",
  },
  {
    name: "TD",
    offering: "TD-2026-2",
    semana: 1,
    minXp: 10,
    marker: RUN_ID + "-td",
    local: { root: "/Users/diegodomingueztapia/Library/CloudStorage/OneDrive-Unibarranquilla/DiegoIcloud/2026/copilot/TD", port: 8784, weekPath: "/semana1/index.html" },
    pages: "https://dfdomin.github.io/td-inteligencia-negocios/semana1/",
    ui: "tga-quiz-sync",
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
  if (!res.ok) return { error: await res.text(), status: res.status };
  const rows = await res.json();
  return { row: rows[0] || null };
}

async function setupProfile(page, mod) {
  await page.evaluate((student) => {
    if (window.GamifSDK) {
      GamifSDK.saveProfile({
        nombre: student.nombre,
        cc: student.cc,
        id_estudiante: student.cc,
        grupo: student.grupo,
        horario: student.horario,
      });
    }
    localStorage.setItem("adm18_user", JSON.stringify({ nombre: student.nombre, cc: student.cc }));
    localStorage.setItem("tga04_global", JSON.stringify({ nombre: student.nombre, cc: student.cc, grupo: student.grupo, horario: student.horario }));
    localStorage.setItem("tga05_global", JSON.stringify({ nombre: student.nombre, cc: student.cc, grupo: student.grupo, horario: student.horario }));
    localStorage.setItem("td_global", JSON.stringify({ nombre: student.nombre, cc: student.cc, grupo: student.grupo, horario: student.horario }));
  }, STUDENT);
}

async function simulateAdm18Quiz(page, mod) {
  await page.waitForFunction(() => !!window.GamifSDK, null, { timeout: 20000 });
  await page.waitForSelector("#quiz-container .quiz-option", { timeout: 15000 });
  const options = page.locator("#quiz-container .quiz-option");
  const count = await options.count();
  if (count < mod.quizAnswers.length * 2) {
    return { ok: false, reason: "quiz_options_insuficientes", count };
  }

  for (let qi = 0; qi < mod.quizAnswers.length; qi++) {
    const idx = mod.quizAnswers[qi];
    const q = page.locator("#q-" + qi + " .quiz-option");
    await q.nth(idx).click({ timeout: 10000 });
  }

  await page.locator("#quiz-container button", { hasText: "Enviar" }).click();
  await page.waitForSelector("#quiz-container .quiz-score", { timeout: 10000 });

  const sync = await page.evaluate(async ({ student, semana, marker }) => {
    if (!window.GamifSDK) return { ok: false, reason: "gamif_missing" };
    const profile = { nombre: student.nombre, cc: student.cc, id_estudiante: student.cc, grupo: student.grupo, horario: student.horario };
    GamifSDK.saveProfile(profile);

    let xp = 80;
    let quizScore = 4;
    const scoreEl = document.querySelector("#quiz-container .quiz-score");
    if (scoreEl && scoreEl.textContent) {
      const m = scoreEl.textContent.match(/(\d+)\s*\/\s*(\d+)/);
      if (m) {
        quizScore = parseInt(m[1], 10);
        const total = parseInt(m[2], 10) || 5;
        xp = Math.round((quizScore / total) * 100);
      }
    }

    if (window.ADM18App) {
      const result = await GamifSDK.syncAdm18Scores(ADM18App.getScores(), ADM18App.getProgress(), profile);
      const scores = ADM18App.getScores();
      const weekKey = "week_" + semana;
      if (scores[weekKey] && scores[weekKey].percent) xp = scores[weekKey].percent;
      if (result.synced > 0) return { ok: true, xp, path: "syncAdm18Scores" };
    }

    const state = {
      semana, xp, nombre: student.nombre, cc: student.cc, id_estudiante: student.cc,
      grupo: student.grupo, horario: student.horario,
      quiz_puntaje: quizScore,
      quiz_respuestas: { _harness_marker: marker },
      actividad_completada: true, activity_done: true,
    };
    const rpc = await GamifSDK.syncWeekProgress(state, GamifSDK.getConfig(), semana);
    return { ok: rpc.ok, xp, path: "syncWeekProgress", status: rpc.status };
  }, { student: STUDENT, semana: mod.semana, marker: mod.marker });

  return sync;
}

async function simulateTgaWeek(page, mod) {
  const quizLi = page.locator(".quiz-q li").first();
  if (await quizLi.count()) {
    await quizLi.click();
    await page.waitForTimeout(400);
  }

  const saveBtn = page.locator("#pt-btn-save, button:has-text('Guardar')").first();
  if (await saveBtn.count()) {
    await saveBtn.click();
    await page.waitForTimeout(1200);
  }

  const sync = await page.evaluate(async ({ student, semana, marker, minXp }) => {
    if (!window.GamifSDK) return { ok: false, reason: "no_gamif_sdk" };
    const cfg = GamifSDK.getConfig();
    let xp = minXp;
    if (typeof window.PT !== "undefined" && PT.state) {
      const st = PT.state();
      xp = Math.max(st.xp || 0, minXp);
      st.nombre = student.nombre;
      st.cc = student.cc;
      st.id_estudiante = student.cc;
      st.grupo = student.grupo;
      st.horario = student.horario;
      st.actividad_completada = true;
      st.activity_done = true;
      st.quiz_respuestas = Object.assign(st.quiz_respuestas || {}, { _harness_marker: marker });
      if (PT.save) PT.save();
      if (PT.sync) await PT.sync();
    }
    const state = {
      semana, xp, nombre: student.nombre, cc: student.cc, id_estudiante: student.cc,
      grupo: student.grupo, horario: student.horario,
      quiz_puntaje: 1, quiz_respuestas: { _harness_marker: marker },
      actividad_completada: true, activity_done: true,
    };
    const rpc = await GamifSDK.syncWeekProgress(state, cfg, semana);
    return { ok: rpc.ok, xp, path: "syncWeekProgress", status: rpc.status, module: cfg.moduleCode };
  }, { student: STUDENT, semana: mod.semana, marker: mod.marker, minXp: mod.minXp });

  return sync;
}

async function runModule(page, mod, url) {
  console.log("\n▶ " + mod.name + " → " + url);
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForFunction(() => !!window.GamifSDK, null, { timeout: 20000 });
  await setupProfile(page, mod);

  let sim;
  if (mod.ui === "adm18-quiz") {
    sim = await simulateAdm18Quiz(page, mod);
  } else {
    sim = await simulateTgaWeek(page, mod);
  }

  if (!sim.ok) {
    return { mod: mod.name, ok: false, step: "simulation", detail: sim };
  }

  await new Promise((r) => setTimeout(r, 2000));
  const cloud = await fetchCloudRow(mod.offering, mod.semana, STUDENT.cc);
  if (cloud.error) {
    return { mod: mod.name, ok: false, step: "supabase_query", detail: cloud };
  }
  if (!cloud.row) {
    return { mod: mod.name, ok: false, step: "supabase_row", detail: "sin fila" };
  }

  const xpOk = Number(cloud.row.xp) >= mod.minXp;
  const activityOk = cloud.row.activity_done === true;
  const nameOk = (cloud.row.student_name || "").toLowerCase().includes("dany");

  return {
    mod: mod.name,
    ok: xpOk && activityOk,
    step: "verified",
    detail: {
      xp: cloud.row.xp,
      activity_done: cloud.row.activity_done,
      student_name: cloud.row.student_name,
      sim_path: sim.path,
      nameOk,
    },
  };
}

async function main() {
  const mode = process.argv.includes("--pages") ? "pages" : "local";
  const servers = [];
  const results = [];

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
    try {
      results.push(await runModule(page, mod, url));
    } catch (e) {
      results.push({ mod: mod.name, ok: false, step: "exception", detail: e.message });
    }
  }

  await browser.close();
  servers.forEach((s) => s.kill());

  console.log("\n=== HARNESS SIMULACIÓN ESTUDIANTE · " + RUN_ID + " (" + mode + ") ===\n");
  let failed = 0;
  for (const r of results) {
    if (r.ok) {
      console.log("✅", r.mod, "— xp=" + r.detail.xp, "activity=" + r.detail.activity_done, "via", r.detail.sim_path);
    } else {
      failed++;
      console.log("❌", r.mod, "—", r.step, JSON.stringify(r.detail));
    }
  }

  const reportPath = path.join(__dirname, "..", "scripts", "harness-reports", RUN_ID + ".json");
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, JSON.stringify({ runId: RUN_ID, mode, student: STUDENT, results }, null, 2));
  console.log("\nReporte:", reportPath);

  if (failed) process.exit(1);
  console.log("\n🎉 Simulación completa en los 4 módulos.\n");
}

main();
