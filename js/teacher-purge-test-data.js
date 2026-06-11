(function (global) {
  "use strict";

  var DEFAULT_PROGRESS_WIPE = {
    "ADM18-2026-2": ["1042856266", "1043448681", "12345"],
    "TD-2026-2": ["1050544752", "1043663975", "1007890090", "1007971817", "12345"],
  };

  function esc(s) {
    return global.GamifSDK ? GamifSDK.esc(s) : String(s ?? "");
  }

  function parseRpcBody(result) {
    if (!result || !result.body) return null;
    try {
      return JSON.parse(result.body);
    } catch (e) {
      return { raw: result.body };
    }
  }

  async function rpc(fn, payload) {
    if (!global.GamifSDK) return { ok: false, error: "GamifSDK no cargado" };
    var result = await GamifSDK.callRpc(fn, payload || {});
    var data = parseRpcBody(result);
    if (!result.ok) {
      return {
        ok: false,
        error: (data && data.message) || result.body || ("HTTP " + result.status),
        status: result.status,
      };
    }
    return { ok: true, data: data };
  }

  async function preview(offeringCode) {
    return rpc("preview_test_data_cleanup", {
      p_offering_code: offeringCode || GamifSDK.getOfferingCode(),
    });
  }

  async function purgeHarnessStudents(offeringCode) {
    return rpc("purge_harness_students", {
      p_offering_code: offeringCode || null,
    });
  }

  async function purgeStudentProgress(offeringCode, ccList) {
    return rpc("purge_student_progress", {
      p_offering_code: offeringCode,
      p_cc_list: ccList,
    });
  }

  async function purgeAllTestData() {
    return rpc("purge_all_test_data", {});
  }

  function renderPreview(root, data) {
    var harness = (data && data.harness_students) || [];
    var progress = (data && data.test_progress) || [];
    var offering = GamifSDK.getOfferingCode();
    var wipeList = (data && data.default_progress_cc && data.default_progress_cc[offering])
      || DEFAULT_PROGRESS_WIPE[offering]
      || [];

    var html = "";
    html += '<div class="panel" style="margin-top:1rem;border-color:#ef9a9a">';
    html += '<h3 style="color:var(--red);margin-bottom:.6rem">Limpiar datos de prueba (Harness)</h3>';
    html += '<p style="font-size:.84rem;color:var(--muted);margin-bottom:.8rem">';
    html += "Elimina estudiantes ficticios (grupo <strong>Harness</strong>, CC 12345, etc.) ";
    html += "y borra el progreso XP generado por las pruebas automáticas. ";
    html += "<strong>No quita estudiantes reales del roster</strong> — solo su XP de prueba.";
    html += "</p>";

    html += "<p><strong>Estudiantes ficticios en Supabase:</strong> " + harness.length + "</p>";
    if (harness.length) {
      html += '<div class="table-wrap" style="max-height:160px;overflow:auto;margin:.5rem 0"><table><thead><tr>';
      html += "<th>CC</th><th>Nombre</th><th>Grupo</th><th>Offering</th></tr></thead><tbody>";
      harness.forEach(function (r) {
        html += "<tr><td>" + esc(r.cc) + "</td><td>" + esc(r.name) + "</td><td>" + esc(r.grupo)
          + "</td><td>" + esc(r.offering_code) + "</td></tr>";
      });
      html += "</tbody></table></div>";
    }

    html += "<p><strong>Progreso de prueba detectado:</strong> " + progress.length + " fila(s)</p>";
    if (progress.length) {
      html += '<div class="table-wrap" style="max-height:160px;overflow:auto;margin:.5rem 0"><table><thead><tr>';
      html += "<th>CC</th><th>Nombre</th><th>XP</th><th>Semanas</th><th>Módulo</th></tr></thead><tbody>";
      progress.forEach(function (r) {
        html += "<tr><td>" + esc(r.cc) + "</td><td>" + esc(r.name) + "</td><td>" + esc(r.xp_total)
          + "</td><td>" + esc(r.semanas_visitadas) + "</td><td>" + esc(r.offering_code) + "</td></tr>";
      });
      html += "</tbody></table></div>";
    }

    html += '<p style="font-size:.82rem;color:var(--muted)">CC a limpiar en <strong>' + esc(offering)
      + "</strong>: " + esc(wipeList.join(", ")) + "</p>";

    html += '<div class="actions-row">';
    html += '<button type="button" class="btn-sm" data-purge-action="refresh">Actualizar vista</button>';
    html += '<button type="button" class="btn-red btn-sm" data-purge-action="harness">Eliminar ficticios (Harness)</button>';
    html += '<button type="button" class="btn-red btn-sm" data-purge-action="progress">Borrar solo progreso de prueba</button>';
    html += '<button type="button" class="btn-red" data-purge-action="all">Limpieza completa (Harness + progreso ADM18 y TD)</button>';
    html += "</div>";
    html += '<p class="msg" id="purgeTestMsg"></p>';
    html += "</div>";

    root.innerHTML = html;
    root.dataset.wipeList = JSON.stringify(wipeList);
  }

  function setMsg(text, ok) {
    var el = document.getElementById("purgeTestMsg");
    if (!el) return;
    el.textContent = text || "";
    el.className = "msg" + (ok ? " ok" : text ? " err" : "");
  }

  async function refresh(root) {
    setMsg("Cargando vista previa…", false);
    var res = await preview();
    if (!res.ok) {
      var hint = res.status === 404
        ? " Ejecuta setup/migrations/012_purge_test_data.sql en Supabase SQL Editor."
        : "";
      setMsg("Error: " + res.error + hint, false);
      return;
    }
    renderPreview(root, res.data);
    setMsg("Vista actualizada.", true);
  }

  async function mount(containerId) {
    var root = document.getElementById(containerId);
    if (!root) return;
    if (!root.dataset.wired) {
      root.dataset.wired = "1";
      root.addEventListener("click", async function (e) {
        var btn = e.target.closest("[data-purge-action]");
        if (!btn) return;
        var action = btn.getAttribute("data-purge-action");
        if (action === "refresh") {
          refresh(root);
          return;
        }
        var offering = GamifSDK.getOfferingCode();
        var wipeList = [];
        try { wipeList = JSON.parse(root.dataset.wipeList || "[]"); } catch (err) { /* ignore */ }

        if (action === "harness") {
          if (!confirm("¿Eliminar TODOS los estudiantes ficticios Harness de TODOS los módulos en Supabase?")) return;
          setMsg("Eliminando ficticios…", false);
          var h = await purgeHarnessStudents(null);
          setMsg(h.ok ? "Ficticios eliminados: " + JSON.stringify(h.data) : h.error, h.ok);
          if (h.ok) refresh(root);
          return;
        }

        if (action === "progress") {
          if (!confirm("¿Borrar progreso de prueba en " + offering + " para: " + wipeList.join(", ") + "?")) return;
          setMsg("Borrando progreso…", false);
          var p = await purgeStudentProgress(offering, wipeList);
          setMsg(p.ok ? "Progreso borrado: " + JSON.stringify(p.data) : p.error, p.ok);
          if (p.ok) refresh(root);
          return;
        }

        if (action === "all") {
          if (!confirm("Limpieza COMPLETA: ficticios Harness + progreso de prueba ADM18 y TD. ¿Continuar?")) return;
          setMsg("Ejecutando limpieza completa…", false);
          var a = await purgeAllTestData();
          setMsg(a.ok ? "Listo: " + JSON.stringify(a.data) : a.error, a.ok);
          if (a.ok) refresh(root);
        }
      });
    }
    await refresh(root);
  }

  global.IUBTeacherPurgeTestData = {
    DEFAULT_PROGRESS_WIPE: DEFAULT_PROGRESS_WIPE,
    preview: preview,
    purgeHarnessStudents: purgeHarnessStudents,
    purgeStudentProgress: purgeStudentProgress,
    purgeAllTestData: purgeAllTestData,
    mount: mount,
  };
})(typeof window !== "undefined" ? window : globalThis);
