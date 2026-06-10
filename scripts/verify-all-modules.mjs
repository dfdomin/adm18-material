#!/usr/bin/env node
/**
 * Verificación Playwright — enlaces y requisitos en ADM18, TGA04, TGA05, TD
 * Uso: node scripts/verify-all-modules.mjs [--local|--pages]
 */
import { chromium } from "playwright";
import { spawn } from "child_process";
import { fileURLToPath } from "url";
import path from "path";
import fs from "fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const MODULES = {
  ADM18: {
    root: path.resolve(__dirname, ".."),
    baseUrl: "http://127.0.0.1:8765",
    port: 8765,
    week1: "/semana-01/index.html",
    week5: "/semana-05/index.html",
    pages: [
      "/index.html",
      "/dashboard/index.html",
      "/dashboard/profesor.html",
      "/dashboard/participacion.html",
      "/progreso.html",
      "/semana-01/index.html",
      "/JuegoDelAhorcado/index.html",
    ],
    requiredScripts: ["supabase-config.js", "gamification-sdk.js", "student-dashboard.js", "academic-rules.js"],
    dashChecks: ["student-dashboard", "dash-blocks", "academic-panels"],
  },
  TGA04: {
    root: "/Users/diegodomingueztapia/code/tga04-neurobiz",
    baseUrl: "http://127.0.0.1:8766",
    port: 8766,
    week1: "/semana1/index.html",
    week5: "/semana5/index.html",
    pages: [
      "/index.html",
      "/dashboard/index.html",
      "/dashboard/profesor.html",
      "/dashboard/participacion.html",
      "/semana1/index.html",
      "/semana5/index.html",
      "/semana10/index.html",
    ],
    requiredScripts: ["supabase-config.js", "gamification-sdk.js", "academic-rules.js"],
    dashChecks: ["student-dashboard", "dash-blocks"],
  },
  TGA05: {
    root: "/Users/diegodomingueztapia/code/tga05-neurobiz",
    baseUrl: "http://127.0.0.1:8767",
    port: 8767,
    week1: "/semana1/index.html",
    week5: "/semana5/index.html",
    pages: [
      "/index.html",
      "/dashboard/index.html",
      "/dashboard/profesor.html",
      "/dashboard/participacion.html",
      "/dashboard/notas.html",
      "/semana1/index.html",
    ],
    requiredScripts: ["supabase-config.js", "gamification-sdk.js", "academic-rules.js"],
    dashChecks: ["student-dashboard", "dash-blocks"],
  },
  TD: {
    root: "/Users/diegodomingueztapia/Library/CloudStorage/OneDrive-Unibarranquilla/DiegoIcloud/2026/copilot/TD",
    baseUrl: "http://127.0.0.1:8768",
    port: 8768,
    week1: "/semana1/index.html",
    week5: "/semana5/index.html",
    pages: [
      "/index.html",
      "/dashboard/index.html",
      "/dashboard/profesor.html",
      "/dashboard/participacion.html",
      "/semana1/index.html",
    ],
    requiredScripts: ["supabase-config.js", "gamification-sdk.js", "academic-rules.js"],
    dashChecks: ["student-dashboard", "dash-blocks"],
  },
};

const GITHUB_PAGES = {
  ADM18: "https://dfdomin.github.io/adm18-material",
  TGA04: "https://dfdomin.github.io/tga04-neurobiz",
  TGA05: "https://dfdomin.github.io/tga05-neurobiz",
  TD: "https://dfdomin.github.io/td-inteligencia-negocios",
};

function startServer(root, port) {
  return new Promise((resolve, reject) => {
    const proc = spawn("python3", ["-m", "http.server", String(port)], { cwd: root, stdio: "ignore" });
    proc.on("error", reject);
    setTimeout(() => resolve(proc), 600);
  });
}

async function checkPage(page, url, mod, results) {
  let res;
  try {
    res = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 20000 });
    if (url.includes("progreso.html")) {
      await page.waitForURL(/dashboard\/index\.html/, { timeout: 8000 }).catch(() => {});
    }
  } catch (e) {
    results.fail.push(`${mod}: navegación falló → ${url} (${e.message})`);
    return;
  }
  const status = res ? res.status() : 0;
  if (status >= 400) {
    results.fail.push(`${mod}: HTTP ${status} → ${url}`);
    return;
  }
  const finalUrl = page.url();
  if (url.includes("progreso.html") && !finalUrl.includes("dashboard/index")) {
    results.fail.push(`${mod}: progreso.html no redirige a dashboard/index (${finalUrl})`);
    return;
  }
  results.pass.push(`${mod}: OK ${url}${finalUrl !== url ? " → " + finalUrl : ""}`);

  const html = await page.content();
  if (url.includes("dashboard/index")) {
    for (const id of MODULES[mod].dashChecks) {
      if (!html.includes(`id="${id}"`) && id !== "dash-blocks") {
        // dash-blocks is class not id
      }
      if (id === "dash-blocks" && !html.includes("dash-blocks") && !html.includes("student-dashboard")) {
        results.fail.push(`${mod}: dashboard sin bloques de semanas en ${url}`);
      }
      if (id === "student-dashboard" && !html.includes('id="student-dashboard"')) {
        results.fail.push(`${mod}: falta #student-dashboard en ${url}`);
      }
      if (id === "academic-panels" && !html.includes('id="academic-panels"')) {
        results.fail.push(`${mod}: falta #academic-panels en ${url}`);
      }
    }
    await page.waitForTimeout(800);
    const dashHtml = await page.locator("#student-dashboard").innerHTML({ timeout: 5000 }).catch(() => "");
    if (!dashHtml.includes("Semana 1") && !dashHtml.includes("Semana")) {
      results.fail.push(`${mod}: dashboard no renderizó semanas`);
    }
    if (mod === "TD" && !dashHtml.includes("Próximamente")) {
      results.fail.push(`${mod}: TD debería marcar semanas 9-14 como Próximamente`);
    }
  }

  for (const script of MODULES[mod].requiredScripts) {
    if (url.includes("dashboard") || url.includes("index.html") || url.includes("semana")) {
      const scripts = await page.locator("script[src]").evaluateAll((els) => els.map((e) => e.getAttribute("src")));
      const found = scripts.some((s) => s && s.includes(script));
      if (!found && (url.includes("dashboard/index") || url.endsWith("/index.html"))) {
        results.warn.push(`${mod}: script ${script} no detectado en ${url}`);
      }
    }
  }

  let badLinks = [];
  let iub = {};
  try {
    badLinks = await page.evaluate(() => {
      const bad = [];
      const inDashboard = location.pathname.includes("/dashboard/");
      document.querySelectorAll("a[href]").forEach((a) => {
        const href = a.getAttribute("href");
        if (!href) return;
        if (href.includes("../profesor.html")) bad.push(href);
        if (href.includes("profesor.html") && !href.includes("dashboard/profesor") && !inDashboard) bad.push(href);
        if ((href === "progreso.html" || href.endsWith("/progreso.html")) && !href.includes("dashboard")) bad.push(href);
        if (href.includes("../setup/CONFIGURAR_SUPABASE")) bad.push(href);
      });
      return bad;
    });
    iub = await page.evaluate(() => ({
      hasGamif: !!window.GamifSDK,
      hasDash: !!window.IUB_DASHBOARD,
      hasAcademic: !!window.IUBAcademicRules,
      module: window.MODULE_CODE,
      weeks: window.IUB_DASHBOARD && window.IUB_DASHBOARD.availableWeeks,
    }));
  } catch (e) {
    results.warn.push(`${mod}: evaluate omitido en ${url} (${e.message})`);
  }
  for (const bl of badLinks) {
    results.fail.push(`${mod}: enlace legacy roto "${bl}" en ${url}`);
  }
  if (url.includes("dashboard/index") || url.endsWith("/index.html")) {
    if (!iub.hasGamif) results.fail.push(`${mod}: GamifSDK no cargó en ${url}`);
    if (!iub.hasDash) results.fail.push(`${mod}: IUB_DASHBOARD no cargó en ${url}`);
    if (iub.module !== mod) results.fail.push(`${mod}: MODULE_CODE=${iub.module} en ${url}`);
  }
}

async function runLocal() {
  const servers = [];
  const results = { pass: [], fail: [], warn: [] };

  for (const [name, cfg] of Object.entries(MODULES)) {
    if (!fs.existsSync(cfg.root)) {
      results.fail.push(`${name}: root no existe ${cfg.root}`);
      continue;
    }
    const proc = await startServer(cfg.root, cfg.port);
    servers.push(proc);
  }

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  for (const [name, cfg] of Object.entries(MODULES)) {
    if (!fs.existsSync(cfg.root)) continue;
    for (const p of cfg.pages) {
      await checkPage(page, cfg.baseUrl + p, name, results);
    }
  }

  await browser.close();
  servers.forEach((s) => s.kill());

  return results;
}

async function runPages() {
  const results = { pass: [], fail: [], warn: [] };
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  for (const [name, base] of Object.entries(GITHUB_PAGES)) {
    const cfg = MODULES[name];
    for (const p of cfg.pages.slice(0, 4)) {
      await checkPage(page, base + p, name, results);
    }
  }

  await browser.close();
  return results;
}

const mode = process.argv.includes("--pages") ? "pages" : "local";
const results = mode === "pages" ? await runPages() : await runLocal();

console.log("\n=== VERIFICACIÓN IUB (" + mode + ") ===\n");
console.log("✅ PASS:", results.pass.length);
results.pass.forEach((p) => console.log("  ", p));
if (results.warn.length) {
  console.log("\n⚠️  WARN:", results.warn.length);
  results.warn.forEach((w) => console.log("  ", w));
}
if (results.fail.length) {
  console.log("\n❌ FAIL:", results.fail.length);
  results.fail.forEach((f) => console.log("  ", f));
  process.exit(1);
}
console.log("\n🎉 Todos los checks críticos pasaron.\n");
