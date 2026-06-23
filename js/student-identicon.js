// ══════════════════════════════════════════════════════════════
//  Student Identicon · TGA · Identidad visual única por estudiante
//  Genera un patrón 5×5 determinístico desde la cédula.
//  El pixel firma (esquina inferior derecha) usa una clave
//  secreta conocida solo por el docente para verificar capturas.
// ══════════════════════════════════════════════════════════════

(function () {
  "use strict";

  // ── CONFIG: solo el docente conoce SECRET ──────────────
  var SECRET = "bajogrande";

  // 4 colores base para el grid (2 bits por celda)
  var PALETTE = [
    "#1E2843", // navy
    "#2d3a5e", // light navy
    "#FFDF2D", // gold
    "#2e7d32", // green
  ];

  // 8 colores para el pixel-firma (3 bits)
  var FIRMA_COLORS = [
    { hex: "#c62828", name: "ROJO" },
    { hex: "#1565c0", name: "AZUL" },
    { hex: "#2e7d32", name: "VERDE" },
    { hex: "#f9a825", name: "AMARILLO" },
    { hex: "#6a1b9a", name: "MORADO" },
    { hex: "#e65100", name: "NARANJA" },
    { hex: "#00838f", name: "CIAN" },
    { hex: "#ad1457", name: "ROSA" },
  ];

  // ── FNV-1a 32-bit (rápido, determinístico, sin dependencias) ──
  function fnv32(str) {
    var hash = 0x811c9dc5;
    for (var i = 0; i < str.length; i++) {
      hash ^= str.charCodeAt(i);
      hash = Math.imul(hash, 0x01000193);
    }
    return hash >>> 0;
  }

  // ── Extraer bits de un entero ──────────────────────────
  function getBits(val, offset, bits) {
    return (val >>> offset) & ((1 << bits) - 1);
  }

  // ── Generar SVG del identicon ──────────────────────────
  //   Grid 5×5 con espejo horizontal (como GitHub).
  //   Celda (4,4) = pixel-firma.
  //   Retorna string SVG.
  window.renderIdenticonSVG = function (cedula) {
    cedula = String(cedula || "unknown");
    var hash = fnv32(cedula);
    var firmaHash = fnv32(cedula + SECRET);

    var SIZE = 5;
    var CELL = 8;
    var PAD = 2;
    var R = 1.5; // border-radius del rect
    var TOTAL = SIZE * CELL + PAD * 2;

    var svg =
      '<svg width="' +
      TOTAL +
      '" height="' +
      TOTAL +
      '" viewBox="0 0 ' +
      TOTAL +
      " " +
      TOTAL +
      '" xmlns="http://www.w3.org/2000/svg">';

    // Columnas únicas: 0,1,2 (se espejan a 4,3)
    var UNIQUE_COLS = 3;
    var bitOffset = 0;

    for (var row = 0; row < SIZE; row++) {
      for (var col = 0; col < SIZE; col++) {
        // Espejo horizontal
        var actualCol = col >= UNIQUE_COLS ? SIZE - 1 - col : col;
        var isFirma = row === SIZE - 1 && col === SIZE - 1;

        var fill;
        if (isFirma) {
          var fi = getBits(firmaHash, 0, 3);
          fill = FIRMA_COLORS[fi % FIRMA_COLORS.length].hex;
        } else {
          var idx = row * UNIQUE_COLS + actualCol;
          var ci = getBits(hash, (idx * 2) % 30, 2);
          fill = PALETTE[ci % PALETTE.length];
        }

        var x = PAD + col * CELL;
        var y = PAD + row * CELL;
        svg +=
          '<rect x="' +
          x +
          '" y="' +
          y +
          '" width="' +
          CELL +
          '" height="' +
          CELL +
          '" rx="' +
          R +
          '" fill="' +
          fill +
          '"/>';
      }
    }

    svg += "</svg>";
    return svg;
  };

  // ── Renderizar identicon en un contenedor ──────────────
  window.renderIdenticon = function (cedula, container) {
    if (!container) return;
    container.innerHTML = renderIdenticonSVG(cedula);
  };

  // ── Obtener color del pixel-firma (para verificación) ──
  window.getIdenticonFirmaHex = function (cedula) {
    if (!cedula) return null;
    var h = fnv32(String(cedula) + SECRET);
    return FIRMA_COLORS[h % FIRMA_COLORS.length].hex;
  };

  window.getIdenticonFirmaName = function (cedula) {
    if (!cedula) return null;
    var h = fnv32(String(cedula) + SECRET);
    return FIRMA_COLORS[h % FIRMA_COLORS.length].name;
  };

  // ── Código de verificación visible ────────────────────
  //   Retorna un código corto tipo "A3F" derivado de cédula + SECRET.
  //   Solo el docente puede verificar que el código es correcto.
  window.getIdenticonCode = function (cedula) {
    if (!cedula) return "???";
    var h = fnv32(String(cedula) + SECRET);
    // Tomar 3 bytes → 6 hex chars, mostrar solo 3 para brevedad
    var b1 = (h >>> 0) & 0xFF;
    var b2 = (h >>> 8) & 0xFF;
    var b3 = (h >>> 16) & 0xFF;
    var code = ((b1 ^ b2 ^ b3) % 4096).toString(16).toUpperCase().padStart(3, "0");
    return code;
  };

  // ── Helper: crear un elemento identicon completo ───────
  //   Retorna un <span> con SVG + nombre + firma (opcional)
  //   Uso: document.getElementById('x').appendChild(makeIdenticon(cedula, nombre))
  window.makeIdenticon = function (cedula, nombre, showFirma) {
    var span = document.createElement("span");
    span.className = "identicon-block";
    span.style.cssText =
      "display:inline-flex;align-items:center;gap:5px;white-space:nowrap;";

    var svgContainer = document.createElement("span");
    svgContainer.style.cssText =
      "display:inline-block;vertical-align:middle;flex-shrink:0;";
    renderIdenticon(cedula, svgContainer);

    var nameSpan = document.createElement("span");
    nameSpan.className = "identicon-name";
    nameSpan.style.cssText =
      "font-weight:600;font-size:.85rem;color:#1E2843;vertical-align:middle;";
    nameSpan.textContent = nombre || "—";

    span.appendChild(svgContainer);
    span.appendChild(nameSpan);

    if (showFirma) {
      var firma = document.createElement("span");
      firma.className = "identicon-firma";
      firma.style.cssText =
        "font-size:.6rem;color:#546e7a;margin-left:2px;opacity:.5;";
      firma.textContent = "◇"; // marcador sutil
      firma.title =
        "Pixel-firma: " + (window.getIdenticonFirmaName(cedula) || "?");
      span.appendChild(firma);
    }

    return span;
  };
})();
