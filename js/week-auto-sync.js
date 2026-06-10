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
    if (!global.GamifSDK || !global.PT || typeof PT.state !== "function") return;
    var st = PT.state();
    var cc = String(st.id_estudiante || st.cc || "").trim();
    if (!cc) return;
    var cfg = GamifSDK.getConfig();
    var semana = st.semana || cfg.semana;
    if (!semana) return;
    try {
      await GamifSDK.syncWeekProgress(st, cfg, semana);
    } catch (e) {
      console.warn("[IUB] week-auto-sync:", e.message || e);
    }
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
