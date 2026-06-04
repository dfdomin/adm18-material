/* === ADM18 Quiz Engine ===
 * Inline quiz system for each weekly page.
 * localStorage-backed with optional Supabase sync.
 * Reference: TGA04 NeuroBiz QuizModule (reference.md §5.2)
 */
const QuizEngine = (function() {
    'use strict';

    const state = {
        questions: [],
        answers: {},
        submitted: false,
        weekNum: null
    };

    /* ── Init ── */
    function init(weekNum, questions) {
        state.weekNum = weekNum;
        state.questions = questions;
        state.answers = {};
        state.submitted = false;

        // Check if already submitted
        const existing = ADM18App.getQuizScore(weekNum);
        if (existing) {
            state.submitted = true;
            state.answers = existing.answers || {};
        }

        render();
    }

    /* ── Render ── */
    function render() {
        const container = document.getElementById('quiz-container');
        if (!container || !state.questions.length) return;

        let html = '<h3 class="card-header">Quiz de la Semana ' + state.weekNum + '</h3>';

        state.questions.forEach((q, qi) => {
            html += '<div class="quiz-question" id="q-' + qi + '">';
            html += '<p><strong>' + (qi + 1) + '. ' + escapeHtml(q.question) + '</strong></p>';
            html += '<div class="quiz-options">';
            q.options.forEach((opt, oi) => {
                const letter = String.fromCharCode(65 + oi); // A, B, C, D
                const selected = state.answers[qi] === oi;
                const correctClass = state.submitted ? (oi === q.correct ? ' correct' : (selected && oi !== q.correct ? ' incorrect' : '')) : '';
                const selectedClass = selected ? ' selected' : '';
                html += '<div class="quiz-option' + correctClass + selectedClass + '" ';
                html += 'data-q="' + qi + '" data-o="' + oi + '"';
                if (state.submitted) html += ' style="pointer-events:none"';
                html += '>';
                html += '<span style="font-weight:700;min-width:24px">' + letter + ')</span>';
                html += '<span>' + escapeHtml(opt) + '</span>';
                html += '</div>';
            });
            html += '</div>';

            // Show correct answer after submission
            if (state.submitted) {
                const correctLetter = String.fromCharCode(65 + q.correct);
                html += '<p style="color:var(--success);font-size:var(--font-size-sm);margin-top:var(--space-xs)">';
                html += 'Respuesta correcta: ' + correctLetter + ') ' + escapeHtml(q.options[q.correct]);
                html += '</p>';
            }
        });

        if (!state.submitted) {
            html += '<button class="btn btn-primary" onclick="QuizEngine.submit()" style="margin-top:var(--space-md);width:100%">';
            html += 'Enviar respuestas';
            html += '</button>';
        } else {
            const score = calculateScore();
            html += '<div class="quiz-score">';
            html += 'Puntaje: ' + score.correct + ' / ' + score.total;
            html += ' (' + Math.round((score.correct / score.total) * 100) + '%)';
            html += '</div>';
            html += '<button class="btn btn-outline btn-sm" onclick="QuizEngine.reset()">';
            html += 'Intentar de nuevo';
            html += '</button>';
        }

        container.innerHTML = html;

        // Add click handlers for options
        if (!state.submitted) {
            container.querySelectorAll('.quiz-option').forEach(opt => {
                opt.addEventListener('click', function() {
                    const q = parseInt(this.dataset.q);
                    const o = parseInt(this.dataset.o);
                    selectOption(q, o);
                });
            });
        }
    }

    /* ── Select option ── */
    function selectOption(qIndex, optIndex) {
        state.answers[qIndex] = optIndex;
        render();
    }

    /* ── Submit ── */
    function submit() {
        if (state.submitted) return;

        // Check all answered
        const unanswered = state.questions.filter((q, i) => state.answers[i] === undefined);
        if (unanswered.length > 0) {
            alert('Por favor responde todas las preguntas antes de enviar.');
            return;
        }

        state.submitted = true;
        const score = calculateScore();

        // Save to localStorage via ADM18App
        ADM18App.saveQuizScore(state.weekNum, score.correct, score.total);
        ADM18App.markWeekComplete(state.weekNum);

        render();
    }

    /* ── Reset ── */
    function reset() {
        state.answers = {};
        state.submitted = false;
        render();
    }

    /* ── Calculate score ── */
    function calculateScore() {
        let correct = 0;
        state.questions.forEach((q, i) => {
            if (state.answers[i] === q.correct) correct++;
        });
        return { correct, total: state.questions.length };
    }

    /* ── Utility ── */
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /* ── Public API ── */
    return {
        init,
        submit,
        reset,
        calculateScore
    };
})();
