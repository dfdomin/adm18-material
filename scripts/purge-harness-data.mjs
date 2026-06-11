#!/usr/bin/env node
/**
 * Limpia estudiantes ficticios Harness y progreso de pruebas en Supabase.
 * Requiere: setup/migrations/012_purge_test_data.sql aplicada en Supabase.
 *
 * Uso:
 *   node scripts/purge-harness-data.mjs --preview
 *   node scripts/purge-harness-data.mjs --all
 *   node scripts/purge-harness-data.mjs --harness
 *   node scripts/purge-harness-data.mjs --progress ADM18-2026-2
 */
import { readFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SUPABASE_URL = "https://nnrgxuzvjtweyzkdrech.supabase.co";
const SUPABASE_KEY = "sb_publishable_-101J7EEEhv-C5kjosWGTg_657OtsBg";

const DEFAULT_WIPE = {
  "ADM18-2026-2": ["1042856266", "1043448681", "12345"],
  "TD-2026-2": ["1050544752", "1043663975", "1007890090", "1007971817", "12345"],
};

async function rpc(fn, payload) {
  const res = await fetch(SUPABASE_URL + "/rest/v1/rpc/" + fn, {
    method: "POST",
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: "Bearer " + SUPABASE_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  const text = await res.text();
  if (!res.ok) {
    const hint = res.status === 404
      ? "\n\nAplica primero: setup/migrations/012_purge_test_data.sql en Supabase SQL Editor."
      : "";
    throw new Error(fn + " HTTP " + res.status + ": " + text + hint);
  }
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

async function main() {
  const args = process.argv.slice(2);
  if (args.includes("--preview") || !args.length) {
    const data = await rpc("preview_test_data_cleanup", { p_offering_code: null });
    console.log(JSON.stringify(data, null, 2));
    return;
  }
  if (args.includes("--harness")) {
    const data = await rpc("purge_harness_students", { p_offering_code: null });
    console.log("Harness eliminado:", JSON.stringify(data, null, 2));
    return;
  }
  if (args.includes("--progress")) {
    const offering = args[args.indexOf("--progress") + 1];
    if (!offering || offering.startsWith("--")) {
      console.error("Uso: --progress ADM18-2026-2");
      process.exit(1);
    }
    const ccs = DEFAULT_WIPE[offering];
    if (!ccs) {
      console.error("Offering no configurado:", offering);
      process.exit(1);
    }
    const data = await rpc("purge_student_progress", {
      p_offering_code: offering,
      p_cc_list: ccs,
    });
    console.log("Progreso borrado:", JSON.stringify(data, null, 2));
    return;
  }
  if (args.includes("--all")) {
    const data = await rpc("purge_all_test_data", {});
    console.log("Limpieza completa:", JSON.stringify(data, null, 2));
    return;
  }
  console.log(`Opciones:
  --preview          Ver qué se borraría
  --harness          Eliminar estudiantes ficticios Harness
  --progress OFFERING  Borrar progreso de prueba (ADM18-2026-2 | TD-2026-2)
  --all              Harness + progreso ADM18 + TD`);
}

main().catch((e) => {
  console.error("Error:", e.message);
  process.exit(1);
});
