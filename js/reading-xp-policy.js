(function (global) {
  "use strict";

  /**
   * Política IUB — XP por lectura (tiempo de permanencia en pantalla).
   * Referencia: setup/LECTURA-XP-IUB.md
   * ~51 XP lectura ≈ 40–51 % del cupo semanal de 100 (participación formativa).
   */
  var CATALOG_TGA = [
    { id: "mision", label: "📋 Memorando", segundos: 20, xp: 5 },
    { id: "teoria", label: "📚 Marco teórico", segundos: 60, xp: 15 },
    { id: "python", label: "🐍 Python / Colab", segundos: 40, xp: 10 },
    { id: "actividad", label: "⚙️ Actividades", segundos: 30, xp: 8 },
    { id: "interactivo", label: "🧪 Interactivo", segundos: 30, xp: 8 },
    { id: "quiz", label: "🎮 Quiz (lectura previa)", segundos: 20, xp: 5 },
  ];

  var CATALOG_ADM18 = [
    { id: "mision", label: "📋 Memorando", segundos: 20, xp: 5 },
    { id: "contenido", label: "📚 Contenido", segundos: 60, xp: 15 },
    { id: "actividades", label: "⚙️ Actividades", segundos: 30, xp: 8 },
    { id: "bibliografia", label: "📖 Bibliografía", segundos: 20, xp: 5 },
  ];

  var MAX_READING_XP = 51;
  var READING_NOTE_PCT = "40–51 %";

  function detectCatalog() {
    if (document.getElementById("teoria")) return CATALOG_TGA;
    if (document.getElementById("contenido")) return CATALOG_ADM18;
    return CATALOG_TGA.concat(CATALOG_ADM18);
  }

  function detectSections() {
    var seen = {};
    return detectCatalog().filter(function (sec) {
      if (seen[sec.id] || !document.getElementById(sec.id)) return false;
      seen[sec.id] = true;
      return true;
    });
  }

  function readingTotal(sections) {
    return sections.reduce(function (sum, s) { return sum + s.xp; }, 0);
  }

  function parseSemana() {
    var m = (global.location && global.location.pathname || "").match(/semana[-_]?0?(\d+)/i);
    return m ? parseInt(m[1], 10) : 1;
  }

  function hasEmbeddedTracker() {
    return !!document.getElementById("reading-tracker-js");
  }

  function injectNotice() {
    if (document.getElementById("iub-reading-notice")) return;
    var sections = detectSections();
    if (!sections.length) return;

    var total = readingTotal(sections);
    var host = document.querySelector("main") || document.querySelector(".container") || document.body;
    var firstCard = host.querySelector(".card, section.card");
    var box = document.createElement("aside");
    box.id = "iub-reading-notice";
    box.setAttribute("role", "note");
    box.style.cssText =
      "margin:1rem 0 1.25rem;padding:1rem 1.1rem;border-radius:12px;"
      + "background:linear-gradient(135deg,#e3f2fd,#f3e5f5);border:1px solid #90caf9;"
      + "font-size:.88rem;line-height:1.45;color:#1a237e;";

    var rows = sections.map(function (s) {
      return "<tr><td>" + s.label + "</td><td>" + s.segundos + " s</td><td><strong>+" + s.xp + " XP</strong></td></tr>";
    }).join("");

    box.innerHTML =
      "<p style=\"margin:0 0 .5rem;font-weight:700;font-size:.95rem\">📖 Puntos por lectura (cuentan para la nota formativa)</p>"
      + "<p style=\"margin:0 0 .6rem;color:#37474f\">"
      + "Ganas XP al <strong>leer cada sección con calma</strong>: la página detecta cuánto tiempo la tienes visible "
      + "(pestaña activa). La lectura aporta hasta <strong>" + total + " XP</strong> esta semana "
      + "(≈ " + READING_NOTE_PCT + " del cupo de participación; el resto viene del quiz y actividades)."
      + "</p>"
      + "<table style=\"width:100%;border-collapse:collapse;font-size:.82rem\">"
      + "<thead><tr style=\"text-align:left;border-bottom:1px solid #90caf9\">"
      + "<th>Sección</th><th>Tiempo mín.</th><th>XP</th></tr></thead><tbody>" + rows + "</tbody>"
      + "<tfoot><tr style=\"border-top:1px solid #90caf9;font-weight:700\">"
      + "<td colspan=\"2\">Total lectura</td><td>+" + total + " XP</td></tr></tfoot></table>"
      + "<p style=\"margin:.55rem 0 0;font-size:.78rem;color:#546e7a\">"
      + "Referencia pedagógica: 1 página ≈ 1 XP (Level Up Classroom); aquí usamos tiempo por sección "
      + "para evitar “farmear” sin leer. Complementa el 40 % formativo del corte académico."
      + "</p>";

    if (firstCard && firstCard.parentNode) {
      firstCard.parentNode.insertBefore(box, firstCard);
    } else {
      host.insertBefore(box, host.firstChild);
    }
  }

  function bootTracker() {
    if (hasEmbeddedTracker() || !global.IUBReadingTracker) return;
    var sections = detectSections();
    if (!sections.length) return;
    IUBReadingTracker.init({ semana: parseSemana(), sections: sections });
  }

  function boot() {
    injectNotice();
    bootTracker();
  }

  global.IUBReadingPolicy = {
    CATALOG_TGA: CATALOG_TGA,
    CATALOG_ADM18: CATALOG_ADM18,
    MAX_READING_XP: MAX_READING_XP,
    detectSections: detectSections,
    injectNotice: injectNotice,
    bootTracker: bootTracker,
    boot: boot,
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})(typeof window !== "undefined" ? window : globalThis);
