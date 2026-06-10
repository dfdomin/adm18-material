// ══════════════════════════════════════════════════════════════
//  Gamificación unificada · SDK compartido multi-módulo
//  Uso: GamifSDK.createPT({ semana, xpMax, visitedKey })
// ══════════════════════════════════════════════════════════════

(function (global) {
  "use strict";

  var DEFAULT_RANKS = [
    { min_xp: 650, name: "CTO" },
    { min_xp: 450, name: "Arquitecto" },
    { min_xp: 250, name: "Consultor" },
    { min_xp: 100, name: "Analista Junior" },
    { min_xp: 0, name: "Aprendiz" },
  ];

  function esc(s) {
    return String(s ?? "").replace(/[&<>"']/g, function (m) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m];
    });
  }

  var MODULE_DEFAULTS = {
    ADM18: { prefix: "adm18", offering: "ADM18-2026-2", narrative: "LatamBox" },
    TGA04: { prefix: "tga04", offering: "TGA04-2026-2", narrative: "NeuroBiz S.A.S." },
    TGA05: { prefix: "tga05", offering: "TGA05-2026-2", narrative: "NeuroBiz S.A.S." },
    TD: { prefix: "td", offering: "TD-2026-2", narrative: "Mercado360" },
  };

  function moduleDefaults(moduleCode) {
    return MODULE_DEFAULTS[moduleCode] || {
      prefix: String(moduleCode || "ADM18").toLowerCase(),
      offering: moduleCode + "-2026-2",
      narrative: moduleCode,
    };
  }

  function getConfig() {
    var moduleCode = global.MODULE_CODE || localStorage.getItem("gamif_module_code") || "ADM18";
    var defs = moduleDefaults(moduleCode);
    var prefix = global.GAMIF_PREFIX || defs.prefix;
    return {
      moduleCode: moduleCode,
      offeringCode: global.OFFERING_CODE || localStorage.getItem("gamif_offering_code")
        || localStorage.getItem(prefix + "_course_code")
        || defs.offering,
      narrative: global.NARRATIVE || localStorage.getItem("gamif_narrative") || defs.narrative,
      prefix: prefix,
      legacyPrefix: prefix,
      useUnified: localStorage.getItem("gamif_use_unified") !== "false",
    };
  }

  function persistConfig(cfg) {
    localStorage.setItem("gamif_module_code", cfg.moduleCode);
    localStorage.setItem("gamif_offering_code", cfg.offeringCode);
    localStorage.setItem("gamif_narrative", cfg.narrative);
    localStorage.setItem(cfg.prefix + "_course_code", cfg.offeringCode);
  }

  function progressKey(cfg, semana) {
    return cfg.prefix + "_progress:" + cfg.offeringCode + ":" + semana;
  }

  function legacyProgressKey(cfg, semana) {
    var p = (cfg && cfg.prefix) || "tga04";
    return p + "_s" + semana;
  }

  function profileKey(cfg) {
    return cfg.prefix + "_profile";
  }

  function legacyProfileKey(cfg) {
    var p = (cfg && cfg.prefix) || "adm18";
    if (p === "adm18") return "adm18_user";
    return p + "_global";
  }

  function sbUrl() {
    var cfg = getConfig();
    return localStorage.getItem(cfg.prefix + "_supabase_url")
      || global.SUPABASE_URL
      || localStorage.getItem("adm18_supabase_url")
      || localStorage.getItem("tga04_supabase_url")
      || "";
  }

  function sbKey() {
    var cfg = getConfig();
    return localStorage.getItem(cfg.prefix + "_supabase_key")
      || global.SUPABASE_KEY
      || localStorage.getItem("adm18_supabase_key")
      || localStorage.getItem("tga04_supabase_key")
      || "";
  }

  function rankFor(xp, ranks) {
    var list = ranks || DEFAULT_RANKS;
    for (var i = 0; i < list.length; i++) {
      if (xp >= list[i].min_xp) return list[i].name;
    }
    return "Aprendiz";
  }

  function riskFor(semanasVisitadas, xp) {
    if (semanasVisitadas <= 2 || xp < 80) return ["Alto", "high"];
    if (semanasVisitadas <= 5 || xp < 220) return ["Medio", "warn"];
    return ["Normal", "ok"];
  }

  function calcNotaFormativa(quizPromedio, actividades, semanas, semanasEsperadas) {
    var expected = semanasEsperadas || 13;
    var quiz = (quizPromedio / 10 * 5.0) * 0.50;
    var acts = Math.min(actividades / expected, 1) * 5.0 * 0.30;
    var sem = Math.min(semanas / expected, 1) * 5.0 * 0.20;
    return Math.round((quiz + acts + sem) * 100) / 100;
  }

  function totalXP(cfg) {
    var total = 0;
    var cfgRef = cfg || getConfig();
    if (cfgRef.legacyPrefix === "adm18") {
      try {
        var scores = JSON.parse(localStorage.getItem("adm18_scores") || "{}");
        Object.keys(scores).forEach(function (key) {
          var entry = scores[key];
          if (entry && typeof entry.percent === "number") {
            total += entry.percent;
          }
        });
      } catch (e) { /* ignore */ }
      return total;
    }
    var legacyRe = new RegExp("^" + cfgRef.prefix + "_s(\\d+)$");
    var unifiedRe = new RegExp("^" + cfgRef.prefix + "_progress:[^:]+:(\\d+)$");
    for (var i = 0; i < localStorage.length; i++) {
      var k = localStorage.key(i);
      if (!k) continue;
      if (!legacyRe.test(k) && !unifiedRe.test(k)) continue;
      try {
        total += Number(JSON.parse(localStorage.getItem(k) || "{}").xp || 0);
      } catch (e) { /* ignore */ }
    }
    return total;
  }

  async function upsertWeeklyProgress(payload) {
    return callRpc("upsert_weekly_progress", payload);
  }

  async function syncWeekProgress(state, cfg, semana) {
    var config = cfg || getConfig();
    var week = semana || (state && state.semana);
    if (!state || !week) return { ok: false, reason: "no_state" };
    if (!sbUrl() || !sbKey()) return { ok: false, reason: "no_config" };

    var cc = String(state.id_estudiante || state.cc || "").trim();
    if (!cc) return { ok: false, reason: "no_cc" };

    var rpc = await upsertWeeklyProgress({
      p_offering_code: config.offeringCode,
      p_student_id: cc,
      p_student_name: state.nombre || state.name || "",
      p_grupo: state.grupo || "",
      p_horario: state.horario || "",
      p_semana: week,
      p_xp: Number(state.xp || 0),
      p_quiz_score: Number(state.quiz_puntaje || state.quiz_score || 0),
      p_quiz_answers: state.quiz_respuestas || state.quiz_answers || {},
      p_hti_done: !!(state.hti_entregado || state.hti_done),
      p_activity_done: !!(state.actividad_completada || state.activity_done),
    });
    if (rpc.ok) return rpc;

    var legacy = await syncLegacyProgress(state, config);
    var unified = await syncUnifiedProgress(state, config);
    return {
      ok: legacy.ok || unified.ok,
      status: rpc.status || legacy.status || unified.status,
      reason: rpc.ok ? undefined : "rpc_failed",
      rpc: rpc,
      legacy: legacy,
      unified: unified,
    };
  }

  async function syncAdm18Scores(scores, progress, profile) {
    var cfg = getConfig();
    var cc = profile && (profile.cc || profile.id_estudiante);
    if (!cc) return { ok: false, reason: "no_cc", synced: 0 };

    var synced = 0;
    var failed = 0;
    var entries = Object.entries(scores || {});

    for (var i = 0; i < entries.length; i++) {
      var key = entries[i][0];
      var value = entries[i][1];
      if (!value || value.synced) continue;

      var weekNum = parseInt(String(key).replace("week_", ""), 10);
      if (!weekNum) continue;

      var weekProgress = progress && progress["week_" + weekNum];
      var result = await upsertWeeklyProgress({
        p_offering_code: cfg.offeringCode,
        p_student_id: cc,
        p_student_name: profile.nombre || profile.name || "",
        p_grupo: profile.grupo || "",
        p_horario: profile.horario || "",
        p_semana: weekNum,
        p_xp: value.percent || 0,
        p_quiz_score: value.percent || 0,
        p_quiz_answers: value.answers || {},
        p_hti_done: false,
        p_activity_done: !!(weekProgress && weekProgress.completed),
      });

      if (result.ok) {
        value.synced = true;
        synced++;
      } else {
        failed++;
      }
    }

    return { ok: failed === 0, synced: synced, failed: failed };
  }

  function loadProfile(cfg) {
    var config = cfg || getConfig();
    var raw = localStorage.getItem(profileKey(config)) || localStorage.getItem(legacyProfileKey(config));
    try {
      if (!raw) return {};
      var parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") return parsed;
    } catch (e) {
      if (typeof raw === "string" && raw.trim()) {
        return { nombre: raw.trim() };
      }
    }
    return {};
  }

  function saveProfile(cfg, profile) {
    var config = cfg || getConfig();
    var json = JSON.stringify(profile);
    localStorage.setItem(profileKey(config), json);
    localStorage.setItem(legacyProfileKey(config), json);
  }

  function loadWeekState(cfg, semana) {
    var key = progressKey(cfg, semana);
    var legacy = legacyProgressKey(cfg, semana);
    var raw = localStorage.getItem(key) || localStorage.getItem(legacy);
    var state = {
      semana: semana,
      xp: 0,
      quiz_respuestas: {},
      quiz_puntaje: 0,
      nombre: "",
      cc: "",
      id_estudiante: "",
      grupo: "",
      horario: "",
      hti_entregado: false,
      hti_done: false,
      actividad_completada: false,
      activity_done: false,
    };
    try {
      if (raw) Object.assign(state, JSON.parse(raw));
    } catch (e) { /* ignore */ }
    var profile = loadProfile(cfg);
    if (!state.nombre && profile.nombre) state.nombre = profile.nombre;
    if (!state.cc && profile.cc) state.cc = profile.cc;
    if (!state.id_estudiante && profile.cc) state.id_estudiante = profile.cc;
    if (!state.grupo && profile.grupo) state.grupo = profile.grupo;
    if (!state.horario && profile.horario) state.horario = profile.horario;
    state.hti_done = !!state.hti_entregado || !!state.hti_done;
    state.activity_done = !!state.actividad_completada || !!state.activity_done;
    return state;
  }

  function saveWeekState(cfg, semana, state) {
    var json = JSON.stringify(state);
    localStorage.setItem(progressKey(cfg, semana), json);
    localStorage.setItem(legacyProgressKey(cfg, semana), json);
  }

  async function syncLegacyProgress(state, cfg) {
    var url = sbUrl();
    var key = sbKey();
    if (!url || !key) return { ok: false, reason: "no_config" };
    var res = await fetch(url + "/rest/v1/student_progress", {
      method: "POST",
      headers: {
        apikey: key,
        Authorization: "Bearer " + key,
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates",
      },
      body: JSON.stringify({
        student_name: state.nombre || "Anónimo",
        student_id: state.id_estudiante || state.cc || "desconocido",
        semana: state.semana,
        xp: state.xp || 0,
        quiz_answers: state.quiz_respuestas || {},
        quiz_score: state.quiz_puntaje || 0,
        hti_done: !!(state.hti_entregado || state.hti_done),
        activity_done: !!(state.actividad_completada || state.activity_done),
        grupo: state.grupo || "",
        horario: state.horario || "",
        offering_code: cfg.offeringCode,
        updated_at: new Date().toISOString(),
      }),
    });
    return { ok: res.ok || res.status === 201, status: res.status };
  }

  async function syncUnifiedProgress(state, cfg) {
    var url = sbUrl();
    var key = sbKey();
    if (!url || !key || !cfg.useUnified) return { ok: true, skipped: true };

    var cc = state.id_estudiante || state.cc;
    if (!cc) return { ok: false, reason: "no_cc" };

    var offering = encodeURIComponent(cfg.offeringCode);
    var enrollRes = await fetch(
      url + "/rest/v1/v_legacy_students?select=cc,offering_code&id=not.is.null"
      + "&cc=eq." + encodeURIComponent(cc)
      + "&offering_code=eq." + offering
      + "&limit=1",
      { headers: { apikey: key, Authorization: "Bearer " + key } }
    );
    if (!enrollRes.ok) return { ok: false, status: enrollRes.status };

    var payload = {
      offering_code: cfg.offeringCode,
      student_id: cc,
      semana: state.semana,
      xp: state.xp || 0,
      quiz_score: state.quiz_puntaje || 0,
      quiz_answers: state.quiz_respuestas || {},
      hti_done: !!(state.hti_entregado || state.hti_done),
      activity_done: !!(state.actividad_completada || state.activity_done),
      student_name: state.nombre || "",
      grupo: state.grupo || "",
      horario: state.horario || "",
    };

    var res = await fetch(url + "/rest/v1/v_legacy_student_progress", {
      method: "POST",
      headers: {
        apikey: key,
        Authorization: "Bearer " + key,
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates",
      },
      body: JSON.stringify(payload),
    });
    return { ok: res.ok || res.status === 201, status: res.status, unified: true };
  }

  async function callRpc(fn, payload) {
    var url = sbUrl();
    var key = sbKey();
    if (!url || !key) return { ok: false, reason: "no_config" };
    var res = await fetch(url + "/rest/v1/rpc/" + fn, {
      method: "POST",
      headers: {
        apikey: key,
        Authorization: "Bearer " + key,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    var body = "";
    try { body = await res.text(); } catch (e) { /* ignore */ }
    return { ok: res.ok, status: res.status, body: body };
  }

  async function syncParticipation(events, offeringCode) {
    var cfg = getConfig();
    var offering = offeringCode || cfg.offeringCode;
    if (!events || !events.length) return { ok: false, count: 0 };

    var ok = 0;
    var fail = 0;
    for (var i = 0; i < events.length; i++) {
      var ev = events[i];
      if (!ev.cc || ev.points == null || Number(ev.points) <= 0) continue;
      var result = await callRpc("record_participation", {
        p_cc: ev.cc,
        p_offering_code: offering,
        p_points: ev.points,
        p_event_type: ev.type || "participation",
        p_session_date: (ev.ts || new Date().toISOString()).slice(0, 10),
        p_note: ev.name || "",
      });
      if (result.ok) ok++;
      else fail++;
    }
    return { ok: fail === 0, count: ok, failed: fail };
  }

  async function syncAttendanceRows(rows, offeringCode) {
    var cfg = getConfig();
    var offering = offeringCode || cfg.offeringCode;
    if (!rows || !rows.length) return { ok: true, count: 0 };

    var ok = 0;
    var fail = 0;
    for (var i = 0; i < rows.length; i++) {
      var row = rows[i];
      if (!row.cc || !row.fecha || !row.estado || row.estado === "-") continue;
      var result = await callRpc("record_attendance", {
        p_cc: row.cc,
        p_offering_code: offering,
        p_fecha: row.fecha,
        p_estado: row.estado,
      });
      if (result.ok) ok++;
      else fail++;
    }
    return { ok: fail === 0, count: ok, failed: fail };
  }

  function createPT(options) {
    var cfg = getConfig();
    persistConfig(cfg);
    var semana = options.semana;
    var xpMax = options.xpMax || 80;
    var visitedKey = options.visitedKey || (cfg.prefix + "_visited_s" + semana);
    var state = loadWeekState(cfg, semana);

    function msg(text, color) {
      var el = document.getElementById("pt-msg");
      if (!el) return;
      el.textContent = text;
      el.style.color = color || "#fff";
      setTimeout(function () {
        if (el.textContent === text) el.textContent = "";
      }, options.msgTimeout || 4000);
    }

    function render() {
      var pct = Math.min((state.xp / xpMax) * 100, 100) + "%";
      var bar = document.querySelector("#pt-bar>div") || document.getElementById("pt-xp-bar");
      var cnt = document.getElementById("ptCount") || document.getElementById("pt-xp-count");
      var hBar = document.getElementById("xpBar");
      var hCnt = document.getElementById("xpCount");
      var ptRank = document.getElementById("ptRankName");
      var ptTotal = document.getElementById("ptTotal");
      var headerRank = document.getElementById("headerRank");
      if (bar) bar.style.width = pct;
      if (cnt) cnt.textContent = state.xp + " XP";
      if (hBar) hBar.style.width = pct;
      if (hCnt) hCnt.textContent = state.xp;
      var txp = totalXP(cfg);
      var rank = rankFor(txp);
      if (ptRank) ptRank.textContent = rank;
      if (ptTotal) ptTotal.textContent = txp;
      if (headerRank) headerRank.textContent = rank;
      var lbl = document.getElementById("pt-semana-label") || document.querySelector("#pt-label span");
      if (lbl) lbl.textContent = "Semana " + semana;
    }

    function save() {
      saveWeekState(cfg, semana, state);
      render();
    }

    function addXP(pts, motivo) {
      state.xp = Math.min((state.xp || 0) + pts, xpMax);
      msg("✨ +" + pts + " XP — " + motivo, "lime");
      save();
      if (/complet|correct|ganaste|éxito|exito|✅|quiz|actividad|lectura|📖/i.test(String(motivo || ""))) {
        if (global.IUBCelebrate) global.IUBCelebrate.launch({ message: motivo });
        try {
          document.dispatchEvent(new CustomEvent("iub:activity-complete", { detail: { message: motivo } }));
        } catch (e) { /* ignore */ }
      }
    }

    function completeActivity(motivo, pts) {
      state.actividad_completada = true;
      state.activity_done = true;
      addXP(typeof pts === "number" ? pts : Math.min(15, xpMax - (state.xp || 0)), motivo || "Actividad completada ✅");
      syncCloud();
    }

    async function syncCloud() {
      save();
      var result = await syncWeekProgress(state, cfg, semana);
      if (result.ok) {
        msg("✅ Guardado en Supabase ☁️", "lightgreen");
      } else if (result.reason === "no_config") {
        msg("⚠️ Supabase no configurado", "orange");
      } else if (result.reason === "no_cc") {
        msg("⚠️ Configura tu cédula para sincronizar", "orange");
      } else {
        msg("❌ Error " + (result.status || result.reason || "sync"), "salmon");
      }
    }

    function exportCode() {
      save();
      var code = btoa(encodeURIComponent(JSON.stringify(state)));
      try {
        navigator.clipboard.writeText(code);
      } catch (e) { /* ignore */ }
      var a = document.createElement("a");
      a.href = "data:text/plain;charset=utf-8," + encodeURIComponent(code);
      a.download = "progreso_" + cfg.offeringCode + "_s" + semana + "_" + (state.id_estudiante || "est") + ".txt";
      a.click();
      msg("📋 ¡Código copiado!", "#fff9c4");
    }

    function importCode() {
      var code = prompt("Pega tu código de progreso:");
      if (!code) return;
      try {
        Object.assign(state, JSON.parse(decodeURIComponent(atob(code.trim()))));
        save();
        msg("✅ Progreso restaurado.", "lightgreen");
      } catch (e) {
        msg("❌ Código inválido.", "salmon");
      }
    }

    function toggle() {
      var w = document.getElementById("pt-widget");
      var t = document.getElementById("pt-toggle");
      if (w) w.classList.toggle("collapsed");
      if (t) t.textContent = w && w.classList.contains("collapsed") ? "▼" : "▲";
    }

    function init() {
      loadWeekState(cfg, semana);
      state = loadWeekState(cfg, semana);
      render();
      if (options.autoVisitXp && !localStorage.getItem(visitedKey)) {
        localStorage.setItem(visitedKey, "1");
        addXP(10, "Asistencia Semana " + semana + " ✅");
      }
      if (typeof options.onInit === "function") options.onInit(state, { addXP: addXP, save: save });
    }

    return {
      init: init,
      addXP: addXP,
      completeActivity: completeActivity,
      save: save,
      sync: syncCloud,
      export: exportCode,
      import: importCode,
      exportCode: exportCode,
      importCode: importCode,
      toggle: toggle,
      state: function () { return state; },
      getRank: function () { return rankFor(totalXP(cfg)); },
      totalXP: function () { return totalXP(cfg); },
      render: render,
      msg: msg,
    };
  }

  var GamifSDK = {
    esc: esc,
    getConfig: getConfig,
    persistConfig: persistConfig,
    getOfferingCode: function () { return getConfig().offeringCode; },
    rankFor: rankFor,
    riskFor: riskFor,
    calcNotaFormativa: calcNotaFormativa,
    totalXP: totalXP,
    createPT: createPT,
    syncParticipation: syncParticipation,
    syncAttendanceRows: syncAttendanceRows,
    upsertWeeklyProgress: upsertWeeklyProgress,
    syncWeekProgress: syncWeekProgress,
    syncAdm18Scores: syncAdm18Scores,
    callRpc: callRpc,
    loadProfile: loadProfile,
    saveProfile: saveProfile,
    sbUrl: sbUrl,
    sbKey: sbKey,
    DEFAULT_RANKS: DEFAULT_RANKS,
  };

  global.GamifSDK = GamifSDK;
  global.rankFor = rankFor;
  global.riskFor = riskFor;

})(typeof window !== "undefined" ? window : globalThis);
