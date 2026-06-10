/**
 * Progreso semanal directo a Supabase (sin localStorage como fuente de verdad).
 * Parchea PT en TGA/TD: carga desde nube al iniciar, guarda en nube en cada cambio.
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

  function cloudMode() {
    return global.GamifSDK && GamifSDK.isCloudDirectMode && GamifSDK.isCloudDirectMode();
  }

  function getCc() {
    if (global.PT && typeof PT.state === "function") {
      var st = PT.state();
      var cc = String(st.id_estudiante || st.cc || "").trim();
      if (cc.length >= 3) return cc;
    }
    if (global.GamifSDK) {
      var p = GamifSDK.loadProfile();
      return String(p.cc || p.id_estudiante || "").trim();
    }
    return "";
  }

  function getSemana() {
    if (global.PT && typeof PT.state === "function") {
      var s = PT.state();
      if (s.semana) return s.semana;
    }
    var m = (global.location && global.location.pathname || "").match(/semana(\d+)/i);
    return m ? parseInt(m[1], 10) : null;
  }

  async function hydrateFromCloud() {
    if (!cloudMode() || !global.PT || typeof PT.state !== "function") return;
    var cc = getCc();
    var sem = getSemana();
    if (!cc || !sem) return;
    var row = await GamifSDK.fetchWeekProgressFromCloud(null, sem, cc);
    if (row) {
      GamifSDK.applyCloudRowToState(PT.state(), row);
      GamifSDK.clearLocalWeekProgress(null, sem);
      if (typeof PT.render === "function") PT.render();
    }
  }

  async function pushToCloud() {
    if (!global.GamifSDK || !global.PT || typeof PT.state !== "function") {
      return { ok: false, reason: "no_sdk" };
    }
    var st = PT.state();
    var cc = getCc();
    if (!cc) return { ok: false, reason: "no_cc" };
    if (!st.id_estudiante) st.id_estudiante = cc;
    if (!st.cc) st.cc = cc;
    var sem = getSemana() || st.semana;
    if (!sem) return { ok: false, reason: "no_semana" };
    if (cloudMode()) GamifSDK.clearLocalWeekProgress(null, sem);
    try {
      var result = await GamifSDK.syncWeekProgress(st, GamifSDK.getConfig(), sem);
      if (result && result.ok && cloudMode()) GamifSDK.clearLocalWeekProgress(null, sem);
      return result;
    } catch (e) {
      console.warn("[IUB] cloud-progress:", e.message || e);
      return { ok: false, reason: e.message || "error" };
    }
  }

  var debouncedPush = debounce(function () {
    pushToCloud();
  }, 400);

  function patchPT() {
    if (!global.PT || PT.__iubCloudDirect) return;
    PT.__iubCloudDirect = true;

    if (typeof PT.save === "function") {
      var origSave = PT.save;
      PT.save = function () {
        if (cloudMode()) {
          if (typeof PT.render === "function") PT.render();
          debouncedPush();
        } else {
          origSave.apply(PT, arguments);
        }
      };
    }

    if (typeof PT.init === "function") {
      var origInit = PT.init;
      PT.init = function () {
        origInit.apply(PT, arguments);
        hydrateFromCloud();
      };
    }

    PT.sync = PT.syncCloud = async function () {
      if (typeof PT.render === "function") PT.render();
      var result = await pushToCloud();
      var msgFn = PT.msg && PT.msg.bind(PT);
      if (result.ok && msgFn) msgFn("✅ Guardado en la base de datos", "lightgreen");
      else if (result.reason === "no_cc" && msgFn) msgFn("⚠️ Configura tu cédula en el perfil", "orange");
      else if (!result.ok && msgFn) msgFn("❌ No se pudo guardar. Revisa conexión.", "salmon");
      return result;
    };

    PT.export = PT.exportCode = function () {
      if (PT.msg) PT.msg("ℹ️ El progreso se guarda automáticamente en la base de datos.", "#fff9c4");
    };
    PT.import = PT.importCode = function () {
      if (PT.msg) PT.msg("ℹ️ Ingresa tu cédula; tu progreso se carga desde la nube.", "#fff9c4");
    };
  }

  function hideLegacyUi() {
    if (!cloudMode()) return;
    var btn = document.getElementById("pt-btn-save");
    if (btn) btn.style.display = "none";
    document.querySelectorAll(
      '[onclick*="ptExportCode"],[onclick*="ptImportCode"],[onclick*="PT.export"],[onclick*="PT.import"]'
    ).forEach(function (el) {
      el.style.display = "none";
    });
  }

  function init() {
    patchPT();
    setTimeout(function () {
      patchPT();
      hideLegacyUi();
      hydrateFromCloud();
    }, 600);
    setTimeout(patchPT, 2500);
  }

  document.addEventListener("iub:profile-saved", function () {
    hydrateFromCloud().then(pushToCloud);
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  global.IUBWeekAutoSync = { hydrate: hydrateFromCloud, push: pushToCloud, patchPT: patchPT };
})(typeof window !== "undefined" ? window : globalThis);
