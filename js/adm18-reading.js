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

  function loadProfile() {
    var profile = global.GamifSDK ? (GamifSDK.loadProfile() || {}) : {};
    if (global.ADM18App && typeof ADM18App.getProfile === "function") {
      profile = Object.assign({}, ADM18App.getProfile() || {}, profile);
    }
    return profile;
  }

  async function syncCloud(semana) {
    if (!global.GamifSDK) return;
    var profile = loadProfile();

    var cc = String(profile.cc || profile.id_estudiante || "").trim();
    if (!cc) return;

    var xp = sessionXp(semana);
    var progress = global.ADM18App ? (ADM18App.getProgress() || {}) : {};
    var weekKey = "week_" + semana;
    var activityDone = !!(progress[weekKey] && progress[weekKey].completed) || xp >= 33;

    var result = await GamifSDK.syncWeekProgress({
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
    if (result && result.ok && global.ADM18App) {
      var scores = ADM18App.getScores();
      var wk = scores["week_" + semana];
      if (wk && !wk.synced) {
        wk.synced = true;
        try {
          localStorage.setItem("adm18_scores", JSON.stringify(scores));
        } catch (e) { /* ignore */ }
      }
    }
    return result;
  }

  var syncTimer;
  function scheduleSync(semana) {
    clearTimeout(syncTimer);
    syncTimer = setTimeout(function () {
      syncCloud(semana).catch(function () { /* offline */ });
    }, 350);
  }

  function award(sec) {
    var semana = parseSemana();
    var next = getReadingXp(semana) + sec.xp;
    localStorage.setItem(readingXpKey(semana), String(next));
    updateSessionUI(semana);
    if (typeof document !== "undefined") {
      document.dispatchEvent(new CustomEvent("iub:adm18-xp-updated"));
    }
    scheduleSync(semana);
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

  async function hydrateFromCloud(semana) {
    if (!global.GamifSDK || !GamifSDK.isCloudDirectMode()) return;
    var profile = loadProfile();
    var cc = String(profile.cc || profile.id_estudiante || "").trim();
    if (!cc) return;
    var row = await GamifSDK.fetchWeekProgressFromCloud(null, semana, cc);
    if (!row) return;
    var localReading = getReadingXp(semana);
    var cloudReading = row.quiz_answers && row.quiz_answers.reading_xp != null
      ? Number(row.quiz_answers.reading_xp) || 0
      : null;
    if (cloudReading != null && cloudReading > localReading) {
      localStorage.setItem(readingXpKey(semana), String(cloudReading));
    }
    var quizScore = Number(row.quiz_score || 0);
    if (quizScore > 0 && global.ADM18App) {
      var scores = ADM18App.getScores();
      var weekKey = "week_" + semana;
      var existing = scores[weekKey] || {};
      var localQuiz = typeof existing.percent === "number" ? existing.percent : 0;
      if (!existing.synced || quizScore >= localQuiz) {
        scores[weekKey] = Object.assign(existing, {
          percent: Math.max(localQuiz, quizScore),
          score: Math.round(Math.max(localQuiz, quizScore) / 100 * 5),
          total: 5,
          synced: true,
          answers: row.quiz_answers || existing.answers || {},
          timestamp: row.updated_at ? Date.parse(row.updated_at) : Date.now(),
        });
        try {
          localStorage.setItem("adm18_scores", JSON.stringify(scores));
        } catch (e) { /* ignore */ }
      }
    }
  }

  function boot() {
    if (!isAdm18()) return;
    var semana = parseSemana();
    setTimeout(function () {
      prepareAnchors();
      var sections = global.IUBReadingPolicy
        ? IUBReadingPolicy.detectSections()
        : [];
      injectReadingUI(sections.length);
      hydrateFromCloud(semana).then(function () {
        updateSessionUI(semana, 0, sections.length);
      });
    }, 300);
  }

  global.IUBAdm18Reading = {
    isAdm18: isAdm18,
    award: award,
    prepareAnchors: prepareAnchors,
    syncCloud: syncCloud,
    hydrateFromCloud: hydrateFromCloud,
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
