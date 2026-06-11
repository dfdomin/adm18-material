/**
 * Progreso semanal directo a Supabase (sin localStorage como fuente de verdad).
 * Parchea PT.save / PT.addXP para llamar GamifSDK.syncWeekProgress sin botón ☁️.
 *
 * En semanas TGA, PT suele ser `const PT` en script inline (no visible desde este archivo).
 * exposePT() ejecuta un script inline que copia PT → window.PT y luego parchea.
 */
(function (global) {
  "use strict";

  function getPT() {
    if (global.PT) return global.PT;
    try {
      if (typeof PT !== "undefined") {
        global.PT = PT;
        return PT;
      }
    } catch (e) { /* cross-script lexical scope */ }
    return null;
  }

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
    var pt = getPT();
    if (pt && typeof pt.state === "function") {
      var st = pt.state();
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
    var pt = getPT();
    if (pt && typeof pt.state === "function") {
      var s = pt.state();
      if (s.semana) return s.semana;
    }
    var m = (global.location && global.location.pathname || "").match(/semana(\d+)/i);
    return m ? parseInt(m[1], 10) : null;
  }

  async function hydrateFromCloud() {
    if (!cloudMode()) return;
    var pt = getPT();
    if (!pt || typeof pt.state !== "function") return;
    var cc = getCc();
    var sem = getSemana();
    if (!cc || !sem) return;
    var row = await GamifSDK.fetchWeekProgressFromCloud(null, sem, cc);
    if (row) {
      GamifSDK.applyCloudRowToState(pt.state(), row);
      GamifSDK.clearLocalWeekProgress(null, sem);
      if (typeof pt.render === "function") pt.render();
    }
  }

  async function pushToCloud() {
    if (!global.GamifSDK) return { ok: false, reason: "no_sdk" };
    var pt = getPT();
    if (!pt || typeof pt.state !== "function") return { ok: false, reason: "no_pt" };
    var st = pt.state();
    var cc = getCc();
    if (!cc) return { ok: false, reason: "no_cc" };
    if (!st.id_estudiante) st.id_estudiante = cc;
    if (!st.cc) st.cc = cc;
    if (!st.nombre) {
      var profile = GamifSDK.loadProfile();
      if (profile.nombre) st.nombre = profile.nombre;
    }
    if (!st.grupo && GamifSDK.loadProfile().grupo) st.grupo = GamifSDK.loadProfile().grupo;
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
    var pt = getPT();
    if (!pt || pt.__iubCloudDirect) return false;
    pt.__iubCloudDirect = true;
    global.PT = pt;

    if (typeof pt.save === "function") {
      var origSave = pt.save;
      pt.save = function () {
        if (cloudMode()) {
          if (typeof pt.render === "function") pt.render();
          debouncedPush();
        } else {
          origSave.apply(pt, arguments);
        }
      };
    }

    if (typeof pt.addXP === "function") {
      var origXp = pt.addXP;
      pt.addXP = function () {
        var out = origXp.apply(pt, arguments);
        if (cloudMode()) debouncedPush();
        return out;
      };
    }

    if (typeof pt.init === "function" && !pt.__iubInitPatched) {
      pt.__iubInitPatched = true;
      var origInit = pt.init;
      pt.init = function () {
        origInit.apply(pt, arguments);
        hydrateFromCloud();
      };
    }

    pt.sync = pt.syncCloud = async function () {
      if (typeof pt.render === "function") pt.render();
      var result = await pushToCloud();
      var msgFn = pt.msg && pt.msg.bind(pt);
      if (result.ok && msgFn) msgFn("✅ Guardado en la base de datos", "lightgreen");
      else if (result.reason === "no_cc" && msgFn) msgFn("⚠️ Configura tu cédula en el perfil", "orange");
      else if (!result.ok && msgFn) msgFn("❌ No se pudo guardar. Revisa conexión.", "salmon");
      return result;
    };

    pt.export = pt.exportCode = function () {
      if (pt.msg) pt.msg("ℹ️ El progreso se guarda automáticamente en la base de datos.", "#fff9c4");
    };
    pt.import = pt.importCode = function () {
      if (pt.msg) pt.msg("ℹ️ Ingresa tu cédula; tu progreso se carga desde la nube.", "#fff9c4");
    };

    return true;
  }

  /** Ejecuta en el mismo realm que `const PT` para exponerlo en window.PT */
  function exposePT() {
    var el = document.createElement("script");
    el.textContent = "(function(){try{if(typeof PT!=='undefined'){window.PT=PT;}}catch(e){}})();";
    (document.documentElement || document.head || document.body).appendChild(el);
    el.remove();
    return patchPT();
  }

  function exposeAndPatch() {
    exposePT();
    hideLegacyUi();
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
    exposeAndPatch();
    setTimeout(function () {
      exposeAndPatch();
      hydrateFromCloud();
    }, 600);
    setTimeout(exposeAndPatch, 1500);
    setTimeout(exposeAndPatch, 3500);
    global.addEventListener("load", function () {
      exposeAndPatch();
      hydrateFromCloud();
    });
  }

  document.addEventListener("iub:profile-saved", function () {
    exposeAndPatch();
    hydrateFromCloud().then(pushToCloud);
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  global.IUBWeekAutoSync = {
    hydrate: hydrateFromCloud,
    push: pushToCloud,
    patchPT: patchPT,
    exposePT: exposeAndPatch,
  };
})(typeof window !== "undefined" ? window : globalThis);
