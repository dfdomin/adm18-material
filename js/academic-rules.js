(function (global) {
  "use strict";

  var DEFAULTS = {
    hoursPerSession: 4,
    sessionsForAttendance: 13,
    maxAbsencePct: 0.2,
    formativeWeightPct: 40,
    evaluationWeightPct: 60,
    hourLossByState: { F: 4, T: 1, P: 0, M: 0, I: 0 },
  };

  function rulesConfig() {
    var dash = global.IUB_DASHBOARD || {};
    var hoursPerSession = dash.hoursPerSession || DEFAULTS.hoursPerSession;
    var sessions = dash.sessionsForAttendance || DEFAULTS.sessionsForAttendance;
    var totalHours = hoursPerSession * sessions;
    var maxAbsenceHours = Math.round(totalHours * (dash.maxAbsencePct || DEFAULTS.maxAbsencePct) * 10) / 10;
    return {
      hoursPerSession: hoursPerSession,
      sessionsForAttendance: sessions,
      totalHours: totalHours,
      maxAbsenceHours: maxAbsenceHours,
      maxAbsencePct: dash.maxAbsencePct || DEFAULTS.maxAbsencePct,
      minRequiredHours: Math.round((totalHours - maxAbsenceHours) * 10) / 10,
      formativeWeightPct: dash.formativeWeightPct || DEFAULTS.formativeWeightPct,
      evaluationWeightPct: dash.evaluationWeightPct || DEFAULTS.evaluationWeightPct,
      hourLossByState: dash.hourLossByState || DEFAULTS.hourLossByState,
    };
  }

  function hoursLostForState(estado, cfg) {
    var rules = cfg || rulesConfig();
    var code = String(estado || "").toUpperCase();
    if (Object.prototype.hasOwnProperty.call(rules.hourLossByState, code)) {
      return rules.hourLossByState[code];
    }
    return 0;
  }

  function dedupeAttendanceRecords(records) {
    var map = {};
    (records || []).forEach(function (row) {
      var id = String(row.cc || row.student_id || "").trim();
      var fecha = String(row.fecha || "").trim();
      if (!id || !fecha) return;
      map[id + "|" + fecha] = row;
    });
    return Object.values(map);
  }

  function summarizeAttendanceRecords(records, studentCc) {
    var rules = rulesConfig();
    var cc = String(studentCc || "").trim();
    var hoursLost = 0;
    var sessions = { P: 0, T: 0, F: 0, M: 0, I: 0, other: 0 };
    var count = 0;

    dedupeAttendanceRecords(records).forEach(function (row) {
      if (cc && String(row.cc || row.student_id || "").trim() !== cc) return;
      var estado = String(row.estado || "").toUpperCase();
      if (!estado || estado === "-") return;
      count += 1;
      if (sessions[estado] != null) sessions[estado] += 1;
      else sessions.other += 1;
      hoursLost += hoursLostForState(estado, rules);
    });

    hoursLost = Math.round(hoursLost * 10) / 10;
    var hoursAttended = Math.max(0, Math.round((rules.totalHours - hoursLost) * 10) / 10);
    var remainingBeforeLoss = Math.round((rules.maxAbsenceHours - hoursLost) * 10) / 10;
    var absencePct = rules.totalHours ? Math.round((hoursLost / rules.totalHours) * 1000) / 10 : 0;
    var lostModule = hoursLost > rules.maxAbsenceHours;
    var atRisk = !lostModule && remainingBeforeLoss <= 4;

    return {
      rules: rules,
      sessionCount: count,
      sessions: sessions,
      hoursLost: hoursLost,
      hoursAttended: hoursAttended,
      totalHours: rules.totalHours,
      maxAbsenceHours: rules.maxAbsenceHours,
      minRequiredHours: rules.minRequiredHours,
      remainingBeforeLoss: remainingBeforeLoss,
      absencePct: absencePct,
      lostModule: lostModule,
      atRisk: atRisk,
      status: lostModule ? "lost" : atRisk ? "risk" : "ok",
    };
  }

  function flattenLocalAttendance(storageKey, studentCc) {
    var cc = String(studentCc || "").trim();
    var records = [];
    try {
      var att = JSON.parse(localStorage.getItem(storageKey) || "{}");
      Object.keys(att).forEach(function (fecha) {
        var day = att[fecha] || {};
        Object.keys(day).forEach(function (id) {
          if (cc && id !== cc) return;
          var cell = day[id];
          records.push({ cc: id, fecha: fecha, estado: cell.estado || cell });
        });
      });
    } catch (e) { /* ignore */ }
    return records;
  }

  async function fetchAllCloudAttendance(offeringCode) {
    if (!global.GamifSDK) return [];
    var url = GamifSDK.sbUrl();
    var key = GamifSDK.sbKey();
    var offering = offeringCode || GamifSDK.getOfferingCode();
    if (!url || !key) return [];
    try {
      var res = await fetch(
        url + "/rest/v1/v_legacy_attendance?select=cc,fecha,estado,grupo,horario,offering_code"
        + "&offering_code=eq." + encodeURIComponent(offering)
        + "&order=fecha.desc",
        { headers: { apikey: key, Authorization: "Bearer " + key } }
      );
      if (!res.ok) return [];
      return await res.json();
    } catch (e) {
      return [];
    }
  }

  async function fetchOfferingRoster(offeringCode, storageKey) {
    var roster = [];
    if (global.GamifSDK) {
      var url = GamifSDK.sbUrl();
      var key = GamifSDK.sbKey();
      var offering = offeringCode || GamifSDK.getOfferingCode();
      if (url && key) {
        try {
          var res = await fetch(
            url + "/rest/v1/v_legacy_students?select=cc,name,grupo,horario,offering_code"
            + "&offering_code=eq." + encodeURIComponent(offering),
            { headers: { apikey: key, Authorization: "Bearer " + key } }
          );
          if (res.ok) roster = await res.json();
        } catch (e) { /* ignore */ }
      }
    }
    if (!roster.length && storageKey) {
      try {
        roster = JSON.parse(localStorage.getItem(storageKey) || "[]");
      } catch (e) { roster = []; }
    }
    return roster.map(function (r) {
      return {
        cc: r.cc || r.student_id || "",
        name: r.name || r.student_name || "Sin nombre",
        grupo: r.grupo || "",
        horario: r.horario || "",
      };
    }).filter(function (r) { return r.cc; });
  }

  function mergeAttendanceRecords(cloudRows, localRows) {
    var map = {};
    (localRows || []).forEach(function (r) {
      map[String(r.cc) + "|" + r.fecha] = r;
    });
    (cloudRows || []).forEach(function (r) {
      map[String(r.cc) + "|" + r.fecha] = r;
    });
    return Object.values(map);
  }

  function recordsForStudent(allRecords, cc) {
    return (allRecords || []).filter(function (r) {
      return String(r.cc) === String(cc);
    });
  }

  async function buildTeacherAttendanceReport(options) {
    options = options || {};
    var cfg = global.GamifSDK ? GamifSDK.getConfig() : { prefix: "adm18" };
    var offering = options.offeringCode || (GamifSDK && GamifSDK.getOfferingCode()) || "";
    var storageKey = options.storageKey || (cfg.prefix + "_attendance");
    var studentsKey = options.studentsKey || (cfg.prefix + "_students_v1");

    var roster = await fetchOfferingRoster(offering, studentsKey);
    var cloud = await fetchAllCloudAttendance(offering);
    var local = flattenLocalAttendance(storageKey, "");
    var allRecords = mergeAttendanceRecords(cloud, local);

    var ccInRoster = {};
    roster.forEach(function (s) { ccInRoster[s.cc] = true; });

    var studentRows = roster.map(function (s) {
      var summary = summarizeAttendanceRecords(recordsForStudent(allRecords, s.cc), s.cc);
      return {
        cc: s.cc,
        name: s.name,
        grupo: s.grupo || "Sin grupo",
        horario: s.horario || "Sin horario",
        attendance: summary,
      };
    });

    Object.keys(groupRecordsByCc(allRecords)).forEach(function (cc) {
      if (ccInRoster[cc]) return;
      studentRows.push({
        cc: cc,
        name: "Estudiante " + cc,
        grupo: "Sin grupo",
        horario: "Sin horario",
        attendance: summarizeAttendanceRecords(recordsForStudent(allRecords, cc), cc),
      });
    });

    var groups = {};
    var totals = { ok: 0, risk: 0, lost: 0, students: studentRows.length };

    studentRows.forEach(function (row) {
      var gkey = row.grupo + "|||" + row.horario;
      if (!groups[gkey]) {
        groups[gkey] = {
          grupo: row.grupo,
          horario: row.horario,
          ok: 0,
          risk: 0,
          lost: 0,
          students: [],
        };
      }
      groups[gkey].students.push(row);
      groups[gkey][row.attendance.status] += 1;
      totals[row.attendance.status] += 1;
    });

    return {
      offering: offering,
      moduleCode: cfg.moduleCode,
      totals: totals,
      groups: Object.keys(groups).map(function (k) { return groups[k]; }).sort(function (a, b) {
        return a.grupo.localeCompare(b.grupo) || a.horario.localeCompare(b.horario);
      }),
      students: studentRows,
      rules: rulesConfig(),
    };
  }

  function groupRecordsByCc(records) {
    var out = {};
    (records || []).forEach(function (r) {
      if (!out[r.cc]) out[r.cc] = [];
      out[r.cc].push(r);
    });
    return out;
  }

  function teacherAttendanceReportHtml(report) {
    if (!report || !report.groups.length) {
      return "<p class=\"msg\">Sin estudiantes registrados. Importa la lista en Participación → Configuración.</p>";
    }

    var esc = global.GamifSDK ? GamifSDK.esc.bind(GamifSDK) : function (s) { return String(s ?? ""); };
    var r = report.rules;
    var html = "<div class=\"group-layer\"><strong>Asistencia reglamentaria · " + esc(report.moduleCode) + "</strong>";
    html += "<span>" + esc(report.offering) + " · Límite " + r.maxAbsenceHours + " h (" + (r.maxAbsencePct * 100) + "%)</span></div>";

    html += "<div class=\"att-summary-chips\">";
    html += "<span class=\"att-chip ok\">🟢 En regla: <strong>" + report.totals.ok + "</strong></span>";
    html += "<span class=\"att-chip risk\">🟠 En riesgo: <strong>" + report.totals.risk + "</strong></span>";
    html += "<span class=\"att-chip lost\">🔴 Módulo perdido: <strong>" + report.totals.lost + "</strong></span>";
    html += "<span class=\"att-chip\">Total: <strong>" + report.totals.students + "</strong></span>";
    html += "</div>";

    html += "<div class=\"table-wrap\" style=\"margin-top:.8rem\"><table><thead><tr>";
    html += "<th>Grupo</th><th>Horario</th><th>Est.</th><th>🟢 OK</th><th>🟠 Riesgo</th><th>🔴 Perdido</th><th>Barra riesgo</th>";
    html += "</tr></thead><tbody>";

    report.groups.forEach(function (g) {
      var total = g.students.length;
      var riskPct = total ? Math.round(((g.risk + g.lost) / total) * 100) : 0;
      var barColor = g.lost > 0 ? "#c62828" : g.risk > 0 ? "#e65100" : "#2e7d32";
      html += "<tr><td>" + esc(g.grupo) + "</td><td>" + esc(g.horario) + "</td><td>" + total + "</td>";
      html += "<td>" + g.ok + "</td><td>" + g.risk + "</td><td>" + g.lost + "</td>";
      html += "<td><div class=\"iub-bar\"><div class=\"iub-bar-fill\" style=\"width:" + riskPct + "%;background:" + barColor + "\"></div></div></td></tr>";
    });
    html += "</tbody></table></div>";

    var flagged = report.students.filter(function (s) {
      return s.attendance.status !== "ok";
    }).sort(function (a, b) {
      if (a.attendance.status === b.attendance.status) return a.name.localeCompare(b.name);
      var order = { lost: 0, risk: 1, ok: 2 };
      return order[a.attendance.status] - order[b.attendance.status];
    });

    if (flagged.length) {
      html += "<h4 style=\"margin:1rem 0 .5rem;color:var(--primary)\">Estudiantes en riesgo o con módulo perdido</h4>";
      html += "<div class=\"table-wrap\"><table><thead><tr><th>Estudiante</th><th>Grupo</th><th>Horario</th><th>h perdidas</th><th>Estado</th></tr></thead><tbody>";
      flagged.forEach(function (s) {
        var st = s.attendance.status;
        var label = st === "lost" ? "Módulo perdido" : "En riesgo";
        html += "<tr><td><strong>" + esc(s.name) + "</strong><br><small>" + esc(s.cc) + "</small></td>";
        html += "<td>" + esc(s.grupo) + "</td><td>" + esc(s.horario) + "</td>";
        html += "<td>" + s.attendance.hoursLost + " / " + r.maxAbsenceHours + " h</td>";
        html += "<td><span class=\"att-chip " + st + "\">" + label + "</span></td></tr>";
      });
      html += "</tbody></table></div>";
    }

    return html;
  }

  async function renderTeacherAttendanceReport(containerId, options) {
    var el = document.getElementById(containerId);
    if (!el) return null;
    el.innerHTML = "<p class=\"msg\">Calculando asistencia por grupo…</p>";
    try {
      var report = await buildTeacherAttendanceReport(options);
      el.innerHTML = teacherAttendanceReportHtml(report);
      return report;
    } catch (e) {
      el.innerHTML = "<p class=\"msg err\">Error al calcular asistencia: " + (e.message || e) + "</p>";
      return null;
    }
  }

  async function fetchCloudAttendance(studentCc, offeringCode) {
    if (!global.GamifSDK || !studentCc) return [];
    var url = GamifSDK.sbUrl();
    var key = GamifSDK.sbKey();
    var offering = offeringCode || GamifSDK.getOfferingCode();
    if (!url || !key || !studentCc) return [];
    try {
      var res = await fetch(
        url + "/rest/v1/v_legacy_attendance?select=cc,fecha,estado,grupo,offering_code"
        + "&cc=eq." + encodeURIComponent(studentCc)
        + "&offering_code=eq." + encodeURIComponent(offering)
        + "&order=fecha.desc",
        { headers: { apikey: key, Authorization: "Bearer " + key } }
      );
      if (!res.ok) return [];
      return await res.json();
    } catch (e) {
      return [];
    }
  }

  function emptyAttendanceSummary(reason) {
    var summary = summarizeAttendanceRecords([], "");
    summary.status = "unknown";
    summary.profileRequired = true;
    summary.message = reason || "Configura tu cédula en el perfil del curso para ver tu asistencia.";
    return summary;
  }

  async function getStudentAttendanceSummary(studentCc, options) {
    options = options || {};
    var cfg = global.GamifSDK ? GamifSDK.getConfig() : { prefix: "adm18" };
    var profile = GamifSDK ? GamifSDK.loadProfile(cfg) : {};
    var cc = String(studentCc || profile.cc || profile.id_estudiante || "").trim();
    if (!cc) return emptyAttendanceSummary();

    var localKey = options.storageKey || (cfg.prefix + "_attendance");
    var localRecords = flattenLocalAttendance(localKey, cc);
    var cloudRecords = options.skipCloud ? [] : await fetchCloudAttendance(cc, options.offeringCode);
    var merged = mergeAttendanceRecords(cloudRecords, localRecords);
    var summary = summarizeAttendanceRecords(merged, cc);
    summary.profileRequired = false;
    return summary;
  }

  function gradeWeightsHtml() {
    var r = rulesConfig();
    return (
      "<span class=\"iub-weight-chip\">Nota formativa <strong>" + r.formativeWeightPct + "%</strong></span>" +
      "<span class=\"iub-weight-chip\">Evaluación / caso del corte <strong>" + r.evaluationWeightPct + "%</strong></span>"
    );
  }

  function attendanceSummaryHtml(summary) {
    var s = summary || summarizeAttendanceRecords([]);
    if (s.profileRequired || s.status === "unknown") {
      return (
        '<div class="iub-attendance-panel">' +
        "<h3>ℹ️ Asistencia personal</h3>" +
        "<p>" + (s.message || "Configura tu cédula en el perfil de cualquier semana para calcular tu asistencia.") + "</p>" +
        "</div>"
      );
    }
    var rules = s.rules;
    var statusClass = s.status === "lost" ? "lost" : s.status === "risk" ? "risk" : "ok";
    var icon = s.status === "lost" ? "🔴" : s.status === "risk" ? "🟠" : "🟢";
    var msg = s.status === "lost"
      ? "Perdiste el módulo: superaste " + rules.maxAbsenceHours + " h de inasistencia (" + rules.maxAbsencePct * 100 + "% de " + rules.totalHours + " h)."
      : s.status === "risk"
        ? "Alerta: te quedan " + Math.max(0, s.remainingBeforeLoss) + " h antes del límite reglamentario."
        : "Asistencia en regla: " + s.hoursAttended + " h de " + rules.totalHours + " h.";

    return (
      '<div class="iub-attendance-panel ' + statusClass + '">' +
      "<h3>" + icon + " Reglamento de asistencia</h3>" +
      "<p>Módulo presencial: <strong>" + rules.hoursPerSession + " h × " + rules.sessionsForAttendance + " semanas = " + rules.totalHours + " h</strong>. " +
      "Puedes perder hasta <strong>" + rules.maxAbsenceHours + " h</strong> (" + (rules.maxAbsencePct * 100) + "%). Debes asistir al menos <strong>" + rules.minRequiredHours + " h</strong>.</p>" +
      barHtml(s.hoursLost, rules.maxAbsenceHours, statusClass) +
      '<div class="iub-attendance-stats">' +
      "<span>Horas asistidas (equiv.): <strong>" + s.hoursAttended + " h</strong></span>" +
      "<span>Horas no asistidas: <strong>" + s.hoursLost + " h</strong> / " + rules.maxAbsenceHours + " h</span>" +
      "<span>Sesiones registradas: <strong>" + s.sessionCount + "</strong></span>" +
      "</div>" +
      '<p class="iub-attendance-msg">' + msg + "</p>" +
      '<p class="iub-attendance-legend">F = 4 h · T = 1 h · P/M/I = 0 h (justificadas no penalizan)</p>' +
      "</div>"
    );
  }

  function barHtml(value, max, statusClass) {
    var pct = max ? Math.min(100, Math.round((value / max) * 100)) : 0;
    var color = statusClass === "lost" ? "#c62828" : statusClass === "risk" ? "#e65100" : "#2e7d32";
    return (
      '<div class="iub-bar" aria-label="' + value + ' de ' + max + ' horas perdidas">' +
      '<div class="iub-bar-fill" style="width:' + pct + "%;background:" + color + '"></div>' +
      "</div>"
    );
  }

  function evaluationPanelHtml() {
    var r = rulesConfig();
    return (
      '<div class="iub-eval-panel panel">' +
      "<h3>Ponderación de notas por corte</h3>" +
      '<div class="iub-weight-row">' + gradeWeightsHtml() + "</div>" +
      "<ul class=\"iub-eval-list\">" +
      "<li><strong>Semana 5 · Primer corte:</strong> " + r.formativeWeightPct + "% formativa + " + r.evaluationWeightPct + "% evaluación (caso parcial 1)</li>" +
      "<li><strong>Semana 10 · Segundo corte:</strong> " + r.formativeWeightPct + "% formativa + " + r.evaluationWeightPct + "% evaluación (caso parcial 2)</li>" +
      "<li><strong>Semana 14 · Final:</strong> " + r.formativeWeightPct + "% formativa + " + r.evaluationWeightPct + "% evaluación (caso final)</li>" +
      "</ul>" +
      "<p class=\"iub-eval-note\">La nota formativa incluye participación, actividades semanales y gamificación. La evaluación es el caso estudio del corte.</p>" +
      "</div>"
    );
  }

  global.IUBAcademicRules = {
    rulesConfig: rulesConfig,
    summarizeAttendanceRecords: summarizeAttendanceRecords,
    getStudentAttendanceSummary: getStudentAttendanceSummary,
    buildTeacherAttendanceReport: buildTeacherAttendanceReport,
    renderTeacherAttendanceReport: renderTeacherAttendanceReport,
    teacherAttendanceReportHtml: teacherAttendanceReportHtml,
    gradeWeightsHtml: gradeWeightsHtml,
    attendanceSummaryHtml: attendanceSummaryHtml,
    evaluationPanelHtml: evaluationPanelHtml,
    flattenLocalAttendance: flattenLocalAttendance,
    fetchOfferingRoster: fetchOfferingRoster,
  };
})(typeof window !== "undefined" ? window : globalThis);
