/**
 * UI de semana ADM18: perfil, XP de sesión (lectura + quiz) y banner de identificación.
 */
(function (global) {
  "use strict";

  function parseSemana() {
    var m = (global.location && global.location.pathname || "").match(/semana-0?(\d+)/i);
    return m ? parseInt(m[1], 10) : 1;
  }

  function getProfile() {
    if (global.ADM18App && typeof ADM18App.getProfile === "function") {
      return ADM18App.getProfile() || {};
    }
    if (global.GamifSDK) return GamifSDK.loadProfile() || {};
    return {};
  }

  function sessionXp(semana) {
    if (global.IUBAdm18Reading && typeof IUBAdm18Reading.sessionXp === "function") {
      return IUBAdm18Reading.sessionXp(semana);
    }
    try {
      var scores = JSON.parse(localStorage.getItem("adm18_scores") || "{}");
      var w = scores["week_" + semana];
      var quiz = w && typeof w.percent === "number" ? w.percent : 0;
      var reading = parseInt(localStorage.getItem("adm18_s" + semana + "_reading_xp") || "0", 10) || 0;
      return Math.min(100, quiz + reading);
    } catch (e) {
      return 0;
    }
  }

  function ensureSyncBanner(profile) {
    if (profile.cc || profile.id_estudiante) return;
    var id = "adm18-week-sync-banner";
    if (document.getElementById(id)) return;

    // Detectar si la barra de estado académico está presente para posicionar debajo
    var topOffset = 0;
    var statusBar = document.getElementById("iub-academic-status-bar");
    if (statusBar) {
      topOffset = statusBar.offsetHeight || 46;
    }

    var bar = document.createElement("div");
    bar.id = id;
    bar.style.cssText =
      "position:fixed;top:" + topOffset + "px;left:0;right:0;z-index:99989;background:#fff3cd;color:#5d4037;" +
      "padding:.55rem 1rem;text-align:center;font-size:.88rem;border-bottom:1px solid #ffe082;";
    bar.innerHTML =
      '⚠️ Configura tu cédula para guardar tu progreso en la nube. ' +
      '<button type="button" id="adm18-week-identify-btn" style="margin-left:.5rem;font-weight:800;' +
      'border:1px solid #5d4037;background:#ffdf2d;border-radius:8px;padding:.2rem .65rem;cursor:pointer;">Identificarme</button>';
    document.body.appendChild(bar);
    var btn = document.getElementById("adm18-week-identify-btn");
    if (btn) btn.addEventListener("click", identifyStudent);
  }

  async function identifyStudent() {
    var profile = getProfile();
    var cc = prompt("Tu número de cédula:");
    if (!cc || !cc.trim()) return;
    cc = cc.trim();

    // Consultar BD para obtener nombre, grupo y horario — NUNCA pedirlos manualmente
    var nombre = "";
    var grupo = "";
    var horario = "";

    if (global.GamifSDK && GamifSDK.isCloudDirectMode && GamifSDK.isCloudDirectMode()) {
      try {
        var rows = await GamifSDK.fetchAllProgressFromCloud(null, cc);
        if (rows && rows.length > 0) {
          // Extraer datos más recientes (última semana registrada)
          var latest = rows[rows.length - 1];
          nombre = (latest.student_name || "").trim();
          grupo = (latest.grupo || "").trim();
          horario = (latest.horario || "").trim();
        }
      } catch (e) {
        console.warn("No se pudo consultar la nube:", e);
      }
    }

    // Si no se encontró en la nube, usar localStorage local como fallback
    if (!nombre) nombre = (profile.nombre || profile.name || "").trim();
    if (!grupo) grupo = (profile.grupo || "").trim();
    if (!horario) horario = (profile.horario || "").trim();

    var next = {
      cc: cc,
      id_estudiante: cc,
      nombre: nombre,
      grupo: grupo,
      horario: horario,
    };

    if (global.ADM18App && ADM18App.saveProfile) {
      ADM18App.saveProfile(next);
    } else if (global.GamifSDK) {
      GamifSDK.saveProfile(next);
    }

    // Mostrar advertencia si no se encontraron datos en la nube
    if (!nombre) {
      showMissingProfileBanner(cc);
    }

    var banner = document.getElementById("adm18-week-sync-banner");
    if (banner) banner.remove();
    refreshUI();
  }

  function showMissingProfileBanner(cc) {
    var id = "adm18-missing-profile-banner";
    if (document.getElementById(id)) return;
    var bar = document.createElement("div");
    bar.id = id;
    bar.style.cssText =
      "position:fixed;top:46px;left:0;right:0;z-index:99990;background:#ffebee;color:#b71c1c;" +
      "padding:.55rem 1rem;text-align:center;font-size:.88rem;border-bottom:1px solid #ef9a9a;";
    bar.innerHTML =
      "⚠️ Cédula " + escHtml(cc) + " no encontrada en la base de datos del curso. " +
      "Verifica que esté correcta o contacta a tu docente.";
    document.body.appendChild(bar);
  }

  function escHtml(s) {
    return String(s).replace(/[&<>\"']/g, function(m) {
      return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m];
    });
  }

  function refreshUI(semana) {
    semana = semana || parseSemana();
    var progress = {};
    try {
      progress = JSON.parse(localStorage.getItem("adm18_progress") || "{}");
    } catch (e) { /* ignore */ }
    var completed = Object.values(progress).filter(function (item) {
      return item && item.completed;
    }).length;
    var pct = Math.round((completed / 14) * 100);
    var xp = sessionXp(semana);
    var profile = getProfile();
    var userName = profile.nombre || profile.name || "Estudiante ADM18";

    [
      ["week-hero-fill", pct],
      ["week-widget-fill", pct],
      ["week-hero-fill-auto", pct],
      ["week-widget-fill-auto", pct],
    ].forEach(function (pair) {
      var el = document.getElementById(pair[0]);
      if (el) el.style.width = pair[1] + "%";
    });

    [
      ["week-hero-xp", xp + " / 100 pts"],
      ["week-widget-xp", xp + " XP"],
      ["week-hero-xp-auto", xp + " / 100 pts"],
      ["week-widget-xp-auto", xp + " XP"],
    ].forEach(function (pair) {
      var el = document.getElementById(pair[0]);
      if (el) el.textContent = pair[1];
    });

    [
      ["week-widget-name", userName],
      ["week-widget-name-auto", userName],
    ].forEach(function (pair) {
      var el = document.getElementById(pair[0]);
      if (el) el.textContent = pair[1];
    });

    ensureSyncBanner(profile);
  }

  function boot() {
    var semana = parseSemana();
    refreshUI(semana);
    setTimeout(function () { refreshUI(semana); }, 900);
  }

  document.addEventListener("DOMContentLoaded", boot);
  document.addEventListener("iub:profile-saved", function () {
    refreshUI();
    if (global.IUBAdm18Reading && IUBAdm18Reading.syncCloud) {
      IUBAdm18Reading.syncCloud(parseSemana()).catch(function () { /* offline */ });
    }
  });
  document.addEventListener("iub:adm18-xp-updated", function () {
    refreshUI();
  });

  global.ADM18WeekBoot = {
    parseSemana: parseSemana,
    refreshUI: refreshUI,
    identifyStudent: identifyStudent,
    sessionXp: sessionXp,
  };
})(typeof window !== "undefined" ? window : globalThis);
