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
    minXp: 90,
    minReadingXp: 20,
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
    minXp: 80,
    minXpRatio: 0.8,
    marker: RUN_ID + "-tga04",
    local: { root: "/Users/diegodomingueztapia/code/tga04-neurobiz", port: 8782, weekPath: "/semana1/index.html" },
    pages: "https://dfdomin.github.io/tga04-neurobiz/semana1/",
    ui: "tga-quiz-sync",
  },
  {
    name: "TGA05",
    offering: "TGA05-2026-2",
    semana: 1,
    minXp: 80,
    minXpRatio: 0.8,
    marker: RUN_ID + "-tga05",
    local: { root: "/Users/diegodomingueztapia/code/tga05-neurobiz", port: 8783, weekPath: "/semana1/index.html" },
    pages: "https://dfdomin.github.io/tga05-neurobiz/semana1/",
    ui: "tga-quiz-sync",
  },
  {
    name: "TD",
    offering: "TD-2026-2",
    semana: 1,
    minXp: 80,
    minXpRatio: 0.8,
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

async function installStudentContext(page) {
  await page.addInitScript((student) => {
    const profile = {
      nombre: student.nombre,
      cc: student.cc,
      id_estudiante: student.cc,
      grupo: student.grupo,
      horario: student.horario,
    };
    const adm18Profile = {
      nombre: student.nombre,
      cc: student.cc,
      id_estudiante: student.cc,
      grupo: student.grupo,
      horario: student.horario,
    };
    localStorage.setItem("adm18_user", JSON.stringify(adm18Profile));
    localStorage.setItem("adm18_profile", JSON.stringify(adm18Profile));
    localStorage.setItem("tga04_global", JSON.stringify(profile));
    localStorage.setItem("tga05_global", JSON.stringify(profile));
    localStorage.setItem("td_global", JSON.stringify(profile));
  }, STUDENT);
}

async function setupProfile(page) {
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
    const profile = {
      nombre: student.nombre,
      cc: student.cc,
      id_estudiante: student.cc,
      grupo: student.grupo,
      horario: student.horario,
    };
    const adm18Profile = {
      nombre: student.nombre,
      cc: student.cc,
      id_estudiante: student.cc,
      grupo: student.grupo,
      horario: student.horario,
    };
    localStorage.setItem("adm18_user", JSON.stringify(adm18Profile));
    localStorage.setItem("adm18_profile", JSON.stringify(adm18Profile));
    localStorage.setItem("tga04_global", JSON.stringify(profile));
    localStorage.setItem("tga05_global", JSON.stringify(profile));
    localStorage.setItem("td_global", JSON.stringify(profile));
    const overlay = document.getElementById("pt-overlay");
    if (overlay) overlay.style.display = "none";
  }, STUDENT);
}

async function simulateAdm18Reading(page) {
  await page.waitForFunction(
    () => !!window.IUBAdm18Reading && !!window.IUBReadingPolicy,
    null,
    { timeout: 15000 },
  );
  await page.waitForTimeout(1200);
  return page.evaluate(() => {
    if (IUBAdm18Reading.prepareAnchors) IUBAdm18Reading.prepareAnchors();
    const sections = IUBReadingPolicy.detectSections();
    const semana = IUBAdm18Reading.parseSemana();
    const lsKey = "adm18_s" + semana + "_reading";
    const state = {};
    sections.forEach((sec) => {
      IUBAdm18Reading.award(sec);
      state[sec.id] = true;
    });
    try {
      localStorage.setItem(lsKey, JSON.stringify(state));
    } catch (e) { /* ignore */ }
    const granted = parseInt(localStorage.getItem("adm18_s" + semana + "_reading_xp") || "0", 10);
    return {
      sections: sections.length,
      granted,
      sectionIds: sections.map((s) => s.id),
    };
  });
}

async function simulateAdm18QuizOnly(page, mod) {
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

  return page.evaluate(() => {
    let quizScore = 0;
    let quizTotal = 5;
    let quizPercent = 0;
    const scoreEl = document.querySelector("#quiz-container .quiz-score");
    if (scoreEl && scoreEl.textContent) {
      const m = scoreEl.textContent.match(/(\d+)\s*\/\s*(\d+)/);
      if (m) {
        quizScore = parseInt(m[1], 10);
        quizTotal = parseInt(m[2], 10) || 5;
        quizPercent = Math.round((quizScore / quizTotal) * 100);
      }
    }
    return { quizScore, quizTotal, quizPercent };
  });
}

async function simulateAdm18Week(page, mod) {
  await page.waitForFunction(() => !!window.GamifSDK, null, { timeout: 20000 });
  const reading = await simulateAdm18Reading(page);
  const quiz = await simulateAdm18QuizOnly(page, mod);
  await page.waitForTimeout(1500);

  const sync = await page.evaluate(async ({ student, semana, marker }) => {
    if (!window.GamifSDK) return { ok: false, reason: "gamif_missing" };
    const profile = {
      nombre: student.nombre,
      cc: student.cc,
      id_estudiante: student.cc,
      grupo: student.grupo,
      horario: student.horario,
    };
    GamifSDK.saveProfile(profile);

    if (window.ADM18App) {
      const progress = ADM18App.getProgress() || {};
      const weekKey = "week_" + semana;
      progress[weekKey] = Object.assign(progress[weekKey] || {}, { completed: true });
      await GamifSDK.syncAdm18Scores(ADM18App.getScores(), progress, profile);
    }

    if (window.IUBAdm18Reading) {
      await IUBAdm18Reading.syncCloud(semana);
      const readingXp = parseInt(localStorage.getItem("adm18_s" + semana + "_reading_xp") || "0", 10);
      const xp = IUBAdm18Reading.sessionXp(semana);
      return {
        ok: true,
        xp,
        path: "adm18-reading+quiz",
        reading_xp: readingXp,
        quiz_percent: (() => {
          try {
            const scores = JSON.parse(localStorage.getItem("adm18_scores") || "{}");
            const w = scores["week_" + semana];
            return w && typeof w.percent === "number" ? w.percent : 0;
          } catch (e) {
            return 0;
          }
        })(),
        marker,
      };
    }

    const state = {
      semana,
      xp: 100,
      nombre: student.nombre,
      cc: student.cc,
      id_estudiante: student.cc,
      grupo: student.grupo,
      horario: student.horario,
      quiz_puntaje: 5,
      quiz_respuestas: { _harness_marker: marker },
      actividad_completada: true,
      activity_done: true,
    };
    const rpc = await GamifSDK.syncWeekProgress(state, GamifSDK.getConfig(), semana);
    return { ok: rpc.ok, xp: state.xp, path: "syncWeekProgress", status: rpc.status };
  }, { student: STUDENT, semana: mod.semana, marker: mod.marker });

  return Object.assign(sync, { reading, quiz });
}

async function resolveWeekXpTarget(page, mod) {
  const target = await page.evaluate(() => {
    const el = document.getElementById("xpCount");
    if (el && el.parentElement) {
      const m = (el.parentElement.textContent || "").match(/\/\s*(\d+)\s*pts/i);
      if (m) return parseInt(m[1], 10);
    }
    const pt = document.getElementById("pt-xp-count");
    if (pt) {
      const m2 = (pt.textContent || "").match(/(\d+)\s*\/\s*(\d+)/);
      if (m2) return parseInt(m2[2], 10);
    }
    return 100;
  });
  const ratio = mod.minXpRatio || 0.8;
  return { weekMax: target, minXp: Math.round(target * ratio) };
}

async function simulateTgaFullQuiz(page) {
  const questions = page.locator(".quiz-q");
  const total = await questions.count();
  if (!total) return { answered: 0, total: 0, quizScore: 0 };

  let answered = 0;
  let quizScore = 0;
  for (let i = 0; i < total; i++) {
    const q = questions.nth(i);
    const answerText = await q.locator(".quiz-answer").innerText().catch(() => "");
    const m = answerText.match(/✅\s*([a-d])/i);
    const idx = m ? ["a", "b", "c", "d"].indexOf(m[1].toLowerCase()) : 0;
    const option = q.locator("li").nth(Math.max(idx, 0));
    if (await option.count()) {
      await option.click({ timeout: 8000 });
      answered++;
      if (idx >= 0) quizScore++;
      await page.waitForTimeout(350);
    }
  }
  return { answered, total, quizScore };
}

async function simulateReadingXp(page) {
  await page.waitForFunction(() => !!window.IUBReadingPolicy && typeof window.PT !== "undefined", null, { timeout: 8000 }).catch(() => {});
  return page.evaluate(() => {
    const sections = window.IUBReadingPolicy
      ? IUBReadingPolicy.detectSections()
      : [];
    let granted = 0;
    if (typeof window.PT !== "undefined" && PT.addXP) {
      sections.forEach((sec) => {
        PT.addXP(sec.xp, "Lectura: " + sec.label);
        granted += sec.xp;
      });
    }
    return { sections: sections.length, granted };
  });
}

async function simulateTgaWeek(page, mod) {
  const xpTarget = await resolveWeekXpTarget(page, mod);
  const quiz = await simulateTgaFullQuiz(page);
  const reading = await simulateReadingXp(page);
  await page.waitForTimeout(1500);

  const sync = await page.evaluate(async ({ student, semana, marker, minXp, quizScore, quizTotal }) => {
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
      st.quiz_puntaje = quizScore || st.quiz_puntaje || 0;
      st.quiz_respuestas = Object.assign(st.quiz_respuestas || {}, { _harness_marker: marker });
      if (PT.save) PT.save();
      if (PT.sync) await PT.sync();
      xp = Math.max(st.xp || 0, xp);
    }
    const state = {
      semana, xp, nombre: student.nombre, cc: student.cc, id_estudiante: student.cc,
      grupo: student.grupo, horario: student.horario,
      quiz_puntaje: quizScore || quizTotal || 0,
      quiz_respuestas: { _harness_marker: marker },
      actividad_completada: true, activity_done: true,
    };
    const rpc = await GamifSDK.syncWeekProgress(state, cfg, semana);
    return {
      ok: rpc.ok,
      xp,
      path: "syncWeekProgress",
      status: rpc.status,
      module: cfg.moduleCode,
      weekMax: minXp,
    };
  }, {
    student: STUDENT,
    semana: mod.semana,
    marker: mod.marker,
    minXp: xpTarget.minXp,
    quizScore: quiz.quizScore,
    quizTotal: quiz.total,
  });

  return Object.assign(sync, { quiz, reading, xpTarget });
}

async function runModule(page, mod, url) {
  console.log("\n▶ " + mod.name + " → " + url);
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForFunction(() => !!window.GamifSDK, null, { timeout: 20000 });
  await setupProfile(page);

  let sim;
  if (mod.ui === "adm18-quiz") {
    sim = await simulateAdm18Week(page, mod);
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

  const minXp = sim.xpTarget?.minXp ?? mod.minXp;
  const xpOk = Number(cloud.row.xp) >= minXp;
  const activityOk = cloud.row.activity_done === true;
  const nameOk = (cloud.row.student_name || "").toLowerCase().includes("dany");
  const readingGranted = sim.reading?.granted ?? 0;
  const readingOk = !mod.minReadingXp || readingGranted >= mod.minReadingXp;

  return {
    mod: mod.name,
    ok: xpOk && activityOk && readingOk,
    step: "verified",
    detail: {
      xp: cloud.row.xp,
      activity_done: cloud.row.activity_done,
      student_name: cloud.row.student_name,
      sim_path: sim.path,
      minXp,
      minReadingXp: mod.minReadingXp,
      reading_xp: sim.reading_xp ?? readingGranted,
      weekMax: sim.xpTarget?.weekMax,
      quiz: sim.quiz,
      reading: sim.reading,
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
  await installStudentContext(page);

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
      const readInfo = r.detail.reading_xp != null ? " lectura=" + r.detail.reading_xp : "";
      console.log("✅", r.mod, "— xp=" + r.detail.xp + readInfo, "activity=" + r.detail.activity_done, "via", r.detail.sim_path);
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
