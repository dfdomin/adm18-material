(function (global) {
  "use strict";

  var mountedRoot = null;
  var state = { semana: 1, rows: [], group: "", search: "", msg: "" };

  function esc(s) {
    return String(s ?? "").replace(/[&<>"']/g, function (m) {
      return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[m];
    });
  }

  function totalWeeks() {
    var dash = global.IUB_DASHBOARD;
    return (dash && dash.totalWeeks) || 14;
  }

  function weekOptions() {
    var n = totalWeeks();
    var html = "";
    for (var i = 1; i <= n; i++) html += '<option value="' + i + '">Semana ' + i + "</option>";
    return html;
  }

  async function fetchWeekRows(semana) {
    if (!global.GamifSDK) return [];
    var cfg = GamifSDK.getConfig();
    var url = GamifSDK.sbUrl();
    var key = GamifSDK.sbKey();
    if (!url || !key) return [];

    var offering = encodeURIComponent(cfg.offeringCode);
    var headers = { apikey: key, Authorization: "Bearer " + key };

    var studsRes = await fetch(
      url + "/rest/v1/v_legacy_students?select=cc,name,grupo,horario"
        + "&offering_code=eq." + offering + "&order=name",
      { headers: headers }
    );
    if (!studsRes.ok) throw new Error("Estudiantes HTTP " + studsRes.status);
    var students = await studsRes.json();

    var progRes = await fetch(
      url + "/rest/v1/v_legacy_student_progress?select=*"
        + "&offering_code=eq." + offering
        + "&semana=eq." + semana,
      { headers: headers }
    );
    if (!progRes.ok) throw new Error("Progreso HTTP " + progRes.status);
    var progress = await progRes.json();
    var byCc = {};
    progress.forEach(function (p) {
      byCc[String(p.student_id)] = p;
    });

    return (students || []).map(function (s) {
      var p = byCc[String(s.cc)] || {};
      var answers = p.quiz_answers || {};
      var phoneXp = Number(p.xp || 0);
      return {
        cc: s.cc,
        name: s.name,
        grupo: s.grupo || "",
        horario: s.horario || "",
        semana: semana,
        phoneXp: phoneXp,
        quizScore: Number(p.quiz_score || 0),
        activityDone: !!p.activity_done,
        validated: !!answers.teacher_validated,
        teacherXp: phoneXp,
        note: "",
        updatedAt: p.updated_at || "",
      };
    });
  }

  function filteredRows() {
    var q = state.search.toLowerCase().trim();
    var rows = state.rows.filter(function (r) {
      if (state.group && r.grupo !== state.group) return false;
      if (state.onlyWithXp && !(r.phoneXp > 0)) return false;
      if (q && !(r.name + " " + r.cc).toLowerCase().includes(q)) return false;
      return true;
    });
    rows.sort(function (a, b) {
      if (b.phoneXp !== a.phoneXp) return b.phoneXp - a.phoneXp;
      return a.name.localeCompare(b.name);
    });
    return rows;
  }

  function groups() {
    var set = {};
    state.rows.forEach(function (r) {
      if (r.grupo) set[r.grupo] = true;
    });
    return Object.keys(set).sort();
  }

  function setMsg(text, ok) {
    state.msg = text;
    var el = mountedRoot && mountedRoot.querySelector("#twv-msg");
    if (el) {
      el.textContent = text || "";
      el.className = ok ? "msg ok" : text ? "msg err" : "msg";
    }
  }

  function refreshGroupSelect() {
    if (!mountedRoot) return;
    var sel = mountedRoot.querySelector("#twv-group");
    if (!sel) return;
    var current = sel.value;
    sel.innerHTML = '<option value="">Todos</option>' + groups().map(function (g) {
      return '<option value="' + esc(g) + '">' + esc(g) + "</option>";
    }).join("");
    sel.value = current || "";
  }

  function renderTable() {
    if (!mountedRoot) return;
    var tbody = mountedRoot.querySelector("#twv-rows");
    if (!tbody) return;
    var rows = filteredRows();
    if (!state.rows.length) {
      tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;padding:2rem;color:var(--muted)">Sin estudiantes en el roster. Importa la lista en Configuración y sincroniza a Supabase.</td></tr>';
      return;
    }
    if (!rows.length) {
      tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;padding:2rem;color:var(--muted)">Ningún estudiante coincide con el filtro. Prueba <strong>Grupo: Todos</strong> y borra la búsqueda.</td></tr>';
      return;
    }

    tbody.innerHTML = rows.map(function (r, idx) {
      var status = r.validated
        ? '<span class="chip p">✓ Validado</span>'
        : (r.phoneXp > 0 ? '<span class="chip t">Pendiente</span>' : '<span class="chip f">Sin XP</span>');
      return '<tr data-idx="' + idx + '" data-cc="' + esc(r.cc) + '">'
        + "<td><strong>" + esc(r.name) + "</strong></td>"
        + "<td>" + esc(r.cc) + "</td>"
        + "<td>" + esc(r.grupo || "—") + "</td>"
        + '<td style="text-align:center"><strong style="font-size:1.1rem;color:var(--primary)">' + r.phoneXp + '</strong> <span style="font-size:.72rem;color:var(--muted)">/ 100</span></td>'
        + "<td>" + Math.round(r.quizScore) + "%</td>"
        + "<td>" + (r.activityDone ? "✅" : "—") + "</td>"
        + '<td><input type="number" min="0" max="100" step="1" class="twv-xp-input" data-cc="' + esc(r.cc) + '" value="' + r.teacherXp + '" style="width:4.5rem;padding:.35rem .5rem;margin:0"></td>'
        + "<td>" + status + "</td>"
        + '<td><button type="button" class="btn-sm btn-gold twv-save-one" data-cc="' + esc(r.cc) + '">Guardar</button></td>'
        + "</tr>";
    }).join("");

    var mTotal = mountedRoot.querySelector("#twv-m-total");
    var mSynced = mountedRoot.querySelector("#twv-m-synced");
    var mValidated = mountedRoot.querySelector("#twv-m-validated");
    if (mTotal) mTotal.textContent = String(state.rows.length);
    if (mSynced) mSynced.textContent = String(state.rows.filter(function (r) { return r.phoneXp > 0; }).length);
    if (mValidated) mValidated.textContent = String(state.rows.filter(function (r) { return r.validated; }).length);
  }

  function findRow(cc) {
    cc = String(cc);
    return state.rows.find(function (r) { return String(r.cc) === cc; });
  }

  async function saveRow(cc) {
    var row = findRow(cc);
    if (!row) return;
    var inputs = mountedRoot.querySelectorAll(".twv-xp-input");
    var input = null;
    for (var i = 0; i < inputs.length; i++) {
      if (inputs[i].getAttribute("data-cc") === String(cc)) {
        input = inputs[i];
        break;
      }
    }
    if (input) row.teacherXp = Math.max(0, Math.min(100, parseInt(input.value, 10) || 0));

    setMsg("Guardando " + row.name + "…", false);
    var res = await GamifSDK.teacherValidateWeek({
      cc: row.cc,
      name: row.name,
      grupo: row.grupo,
      horario: row.horario,
      semana: state.semana,
      xp: row.teacherXp,
      phoneXp: row.phoneXp,
      quizScore: row.quizScore,
      activityDone: row.activityDone || row.teacherXp > 0,
      quizAnswers: row.quizAnswers,
    });

    if (res.ok) {
      row.validated = true;
      row.phoneXp = row.teacherXp;
      setMsg("✓ " + row.name + " — nota " + row.teacherXp + " XP guardada.", true);
      if (global.IUBCelebrate) IUBCelebrate.launch({ message: "✓ " + row.name });
      renderTable();
    } else {
      setMsg("Error al guardar " + row.name + " (HTTP " + (res.status || "?") + ")", false);
    }
  }

  async function validateAllFromPhone() {
    var pending = filteredRows().filter(function (r) { return r.phoneXp > 0; });
    if (!pending.length) {
      setMsg("Nadie tiene XP en el celular para esta semana.", false);
      return;
    }
    setMsg("Validando " + pending.length + " estudiante(s)…", false);
    var ok = 0;
    for (var i = 0; i < pending.length; i++) {
      var r = pending[i];
      r.teacherXp = r.phoneXp;
      var res = await GamifSDK.teacherValidateWeek({
        cc: r.cc,
        name: r.name,
        grupo: r.grupo,
        horario: r.horario,
        semana: state.semana,
        xp: r.teacherXp,
        phoneXp: r.phoneXp,
        quizScore: r.quizScore,
        activityDone: r.activityDone || r.teacherXp > 0,
      });
      if (res.ok) {
        r.validated = true;
        ok++;
      }
    }
    setMsg("✓ " + ok + " de " + pending.length + " validados con XP del celular.", true);
    renderTable();
  }

  async function refresh() {
    if (!mountedRoot) return;
    setMsg("Cargando semana " + state.semana + "…", false);
    try {
      state.rows = await fetchWeekRows(state.semana);
      refreshGroupSelect();
      renderTable();
      var withXp = state.rows.filter(function (r) { return r.phoneXp > 0; }).length;
      setMsg(
        "Actualizado: " + state.rows.length + " estudiantes, " + withXp + " con XP en la base de datos. "
        + "El progreso se guarda automáticamente al hacer actividades en la semana.",
        true
      );
    } catch (e) {
      setMsg("Error: " + (e.message || e), false);
    }
  }

  function wireEvents() {
    if (!mountedRoot) return;
    mountedRoot.addEventListener("click", function (ev) {
      var btn = ev.target.closest(".twv-save-one");
      if (btn) saveRow(btn.getAttribute("data-cc"));
      if (ev.target.id === "twv-refresh") refresh();
      if (ev.target.id === "twv-validate-all") validateAllFromPhone();
    });
    mountedRoot.addEventListener("change", function (ev) {
      if (ev.target.id === "twv-semana") {
        state.semana = parseInt(ev.target.value, 10) || 1;
        refresh();
      }
      if (ev.target.id === "twv-group") {
        state.group = ev.target.value;
        renderTable();
      }
    });
    mountedRoot.addEventListener("input", function (ev) {
      if (ev.target.id === "twv-search") {
        state.search = ev.target.value;
        renderTable();
      }
      if (ev.target.id === "twv-only-xp") {
        state.onlyWithXp = ev.target.checked;
        renderTable();
      }
    });
  }

  function buildShell() {
    var groupOpts = '<option value="">Todos</option>' + groups().map(function (g) {
      return '<option value="' + esc(g) + '">' + esc(g) + "</option>";
    }).join("");

    return ''
      + '<div class="summary">'
      + '<div class="metric"><span>Estudiantes</span><strong id="twv-m-total">0</strong></div>'
      + '<div class="metric"><span>Con XP en celular</span><strong id="twv-m-synced">0</strong></div>'
      + '<div class="metric"><span>Validados</span><strong id="twv-m-validated">0</strong></div>'
      + "</div>"
      + '<div class="panel">'
      + "<p style=\"margin:0 0 .8rem;font-size:.9rem;color:var(--muted)\">"
      + "📱 <strong>Cómo usar:</strong> el XP se guarda solo en la base de datos al hacer actividades. "
      + "Confirma la columna <em>XP celular</em> con el estudiante o ajusta la nota manualmente con <em>Guardar</em>."
      + "</p>"
      + '<div class="toolbar">'
      + '<div><label for="twv-semana">Semana</label><select id="twv-semana">' + weekOptions() + "</select></div>"
      + '<div><label for="twv-group">Grupo</label><select id="twv-group">' + groupOpts + "</select></div>"
      + '<div><label for="twv-search">Buscar</label><input id="twv-search" placeholder="Nombre o CC (ej. 1001892647)"></div>'
      + '<div><label for="twv-only-xp">&nbsp;</label><label style="text-transform:none;font-weight:600;font-size:.85rem"><input type="checkbox" id="twv-only-xp" style="width:auto;margin:0 .35rem 0 0"> Solo con XP en celular</label></div>'
      + "</div>"
      + '<div class="actions-row">'
      + '<button type="button" class="btn-gold" id="twv-validate-all">✓ Validar todos (XP del celular)</button>'
      + '<button type="button" id="twv-refresh">🔄 Actualizar desde nube</button>'
      + "</div>"
      + '<p class="msg" id="twv-msg"></p>'
      + '<div class="table-wrap"><table>'
      + "<thead><tr>"
      + "<th>Estudiante</th><th>CC</th><th>Grupo</th>"
      + "<th>XP celular</th><th>Quiz</th><th>Actividad</th>"
      + "<th>Nota docente</th><th>Estado</th><th></th>"
      + "</tr></thead>"
      + '<tbody id="twv-rows"></tbody>'
      + "</table></div>"
      + "</div>";
  }

  function mount(rootId) {
    mountedRoot = document.getElementById(rootId);
    if (!mountedRoot) return;
    state.semana = 1;
    mountedRoot.innerHTML = buildShell();
    var sel = mountedRoot.querySelector("#twv-semana");
    if (sel) sel.value = String(state.semana);
    wireEvents();
    refresh();
  }

  global.IUBTeacherWeekValidator = {
    mount: mount,
    refresh: refresh,
  };
})(typeof window !== "undefined" ? window : globalThis);
