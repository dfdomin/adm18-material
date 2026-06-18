// ══════════════════════════════════════════════════════════════
//  ADM18 · Examen Parcial 1 — Detección de cambio de ventana
//  Cada vez que el estudiante abandona la ventana del examen,
//  se registra un evento de visibilidad y se descuentan 0.5 pts.
// ══════════════════════════════════════════════════════════════

var ExamVisibility = (function () {
  var isActive = false;
  var overlay = null;
  var lastEventTime = 0;
  var MIN_INTERVAL_MS = 2000; // evitar doble registro

  // ── Crear overlay de reconexión ────────────────────────────
  function showReconnecting(message) {
    hideOverlay();
    overlay = document.createElement('div');
    overlay.className = 'exam-overlay';
    overlay.innerHTML = [
      '<div class="exam-overlay-content">',
      '  <span class="exam-spinner">⏳</span>',
      '  <p>' + (message || 'Reconectando...') + '</p>',
      '</div>'
    ].join('\n');
    document.body.appendChild(overlay);
  }

  function hideOverlay() {
    if (overlay) {
      overlay.remove();
      overlay = null;
    }
  }

  // ── Evento de cambio de visibilidad ────────────────────────
  function handleVisibilityChange() {
    if (!isActive) return;
    if (!ExamEngine || ExamEngine.isFinished()) return;

    var now = Date.now();
    if (now - lastEventTime < MIN_INTERVAL_MS) return;

    if (document.hidden) {
      // El estudiante abandonó la ventana
      lastEventTime = now;
      ExamEngine.recordVisibilityEvent('hidden').then(function (result) {
        if (result && result.ok) {
          updateTabCounter();
        }
      });
    } else {
      // El estudiante volvió a la ventana
      lastEventTime = now;
      ExamEngine.recordVisibilityEvent('visible').then(function (result) {
        if (result && result.ok) {
          updateTabCounter();
        }
      });
    }
  }

  // ── Evento de blur (pérdida de foco) ───────────────────────
  function handleBlur() {
    if (!isActive) return;
    if (!ExamEngine || ExamEngine.isFinished()) return;

    var now = Date.now();
    if (now - lastEventTime < MIN_INTERVAL_MS) return;

    lastEventTime = now;
    ExamEngine.recordVisibilityEvent('blur').then(function (result) {
      if (result && result.ok) {
        updateTabCounter();
      }
    });
  }

  // ── Actualizar contador en UI ───────────────────────────────
  function updateTabCounter() {
    var countEl = document.getElementById('exam-switch-count');
    var penaltyEl = document.getElementById('exam-penalty-display');
    if (countEl) {
      countEl.textContent = ExamEngine.getTabSwitches();
    }
    if (penaltyEl) {
      var penalty = ExamEngine.getTabSwitches() * 0.5;
      penaltyEl.textContent = ' (−' + penalty.toFixed(1) + ' pts)';
    }
  }

  // ── Iniciar monitoreo ──────────────────────────────────────
  function start() {
    if (isActive) return;
    isActive = true;

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleBlur);
  }

  // ── Detener monitoreo ──────────────────────────────────────
  function stop() {
    isActive = false;

    document.removeEventListener('visibilitychange', handleVisibilityChange);
    window.removeEventListener('blur', handleBlur);
    hideOverlay();
  }

  return {
    start: start,
    stop: stop,
    showReconnecting: showReconnecting,
    hideOverlay: hideOverlay
  };
})();