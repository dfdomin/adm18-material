// ══════════════════════════════════════════════════════════════
//  ADM18 · Examen Parcial 1 — Motor (100% Supabase, sin localStorage)
// ══════════════════════════════════════════════════════════════

var ExamEngine = (function () {
  var db;           // Supabase client
  var attemptId;    // UUID del intento actual
  var questions;    // Array de 12 preguntas seleccionadas
  var currentStep;  // 1-12
  var tabSwitches;  // Contador de cambios de ventana
  var studentName;  // Nombre del estudiante
  var studentCc;    // Cédula del estudiante
  var isFinished;   // true cuando termina el examen
  var retryTimer;   // Timer para reconexión
  var isSubmitting; // Lock para evitar doble envío

  // ── Inicializar Supabase ──────────────────────────────────
  async function initSupabase() {
    if (db) return;
    var C = window.EXAM_CONFIG;
    if (typeof supabase !== 'undefined' && supabase.createClient) {
      db = supabase.createClient(C.SUPABASE_URL, C.SUPABASE_KEY);
    } else {
      throw new Error('Librería Supabase no cargada');
    }
  }

  // ── RPC helper ─────────────────────────────────────────────
  async function rpc(fnName, params) {
    await initSupabase();
    var C = window.EXAM_CONFIG;
    var url = C.SUPABASE_URL + '/rest/v1/rpc/' + fnName;
    var resp = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': C.SUPABASE_KEY,
        'Authorization': 'Bearer ' + C.SUPABASE_KEY,
        'Prefer': 'return=representation'
      },
      body: JSON.stringify(params)
    });
    if (!resp.ok) {
      var errBody = await resp.text();
      throw new Error('RPC ' + fnName + ' failed: ' + resp.status + ' ' + errBody);
    }
    return await resp.json();
  }

  // ── Buscar estudiante por cédula ───────────────────────────
  async function lookupStudent(cc) {
    var result = await rpc('lookup_student_by_cc', { p_cc: cc });
    if (!result.ok) {
      throw new Error(result.error || 'Estudiante no encontrado');
    }
    return result;
  }

  // ── Iniciar o retomar examen ────────────────────────────────
  async function startExam(cc) {
    studentCc = cc;
    var result = await rpc('start_exam', {
      p_cc: cc,
      p_offering_code: window.EXAM_CONFIG.OFFERING_CODE,
      p_exam_type: window.EXAM_CONFIG.EXAM_TYPE
    });

    if (!result.ok) {
      throw new Error(result.error || 'No se pudo iniciar el examen');
    }

    attemptId = result.attempt_id;
    studentName = result.student_name;
    questions = result.questions || [];
    currentStep = result.current_step || 1;
    tabSwitches = result.tab_switches || 0;
    isFinished = false;
    isSubmitting = false;

    return result;
  }

  // ── Guardar respuesta ──────────────────────────────────────
  async function saveAnswer(stepNumber, selectedOption, questionId) {
    if (isSubmitting) return null;
    isSubmitting = true;

    try {
      var result = await rpc('save_exam_answer', {
        p_attempt_id: attemptId,
        p_step_number: stepNumber,
        p_selected_option: selectedOption,
        p_question_id: questionId
      });

      if (result.ok) {
        currentStep = result.current_step || stepNumber;
      }
      return result;
    } finally {
      isSubmitting = false;
    }
  }

  // ── Registrar cambio de ventana ─────────────────────────────
  async function recordVisibilityEvent(eventType, durationSeconds) {
    if (isFinished) return null;

    try {
      var result = await rpc('record_visibility_event', {
        p_attempt_id: attemptId,
        p_event_type: eventType,
        p_duration_seconds: durationSeconds || 0
      });

      if (result.ok) {
        tabSwitches = result.tab_switches;
      }
      return result;
    } catch (e) {
      console.error('[ADM18-EXAM] Error registrando visibility event:', e);
      return null;
    }
  }

  // ── Finalizar examen ───────────────────────────────────────
  async function finishExam() {
    var result = await rpc('finish_exam', {
      p_attempt_id: attemptId
    });

    if (result.ok) {
      isFinished = true;
    }
    return result;
  }

  // ── Obtener estado actual ──────────────────────────────────
  async function getExamState() {
    var result = await rpc('get_exam_state', {
      p_attempt_id: attemptId
    });
    if (result.ok) {
      questions = result.questions || [];
      currentStep = result.current_step || 1;
      tabSwitches = result.tab_switches || 0;
      isFinished = (result.status === 'finished');
    }
    return result;
  }

  // ── Reconexión con backoff ─────────────────────────────────
  async function retryWithBackoff(fn, maxAttempts, baseDelay) {
    maxAttempts = maxAttempts || 10;
    baseDelay = baseDelay || 3000;

    for (var i = 0; i < maxAttempts; i++) {
      try {
        return await fn();
      } catch (e) {
        var delay = Math.min(baseDelay * Math.pow(2, i), 30000);
        console.warn('[ADM18-EXAM] Reintento ' + (i + 1) + ' en ' + delay + 'ms');
        await new Promise(function (r) { setTimeout(r, delay); });
      }
    }
    throw new Error('No se pudo reconectar después de ' + maxAttempts + ' intentos');
  }

  // ── Obtener configuración del examen ──────────────────────
  async function getExamConfig() {
    return await rpc('get_exam_config', {});
  }

  // ── Public API ─────────────────────────────────────────────
  return {
    startExam: startExam,
    saveAnswer: saveAnswer,
    recordVisibilityEvent: recordVisibilityEvent,
    finishExam: finishExam,
    getExamState: getExamState,
    lookupStudent: lookupStudent,
    retryWithBackoff: retryWithBackoff,
    getExamConfig: getExamConfig,
    rpc: rpc,
    getAttemptId: function () { return attemptId; },
    getQuestions: function () { return questions; },
    getCurrentStep: function () { return currentStep; },
    getTabSwitches: function () { return tabSwitches; },
    getStudentName: function () { return studentName; },
    isFinished: function () { return isFinished; }
  };
})();