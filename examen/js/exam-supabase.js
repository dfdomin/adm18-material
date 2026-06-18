// ══════════════════════════════════════════════════════════════
//  ADM18 · Examen Parcial 1 — Conexión Supabase
//  Usa la misma instancia compartida del módulo.
//  100% Supabase — sin localStorage para datos de examen.
// ══════════════════════════════════════════════════════════════

(function () {
  var SUPABASE_URL = "https://nnrgxuzvjtweyzkdrech.supabase.co";
  var SUPABASE_KEY = "sb_publishable_-101J7EEEhv-C5kjosWGTg_657OtsBg";
  var OFFERING_CODE  = "ADM18-2026-2";
  var EXAM_TYPE      = "parcial1";

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error("[ADM18-EXAM] Credenciales Supabase no configuradas.");
    return;
  }

  // Expose config globally
  window.EXAM_CONFIG = {
    SUPABASE_URL:  SUPABASE_URL,
    SUPABASE_KEY:  SUPABASE_KEY,
    OFFERING_CODE: OFFERING_CODE,
    EXAM_TYPE:     EXAM_TYPE,
    TOTAL_QUESTIONS: 12,
    PENALTY_PER_SWITCH: 0.5,
    MAX_SCORE: 5.0,
    MIN_SCORE: 0.0
  };
})();