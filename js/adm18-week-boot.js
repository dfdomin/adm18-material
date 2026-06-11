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
    var bar = document.createElement("div");
    bar.id = id;
    bar.style.cssText =
      "position:fixed;top:0;left:0;right:0;z-index:60;background:#fff3cd;color:#5d4037;" +
      "padding:.55rem 1rem;text-align:center;font-size:.88rem;border-bottom:1px solid #ffe082;";
    bar.innerHTML =
      '⚠️ Configura tu cédula para guardar tu progreso en la nube. ' +
      '<button type="button" id="adm18-week-identify-btn" style="margin-left:.5rem;font-weight:800;' +
      'border:1px solid #5d4037;background:#ffdf2d;border-radius:8px;padding:.2rem .65rem;cursor:pointer;">Identificarme</button>';
    document.body.appendChild(bar);
    var btn = document.getElementById("adm18-week-identify-btn");
    if (btn) btn.addEventListener("click", identifyStudent);
  }

  function identifyStudent() {
    var profile = getProfile();
    var cc = prompt("Tu número de cédula (para guardar puntajes en la nube):");
    if (!cc || !cc.trim()) return;
    var nombre = prompt("Tu nombre completo:", profile.nombre || profile.name || "") || "";
    var grupo = prompt("Grupo (opcional):", profile.grupo || "") || "";
    var horario = prompt("Horario (opcional):", profile.horario || "") || "";
    var next = {
      cc: cc.trim(),
      id_estudiante: cc.trim(),
      nombre: nombre.trim(),
      grupo: grupo.trim(),
      horario: horario.trim(),
    };
    if (global.ADM18App && ADM18App.saveProfile) {
      ADM18App.saveProfile(next);
    } else if (global.GamifSDK) {
      GamifSDK.saveProfile(next);
    }
    var banner = document.getElementById("adm18-week-sync-banner");
    if (banner) banner.remove();
    refreshUI();
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
