#!/usr/bin/env node
/**
 * Verifica semanas 1–4 ADM18: lectura + quiz → Supabase.
 * Uso: node scripts/verify-adm18-four-weeks.mjs [--local|--pages]
 */
import { chromium } from "playwright";
import { spawn } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const OFFERING = "ADM18-2026-2";
const MIN_XP = 80;
const MIN_READING = 15;

const WEEK_SETS = {
  "1-4": [
    { semana: 1, answers: [1, 1, 1, 1, 2], path: "/semana-01/index.html" },
    { semana: 2, answers: [2, 1, 2, 2, 1], path: "/semana-02/index.html" },
    { semana: 3, answers: [2, 2, 1, 2, 1], path: "/semana-03/index.html" },
    { semana: 4, answers: [2, 2, 1, 1, 1], path: "/semana-04/index.html" },
  ],
  "5-8": [
    { semana: 5, answers: [], path: "/semana-05/index.html", minXp: 30, noQuiz: true },
    { semana: 6, answers: [2, 1, 1, 1, 1], path: "/semana-06/index.html" },
    { semana: 7, answers: [2, 1, 1, 1, 3], path: "/semana-07/index.html" },
    { semana: 8, answers: [1, 2, 1, 1, 1], path: "/semana-08/index.html" },
  ],
  "9-12": [
    { semana: 9, answers: [1, 1, 1, 1, 2], path: "/semana-09/index.html" },
    { semana: 10, answers: [], path: "/semana-10/index.html", minXp: 30, noQuiz: true },
    { semana: 11, answers: [1, 0, 1, 1, 2], path: "/semana-11/index.html" },
    { semana: 12, answers: [2, 1, 2, 1, 1], path: "/semana-12/index.html" },
  ],
  "13-14": [
    { semana: 13, answers: [2, 2, 2, 2, 2], path: "/semana-13/index.html" },
    { semana: 14, answers: [], path: "/semana-14/index.html", minXp: 30, noQuiz: true },
  ],
};

const PAGES_BASE = "https://dfdomin.github.io/adm18-material";
const LOCAL_PORT = 8791;

function startServer() {
  return new Promise((resolve, reject) => {
    const proc = spawn("python3", ["-m", "http.server", String(LOCAL_PORT)], {
      cwd: ROOT,
      stdio: "ignore",
    });
    proc.on("error", reject);
    setTimeout(() => resolve(proc), 700);
  });
}

async function pickStudent(page, semanas) {
  return page.evaluate(async ({ offering, semanas }) => {
    const url = GamifSDK.sbUrl();
    const key = GamifSDK.sbKey();
    const headers = { apikey: key, Authorization: "Bearer " + key };
    const res = await fetch(
      url + "/rest/v1/v_legacy_students?select=cc,name,grupo,horario&offering_code=eq."
        + encodeURIComponent(offering) + "&order=name&limit=80",
      { headers },
    );
    if (!res.ok) return { error: res.status };
    const students = await res.json();
    const semanaList = semanas.join(",");
    const progRes = await fetch(
      url + "/rest/v1/v_legacy_student_progress?select=student_id,semana,xp&offering_code=eq."
        + encodeURIComponent(offering) + "&semana=in.(" + semanaList + ")",
      { headers },
    );
    const prog = progRes.ok ? await progRes.json() : [];
    const highXp = new Set(
      prog.filter((r) => Number(r.xp) >= 80).map((r) => String(r.student_id) + ":" + r.semana),
    );
    for (const s of students) {
      const busy = semanas.every((w) => highXp.has(String(s.cc) + ":" + w));
      if (!busy) return s;
    }
    return students[0] || null;
  }, { offering: OFFERING, semanas });
}

async function fetchCloud(page, semana, cc) {
  return page.evaluate(
    async ({ offering, semana, cc }) => {
      const url = GamifSDK.sbUrl();
      const key = GamifSDK.sbKey();
      const res = await fetch(
        url + "/rest/v1/v_legacy_student_progress?select=xp,quiz_score,activity_done,quiz_answers,student_name"
          + "&offering_code=eq." + encodeURIComponent(offering)
          + "&semana=eq." + semana
          + "&student_id=eq." + encodeURIComponent(cc),
        { headers: { apikey: key, Authorization: "Bearer " + key } },
      );
      const rows = res.ok ? await res.json() : [];
      return rows[0] || null;
    },
    { offering: OFFERING, semana, cc },
  );
}

async function runWeek(page, baseUrl, student, week) {
  const url = baseUrl + week.path + "?v=" + Date.now();
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45000 });
  await page.waitForFunction(() => !!window.GamifSDK && !!window.IUBAdm18Reading, null, { timeout: 30000 });

  await page.evaluate((s) => {
    const p = {
      nombre: s.name,
      cc: s.cc,
      id_estudiante: s.cc,
      grupo: s.grupo || "",
      horario: s.horario || "",
    };
    GamifSDK.saveProfile(p);
    localStorage.setItem("adm18_profile", JSON.stringify(p));
  }, student);

  await page.waitForTimeout(800);

  const reading = await page.evaluate(() => {
    if (IUBAdm18Reading.prepareAnchors) IUBAdm18Reading.prepareAnchors();
    const sections = IUBReadingPolicy.detectSections();
    const semana = IUBAdm18Reading.parseSemana();
    sections.forEach((sec) => IUBAdm18Reading.award(sec));
    return {
      sections: sections.length,
      readingXp: parseInt(localStorage.getItem("adm18_s" + semana + "_reading_xp") || "0", 10),
    };
  });

  await page.waitForTimeout(500);

  const hasQuiz = await page.locator("#quiz-container .quiz-option").count();
  let quiz = { submitted: false, correct: 0, total: 0 };
  if (hasQuiz > 0) {
    if (await page.locator('button:has-text("Intentar de nuevo")').count()) {
      await page.locator('button:has-text("Intentar de nuevo")').click();
      await page.waitForTimeout(300);
    }
    for (let qi = 0; qi < week.answers.length; qi++) {
      await page.locator("#q-" + qi + " .quiz-option").nth(week.answers[qi]).click({ timeout: 10000 });
    }
    const submit = page.locator("#quiz-container button", { hasText: "Enviar" });
    if (await submit.count()) {
      await submit.click();
      await page.waitForSelector("#quiz-container .quiz-score", { timeout: 15000 });
      quiz.submitted = true;
      const scoreText = await page.locator("#quiz-container .quiz-score").innerText();
      const m = scoreText.match(/(\d+)\s*\/\s*(\d+)/);
      if (m) {
        quiz.correct = parseInt(m[1], 10);
        quiz.total = parseInt(m[2], 10);
      }
    }
  }

  const ui = await page.evaluate((semana) => {
    const scoresRaw = localStorage.getItem("adm18_scores");
    let scoresOk = false;
    try {
      const scores = JSON.parse(scoresRaw || "{}");
      scoresOk = !!(scores["week_" + semana] && typeof scores["week_" + semana].percent === "number");
    } catch (e) { /* ignore */ }
    return {
      sessionXp: IUBAdm18Reading.sessionXp(semana),
      scoresInAdm18Key: scoresOk,
      heroXp: document.getElementById("week-hero-xp")?.textContent || "",
    };
  }, week.semana);

  await page.evaluate(async (semana) => {
    await IUBAdm18Reading.syncCloud(semana);
  }, week.semana);
  await page.waitForTimeout(3000);

  const cloud = await fetchCloud(page, week.semana, student.cc);

  const minXp = week.minXp ?? MIN_XP;
  const expectQuiz = !week.noQuiz && hasQuiz > 0;
  const readingOk = reading.readingXp >= (week.noQuiz ? 15 : MIN_READING);
  const quizOk = !expectQuiz || (quiz.submitted && quiz.correct === quiz.total);
  const uiOk = ui.sessionXp >= minXp;
  const cloudOk = cloud && Number(cloud.xp) >= minXp && cloud.activity_done === true;
  const scoresKeyOk = !expectQuiz || ui.scoresInAdm18Key;

  return {
    semana: week.semana,
    ok: readingOk && quizOk && uiOk && cloudOk && scoresKeyOk,
    reading,
    quiz,
    ui,
    cloud: cloud
      ? {
          xp: cloud.xp,
          quiz_score: cloud.quiz_score,
          activity_done: cloud.activity_done,
          reading_xp: cloud.quiz_answers?.reading_xp,
        }
      : null,
    checks: { readingOk, quizOk, uiOk, cloudOk, scoresKeyOk },
  };
}

async function main() {
  const mode = process.argv.includes("--pages") ? "pages" : "local";
  const weekSetKey = process.argv.includes("--13-14")
    ? "13-14"
    : process.argv.includes("--9-12")
      ? "9-12"
      : process.argv.includes("--5-8")
        ? "5-8"
        : "1-4";
  const WEEKS = WEEK_SETS[weekSetKey];
  const baseUrl = mode === "pages" ? PAGES_BASE : "http://127.0.0.1:" + LOCAL_PORT;
  const server = mode === "local" ? await startServer() : null;

  const browser = await chromium.launch({ headless: true });
  const rosterPage = await browser.newPage();
  await rosterPage.goto(PAGES_BASE + "/dashboard/participacion.html", {
    waitUntil: "domcontentloaded",
    timeout: 45000,
  });
  await rosterPage.waitForFunction(() => !!window.GamifSDK, null, { timeout: 25000 });
  const student = await pickStudent(rosterPage, WEEKS.map((w) => w.semana));
  await rosterPage.close();

  if (!student || student.error) {
    console.error("❌ No se pudo elegir estudiante del roster:", student);
    process.exit(1);
  }

  console.log("▶ Estudiante:", student.name, "| CC", student.cc, "| Modo:", mode);
  console.log("▶ Semanas:", WEEKS.map((w) => w.semana).join(", "), "\n");

  const page = await browser.newPage();
  const results = [];
  for (const week of WEEKS) {
    try {
      const r = await runWeek(page, baseUrl, student, week);
      results.push(r);
      const icon = r.ok ? "✅" : "❌";
      console.log(
        icon,
        "Semana",
        r.semana,
        "— UI",
        r.ui.sessionXp,
        "XP | Nube",
        r.cloud?.xp ?? "?",
        "| lectura",
        r.reading.readingXp,
        "| quiz",
        r.quiz.submitted ? r.quiz.correct + "/" + r.quiz.total : "n/a",
      );
      if (!r.ok) console.log("   checks:", r.checks);
    } catch (e) {
      results.push({ semana: week.semana, ok: false, error: e.message });
      console.log("❌ Semana", week.semana, "—", e.message);
    }
  }

  await browser.close();
  if (server) server.kill();

  const failed = results.filter((r) => !r.ok).length;
  console.log("\n=== RESUMEN ·", student.name, "===\n");
  console.log("Pasaron:", results.length - failed, "/", results.length);
  if (failed) process.exit(1);
  console.log("\n🎉 Semanas", weekSetKey, "— guardado en Supabase OK.\n");
}

main();
