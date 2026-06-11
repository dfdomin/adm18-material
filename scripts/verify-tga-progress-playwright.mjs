#!/usr/bin/env node
/**
 * Verifica que TGA04/TGA05 guarden XP en Supabase al hacer quiz (sin ☁️ manual).
 * Uso: node scripts/verify-tga-progress-playwright.mjs [--pages|--local]
 */
import { chromium } from "playwright";

const SUPABASE_URL = "https://nnrgxuzvjtweyzkdrech.supabase.co";
const SUPABASE_KEY = "sb_publishable_-101J7EEEhv-C5kjosWGTg_657OtsBg";
const RUN_ID = "pw-tga-" + Date.now();

const MODULES = [
  {
    name: "TGA04",
    offering: "TGA04-2026-2",
    semana: 2,
    pages: "https://dfdomin.github.io/tga04-neurobiz/semana2/",
    local: "http://127.0.0.1:8782/semana2/index.html",
  },
  {
    name: "TGA05",
    offering: "TGA05-2026-2",
    semana: 2,
    pages: "https://dfdomin.github.io/tga05-neurobiz/semana2/",
    local: "http://127.0.0.1:8783/semana2/index.html",
  },
];

function studentFor(mod) {
  return {
    nombre: "Harness " + mod.name,
    cc: String(88000000 + mod.semana + (mod.name === "TGA05" ? 100 : 0)),
    grupo: "Harness",
    horario: "Sim",
    marker: RUN_ID + "-" + mod.name.toLowerCase(),
  };
}

async function fetchCloud(offering, semana, cc) {
  const q =
    SUPABASE_URL + "/rest/v1/v_legacy_student_progress?select=*"
    + "&student_id=eq." + encodeURIComponent(cc)
    + "&offering_code=eq." + encodeURIComponent(offering)
    + "&semana=eq." + semana;
  const res = await fetch(q, {
    headers: { apikey: SUPABASE_KEY, Authorization: "Bearer " + SUPABASE_KEY },
  });
  if (!res.ok) return { error: await res.text(), status: res.status };
  const rows = await res.json();
  return { row: rows[0] || null };
}

async function setupPage(page, student) {
  await page.addInitScript((s) => {
    const profile = {
      nombre: s.nombre,
      cc: s.cc,
      id_estudiante: s.cc,
      grupo: s.grupo,
      horario: s.horario,
    };
    localStorage.setItem("tga04_global", JSON.stringify(profile));
    localStorage.setItem("tga05_global", JSON.stringify(profile));
    localStorage.setItem("gamif_module_code", s.module);
    localStorage.removeItem("tga04_s" + s.semana);
    localStorage.removeItem("tga05_s" + s.semana);
    localStorage.removeItem("tga04_visited_s" + s.semana);
    localStorage.removeItem("tga05_visited_s" + s.semana);
  }, { ...student, module: student.module });
}

async function diagnose(page) {
  return page.evaluate(() => {
    var pt;
    try { pt = typeof PT !== "undefined" ? PT : null; } catch (e) { pt = null; }
    return {
      gamif: !!window.GamifSDK,
      cloudDirect: !!(window.GamifSDK && GamifSDK.isCloudDirectMode && GamifSDK.isCloudDirectMode()),
      pt: !!pt,
      ptPatched: !!(pt && pt.__iubCloudDirect),
      weekAutoSync: !!window.IUBWeekAutoSync,
      readingPolicy: !!window.IUBReadingPolicy,
      xp: pt && pt.state ? pt.state().xp : null,
      cc: pt && pt.state ? (pt.state().cc || pt.state().id_estudiante) : null,
    };
  });
}

async function answerQuiz(page, maxQuestions) {
  const questions = page.locator(".quiz-q");
  const total = await questions.count();
  let answered = 0;
  let quizScore = 0;
  const n = Math.min(total, maxQuestions || total);
  for (let i = 0; i < n; i++) {
    const q = questions.nth(i);
    const answerText = await q.locator(".quiz-answer").innerText().catch(() => "");
    const m = answerText.match(/✅\s*([a-d])/i);
    const idx = m ? ["a", "b", "c", "d"].indexOf(m[1].toLowerCase()) : 0;
    await q.locator("li").nth(Math.max(idx, 0)).click({ timeout: 10000 });
    answered++;
    if (idx >= 0) quizScore++;
    await page.waitForTimeout(400);
  }
  return { answered, total, quizScore };
}

async function grantReadingXp(page) {
  return page.evaluate(() => {
    if (!window.IUBReadingPolicy || typeof PT === "undefined") {
      return { sections: 0, granted: 0, reason: "no_reading" };
    }
    const sections = IUBReadingPolicy.detectSections();
    let granted = 0;
    sections.forEach((sec) => {
      if (PT.addXP) {
        PT.addXP(sec.xp, "Lectura: " + sec.label);
        granted += sec.xp;
      }
    });
    return { sections: sections.length, granted };
  });
}

async function waitForCloudXp(page, offering, semana, cc, minXp, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const cloud = await fetchCloud(offering, semana, cc);
    if (cloud.row && Number(cloud.row.xp) >= minXp) {
      return cloud;
    }
    await page.waitForTimeout(800);
  }
  return fetchCloud(offering, semana, cc);
}

async function runModule(browser, mod, usePages) {
  const student = studentFor(mod);
  student.module = mod.name;
  const url = usePages ? mod.pages : mod.local;
  const page = await browser.newPage();

  console.log("\n▶ " + mod.name + " semana " + mod.semana);
  console.log("  URL:", url);
  console.log("  CC harness:", student.cc);

  const before = await fetchCloud(mod.offering, mod.semana, student.cc);
  console.log("  Nube ANTES:", before.row ? { xp: before.row.xp } : "sin fila");

  await setupPage(page, student);
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45000 });
  await page.waitForTimeout(2000);

  await page.evaluate((s) => {
    if (window.GamifSDK) {
      GamifSDK.saveProfile({
        nombre: s.nombre,
        cc: s.cc,
        id_estudiante: s.cc,
        grupo: s.grupo,
        horario: s.horario,
      });
    }
    const overlay = document.getElementById("pt-overlay");
    if (overlay) overlay.style.display = "none";
    if (window.IUBWeekAutoSync && IUBWeekAutoSync.patchPT) IUBWeekAutoSync.patchPT();
  }, student);

  await page.waitForTimeout(1500);
  const diag1 = await diagnose(page);
  console.log("  Diagnóstico:", JSON.stringify(diag1));

  const quiz = await answerQuiz(page, 4);
  console.log("  Quiz:", quiz);

  const reading = await grantReadingXp(page);
  console.log("  Lectura XP simulada:", reading);

  await page.waitForTimeout(5000);

  const ui = await page.evaluate(() => {
    var pt;
    try { pt = PT; } catch (e) { pt = null; }
    return {
      xp: pt && pt.state ? pt.state().xp : 0,
      quiz_puntaje: pt && pt.state ? pt.state().quiz_puntaje : 0,
    };
  });
  console.log("  UI en página:", ui);

  const minExpected = Math.max(15, Math.min(ui.xp, 40));
  const cloud = await waitForCloudXp(page, mod.offering, mod.semana, student.cc, minExpected, 20000);
  await page.close();

  if (cloud.error) {
    return { mod: mod.name, ok: false, step: "supabase", detail: cloud };
  }

  const xpCloud = Number(cloud.row?.xp || 0);
  const ok = xpCloud >= minExpected && xpCloud > 0;

  return {
    mod: mod.name,
    ok,
    step: ok ? "verified" : "xp_not_in_cloud",
    detail: {
      student: student.cc,
      ui_xp: ui.xp,
      cloud_xp: xpCloud,
      quiz,
      reading,
      diag: diag1,
      marker: student.marker,
      cloud_row: cloud.row,
      minExpected,
    },
  };
}

async function main() {
  const usePages = !process.argv.includes("--local");
  const browser = await chromium.launch({ headless: true });
  const results = [];

  for (const mod of MODULES) {
    try {
      results.push(await runModule(browser, mod, usePages));
    } catch (e) {
      results.push({ mod: mod.name, ok: false, step: "exception", detail: e.message });
    }
  }

  await browser.close();

  console.log("\n=== RESULTADO PLAYWRIGHT TGA04/TGA05 · " + RUN_ID + " ===\n");
  let failed = 0;
  for (const r of results) {
    if (r.ok) {
      console.log("✅", r.mod, "— UI xp=" + r.detail.ui_xp, "nube xp=" + r.detail.cloud_xp, "quiz=" + r.detail.quiz.answered);
    } else {
      failed++;
      console.log("❌", r.mod, "—", r.step, JSON.stringify(r.detail, null, 2));
    }
  }

  if (failed) process.exit(1);
  console.log("\n🎉 Progreso se refleja en nube para TGA04 y TGA05.\n");
}

main();
