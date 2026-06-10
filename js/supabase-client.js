/* === ADM18 Supabase Client ===
 * Progreso directo a Supabase (gamificación unificada multi-módulo).
 */

const SupabaseClient = (function() {
    'use strict';

    let configured = false;

    function init() {
        if (typeof GamifSDK !== 'undefined') {
            configured = !!(GamifSDK.sbUrl() && GamifSDK.sbKey());
            if (configured) {
                hydrateFromCloud();
                console.log('ADM18 Supabase gamificación initialized (cloud-direct)');
            } else {
                console.log('Supabase not configured — offline mode');
            }
            return;
        }

        const url = getMetaConfig('SUPABASE_URL');
        const key = getMetaConfig('SUPABASE_ANON_KEY');
        configured = !!(url && key && url !== 'YOUR_SUPABASE_URL');
        if (configured) hydrateFromCloud();
    }

    function getMetaConfig(key) {
        const meta = document.querySelector('meta[name="supabase-' + key.toLowerCase() + '"]');
        if (meta) return meta.content;
        const params = new URLSearchParams(window.location.search);
        if (params.has(key.toLowerCase())) return params.get(key.toLowerCase());
        return null;
    }

    function persistScores(scores) {
        try {
            localStorage.setItem(ADM18App.STORAGE_KEYS.SCORES, JSON.stringify(scores));
        } catch (e) {
            console.warn('Failed to persist scores:', e.message);
        }
    }

    async function hydrateFromCloud() {
        if (!configured || typeof GamifSDK === 'undefined' || !GamifSDK.isCloudDirectMode()) return;

        const profile = GamifSDK.loadProfile();
        const cc = profile.cc || profile.id_estudiante;
        if (!cc) return;

        const rows = await GamifSDK.fetchAllProgressFromCloud(null, cc);
        if (!rows || !rows.length) return;

        const scores = ADM18App.getScores();
        const progress = ADM18App.getProgress();
        let changed = false;

        rows.forEach(function(row) {
            const weekNum = Number(row.semana);
            if (!weekNum) return;
            const weekKey = 'week_' + weekNum;
            const quizScore = Number(row.quiz_score || 0);
            const xp = Number(row.xp || 0);

            if (quizScore > 0 || xp > 0) {
                scores[weekKey] = {
                    score: Math.round(quizScore),
                    total: 100,
                    percent: quizScore,
                    timestamp: row.updated_at ? Date.parse(row.updated_at) : Date.now(),
                    synced: true,
                    answers: row.quiz_answers || {}
                };
                changed = true;
            }
            if (row.activity_done || xp >= 33) {
                progress[weekKey] = { completed: true, timestamp: Date.now() };
                changed = true;
            }
            if (row.quiz_answers && row.quiz_answers.reading_xp != null) {
                try {
                    localStorage.setItem('adm18_s' + weekNum + '_reading_xp', String(row.quiz_answers.reading_xp));
                } catch (e) { /* ignore */ }
            }
        });

        if (changed) {
            persistScores(scores);
            try {
                localStorage.setItem(ADM18App.STORAGE_KEYS.PROGRESS, JSON.stringify(progress));
            } catch (e) { /* ignore */ }
            if (typeof ADM18App.updateProgressUI === 'function') {
                ADM18App.updateProgressUI();
            }
        }
    }

    async function syncUnsynced() {
        if (!configured || typeof GamifSDK === 'undefined') return;

        const profile = GamifSDK.loadProfile();
        const scores = ADM18App.getScores();
        const progress = ADM18App.getProgress();

        const result = await GamifSDK.syncAdm18Scores(scores, progress, profile);
        if (result.synced > 0) {
            persistScores(scores);
        }
        return result;
    }

    async function fetchStudentScores() {
        if (!configured || typeof GamifSDK === 'undefined') return [];

        const profile = GamifSDK.loadProfile();
        const cc = profile.cc || profile.id_estudiante;
        if (!cc) return [];

        return GamifSDK.fetchAllProgressFromCloud(null, cc);
    }

    async function saveParticipation(payload) {
        if (!configured || typeof GamifSDK === 'undefined') {
            return { synced: false, reason: 'not_configured' };
        }

        const profile = GamifSDK.loadProfile();
        if (!profile.cc && !profile.id_estudiante) {
            return { synced: false, reason: 'no_cc' };
        }

        return { synced: true, reason: 'local_preserved' };
    }

    function saveStudentProfile(profile) {
        if (typeof GamifSDK === 'undefined') return;
        GamifSDK.saveProfile(profile);
        hydrateFromCloud();
        syncUnsynced();
    }

    function getStudentProfile() {
        if (typeof GamifSDK === 'undefined') return {};
        return GamifSDK.loadProfile();
    }

    return {
        init,
        isConfigured: function() { return configured; },
        hydrateFromCloud,
        syncUnsynced,
        fetchStudentScores,
        saveParticipation,
        saveStudentProfile,
        getStudentProfile
    };
})();

document.addEventListener('DOMContentLoaded', function() {
    SupabaseClient.init();
});

document.addEventListener('iub:profile-saved', function() {
    if (typeof SupabaseClient !== 'undefined' && SupabaseClient.hydrateFromCloud) {
        SupabaseClient.hydrateFromCloud();
        SupabaseClient.syncUnsynced();
    }
});
