(function (global) {
  "use strict";

  var ZONE = "iub-reading-zone";

  function parseSemana() {
    var m = (global.location && global.location.pathname || "").match(/semana[-_]?0?(\d+)/i);
    return m ? parseInt(m[1], 10) : 1;
  }

  function isAdm18() {
    return !!(global.GamifSDK && GamifSDK.getConfig().prefix === "adm18")
      || /\/adm18-material\//i.test(global.location && global.location.pathname || "")
      || !!document.querySelector(".week-hero");
  }

  function readingXpKey(semana) {
    return "adm18_s" + semana + "_reading_xp";
  }

  function getReadingXp(semana) {
    return parseInt(localStorage.getItem(readingXpKey(semana)) || "0", 10) || 0;
  }

  function getQuizPercent(semana) {
    try {
      var scores = JSON.parse(localStorage.getItem("adm18_scores") || "{}");
      var w = scores["week_" + semana];
      return w && typeof w.percent === "number" ? w.percent : 0;
    } catch (e) {
      return 0;
    }
  }

  function sessionXp(semana) {
    return Math.min(100, getReadingXp(semana) + getQuizPercent(semana));
  }

  function updateSessionUI(semana, sectionsDone, sectionsTotal) {
    var total = sessionXp(semana);
    var heroXp = document.getElementById("week-hero-xp");
    if (heroXp) heroXp.textContent = total + " / 100 pts";
    var widgetXp = document.getElementById("week-widget-xp");
    if (widgetXp) widgetXp.textContent = total + " XP";

    var el = document.getElementById("adm18-reading-progress");
    if (el && sectionsTotal) {
      el.textContent = "📖 Lectura: " + sectionsDone + "/" + sectionsTotal + " secciones";
      el.style.color = sectionsDone === sectionsTotal ? "#2e7d32" : "#546e7a";
    }
  }

  function injectReadingUI(sectionsTotal) {
    if (document.getElementById("adm18-reading-progress")) return;
    var widget = document.querySelector(".week-progress-widget");
    if (!widget) return;
    var div = document.createElement("div");
    div.id = "adm18-reading-progress";
    div.style.cssText = "font-size:.78rem;margin-top:.45rem;opacity:.9;text-align:center;";
    div.textContent = "📖 Lectura: 0/" + sectionsTotal + " secciones";
    var meta = widget.querySelector(".week-progress-widget__meta");
    if (meta) widget.insertBefore(div, meta);
    else widget.appendChild(div);
  }

  async function syncCloud(semana) {
    if (!global.GamifSDK) return;
    var profile = global.ADM18App ? (ADM18App.getProfile() || {}) : {};
    try {
      var raw = localStorage.getItem("adm18_user");
      if (raw) {
        var u = JSON.parse(raw);
        profile = Object.assign({ nombre: u.nombre, cc: u.cc, id_estudiante: u.cc }, profile);
      }
    } catch (e) { /* ignore */ }

    var cc = String(profile.cc || profile.id_estudiante || "").trim();
    if (!cc) return;

    var xp = sessionXp(semana);
    var progress = global.ADM18App ? (ADM18App.getProgress() || {}) : {};
    var weekKey = "week_" + semana;
    var activityDone = !!(progress[weekKey] && progress[weekKey].completed) || xp >= 33;

    await GamifSDK.syncWeekProgress({
      semana: semana,
      xp: xp,
      nombre: profile.nombre || profile.name || "",
      cc: cc,
      id_estudiante: cc,
      grupo: profile.grupo || "",
      horario: profile.horario || "",
      quiz_puntaje: getQuizPercent(semana),
      actividad_completada: activityDone,
      activity_done: activityDone,
      quiz_respuestas: { reading_xp: getReadingXp(semana) },
    }, GamifSDK.getConfig(), semana);
  }

  function award(sec) {
    var semana = parseSemana();
    var next = getReadingXp(semana) + sec.xp;
    localStorage.setItem(readingXpKey(semana), String(next));
    updateSessionUI(semana);
    setTimeout(function () { syncCloud(semana); }, 900);
  }

  function wrapRange(parent, startNode, endBefore, sectionId) {
    if (!startNode) return null;
    var existing = document.getElementById(sectionId);
    if (existing && existing.classList.contains(ZONE) && existing.tagName === "SECTION") {
      return existing;
    }

    var sec = document.createElement("section");
    sec.id = sectionId;
    sec.className = ZONE;
    parent.insertBefore(sec, startNode);

    if (startNode.id === sectionId) startNode.removeAttribute("id");
    sec.appendChild(startNode);

    var node = sec.nextSibling;
    while (node && node !== endBefore) {
      var nxt = node.nextSibling;
      sec.appendChild(node);
      node = nxt;
    }
    return sec;
  }

  function prepareAnchors() {
    if (!isAdm18()) return;

    var card = document.querySelector(".card#mision")
      || document.querySelector(".iub-content > .card, main.iub-content .card");
    if (card) {
      var contenidoAnchor = card.querySelector("#contenido");
      var actividadesAnchor = document.getElementById("actividades");
      var quiz = document.getElementById("quiz-container");
      card.removeAttribute("id");

      if (contenidoAnchor && !card.querySelector("section#mision")) {
        var misionSec = document.createElement("section");
        misionSec.id = "mision";
        misionSec.className = ZONE;
        var node = card.firstChild;
        var before = [];
        while (node && node !== contenidoAnchor) {
          before.push(node);
          node = node.nextSibling;
        }
        card.insertBefore(misionSec, contenidoAnchor);
        before.forEach(function (n) { misionSec.appendChild(n); });
      }

      if (contenidoAnchor && contenidoAnchor.tagName === "H2") {
        wrapRange(card, contenidoAnchor, actividadesAnchor, "contenido");
      }
      if (actividadesAnchor && actividadesAnchor.tagName === "H2") {
        wrapRange(card, actividadesAnchor, quiz, "actividades");
      }
    }

    ["contenido", "actividades", "bibliografia"].forEach(function (id) {
      var el = document.getElementById(id);
      if (!el || (el.classList.contains(ZONE) && el.tagName === "SECTION")) return;
      if (el.tagName === "H2") {
        var parent = el.parentElement;
        if (!parent) return;
        var stop = el.nextElementSibling;
        while (stop && stop.tagName !== "H2" && stop.id !== "quiz-container") {
          stop = stop.nextElementSibling;
        }
        wrapRange(parent, el, stop, id);
      } else if (el.tagName === "DIV" || el.tagName === "SECTION") {
        el.classList.add(ZONE);
      }
    });
  }

  function boot() {
    if (!isAdm18()) return;
    setTimeout(function () {
      prepareAnchors();
      var sections = global.IUBReadingPolicy
        ? IUBReadingPolicy.detectSections()
        : [];
      injectReadingUI(sections.length);
      updateSessionUI(parseSemana(), 0, sections.length);
    }, 300);
  }

  global.IUBAdm18Reading = {
    isAdm18: isAdm18,
    award: award,
    prepareAnchors: prepareAnchors,
    syncCloud: syncCloud,
    sessionXp: sessionXp,
    getReadingXp: getReadingXp,
    getQuizPercent: getQuizPercent,
    updateSessionUI: updateSessionUI,
    parseSemana: parseSemana,
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})(typeof window !== "undefined" ? window : globalThis);
