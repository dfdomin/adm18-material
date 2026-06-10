(function (global) {
  "use strict";

  var STYLE_ID = "iub-academic-status-bar-style";
  var BAR_ID = "iub-academic-status-bar";

  function injectStyles() {
    if (document.getElementById(STYLE_ID)) return;
    var style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = [
      "body.iub-has-status-bar { padding-top: 46px !important; }",
      "#" + BAR_ID + " {",
      "  position:fixed;top:0;left:0;right:0;z-index:99990;",
      "  background:linear-gradient(90deg,#1E2843 0%,#2d3a5e 100%);",
      "  color:#fff;font-family:'Open Sans',Arial,sans-serif;font-size:.72rem;",
      "  display:flex;align-items:center;justify-content:center;flex-wrap:wrap;gap:.45rem 1rem;",
      "  padding:.45rem .75rem;border-bottom:2px solid #FFDF2D;",
      "  box-shadow:0 2px 12px rgba(0,0,0,.2);",
      "}",
      "#" + BAR_ID + " a { color:#FFDF2D;font-weight:800;text-decoration:none; }",
      "#" + BAR_ID + " .iub-weight-chip { background:rgba(255,255,255,.12);padding:.15rem .55rem;border-radius:999px; }",
      "#" + BAR_ID + " .iub-weight-chip strong { color:#FFDF2D; }",
      "#" + BAR_ID + " .iub-att-chip { padding:.15rem .55rem;border-radius:999px;font-weight:700; }",
      "#" + BAR_ID + " .iub-att-chip.ok { background:rgba(46,125,50,.35); }",
      "#" + BAR_ID + " .iub-att-chip.risk { background:rgba(230,81,0,.45); }",
      "#" + BAR_ID + " .iub-att-chip.lost { background:rgba(198,40,40,.55);animation:iubPulse 1.2s infinite; }",
      "#" + BAR_ID + " .iub-mini-bar { width:90px;height:6px;background:rgba(255,255,255,.2);border-radius:999px;overflow:hidden;display:inline-block;vertical-align:middle;margin:0 .25rem; }",
      "#" + BAR_ID + " .iub-mini-bar > span { display:block;height:100%;border-radius:999px; }",
      "@keyframes iubPulse { 0%,100%{opacity:1} 50%{opacity:.75} }",
      ".iub-attendance-panel { border:1px solid #DEDFE4;border-radius:12px;padding:1rem;margin-bottom:1rem;background:#fff; }",
      ".iub-attendance-panel.lost { border-color:#ef9a9a;background:#ffebee; }",
      ".iub-attendance-panel.risk { border-color:#ffb74d;background:#fff8e1; }",
      ".iub-attendance-panel.ok { border-color:#a5d6a7;background:#f7fff8; }",
      ".iub-attendance-panel h3 { color:#1E2843;font-size:1rem;margin-bottom:.5rem; }",
      ".iub-attendance-stats { display:flex;flex-wrap:wrap;gap:.75rem 1.2rem;font-size:.85rem;margin:.6rem 0;color:#546e7a; }",
      ".iub-attendance-stats strong { color:#1E2843; }",
      ".iub-attendance-msg { font-size:.88rem;font-weight:700;margin-top:.4rem; }",
      ".iub-attendance-legend { font-size:.75rem;color:#546e7a;margin-top:.35rem; }",
      ".iub-bar { height:12px;background:#E9EAED;border-radius:999px;overflow:hidden;margin:.5rem 0; }",
      ".iub-bar-fill { height:100%;border-radius:999px;transition:width .4s; }",
      ".iub-eval-panel h3 { color:#1E2843;margin-bottom:.6rem; }",
      ".iub-weight-row { display:flex;flex-wrap:wrap;gap:.5rem;margin-bottom:.6rem; }",
      ".iub-weight-chip { background:#f4f6fa;border:1px solid #DEDFE4;border-radius:999px;padding:.35rem .75rem;font-size:.82rem; }",
      ".iub-eval-list { margin:.5rem 0 0 1.1rem;color:#546e7a;font-size:.88rem;line-height:1.7; }",
      ".iub-eval-note { font-size:.8rem;color:#546e7a;margin-top:.5rem; }",
    ].join("\n");
    document.head.appendChild(style);
  }

  async function renderBar() {
    if (!global.IUBAcademicRules) return;
    injectStyles();
    var existing = document.getElementById(BAR_ID);
    if (!existing) {
      existing = document.createElement("div");
      existing.id = BAR_ID;
      existing.setAttribute("role", "status");
      document.body.insertBefore(existing, document.body.firstChild);
      document.body.classList.add("iub-has-status-bar");
    }

    var summary = await IUBAcademicRules.getStudentAttendanceSummary();
    var r = summary.rules;
    var dashLink = "../dashboard/index.html";
    if (/\/dashboard\//.test(location.pathname)) dashLink = "index.html";
    if (/\/semana/.test(location.pathname)) dashLink = "../dashboard/index.html";

    if (summary.profileRequired || summary.status === "unknown") {
      existing.innerHTML =
        IUBAcademicRules.gradeWeightsHtml() +
        '<span class="iub-att-chip">ℹ️ Sin perfil · configura tu cédula en la semana para ver asistencia</span>' +
        '<a href="' + dashLink + '">Ver dashboard</a>';
      return;
    }

    var barColor = summary.status === "lost" ? "#c62828" : summary.status === "risk" ? "#e65100" : "#2e7d32";
    var lossPct = r.maxAbsenceHours ? Math.min(100, Math.round((summary.hoursLost / r.maxAbsenceHours) * 100)) : 0;
    var statusLabel = summary.status === "lost"
      ? "🔴 Módulo perdido · " + summary.hoursLost + "/" + r.maxAbsenceHours + " h perdidas"
      : summary.status === "risk"
        ? "🟠 Riesgo · " + summary.hoursLost + "/" + r.maxAbsenceHours + " h perdidas"
        : "🟢 Asistencia OK · " + summary.hoursLost + "/" + r.maxAbsenceHours + " h perdidas";

    existing.innerHTML =
      IUBAcademicRules.gradeWeightsHtml() +
      '<span class="iub-att-chip ' + summary.status + '">' +
      statusLabel +
      " · Asistidas " + summary.hoursAttended + "/" + r.totalHours + " h" +
      ' <span class="iub-mini-bar" title="Horas perdidas ' + summary.hoursLost + '/' + r.maxAbsenceHours + ' h (límite reglamentario)">' +
      '<span style="width:' + lossPct + "%;background:" + barColor + '"></span></span>' +
      "</span>" +
      '<a href="' + dashLink + '">Ver dashboard</a>';
  }

  function init() {
    renderBar();
    window.addEventListener("storage", function () { renderBar(); });
    document.addEventListener("iub:attendance-updated", function () { renderBar(); });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  global.IUBAcademicStatusBar = { render: renderBar, init: init };
})(typeof window !== "undefined" ? window : globalThis);
