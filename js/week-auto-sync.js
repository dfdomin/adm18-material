/**
 * Sincronización automática a Supabase tras guardar progreso en semana (TGA/TD).
 * Parchea PT.save / PT.addXP para llamar GamifSDK.syncWeekProgress sin botón ☁️.
 * ADM18 usa QuizEngine → syncAdm18Scores (ya automático al enviar quiz).
 */
(function (global) {
  "use strict";

  function debounce(fn, ms) {
    var timer;
    return function () {
      var self = this;
      var args = arguments;
      clearTimeout(timer);
      timer = setTimeout(function () { fn.apply(self, args); }, ms);
    };
  }

  async function syncFromPT() {
    if (!global.GamifSDK || !global.PT || typeof PT.state !== "function") {
      return { ok: false, reason: "no_sdk" };
    }
    var st = PT.state();
    var cc = String(st.id_estudiante || st.cc || "").trim();
    if (!cc) return { ok: false, reason: "no_cc" };
    var cfg = GamifSDK.getConfig();
    var semana = st.semana || cfg.semana;
    if (!semana) return { ok: false, reason: "no_semana" };
    try {
      return await GamifSDK.syncWeekProgress(st, cfg, semana);
    } catch (e) {
      console.warn("[IUB] week-auto-sync:", e.message || e);
      return { ok: false, reason: e.message || "error" };
    }
  }

  async function syncCloudWithFeedback() {
    if (!global.PT || typeof PT.save === "function") PT.save();
    var msg = global.PT && typeof PT.msg === "function" ? PT.msg.bind(PT) : null;
    if (msg) msg("⏳ Sincronizando a la nube…", "#fff9c4");
    var result = await syncFromPT();
    if (result && result.ok) {
      if (msg) msg("✅ Guardado en Supabase ☁️", "lightgreen");
    } else if (!String(stCc()).trim()) {
      if (msg) msg("⚠️ Configura tu cédula en el perfil primero", "orange");
    } else {
      if (msg) msg("❌ No se pudo sincronizar. Revisa conexión.", "salmon");
    }
    return result;
  }

  function stCc() {
    if (!global.PT || typeof PT.state !== "function") return "";
    var st = PT.state();
    return st.id_estudiante || st.cc || "";
  }

  var debouncedSync = debounce(syncFromPT, 900);

  function patchPT() {
    if (!global.PT || PT.__iubAutoSyncPatched) return;
    PT.__iubAutoSyncPatched = true;

    if (typeof PT.save === "function") {
      var origSave = PT.save;
      PT.save = function () {
        origSave.apply(PT, arguments);
        debouncedSync();
      };
    }
    if (typeof PT.addXP === "function") {
      var origXp = PT.addXP;
      PT.addXP = function () {
        var out = origXp.apply(PT, arguments);
        debouncedSync();
        return out;
      };
    }
    if (typeof PT.completeActivity === "function") {
      var origDone = PT.completeActivity;
      PT.completeActivity = function () {
        var out = origDone.apply(PT, arguments);
        debouncedSync();
        return out;
      };
    }
    PT.sync = syncCloudWithFeedback;
    PT.syncCloud = syncCloudWithFeedback;
  }

  function init() {
    patchPT();
    setTimeout(patchPT, 1200);
    setTimeout(patchPT, 3000);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  global.IUBWeekAutoSync = { syncNow: syncFromPT, patchPT: patchPT };
})(typeof window !== "undefined" ? window : globalThis);
