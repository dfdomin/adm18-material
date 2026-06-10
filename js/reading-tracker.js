(function (global) {
  "use strict";

  function init(options) {
    options = options || {};
    var semana = options.semana || 1;
    var cfg = global.GamifSDK ? GamifSDK.getConfig() : { prefix: "iub" };
    var LS_KEY = options.storageKey || (cfg.prefix + "_s" + semana + "_reading");
    var sections = options.sections || [];
    if (!sections.length) return;

    function loadState() {
      try { return JSON.parse(localStorage.getItem(LS_KEY) || "{}"); }
      catch (e) { return {}; }
    }

    function saveState(st) {
      try { localStorage.setItem(LS_KEY, JSON.stringify(st)); } catch (e) { /* ignore */ }
    }

    function markRead(sectionEl) {
      var h2 = sectionEl.querySelector("h2, h3");
      if (h2 && !h2.querySelector(".read-badge")) {
        var badge = document.createElement("span");
        badge.className = "read-badge";
        badge.textContent = " ✅";
        badge.style.cssText = "font-size:.75em;opacity:.7;";
        h2.appendChild(badge);
      }
    }

    function updateReadingUI(state) {
      var done = sections.filter(function (s) { return state[s.id]; }).length;
      var el = document.getElementById("pt-reading-progress")
        || document.getElementById("adm18-reading-progress");
      if (el) {
        el.textContent = "📖 Lectura: " + done + "/" + sections.length + " secciones";
        el.style.color = done === sections.length ? "var(--green,#2e7d32)" : "var(--muted,#546e7a)";
      }
      if (global.IUBAdm18Reading && typeof IUBAdm18Reading.updateSessionUI === "function") {
        IUBAdm18Reading.updateSessionUI(semana, done, sections.length);
      }
    }

    function award(sec) {
      if (global.IUBCelebrate) IUBCelebrate.launch({ message: "📖 " + sec.label });
      if (typeof options.onAward === "function") {
        options.onAward(sec);
      } else if (global.IUBAdm18Reading && IUBAdm18Reading.isAdm18()) {
        IUBAdm18Reading.award(sec);
      } else if (global.PT && typeof PT.addXP === "function") {
        PT.addXP(sec.xp, "Lectura: " + sec.label);
        setTimeout(function () {
          if (global.PT && typeof PT.sync === "function") PT.sync();
        }, 1200);
      }
    }

    function initObserver() {
      var state = loadState();
      var timers = {};
      var visible = {};
      var paused = false;

      sections.forEach(function (sec) {
        if (state[sec.id]) {
          var el0 = document.getElementById(sec.id);
          if (el0) markRead(el0);
        }
      });
      updateReadingUI(state);

      document.addEventListener("visibilitychange", function () {
        paused = document.hidden;
      });

      var observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          var id = entry.target.id;
          var sec = sections.find(function (s) { return s.id === id; });
          if (!sec || state[id]) return;

          if (entry.isIntersecting && !paused) {
            visible[id] = true;
            timers[id] = timers[id] || { accumulated: 0 };
            timers[id].start = Date.now();
          } else {
            if (visible[id] && timers[id] && timers[id].start) {
              timers[id].accumulated += Date.now() - timers[id].start;
              timers[id].start = null;
            }
            visible[id] = false;
            checkAward(id, sec, entry.target, state, timers, observer);
          }
        });
      }, { threshold: options.threshold || 0.3 });

      function checkAward(id, sec, el, st, tms, obs) {
        var acum = (tms[id] && tms[id].accumulated) || 0;
        if (tms[id] && tms[id].start && !paused) acum += Date.now() - tms[id].start;
        if (acum >= sec.segundos * 1000) {
          st[id] = true;
          saveState(st);
          markRead(el);
          updateReadingUI(st);
          award(sec);
          if (obs) obs.unobserve(el);
        }
      }

      setInterval(function () {
        if (paused) return;
        sections.forEach(function (sec) {
          if (state[sec.id] || !visible[sec.id]) return;
          var el = document.getElementById(sec.id);
          if (!el) return;
          checkAward(sec.id, sec, el, state, timers, observer);
        });
      }, 2000);

      sections.forEach(function (sec) {
        var el = document.getElementById(sec.id);
        if (el && !state[sec.id]) observer.observe(el);
      });
    }

    function injectReadingUI() {
      if (global.IUBAdm18Reading && IUBAdm18Reading.isAdm18()) return;
      var ptBody = document.getElementById("pt-body");
      if (!ptBody || document.getElementById("pt-reading-progress")) return;
      var div = document.createElement("div");
      div.id = "pt-reading-progress";
      div.style.cssText = "font-size:.75rem;margin-top:4px;text-align:center;";
      div.textContent = "📖 Lectura: 0/" + sections.length + " secciones";
      var msg = document.getElementById("pt-msg");
      if (msg) ptBody.insertBefore(div, msg);
      else ptBody.appendChild(div);
    }

    function boot() {
      injectReadingUI();
      setTimeout(initObserver, options.delay || 500);
    }

    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
    else boot();
  }

  global.IUBReadingTracker = { init: init };
})(typeof window !== "undefined" ? window : globalThis);
