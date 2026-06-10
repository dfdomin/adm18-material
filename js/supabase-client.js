/* === ADM18 Supabase Client ===
 * localStorage-first → gamificación unificada (multi-módulo).
 * Usa GamifSDK + RPC upsert_weekly_progress.
 */

const SupabaseClient = (function() {
    'use strict';

    const SYNC_INTERVAL = 30000;
    let syncTimer = null;
    let configured = false;

    function init() {
        if (typeof GamifSDK !== 'undefined') {
            configured = !!(GamifSDK.sbUrl() && GamifSDK.sbKey());
            if (configured) {
                startSync();
                console.log('ADM18 Supabase gamificación initialized');
            } else {
                console.log('Supabase not configured — offline mode');
            }
            return;
        }

        const url = getMetaConfig('SUPABASE_URL');
        const key = getMetaConfig('SUPABASE_ANON_KEY');
        configured = !!(url && key && url !== 'YOUR_SUPABASE_URL');
        if (configured) startSync();
    }

    function getMetaConfig(key) {
        const meta = document.querySelector('meta[name="supabase-' + key.toLowerCase() + '"]');
        if (meta) return meta.content;
        const params = new URLSearchParams(window.location.search);
        if (params.has(key.toLowerCase())) return params.get(key.toLowerCase());
        return null;
    }

    function startSync() {
        if (syncTimer) clearInterval(syncTimer);
        syncTimer = setInterval(syncUnsynced, SYNC_INTERVAL);
        syncUnsynced();
    }

    function persistScores(scores) {
        try {
            localStorage.setItem(ADM18App.STORAGE_KEYS.SCORES, JSON.stringify(scores));
        } catch (e) {
            console.warn('Failed to persist scores after sync:', e.message);
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
    }

    async function fetchStudentScores() {
        if (!configured || typeof GamifSDK === 'undefined') return [];

        const profile = GamifSDK.loadProfile();
        const cc = profile.cc || profile.id_estudiante;
        if (!cc) return [];

        const offering = encodeURIComponent(GamifSDK.getOfferingCode());
        try {
            const res = await fetch(
                GamifSDK.sbUrl()
                + '/rest/v1/v_legacy_student_progress?select=*'
                + '&student_id=eq.' + encodeURIComponent(cc)
                + '&offering_code=eq.' + offering
                + '&order=semana.asc',
                {
                    headers: {
                        apikey: GamifSDK.sbKey(),
                        Authorization: 'Bearer ' + GamifSDK.sbKey()
                    }
                }
            );
            if (!res.ok) return [];
            return await res.json();
        } catch (err) {
            console.warn('Failed to fetch scores:', err.message);
            return [];
        }
    }

    async function saveParticipation(payload) {
        if (!configured || typeof GamifSDK === 'undefined') {
            return { synced: false, reason: 'not_configured' };
        }

        const profile = GamifSDK.loadProfile();
        if (!profile.cc && !profile.id_estudiante) {
            return { synced: false, reason: 'no_cc', local: true };
        }

        // Participación detallada permanece en localStorage (adm18_participation).
        // La nube recibe puntajes por semana vía syncAdm18Scores al tener cédula.
        return { synced: true, reason: 'local_preserved' };
    }

    function saveStudentProfile(profile) {
        if (typeof GamifSDK === 'undefined') return;
        GamifSDK.saveProfile(profile);
        syncUnsynced();
    }

    function getStudentProfile() {
        if (typeof GamifSDK === 'undefined') return {};
        return GamifSDK.loadProfile();
    }

    return {
        init,
        isConfigured: function() { return configured; },
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
