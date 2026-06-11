(function (global) {
  "use strict";

  var mountedRoot = null;
  var cachedReport = null;
  var filterGroup = "";
  var filterSearch = "";
  var showWithout = false;

  function esc(s) {
    return global.GamifSDK ? GamifSDK.esc(s) : String(s ?? "");
  }

  function fmtDate(iso) {
    if (!iso) return "—";
    return String(iso).slice(0, 10);
  }

  function barHtml(value, max, color) {
    var pct = max > 0 ? Math.round((value / max) * 100) : 0;
    return '<div class="iub-bar"><div class="iub-bar-fill" style="width:' + pct + "%;background:" + (color || "#2d3a5e") + '"></div></div>';
  }

  async function fetchReport(offeringCode) {
    if (!global.GamifSDK) throw new Error("GamifSDK no cargado");
    var offering = offeringCode || GamifSDK.getOfferingCode();
    var url = GamifSDK.sbUrl();
    var key = GamifSDK.sbKey();
    if (!url || !key) throw new Error("Supabase no configurado");

    var headers = { apikey: key, Authorization: "Bearer " + key };
    var enc = encodeURIComponent(offering);

    var studsRes = await fetch(
      url + "/rest/v1/v_legacy_students?select=cc,name,grupo,horario&offering_code=eq." + enc + "&order=grupo,name",
      { headers: headers }
    );
    if (!studsRes.ok) throw new Error("Estudiantes HTTP " + studsRes.status);
    var students = await studsRes.json();

    var progRes = await fetch(
      url + "/rest/v1/v_legacy_student_progress?select=student_id,semana,xp,quiz_score,activity_done,updated_at&offering_code=eq."
        + enc + "&order=student_id,semana",
      { headers: headers }
    );
    if (!progRes.ok) throw new Error("Progreso HTTP " + progRes.status);
    var progress = await progRes.json();

    var byStudent = new Map();
    students.forEach(function (s) {
      byStudent.set(String(s.cc), {
        cc: s.cc,
        name: s.name,
        grupo: s.grupo || "",
        horario: s.horario || "",
        weeks: {},
        totalXp: 0,
        weeksWithXp: 0,
        lastUpdate: null,
      });
    });

    progress.forEach(function (p) {
      var cc = String(p.student_id);
      var row = byStudent.get(cc);
      if (!row) {
        row = { cc: cc, name: String(p.student_id), grupo: "", horario: "", weeks: {}, totalXp: 0, weeksWithXp: 0, lastUpdate: null };
        byStudent.set(cc, row);
      }
      var xp = Number(p.xp || 0);
      if (xp > 0 || p.activity_done) {
        row.weeks[p.semana] = {
          xp: xp,
          quiz: Number(p.quiz_score || 0),
          activity: !!p.activity_done,
          updated: p.updated_at,
        };
        if (xp > 0) {
          row.totalXp += xp;
          row.weeksWithXp += 1;
        }
        if (p.updated_at && (!row.lastUpdate || p.updated_at > row.lastUpdate)) {
          row.lastUpdate = p.updated_at;
        }
      }
    });

    var rows = Array.from(byStudent.values()).sort(function (a, b) {
      return b.totalXp - a.totalXp || String(a.name).localeCompare(String(b.name), "es");
    });
    var withXp = rows.filter(function (r) { return r.weeksWithXp > 0; });
    var withoutXp = rows.filter(function (r) { return r.weeksWithXp === 0; });
    var weekCoverage = {};
    for (var w = 1; w <= 14; w++) {
      weekCoverage[w] = progress.filter(function (p) { return p.semana === w && Number(p.xp) > 0; }).length;
    }

    var groups = {};
    students.forEach(function (s) {
      if (s.grupo) groups[s.grupo] = true;
    });

    return {
      generatedAt: new Date().toISOString(),
      offering: offering,
      rosterTotal: rows.length,
      withCloudXp: withXp.length,
      withoutCloudXp: withoutXp.length,
      weekCoverage: weekCoverage,
      studentsWithXp: withXp,
      studentsWithoutXp: withoutXp,
      groups: Object.keys(groups).sort(),
    };
  }

  function weekCoverageHtml(report) {
    var max = 1;
    for (var w = 1; w <= 14; w++) {
      max = Math.max(max, report.weekCoverage[w] || 0);
    }
    var html = '<div class="table-wrap"><table><thead><tr><th>Semana</th><th>Estudiantes con XP</th><th>Cobertura</th></tr></thead><tbody>';
    for (var i = 1; i <= 14; i++) {
      var n = report.weekCoverage[i] || 0;
      html += "<tr><td>S" + i + "</td><td>" + n + "</td><td>" + barHtml(n, max, "#2d3a5e") + "</td></tr>";
    }
    html += "</tbody></table></div>";
    return html;
  }

  function filteredWithXp(report) {
    var q = filterSearch.toLowerCase().trim();
    return report.studentsWithXp.filter(function (r) {
      if (filterGroup && r.grupo !== filterGroup) return false;
      if (!q) return true;
      return String(r.name).toLowerCase().indexOf(q) >= 0 || String(r.cc).indexOf(q) >= 0;
    });
  }

  function filteredWithoutXp(report) {
    var q = filterSearch.toLowerCase().trim();
    return report.studentsWithoutXp.filter(function (r) {
      if (filterGroup && r.grupo !== filterGroup) return false;
      if (!q) return true;
      return String(r.name).toLowerCase().indexOf(q) >= 0 || String(r.cc).indexOf(q) >= 0;
    });
  }

  function renderPanel(report) {
    if (!mountedRoot) return;
    var pct = report.rosterTotal ? Math.round((report.withCloudXp / report.rosterTotal) * 100) : 0;
    var withRows = filteredWithXp(report);
    var withoutRows = filteredWithoutXp(report);

    var groupOpts = '<option value="">Todos los grupos</option>';
    report.groups.forEach(function (g) {
      groupOpts += '<option value="' + esc(g) + '"' + (filterGroup === g ? " selected" : "") + ">" + esc(g) + "</option>";
    });

    var html = "";
    html += '<div class="summary">';
    html += '<div class="metric"><span>Roster</span><strong>' + report.rosterTotal + "</strong></div>";
    html += '<div class="metric"><span>Con XP en nube</span><strong style="color:var(--green)">' + report.withCloudXp + "</strong></div>";
    html += '<div class="metric"><span>Sin XP en nube</span><strong style="color:var(--orange)">' + report.withoutCloudXp + "</strong></div>";
    html += '<div class="metric"><span>Cobertura roster</span><strong>' + pct + "%</strong></div>";
    html += "</div>";

    html += '<p class="msg" style="min-height:auto;color:var(--muted)">';
    html += esc(report.offering) + " · actualizado " + fmtDate(report.generatedAt) + " · fuente Supabase";
    html += "</p>";

    html += '<div class="toolbar">';
    html += '<div><label for="cloudGroup">Grupo</label><select id="cloudGroup">' + groupOpts + "</select></div>";
    html += '<div><label for="cloudSearch">Buscar</label><input id="cloudSearch" placeholder="Nombre o CC" value="' + esc(filterSearch) + '"></div>';
    html += "</div>";

    html += '<div class="actions-row">';
    html += '<button class="btn-gold" type="button" data-cloud-action="refresh">Actualizar desde Supabase</button>';
    html += '<button type="button" data-cloud-action="export-json">Descargar JSON</button>';
    html += '<button type="button" data-cloud-action="toggle-without">' + (showWithout ? "Ocultar sin XP" : "Ver sin XP (" + withoutRows.length + ")") + "</button>";
    html += "</div>";
    html += '<p class="msg" id="cloudReportMsg"></p>';

    html += '<div class="card-row">';
    html += '<div class="panel"><strong style="color:var(--primary)">Cobertura por semana</strong>';
    html += '<p class="msg" style="min-height:auto">Estudiantes con XP &gt; 0 en cada semana.</p>';
    html += weekCoverageHtml(report);
    html += "</div>";
    html += '<div class="panel"><strong style="color:var(--primary)">Con progreso en nube</strong>';
    html += '<p class="msg" style="min-height:auto">' + withRows.length + " estudiante(s) con filtros actuales.</p>";
    html += '<div class="table-wrap"><table><thead><tr><th>Nombre</th><th>CC</th><th>Grupo</th><th>Sem.</th><th>XP</th><th>Última</th></tr></thead><tbody>';
    if (!withRows.length) {
      html += '<tr><td colspan="6">Nadie con XP para este filtro.</td></tr>';
    } else {
      withRows.forEach(function (r) {
        html += "<tr><td>" + esc(r.name) + "</td><td>" + esc(r.cc) + "</td><td>" + esc(r.grupo) + "</td><td>" + r.weeksWithXp
          + "</td><td><strong>" + r.totalXp + "</strong></td><td>" + fmtDate(r.lastUpdate) + "</td></tr>";
      });
    }
    html += "</tbody></table></div></div></div>";

    if (showWithout) {
      html += '<div class="panel"><strong style="color:var(--primary)">Sin XP en nube</strong>';
      html += '<p class="msg" style="min-height:auto">Aún no han identificado cédula o no han completado actividad.</p>';
      html += '<div class="table-wrap"><table><thead><tr><th>Nombre</th><th>CC</th><th>Grupo</th></tr></thead><tbody>';
      if (!withoutRows.length) {
        html += '<tr><td colspan="3">Nadie en este filtro.</td></tr>';
      } else {
        withoutRows.forEach(function (r) {
          html += "<tr><td>" + esc(r.name) + "</td><td>" + esc(r.cc) + "</td><td>" + esc(r.grupo || "—") + "</td></tr>";
        });
      }
      html += "</tbody></table></div></div>";
    }

    mountedRoot.innerHTML = html;

    var groupEl = document.getElementById("cloudGroup");
    var searchEl = document.getElementById("cloudSearch");
    if (groupEl) {
      groupEl.addEventListener("change", function () {
        filterGroup = groupEl.value;
        renderPanel(cachedReport);
      });
    }
    if (searchEl) {
      searchEl.addEventListener("input", function () {
        filterSearch = searchEl.value;
        renderPanel(cachedReport);
      });
    }
  }

  function setMsg(text, ok) {
    var el = document.getElementById("cloudReportMsg");
    if (!el) return;
    el.textContent = text || "";
    el.className = "msg" + (ok ? " ok" : text ? " err" : "");
  }

  function downloadJson(report) {
    var blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "adm18-progreso-nube-" + fmtDate(report.generatedAt) + ".json";
    a.click();
    URL.revokeObjectURL(a.href);
  }

  async function refresh() {
    if (!mountedRoot) return;
    setMsg("Cargando desde Supabase…", false);
    try {
      cachedReport = await fetchReport();
      renderPanel(cachedReport);
      setMsg("Datos actualizados.", true);
    } catch (e) {
      setMsg(e.message || String(e), false);
    }
  }

  function mount(containerId) {
    mountedRoot = document.getElementById(containerId);
    if (!mountedRoot) return;
    if (!mountedRoot.dataset.wired) {
      mountedRoot.dataset.wired = "1";
      mountedRoot.addEventListener("click", function (e) {
        var btn = e.target.closest("[data-cloud-action]");
        if (!btn) return;
        var action = btn.getAttribute("data-cloud-action");
        if (action === "refresh") refresh();
        if (action === "export-json" && cachedReport) downloadJson(cachedReport);
        if (action === "toggle-without") {
          showWithout = !showWithout;
          if (cachedReport) renderPanel(cachedReport);
        }
      });
    }
    if (cachedReport) {
      renderPanel(cachedReport);
    } else {
      refresh();
    }
  }

  global.IUBAdm18CloudReport = {
    fetchReport: fetchReport,
    mount: mount,
    refresh: refresh,
  };
})(typeof window !== "undefined" ? window : globalThis);
