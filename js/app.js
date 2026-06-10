/* === ADM18 Core Application Module ===
 * IIFE pattern from TGA04 NeuroBiz (reference.md §1.5)
 * Mobile-first, no build step, vanilla JS
 */
const ADM18App = (function() {
    'use strict';

    const STORAGE_PREFIX = 'adm18_';
    const state = {
        currentWeek: null,
        studentName: '',
        progress: {},
        scores: {},
        settings: {}
    };

    /* ── Storage keys (reference.md §1.6 pattern) ── */
    const KEYS = {
        USER:      STORAGE_PREFIX + 'user',
        PROGRESS:  STORAGE_PREFIX + 'progress',
        SCORES:    STORAGE_PREFIX + 'scores',
        SETTINGS:  STORAGE_PREFIX + 'settings',
        CACHE:     STORAGE_PREFIX + 'cache'
    };

    /* ── Init ── */
    function init() {
        loadState();
        normalizeWeekLinks();
        ensureWeeklyStyle();
        setupNavigation();
        detectCurrentWeek();
        console.log('ADM18 App initialized');
    }

    /* ── State management ── */
    function loadState() {
        try {
            const raw = localStorage.getItem(KEYS.PROGRESS);
            state.progress = raw ? JSON.parse(raw) : {};

            const scoresRaw = localStorage.getItem(KEYS.SCORES);
            state.scores = scoresRaw ? JSON.parse(scoresRaw) : {};

            const settingsRaw = localStorage.getItem(KEYS.SETTINGS);
            state.settings = settingsRaw ? JSON.parse(settingsRaw) : {};
        } catch (e) {
            console.warn('Failed to load state:', e.message);
        }
    }

    function saveState(key) {
        try {
            localStorage.setItem(key, JSON.stringify(state[key === 'progress' ? 'progress' : key === 'scores' ? 'scores' : 'settings']));
        } catch (e) {
            console.warn('Failed to save state:', e.message);
        }
    }

    /* ── Progress tracking ── */
    function markWeekComplete(weekNum) {
        state.progress['week_' + weekNum] = {
            completed: true,
            timestamp: Date.now()
        };
        saveState('progress');
        updateProgressUI();
    }

    function isWeekComplete(weekNum) {
        return !!(state.progress['week_' + weekNum] && state.progress['week_' + weekNum].completed);
    }

    function getCompletionPercent() {
        const completed = Object.values(state.progress).filter(p => p && p.completed).length;
        return Math.round((completed / 14) * 100);
    }

    /* ── Quiz scores ── */
    function saveQuizScore(weekNum, score, total) {
        state.scores['week_' + weekNum] = {
            score: score,
            total: total,
            percent: Math.round((score / total) * 100),
            timestamp: Date.now(),
            synced: false
        };
        saveState('scores');
        updateProgressUI();
        if (typeof SupabaseClient !== 'undefined' && SupabaseClient.syncUnsynced) {
            SupabaseClient.syncUnsynced();
        }
        return state.scores['week_' + weekNum];
    }

    function getQuizScore(weekNum) {
        return state.scores['week_' + weekNum] || null;
    }

    /* ── UI helpers ── */
    function updateProgressUI() {
        const bar = document.querySelector('.progress-fill');
        if (bar) {
            bar.style.width = getCompletionPercent() + '%';
        }
        const pct = document.querySelector('.progress-pct');
        if (pct) {
            pct.textContent = getCompletionPercent() + '%';
        }
    }

    function setupNavigation() {
        // Highlight current page in nav
        const currentPage = window.location.pathname.split('/').pop() || 'index.html';
        document.querySelectorAll('.header-nav a').forEach(link => {
            const href = link.getAttribute('href');
            if (href === currentPage || (currentPage === '' && href === 'index.html')) {
                link.classList.add('active');
            }
        });
    }

    function normalizeWeekLinks() {
        document.querySelectorAll('a[href]').forEach(link => {
            const href = link.getAttribute('href');
            if (!href) return;
            if (/^\.\.\/semana-\d{2}\/$/.test(href) || /^semana-\d{2}\/$/.test(href)) {
                link.setAttribute('href', href + 'index.html');
            }
        });
    }

    function detectCurrentWeek() {
        const match = window.location.pathname.match(/semana-(\d+)/);
        if (match) {
            state.currentWeek = parseInt(match[1], 10);
        }
    }

    function ensureWeeklyStyle() {
        const match = window.location.pathname.match(/semana-(\d{2})\/?(?:index\.html)?$/);
        if (!match) return;

        const weekNumber = parseInt(match[1], 10);
        const main = document.querySelector('main.iub-content');
        if (!main) return;

        const firstCard = main.querySelector('.card');
        const firstHeader = firstCard ? firstCard.querySelector('.card-header') : null;
        const weekTitleRaw = firstHeader ? firstHeader.textContent.trim() : ('Semana ' + weekNumber);
        const weekTitle = weekTitleRaw.replace(/^Semana\s+\d+\s*[—-]\s*/i, '');
        const weekSubtitle = 'LatamBox · Comercio exterior · Datos, documentos y decisiones con orden.';
        const userName = localStorage.getItem(KEYS.USER) || 'Estudiante ADM18';
        const progress = state.progress || {};
        const scores = state.scores || {};
        const completed = Object.values(progress).filter(item => item && item.completed).length;
        const pct = Math.round((completed / 14) * 100);
        const scoreKey = 'week_' + weekNumber;
        const weekXp = scores[scoreKey] && typeof scores[scoreKey].percent === 'number'
            ? scores[scoreKey].percent
            : Math.min(100, completed * 25);

        if (!document.querySelector('.week-hero')) {
            const hero = document.createElement('section');
            hero.className = 'week-hero';
            hero.innerHTML =
                '<div class="week-hero__shell">' +
                    '<div class="week-hero__chip">ADM18 · Procesamiento de la Información · Semana ' + weekNumber + ' de 14</div>' +
                    '<h1 class="week-hero__title">🧱 ' + escapeHtml(weekTitle) + '</h1>' +
                    '<p class="week-hero__subtitle">' + weekSubtitle + '</p>' +
                    '<div class="week-hero__progress">' +
                        '<div class="progress-bar"><div class="progress-fill" id="week-hero-fill-auto" style="width:' + pct + '%"></div></div>' +
                        '<div class="week-hero__xp">XP de sesión: <strong id="week-hero-xp-auto">' + weekXp + ' / 100 pts</strong></div>' +
                    '</div>' +
                '</div>';
            main.insertBefore(hero, main.firstChild);
        }

        const missionAnchor = ensureAnchorId(firstCard, 'mision');
        const theoryAnchor = ensureAnchorByText(main, ['Contenido', 'Teoría', 'Teoria'], 'contenido');
        const activityAnchor = ensureAnchorByText(main, ['Actividades', 'Actividad'], 'actividades');
        const quizAnchor = ensureAnchorId(document.getElementById('quiz-container') || document.querySelector('.quiz-container'), 'quiz-container');
        const bibliographyAnchor = ensureAnchorByText(main, ['Bibliografía', 'Bibliografia'], 'bibliografia');

        if (!document.querySelector('.week-hero-nav')) {
            const nav = document.createElement('nav');
            nav.className = 'week-hero-nav';
            nav.innerHTML =
                '<a href="#' + missionAnchor + '">🎯 Misión</a>' +
                '<a href="#' + theoryAnchor + '">📚 Teoría</a>' +
                '<a href="#' + activityAnchor + '">⚙️ Actividad</a>' +
                '<a href="#' + quizAnchor + '">🎮 Quiz</a>' +
                '<a href="#' + bibliographyAnchor + '">📖 Bibliografía</a>';
            const hero = document.querySelector('.week-hero');
            if (hero && hero.nextSibling) {
                hero.parentNode.insertBefore(nav, hero.nextSibling);
            } else {
                main.insertBefore(nav, main.firstChild.nextSibling);
            }
        }

        if (!document.querySelector('.week-progress-widget')) {
            const widget = document.createElement('aside');
            widget.className = 'week-progress-widget';
            widget.setAttribute('aria-label', 'Mi progreso TGA05');
            widget.innerHTML =
                '<div class="week-progress-widget__header">📊 Mi Progreso TGA05 <span>▲</span></div>' +
                '<div class="week-progress-widget__name" id="week-widget-name-auto">' + escapeHtml(userName) + '</div>' +
                '<div class="progress-bar"><div class="progress-fill" id="week-widget-fill-auto" style="width:' + pct + '%"></div></div>' +
                '<div class="week-progress-widget__meta"><span>Semana ' + weekNumber + '</span><strong id="week-widget-xp-auto">' + weekXp + ' XP</strong></div>';
            document.body.appendChild(widget);
        }
    }

    function ensureAnchorByText(root, labels, fallbackId) {
        const candidates = root.querySelectorAll('h1, h2, h3');
        for (const el of candidates) {
            const text = (el.textContent || '').toLowerCase();
            if (labels.some(label => text.includes(label.toLowerCase()))) {
                return ensureAnchorId(el, fallbackId);
            }
        }
        return fallbackId;
    }

    function ensureAnchorId(el, fallbackId) {
        if (!el) return fallbackId;
        if (!el.id) el.id = fallbackId;
        return el.id;
    }

    function escapeHtml(value) {
        return String(value)
            .replaceAll('&', '&amp;')
            .replaceAll('<', '&lt;')
            .replaceAll('>', '&gt;')
            .replaceAll('"', '&quot;')
            .replaceAll("'", '&#39;');
    }

    /* ── Public API ── */
    return {
        init,
        markWeekComplete,
        isWeekComplete,
        getCompletionPercent,
        saveQuizScore,
        getQuizScore,
        updateProgressUI,
        getProgress: function() { return state.progress; },
        getScores: function() { return state.scores; },
        getProfile: function() {
            if (typeof GamifSDK !== 'undefined') return GamifSDK.loadProfile();
            try {
                const raw = localStorage.getItem(KEYS.USER);
                return raw ? JSON.parse(raw) : {};
            } catch (e) {
                return {};
            }
        },
        saveProfile: function(profile) {
            if (typeof SupabaseClient !== 'undefined' && SupabaseClient.saveStudentProfile) {
                SupabaseClient.saveStudentProfile(profile);
            } else if (typeof GamifSDK !== 'undefined') {
                GamifSDK.saveProfile(profile);
            } else {
                localStorage.setItem(KEYS.USER, JSON.stringify(profile));
            }
        },
        STORAGE_KEYS: KEYS
    };
})();

// Auto-init when DOM ready
document.addEventListener('DOMContentLoaded', function() {
    ADM18App.init();
});
