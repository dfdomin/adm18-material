/* === ADM18 Supabase Client ===
 * Optional backend sync for quiz scores and progress.
 * Pattern: TGA04 localStorage-first → Supabase best-effort sync.
 * Reference: reference.md §4.6 (RLS), §5.2 (sync pattern)
 *
 * SUPABASE SETUP (to be configured in Phase 5):
 *   1. Create project at supabase.com
 *   2. Set env vars: SUPABASE_URL, SUPABASE_ANON_KEY
 *   3. Run SQL to create tables + RLS policies
 */

const SupabaseClient = (function() {
    'use strict';

    const SYNC_INTERVAL = 30000; // 30 seconds
    let client = null;
    let syncTimer = null;
    let configured = false;

    /* ── Init ── */
    function init() {
        const url = getConfig('SUPABASE_URL');
        const key = getConfig('SUPABASE_ANON_KEY');

        if (!url || !key || url === 'YOUR_SUPABASE_URL') {
            console.log('Supabase not configured — running in offline mode');
            configured = false;
            return;
        }

        try {
            // Using Supabase CDN — loaded from script tag in HTML
            if (typeof supabase !== 'undefined') {
                client = supabase.createClient(url, key);
                configured = true;
                console.log('Supabase client initialized');
                startSync();
            }
        } catch (e) {
            console.warn('Supabase init failed:', e.message);
            configured = false;
        }
    }

    function getConfig(key) {
        // Check meta tags (injected at deploy time)
        const meta = document.querySelector('meta[name="supabase-' + key.toLowerCase() + '"]');
        if (meta) return meta.content;

        // Fallback: check URL params (dev only)
        const params = new URLSearchParams(window.location.search);
        if (params.has(key.toLowerCase())) return params.get(key.toLowerCase());

        return null;
    }

    /* ── Sync engine ── */
    function startSync() {
        if (syncTimer) clearInterval(syncTimer);
        syncTimer = setInterval(syncUnsynced, SYNC_INTERVAL);
        // Also sync immediately
        syncUnsynced();
    }

    async function syncUnsynced() {
        if (!configured || !client) return;

        const scores = ADM18App.getScores();
        const progress = ADM18App.getProgress();

        const unsyncedScores = Object.entries(scores)
            .filter(([_, v]) => v && !v.synced);

        for (const [key, value] of unsyncedScores) {
            try {
                const { error } = await client
                    .from('quiz_scores')
                    .upsert({
                        week: parseInt(key.replace('week_', '')),
                        score: value.score,
                        total: value.total,
                        percent: value.percent,
                        updated_at: new Date().toISOString()
                    });

                if (!error) {
                    value.synced = true;
                }
            } catch (err) {
                console.warn('Sync deferred for', key, ':', err.message);
            }
        }

        // Sync progress
        try {
            await client
                .from('student_progress')
                .upsert({
                    progress: progress,
                    completion_pct: ADM18App.getCompletionPercent(),
                    updated_at: new Date().toISOString()
                });
        } catch (err) {
            console.warn('Progress sync deferred:', err.message);
        }
    }

    /* ── Supabase RLS-ready fetch ── */
    async function fetchStudentScores() {
        if (!configured || !client) return [];

        try {
            const { data, error } = await client
                .from('quiz_scores')
                .select('*')
                .order('week', { ascending: true });

            if (error) throw error;
            return data || [];
        } catch (err) {
            console.warn('Failed to fetch scores:', err.message);
            return [];
        }
    }

    async function saveParticipation(payload) {
        if (!configured || !client) {
            return { synced: false, reason: 'not_configured' };
        }

        try {
            const completionPct = ADM18App.getCompletionPercent();
            const { error } = await client
                .from('student_participation')
                .upsert({
                    participation: payload.participation || {},
                    groups: payload.groups || {},
                    coeval: payload.coeval || {},
                    completion_pct: completionPct,
                    updated_at: new Date().toISOString()
                });

            if (error) throw error;
            return { synced: true };
        } catch (err) {
            console.warn('Participation sync deferred:', err.message);
            return { synced: false, reason: err.message };
        }
    }

    /* ── Public API ── */
    return {
        init,
        isConfigured: function() { return configured; },
        syncUnsynced,
        fetchStudentScores,
        saveParticipation
    };
})();

// Init on load
document.addEventListener('DOMContentLoaded', function() {
    SupabaseClient.init();
});
