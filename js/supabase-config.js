// ══════════════════════════════════════════════════════════════
//  ADM18 · LatamBox — Configuración Supabase (gamificación unificada)
//  Mismo proyecto Supabase compartido entre módulos IUB.
// ══════════════════════════════════════════════════════════════

(function () {
  var SUPABASE_URL = "https://nnrgxuzvjtweyzkdrech.supabase.co";
  var SUPABASE_KEY = "sb_publishable_-101J7EEEhv-C5kjosWGTg_657OtsBg";

  var MODULE_CODE   = "ADM18";
  var OFFERING_CODE = "ADM18-2026-2";
  var NARRATIVE     = "LatamBox";
  var COURSE_CODE   = OFFERING_CODE;

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.warn("[ADM18] supabase-config.js: credenciales no configuradas.");
    return;
  }

  localStorage.setItem("adm18_supabase_url", SUPABASE_URL);
  localStorage.setItem("adm18_supabase_key", SUPABASE_KEY);
  localStorage.setItem("gamif_module_code", MODULE_CODE);
  localStorage.setItem("gamif_offering_code", OFFERING_CODE);
  localStorage.setItem("gamif_narrative", NARRATIVE);
  localStorage.setItem("adm18_course_code", COURSE_CODE);

  window.MODULE_CODE = MODULE_CODE;
  window.OFFERING_CODE = OFFERING_CODE;
  window.NARRATIVE = NARRATIVE;
  window.SUPABASE_URL = SUPABASE_URL;
  window.SUPABASE_KEY = SUPABASE_KEY;
  window.GAMIF_PREFIX = "adm18";

  console.info("[ADM18] Supabase gamificación ✅ →", SUPABASE_URL, "|", OFFERING_CODE);
})();
