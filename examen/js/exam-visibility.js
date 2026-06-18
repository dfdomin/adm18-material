// ══════════════════════════════════════════════════════════════
//  ADM18 · Examen Parcial 1 — Detección de cambio de ventana
//  Solo penaliza si el estudiante estuvo fuera >10 segundos.
// ══════════════════════════════════════════════════════════════

var ExamVisibility = (function () {
  var isActive = false;
  var overlay = null;
  var hiddenAt = null;       // timestamp when window was hidden
  var PENALTY_THRESHOLD = 10000; // 10 segundos en milisegundos
  var lastPenaltyTime = 0;
  var MIN_PENALTY_INTERVAL = 5000; // evitar doble penalización rápida

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

  // ── Calcular tiempo fuera y penalizar si >10s ──────────────
  function handleBecameVisible() {
    if (!isActive || hiddenAt === null) return;
    if (!ExamEngine || ExamEngine.isFinished()) {
      hiddenAt = null;
      return;
    }

    var elapsed = Date.now() - hiddenAt;
    hiddenAt = null;

    var now = Date.now();

    if (elapsed >= PENALTY_THRESHOLD) {
      // Solo penalizar si ha pasado suficiente tiempo desde la última penalización
      if (now - lastPenaltyTime >= MIN_PENALTY_INTERVAL) {
        lastPenaltyTime = now;
        var seconds = Math.floor(elapsed / 1000);
        ExamEngine.recordVisibilityEvent('penalty', seconds).then(function (result) {
          if (result && result.ok && result.penalty_applied) {
            updateTabCounter();
          }
        });
      }
    }
    // Si fue menos de 10s, no hay penalización
  }

  // ── Evento de visibilidad ──────────────────────────────────
  function handleVisibilityChange() {
    if (!isActive) return;
    if (!ExamEngine || ExamEngine.isFinished()) return;

    if (document.hidden) {
      // El estudiante abandonó la ventana → guardar timestamp
      hiddenAt = Date.now();
    } else {
      // El estudiante volvió → calcular tiempo fuera
      handleBecameVisible();
    }
  }

  // ── Evento de blur (pérdida de foco) ───────────────────────
  function handleBlur() {
    if (!isActive) return;
    if (!ExamEngine || ExamEngine.isFinished()) return;

    // blur sin visibilitychange → marcar tiempo
    if (hiddenAt === null) {
      hiddenAt = Date.now();
    }
  }

  // ── Evento de focus (recuperación de foco) ─────────────────
  function handleFocus() {
    if (!isActive) return;
    if (!ExamEngine || ExamEngine.isFinished()) return;

    if (hiddenAt !== null) {
      handleBecameVisible();
    }
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
      penaltyEl.textContent = '(−' + penalty.toFixed(1) + ' pts)';
    }
  }

  // ── Iniciar monitoreo ──────────────────────────────────────
  function start() {
    if (isActive) return;
    isActive = true;
    hiddenAt = null;

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleBlur);
    window.addEventListener('focus', handleFocus);
  }

  // ── Detener monitoreo ──────────────────────────────────────
  function stop() {
    isActive = false;
    hiddenAt = null;

    document.removeEventListener('visibilitychange', handleVisibilityChange);
    window.removeEventListener('blur', handleBlur);
    window.removeEventListener('focus', handleFocus);
    hideOverlay();
  }

  return {
    start: start,
    stop: stop,
    showReconnecting: showReconnecting,
    hideOverlay: hideOverlay
  };
})();