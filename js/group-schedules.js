/**
 * Horarios por grupo · sesiones semanales (asistencia y roster).
 * Cada sesión registrada en Participación cuenta las horas de ese bloque.
 */
(function (global) {
  "use strict";

  var BUILTIN = {
    "6_GA_G1": {
      horario: "LUNES 2h + MIERCOLES 2h",
      label: "Lunes y Miércoles (2 h cada día)",
      sessions: [
        { weekday: 1, dayLabel: "LUNES", hours: 2 },
        { weekday: 3, dayLabel: "MIERCOLES", hours: 2 },
      ],
    },
    "6_GA_G2": {
      horario: "MIÉRCOLES 07:00-10:59 SALÓN CENH P1-7",
      label: "Miércoles (4 h)",
      sessions: [{ weekday: 3, dayLabel: "MIERCOLES", hours: 4 }],
    },
  };

  function allSchedules() {
    var dash = global.IUB_DASHBOARD || {};
    var extra = dash.groupSchedules || {};
    var out = {};
    Object.keys(BUILTIN).forEach(function (k) { out[k] = BUILTIN[k]; });
    Object.keys(extra).forEach(function (k) { out[k] = extra[k]; });
    return out;
  }

  function forGrupo(grupo) {
    if (!grupo) return null;
    return allSchedules()[String(grupo).trim()] || null;
  }

  function looksLikeSchedule(text) {
    return /(LUNES|MARTES|MIERCOLES|MIÉRCOLES|JUEVES|VIERNES|SABADO|SÁBADO|DOMINGO|\d{1,2}:\d{2}|\d+\s*h\b)/i.test(String(text || ""));
  }

  function normalizeHorario(grupo, horario) {
    var def = forGrupo(grupo);
    if (!def) return String(horario || "").trim();
    var h = String(horario || "").trim();
    if (!h || !looksLikeSchedule(h)) return def.horario;
    return h;
  }

  function sessionWeekdays(grupo) {
    var def = forGrupo(grupo);
    if (!def || !def.sessions) return [];
    return def.sessions.map(function (s) { return s.weekday; });
  }

  function parseDateLocal(dateStr) {
    var parts = String(dateStr || "").split("-");
    return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]), 12);
  }

  function isSessionDate(grupo, dateStr) {
    var def = forGrupo(grupo);
    if (!def || !def.sessions || !dateStr) return null;
    var day = parseDateLocal(dateStr).getDay();
    return def.sessions.some(function (s) { return s.weekday === day; });
  }

  function sessionDateForWeekday(refDate, weekday) {
    var d = refDate ? new Date(refDate) : new Date();
    var day = d.getDay();
    var mondayOffset = day === 0 ? -6 : 1 - day;
    var monday = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    monday.setDate(monday.getDate() + mondayOffset);
    var session = new Date(monday);
    session.setDate(monday.getDate() + (weekday === 0 ? 6 : weekday - 1));
    return session.toISOString().slice(0, 10);
  }

  function nearestSessionDate(grupo, refDate) {
    var def = forGrupo(grupo);
    if (!def || !def.sessions || !def.sessions.length) return null;
    var ref = refDate ? parseDateLocal(refDate) : new Date();
    var best = null;
    var bestDiff = Infinity;
    def.sessions.forEach(function (s) {
      var candidate = sessionDateForWeekday(ref, s.weekday);
      var diff = Math.abs(parseDateLocal(candidate) - ref);
      if (diff < bestDiff) {
        bestDiff = diff;
        best = candidate;
      }
    });
    return best;
  }

  function hoursForSession(grupo, dateStr) {
    var def = forGrupo(grupo);
    if (!def || !def.sessions || !dateStr) {
      var dash = global.IUB_DASHBOARD || {};
      return dash.hoursPerSession || 4;
    }
    var day = parseDateLocal(dateStr).getDay();
    for (var i = 0; i < def.sessions.length; i++) {
      if (def.sessions[i].weekday === day) return def.sessions[i].hours;
    }
    return def.sessions[0].hours || 4;
  }

  function hoursLostForRow(row, cfg) {
    var rules = cfg || (global.IUBAcademicRules && IUBAcademicRules.rulesConfig()) || { hourLossByState: { F: 4, T: 1 } };
    var estado = String((row && row.estado) || "").toUpperCase();
    if (!estado || estado === "-") return 0;
    var sessionHours = hoursForSession(row.grupo, row.fecha);
    if (estado === "F") return sessionHours;
    if (estado === "T") return Math.min(1, sessionHours);
    return 0;
  }

  global.IUBGroupSchedules = {
    forGrupo: forGrupo,
    normalizeHorario: normalizeHorario,
    sessionWeekdays: sessionWeekdays,
    isSessionDate: isSessionDate,
    sessionDateForWeekday: sessionDateForWeekday,
    nearestSessionDate: nearestSessionDate,
    hoursForSession: hoursForSession,
    hoursLostForRow: hoursLostForRow,
    looksLikeSchedule: looksLikeSchedule,
  };
})(typeof window !== "undefined" ? window : globalThis);
