// ══════════════════════════════════════════════════════════════
//  ADM18 · Examen Parcial 1 — UI (mobile-first, 100% Supabase)
//  v2: nombre estudiante arriba/abajo, promedio intentos, máx 3
// ══════════════════════════════════════════════════════════════

var ExamUI = (function () {
  var C = null; // EXAM_CONFIG, set on init
  var screen = 'login'; // login | disclaimer | exam | results
  var selectedOption = null;
  var correctCount = 0;
  var answers = {}; // step -> { selected, isCorrect, correctOption }

  // ── Helpers ────────────────────────────────────────────────
  function $(sel) { return document.querySelector(sel); }
  function $$(sel) { return document.querySelectorAll(sel); }

  function formatScore(score) {
    return Number(score).toFixed(2);
  }

  function categoryLabel(code) {
    var labels = {
      '1.1': 'Atención selectiva',
      '1.2': 'Memoria de trabajo',
      '1.3': 'Comprensión vs. Recordar',
      '1.4': 'Documentos como memoria externa',
      '3.1': 'Clases documentales',
      '3.2': 'Anatomía del documento',
      '3.3': 'Función de componentes',
      '3.4': 'Matriz doc-función-decisión',
      '4.1': 'Los 10 criterios GTC 185',
      '4.2': 'Errores documentales',
      '4.3': 'Lista de verificación como aseguramiento',
      '4.4': 'Costo del error documental'
    };
    return labels[code] || code;
  }

  function weekLabel(w) {
    var wLabels = {
      1: 'Semana 1',
      3: 'Semana 3',
      4: 'Semana 4'
    };
    return wLabels[w] || 'Semana ' + w;
  }

  // ── LOGIN SCREEN ───────────────────────────────────────────
  function renderLogin() {
    var app = $('#exam-app');
    app.innerHTML = [
      '<div class="exam-card">',
      '  <div class="exam-logo">📋</div>',
      '  <h1 class="exam-title">Examen Parcial 1</h1>',
      '  <p class="exam-subtitle">ADM18 · Procesamiento de la Información</p>',
      '  <p class="exam-weeks">Semanas 1, 3 y 4</p>',
      '',
      '  <div class="exam-form">',
      '    <label for="exam-cc">Número de identificación (cédula)</label>',
      '    <input type="text" id="exam-cc" inputmode="numeric" placeholder="Ej: 1001234567"',
      '           autocomplete="off" autocorrect="off" autocapitalize="off">',
      '    <div id="exam-cc-error" class="exam-error" style="display:none"></div>',
      '    <button id="exam-login-btn" class="exam-btn exam-btn-primary">Ingresar</button>',
      '  </div>',
      '</div>'
    ].join('\n');

    setTimeout(function () { $('#exam-cc').focus(); }, 300);

    $('#exam-login-btn').addEventListener('click', handleLogin);
    $('#exam-cc').addEventListener('keydown', function (e) {
      if (e.key === 'Enter') handleLogin();
    });
  }

  async function handleLogin() {
    var cc = ($('#exam-cc').value || '').trim();
    var errorEl = $('#exam-cc-error');
    var btn = $('#exam-login-btn');

    if (!cc) {
      errorEl.textContent = 'Ingresa tu número de identificación';
      errorEl.style.display = 'block';
      return;
    }

    btn.disabled = true;
    btn.textContent = 'Verificando...';
    errorEl.style.display = 'none';

    try {
      var result = await ExamEngine.lookupStudent(cc);
      ExamEngine._studentCc = cc;

      // Show disclaimer
      setTimeout(function () { renderDisclaimer(cc, result.name); }, 500);
    } catch (e) {
      errorEl.textContent = e.message || 'Cédula no encontrada. Verifica e intenta de nuevo.';
      errorEl.style.display = 'block';
      btn.disabled = false;
      btn.textContent = 'Ingresar';
    }
  }

  // ── DISCLAIMER SCREEN ──────────────────────────────────────
  function renderDisclaimer(cc, name) {
    var app = $('#exam-app');

    // Check if student has previous attempts by trying to get exam state
    var avgNoteHtml = '';
    var avgScore = 0;

    app.innerHTML = [
      '<div class="exam-card">',
      '  <div class="exam-student-header">',
      '    <span class="exam-student-avatar">👤</span>',
      '    <span class="exam-student-name-label"><strong>' + name + '</strong></span>',
      '  </div>',
      '',
      '  <h2 class="exam-disclaimer-title">⚠️ Antes de comenzar</h2>',
      '',
      '  <div class="exam-disclaimer-box">',
      '    <ol class="exam-disclaimer-list">',
      '      <li>Este examen se toma <strong>exclusivamente en celular</strong>.</li>',
      '      <li>Tienes <strong>12 preguntas</strong> (1 por cada categoría de las semanas 1, 3 y 4).</li>',
      '      <li>Dispones de <strong>máximo 3 intentos</strong>. La <strong>nota definitiva</strong> será el promedio de todos tus intentos.</li>',
      '      <li>Si cambias de ventana por más de <strong>10 segundos</strong> se descontarán <strong>-0.5 puntos</strong> por cada vez.</li>',
      '      <li>La nota final se calcula así:',
      '        <div class="exam-formula">(correctas / 12 × 5.0) − (cambios de ventana × 0.5)</div>',
      '        <div class="exam-formula-note">Mínimo 0.0. Solo cuenta si estás fuera >10s.</div>',
      '      </li>',
      '      <li>Cada respuesta se <strong>guarda inmediatamente</strong>. Si pierdes conexión, tu progreso está seguro en el servidor.</li>',
      '      <li>Una vez finalizado el intento, no puedes volver a modificarlo.</li>',
      '    </ol>',
      '  </div>',
      '',
      '  <div id="exam-avg-score" class="exam-avg-score" style="display:none"></div>',
      '',
      '  <button id="exam-start-btn" class="exam-btn exam-btn-primary">Entendido, comenzar examen</button>',
      '</div>'
    ].join('\n');

    $('#exam-start-btn').addEventListener('click', function () {
      startAndRender(cc);
    });
  }

  // ── START EXAM ─────────────────────────────────────────────
  async function startAndRender(cc) {
    var btn = $('#exam-start-btn');
    btn.disabled = true;
    btn.textContent = 'Cargando examen...';

    try {
      var result = await ExamEngine.startExam(cc);

      if (!result.ok) {
        if (result.error === 'max_attempts_reached') {
          renderMaxAttempts(result);
          return;
        }
        throw new Error(result.error || 'No se pudo iniciar el examen');
      }

      // Show average score if there are previous attempts
      if (result.previous_attempts > 0) {
        var avgEl = document.getElementById('exam-avg-score');
        if (avgEl) {
          avgEl.style.display = 'block';
          avgEl.innerHTML = '📊 <strong>Nota promedio de intentos anteriores:</strong> ' + formatScore(result.average_score) + ' / 5.0';
        }
      }

      if (result.resumed) {
        var resume = confirm(
          'Tienes un examen en progreso (pregunta ' + result.current_step + '/12).\n\n¿Deseas continuar desde donde quedaste?'
        );
        if (!resume) {
          btn.disabled = false;
          btn.textContent = 'Entendido, comenzar examen';
          return;
        }
      }

      ExamVisibility.start();
      renderQuestion();
    } catch (e) {
      alert('Error: ' + e.message);
      btn.disabled = false;
      btn.textContent = 'Entendido, comenzar examen';
    }
  }

  // ── MAX ATTEMPTS REACHED ───────────────────────────────────
  function renderMaxAttempts(result) {
    var app = $('#exam-app');
    app.innerHTML = [
      '<div class="exam-card">',
      '  <div class="exam-result-emoji">⛔</div>',
      '  <h2 class="exam-result-title">Límite de intentos alcanzado</h2>',
      '  <p>Has realizado los <strong>3 intentos</strong> permitidos para este examen.</p>',
      '  <div class="exam-result-score">',
      '    <div class="exam-score-big">' + formatScore(result.average_score) + '</div>',
      '    <div class="exam-score-label">Nota definitiva (promedio de 3 intentos)</div>',
      '  </div>',
      '  <p class="exam-result-note">Tu nota definitiva ya fue registrada. No es necesario enviar capturas de pantalla.</p>',
      '</div>'
    ].join('\n');
  }

  // ── RENDER QUESTION ────────────────────────────────────────
  function renderQuestion() {
    var questions = ExamEngine.getQuestions();
    var step = ExamEngine.getCurrentStep();
    var idx = step - 1;

    if (idx >= questions.length) {
      finishAndRender();
      return;
    }

    var q = questions[idx];
    selectedOption = null;
    var isLast = (step >= C.TOTAL_QUESTIONS);
    var studentName = ExamEngine.getStudentName() || '';

    var app = $('#exam-app');
    app.innerHTML = [
      '<div class="exam-card exam-card-question">',
      '  <div class="exam-student-header">',
      '    <span class="exam-student-avatar">👤</span>',
      '    <span class="exam-student-name-label"><strong>' + studentName + '</strong></span>',
      '  </div>',
      '  <div class="exam-progress-bar">',
      '    <div class="exam-progress-fill" style="width:' + ((step / C.TOTAL_QUESTIONS) * 100) + '%"></div>',
      '  </div>',
      '  <div class="exam-question-header">',
      '    <span class="exam-step-badge">' + step + '/' + C.TOTAL_QUESTIONS + '</span>',
      '    <span class="exam-category-badge">' + categoryLabel(q.category_code) + '</span>',
      '  </div>',
      '  <p class="exam-question-text">' + q.question_text + '</p>',
      '',
      '  <div class="exam-options">',
      '    <button class="exam-option" data-option="A">',
      '      <span class="exam-option-letter">A</span>',
      '      <span class="exam-option-text">' + q.option_a + '</span>',
      '    </button>',
      '    <button class="exam-option" data-option="B">',
      '      <span class="exam-option-letter">B</span>',
      '      <span class="exam-option-text">' + q.option_b + '</span>',
      '    </button>',
      '    <button class="exam-option" data-option="C">',
      '      <span class="exam-option-letter">C</span>',
      '      <span class="exam-option-text">' + q.option_c + '</span>',
      '    </button>',
      '    <button class="exam-option" data-option="D">',
      '      <span class="exam-option-letter">D</span>',
      '      <span class="exam-option-text">' + q.option_d + '</span>',
      '    </button>',
      '  </div>',
      '',
      '  <button id="exam-next-btn" class="exam-btn exam-btn-primary" disabled>',
      '    ' + (isLast ? 'Terminar examen' : 'Siguiente pregunta →'),
      '  </button>',
      '',
      '  <div class="exam-tab-counter">',
      '    ⚠️ Ausencias >10s: <strong id="exam-switch-count">' + ExamEngine.getTabSwitches() + '</strong>',
      '    <span id="exam-penalty-display">(−' + (ExamEngine.getTabSwitches() * 0.5).toFixed(1) + ' pts)</span>',
      '  </div>',
      '</div>'
    ].join('\n');

    $$('.exam-option').forEach(function (btn) {
      btn.addEventListener('click', function () {
        $$('.exam-option').forEach(function (b) { b.classList.remove('selected'); });
        btn.classList.add('selected');
        selectedOption = btn.getAttribute('data-option');
        $('#exam-next-btn').disabled = false;
      });
    });

    $('#exam-next-btn').addEventListener('click', function () {
      if (!selectedOption) return;
      submitCurrentAnswer(q, selectedOption);
    });
  }

  // ── SUBMIT ANSWER ──────────────────────────────────────────
  async function submitCurrentAnswer(question, option) {
    var btn = $('#exam-next-btn');
    btn.disabled = true;
    btn.textContent = 'Guardando...';

    try {
      var result = await ExamEngine.retryWithBackoff(
        function () {
          return ExamEngine.saveAnswer(
            ExamEngine.getCurrentStep(),
            option,
            question.question_id
          );
        },
        5,
        3000
      );

      if (result && result.ok) {
        answers[ExamEngine.getCurrentStep()] = {
          selected: option,
          isCorrect: result.is_correct,
          correctOption: result.correct_option
        };
        if (result.is_correct) correctCount++;
        renderQuestion();
      } else {
        throw new Error(result ? result.error : 'Error desconocido');
      }
    } catch (e) {
      ExamVisibility.showReconnecting('Error de conexión. Reintentando...');
      setTimeout(function () {
        ExamVisibility.hideOverlay();
        btn.disabled = false;
        btn.textContent = 'Reintentar';
      }, 3000);
    }
  }

  // ── FINISH & SHOW RESULTS ──────────────────────────────────
  async function finishAndRender() {
    try {
      var result = await ExamEngine.finishExam();

      if (result && result.ok) {
        ExamVisibility.stop();
        renderResults(result);
      } else {
        var state = await ExamEngine.getExamState();
        ExamVisibility.stop();
        renderResultsFromState(state);
      }
    } catch (e) {
      alert('Error al finalizar: ' + e.message);
    }
  }

  function renderResults(result) {
    renderResultsInternal(
      result.correct_count,
      result.total_questions,
      result.tab_switches,
      result.raw_score,
      result.penalty,
      result.final_score
    );
  }

  function renderResultsFromState(state) {
    var correct = 0;
    (state.questions || []).forEach(function (q) {
      if (q.is_correct) correct++;
    });
    var raw = (correct / C.TOTAL_QUESTIONS) * C.MAX_SCORE;
    var penalty = state.tab_switches * C.PENALTY_PER_SWITCH;
    var finalScore = Math.max(C.MIN_SCORE, raw - penalty);
    renderResultsInternal(correct, C.TOTAL_QUESTIONS, state.tab_switches, raw.toFixed(2), penalty.toFixed(1), finalScore.toFixed(2));
  }

  function renderResultsInternal(correct, total, switches, raw, penalty, finalScore) {
    var emoji = Number(finalScore) >= 3.0 ? '✅' : (Number(finalScore) >= 2.0 ? '⚠️' : '❌');
    var studentName = ExamEngine.getStudentName() || '';
    var app = $('#exam-app');
    app.innerHTML = [
      '<div class="exam-card exam-card-results">',
      '  <div class="exam-student-header">',
      '    <span class="exam-student-avatar">👤</span>',
      '    <span class="exam-student-name-label"><strong>' + studentName + '</strong></span>',
      '  </div>',
      '  <div class="exam-result-emoji">' + emoji + '</div>',
      '  <h2 class="exam-result-title">Examen finalizado</h2>',
      '',
      '  <div class="exam-result-score">',
      '    <div class="exam-score-big">' + formatScore(finalScore) + '</div>',
      '    <div class="exam-score-label">Nota del intento (sobre 5.0)</div>',
      '  </div>',
      '',
      '  <div class="exam-result-details">',
      '    <div class="exam-result-row">',
      '      <span>' + studentName + '</span>',
      '      <strong>' + formatScore(finalScore) + '</strong>',
      '    </div>',
      '    <div class="exam-result-row">',
      '      <span>Respuestas correctas</span>',
      '      <strong>' + correct + ' / ' + total + '</strong>',
      '    </div>',
      '    <div class="exam-result-row">',
      '      <span>Puntaje bruto</span>',
      '      <strong>' + formatScore(raw) + '</strong>',
      '    </div>',
      '    <div class="exam-result-row exam-result-penalty">',
      '      <span>Descuento por ausencias >10s</span>',
      '      <strong>−' + formatScore(penalty) + '</strong>',
      '    </div>',
      '    <div class="exam-result-row exam-result-final">',
      '      <span>Nota del intento</span>',
      '      <strong>' + formatScore(finalScore) + '</strong>',
      '    </div>',
      '  </div>',
      '',
      '  <p class="exam-result-note">Este intento fue registrado. La nota definitiva será el promedio de todos tus intentos.</p>',
      '</div>'
    ].join('\n');
  }

  // ── INIT ────────────────────────────────────────────────────
  function init() {
    C = window.EXAM_CONFIG;
    if (!C) {
      document.getElementById('exam-app').innerHTML =
        '<div class="exam-card"><p class="exam-error">Error: configuración no cargada.</p></div>';
      return;
    }
    renderLogin();
  }

  return { init: init };
})();