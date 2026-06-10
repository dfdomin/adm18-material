(function (global) {
  "use strict";

  var COURSE_BLOCKS = [
    { id: "b1", title: "Semanas 1 – 4", weeks: [1, 2, 3, 4], accent: "#1565c0" },
    { id: "b2", title: "Semana 5 · Primer Corte", weeks: [5], accent: "#c62828", highlight: true },
    { id: "b3", title: "Semanas 6 – 9", weeks: [6, 7, 8, 9], accent: "#2e7d32" },
    { id: "b4", title: "Semana 10 · Segundo Corte", weeks: [10], accent: "#e65100", highlight: true },
    { id: "b5", title: "Semanas 11 – 13 · Tercer Corte", weeks: [11, 12, 13], accent: "#6a1b9a" },
    { id: "b6", title: "Semana 14 · Parcial Final", weeks: [14], accent: "#1E2843", highlight: true },
  ];

  function dashConfig() {
    return global.IUB_DASHBOARD || {
      title: global.MODULE_CODE || "IUB",
      subtitle: global.NARRATIVE || "",
      totalWeeks: 14,
      xpMaxPerWeek: 100,
      weekUrl: function (n) { return "../semana" + n + "/index.html"; },
    };
  }

  function weekAvailable(dash, w) {
    if (dash.availableWeeks) return dash.availableWeeks.indexOf(w) >= 0;
    if (typeof dash.weekAvailable === "function") return dash.weekAvailable(w);
    return true;
  }

  function loadWeekXp(cfg, semana) {
    var key = cfg.prefix + "_progress:" + cfg.offeringCode + ":" + semana;
    var raw = localStorage.getItem(key);
    if (!raw && cfg.prefix === "adm18") {
      raw = localStorage.getItem("adm18_scores") ? null : localStorage.getItem("adm18_s" + semana);
    }
    if (!raw) raw = localStorage.getItem(cfg.prefix + "_s" + semana);
    try {
      var st = JSON.parse(raw || "{}");
      return Number(st.xp || 0);
    } catch (e) {
      return 0;
    }
  }

  function weekRows(cfg, dash) {
    var rows = [];
    for (var w = 1; w <= dash.totalWeeks; w += 1) {
      rows.push({ week: w, xp: loadWeekXp(cfg, w), max: dash.xpMaxPerWeek });
    }
    return rows;
  }

  function pct(current, max) {
    if (!max) return 0;
    return Math.min(100, Math.round((current / max) * 100));
  }

  function barHtml(value, max, color) {
    var width = pct(value, max);
    return (
      '<div class="xp-bar" aria-label="' + value + ' de ' + max + ' XP">' +
      '<div class="xp-bar-fill" style="width:' + width + "%;background:" + (color || "var(--gold)") + '"></div>' +
      "</div>"
    );
  }

  function renderStudentDashboard(rootId) {
    var root = document.getElementById(rootId || "student-dashboard");
    if (!root || !global.GamifSDK) return;

    var cfg = GamifSDK.getConfig();
    var dash = dashConfig();
    var profile = GamifSDK.loadProfile(cfg);
    var rows = weekRows(cfg, dash);
    var totalXp = rows.reduce(function (s, r) { return s + r.xp; }, 0);
    var maxCourse = dash.totalWeeks * dash.xpMaxPerWeek;
    var rank = GamifSDK.rankFor(totalXp);

    var profileLine = profile.nombre
      ? profile.nombre + (profile.grupo ? " · " + profile.grupo : "") + (profile.horario ? " · " + profile.horario : "")
      : "Configura tu perfil desde cualquier semana del curso.";

    var html = "";
    html += '<section class="dash-summary">';
    html += '<div class="dash-metric"><span>XP total</span><strong>' + totalXp + '</strong>' + barHtml(totalXp, maxCourse, "#FFDF2D") + '<small>' + pct(totalXp, maxCourse) + "% del curso</small></div>";
    html += '<div class="dash-metric"><span>Rango</span><strong>' + GamifSDK.esc(rank) + "</strong></div>";
    html += '<div class="dash-metric"><span>Módulo</span><strong>' + GamifSDK.esc(dash.title) + "</strong><small>" + GamifSDK.esc(dash.subtitle) + "</small></div>";
    html += "</section>";

    html += '<section class="dash-overall panel">';
    html += "<h2>Progreso general del curso</h2>";
    html += barHtml(totalXp, maxCourse, "linear-gradient(90deg,#1E2843,#FFDF2D)");
    html += '<p class="dash-note">' + GamifSDK.esc(profileLine) + "</p>";
    html += "</section>";

    html += '<section class="dash-blocks">';
    COURSE_BLOCKS.forEach(function (block) {
      var blockXp = block.weeks.reduce(function (s, w) {
        var row = rows.find(function (r) { return r.week === w; });
        return s + (row ? row.xp : 0);
      }, 0);
      var blockMax = block.weeks.length * dash.xpMaxPerWeek;

      html += '<article class="dash-block panel' + (block.highlight ? " dash-block-cut" : "") + '" style="--block-accent:' + block.accent + '">';
      html += "<h3>" + GamifSDK.esc(block.title);
      if (block.highlight && global.IUBAcademicRules) {
        var rw = IUBAcademicRules.rulesConfig();
        html += ' <small style="font-weight:700;color:var(--muted)">(' + rw.formativeWeightPct + "% formativa · " + rw.evaluationWeightPct + "% evaluación)</small>";
      }
      html += "</h3>";
      html += barHtml(blockXp, blockMax, block.accent);
      html += '<div class="dash-weeks">';

      block.weeks.forEach(function (w) {
        var row = rows.find(function (r) { return r.week === w; });
        var xp = row ? row.xp : 0;
        if (!weekAvailable(dash, w)) {
          html += '<div class="dash-week dash-week-disabled" aria-disabled="true">';
          html += '<div class="dash-week-top"><strong>Semana ' + w + '</strong><span>Próximamente</span></div>';
          html += barHtml(0, dash.xpMaxPerWeek, "#bdbdbd");
          html += "</div>";
          return;
        }
        html += '<a class="dash-week" href="' + dash.weekUrl(w) + '">';
        html += '<div class="dash-week-top"><strong>Semana ' + w + '</strong><span>' + xp + " XP</span></div>";
        html += barHtml(xp, dash.xpMaxPerWeek, block.accent);
        html += "</a>";
      });

      html += "</div></article>";
    });
    html += "</section>";

    root.innerHTML = html;

    var academicRoot = document.getElementById("academic-panels");
    if (academicRoot && global.IUBAcademicRules) {
      academicRoot.innerHTML = IUBAcademicRules.evaluationPanelHtml();
      IUBAcademicRules.getStudentAttendanceSummary().then(function (summary) {
        var attEl = document.getElementById("attendance-panel");
        if (attEl) attEl.innerHTML = IUBAcademicRules.attendanceSummaryHtml(summary);
      });
    }

    var line = document.getElementById("studentLine");
    if (line) line.textContent = profileLine;
    var totalEl = document.getElementById("totalXp");
    if (totalEl) totalEl.textContent = String(totalXp);
    var rankEl = document.getElementById("rank");
    if (rankEl) rankEl.textContent = rank;
    var bar = document.getElementById("courseXpBar");
    if (bar) bar.style.width = pct(totalXp, maxCourse) + "%";
  }

  async function renderGroupProgress(containerId, offeringCode) {
    var el = document.getElementById(containerId);
    if (!el || !global.GamifSDK) return;
    var offering = offeringCode || GamifSDK.getOfferingCode();
    var url = GamifSDK.sbUrl();
    var key = GamifSDK.sbKey();
    if (!url || !key) {
      el.innerHTML = "<p class=\"msg err\">Supabase no configurado.</p>";
      return;
    }

    el.innerHTML = "<p class=\"msg\">Cargando progreso por grupo…</p>";
    var res = await fetch(
      url + "/rest/v1/v_group_progress?select=*&offering_code=eq." + encodeURIComponent(offering) + "&order=grupo.asc",
      { headers: { apikey: key, Authorization: "Bearer " + key } }
    );
    if (!res.ok) {
      el.innerHTML = "<p class=\"msg err\">No se pudo cargar v_group_progress (" + res.status + ").</p>";
      return;
    }
    var rows = await res.json();
    if (!rows.length) {
      el.innerHTML = "<p class=\"msg\">Sin datos de grupo aún. Importa estudiantes y registra actividad.</p>";
      return;
    }

    var modName = rows[0].module_name || offering;
    var html = "<div class=\"group-layer\"><strong>" + GamifSDK.esc(modName) + "</strong><span>" + GamifSDK.esc(offering) + "</span></div>";
    html += "<div class=\"table-wrap\"><table><thead><tr><th>Grupo</th><th>Horario</th><th>Est.</th><th>XP total</th><th>XP prom.</th><th>Progreso</th></tr></thead><tbody>";
    var maxXp = Math.max.apply(null, rows.map(function (r) { return Number(r.xp_total || 0); }).concat([1]));
    rows.forEach(function (r) {
      var xp = Number(r.xp_total || 0);
      html += "<tr><td>" + GamifSDK.esc(r.grupo) + "</td><td>" + GamifSDK.esc(r.horario) + "</td><td>" + r.estudiantes + "</td><td>" + xp + "</td><td>" + Math.round(Number(r.xp_promedio || 0)) + "</td><td>" + barHtml(xp, maxXp, "#FFDF2D") + "</td></tr>";
    });
    html += "</tbody></table></div>";
    el.innerHTML = html;
  }

  global.IUBStudentDashboard = {
    COURSE_BLOCKS: COURSE_BLOCKS,
    render: renderStudentDashboard,
    renderGroupProgress: renderGroupProgress,
    loadWeekXp: loadWeekXp,
  };
})(typeof window !== "undefined" ? window : globalThis);
