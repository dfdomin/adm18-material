(function (global) {
  "use strict";

  var COLORS = ["#FFDF2D", "#1E2843", "#2e7d32", "#c62828", "#1565c0", "#6a1b9a", "#ff6f00"];

  function launch(options) {
    options = options || {};
    var msg = options.message || "¡Actividad completada!";
    var root = document.getElementById("iub-celebration-root");
    if (!root) {
      root = document.createElement("div");
      root.id = "iub-celebration-root";
      root.style.cssText = "position:fixed;inset:0;pointer-events:none;z-index:99999;overflow:hidden;";
      document.body.appendChild(root);
    }
    root.innerHTML = "";

    var banner = document.createElement("div");
    banner.textContent = msg;
    banner.style.cssText = [
      "position:absolute;top:18%;left:50%;transform:translateX(-50%)",
      "background:linear-gradient(135deg,#1E2843,#2d3a5e);color:#FFDF2D",
      "padding:1rem 1.6rem;border-radius:16px;font-weight:800;font-size:clamp(1rem,3vw,1.35rem)",
      "font-family:'Open Sans',Arial,sans-serif;box-shadow:0 8px 32px rgba(0,0,0,.35)",
      "animation:iubPop .6s ease;white-space:nowrap;max-width:92vw;text-align:center",
    ].join(";");
    root.appendChild(banner);

    if (!document.getElementById("iub-celebration-style")) {
      var style = document.createElement("style");
      style.id = "iub-celebration-style";
      style.textContent = [
        "@keyframes iubPop{0%{transform:translateX(-50%) scale(.6);opacity:0}",
        "70%{transform:translateX(-50%) scale(1.05);opacity:1}",
        "100%{transform:translateX(-50%) scale(1);opacity:1}}",
        "@keyframes iubFall{to{transform:translateY(110vh) rotate(720deg);opacity:0}}",
      ].join("");
      document.head.appendChild(style);
    }

    for (var i = 0; i < 48; i += 1) {
      var b = document.createElement("div");
      var size = 8 + Math.random() * 14;
      b.style.cssText = [
        "position:absolute;width:" + size + "px;height:" + (size * 1.25) + "px",
        "left:" + (Math.random() * 100) + "vw;top:" + (-10 - Math.random() * 20) + "vh",
        "background:" + COLORS[i % COLORS.length],
        "border-radius:" + (Math.random() > 0.5 ? "50% 50% 50% 0" : "50%"),
        "opacity:.9;animation:iubFall " + (3 + Math.random() * 2) + "s linear " + (Math.random() * 0.8) + "s forwards",
      ].join(";");
      root.appendChild(b);
    }

    setTimeout(function () {
      if (root.parentNode) root.parentNode.removeChild(root);
    }, 5500);
  }

  global.IUBCelebrate = { launch: launch };

  document.addEventListener("iub:activity-complete", function (ev) {
    launch(ev.detail || {});
  });
})(typeof window !== "undefined" ? window : globalThis);
