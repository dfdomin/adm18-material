(function (global) {
  "use strict";

  var SESSION_KEY = "iub_teacher_session";

  function sbUrl() {
    return (global.GamifSDK && GamifSDK.sbUrl()) || global.SUPABASE_URL || "";
  }

  function sbKey() {
    return (global.GamifSDK && GamifSDK.sbKey()) || global.SUPABASE_KEY || "";
  }

  function getSession() {
    try {
      var raw = sessionStorage.getItem(SESSION_KEY);
      if (!raw) return null;
      var s = JSON.parse(raw);
      if (!s || !s.ok || !s.expires) return null;
      if (Date.now() > s.expires) {
        sessionStorage.removeItem(SESSION_KEY);
        return null;
      }
      return s;
    } catch (e) {
      return null;
    }
  }

  function saveSession(data) {
    var session = {
      ok: true,
      username: data.username,
      display_name: data.display_name || data.username,
      modules: data.modules || [],
      expires: Date.now() + 8 * 60 * 60 * 1000,
    };
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
    return session;
  }

  function logout() {
    sessionStorage.removeItem(SESSION_KEY);
  }

  function moduleAllowed(session) {
    if (!session || !session.modules || !session.modules.length) return true;
    var mod = global.MODULE_CODE || localStorage.getItem("gamif_module_code") || "";
    if (!mod) return true;
    return session.modules.some(function (m) {
      return String(m).toUpperCase() === String(mod).toUpperCase();
    });
  }

  async function login(username, password) {
    var url = sbUrl();
    var key = sbKey();
    if (!url || !key) return { ok: false, error: "Supabase no configurado" };
    if (!username || !password) return { ok: false, error: "Usuario y contraseña requeridos" };

    var res = await fetch(url + "/rest/v1/rpc/verify_teacher_login", {
      method: "POST",
      headers: {
        apikey: key,
        Authorization: "Bearer " + key,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        p_username: String(username).trim(),
        p_password: String(password),
      }),
    });

    if (!res.ok) {
      var bodyText = "";
      try { bodyText = await res.text(); } catch (e) { /* ignore */ }
      if (res.status === 404 && /crypt|verify_teacher_login|42883/i.test(bodyText)) {
        return {
          ok: false,
          error: "Login docente no activo en Supabase. Ejecuta setup/migrations/009_fix_teacher_login_pgcrypto.sql en el SQL Editor.",
        };
      }
      return { ok: false, error: "Error de servidor (" + res.status + ")" };
    }

    var data = await res.json();
    if (!data || !data.ok) return { ok: false, error: "Usuario o contraseña incorrectos" };
    var session = saveSession(data);
    if (!moduleAllowed(session)) {
      logout();
      return { ok: false, error: "Sin acceso a este módulo" };
    }
    return { ok: true, session: session };
  }

  function requireAuth(options) {
    options = options || {};
    var session = getSession();
    if (session && moduleAllowed(session)) {
      if (typeof options.onSuccess === "function") options.onSuccess(session);
      return Promise.resolve({ ok: true, session: session });
    }
    if (typeof options.onFail === "function") options.onFail();
    return Promise.resolve({ ok: false });
  }

  function bindLoginForm(formOptions) {
    formOptions = formOptions || {};
    var userEl = document.getElementById(formOptions.userId || "teacherUser");
    var passEl = document.getElementById(formOptions.passId || "teacherPass");
    var msgEl = document.getElementById(formOptions.msgId || "teacherLoginMsg");
    var loginSec = document.getElementById(formOptions.loginId || "login");
    var appSec = document.getElementById(formOptions.appId || "app");

    function showMsg(text, isErr) {
      if (!msgEl) return;
      msgEl.textContent = text || "";
      msgEl.className = isErr ? "msg err" : "msg ok";
    }

    async function attempt() {
      showMsg("Verificando…", false);
      var result = await login(userEl && userEl.value, passEl && passEl.value);
      if (!result.ok) {
        showMsg(result.error || "Acceso denegado", true);
        return;
      }
      if (loginSec) loginSec.hidden = true;
      if (appSec) appSec.hidden = false;
      showMsg("");
      if (typeof formOptions.onSuccess === "function") formOptions.onSuccess(result.session);
    }

    var btn = document.getElementById(formOptions.btnId || "teacherLoginBtn");
    if (btn) btn.addEventListener("click", attempt);
    if (passEl) {
      passEl.addEventListener("keydown", function (ev) {
        if (ev.key === "Enter") attempt();
      });
    }

    requireAuth({
      onSuccess: function (session) {
        if (loginSec) loginSec.hidden = true;
        if (appSec) appSec.hidden = false;
        if (typeof formOptions.onSuccess === "function") formOptions.onSuccess(session);
      },
    });
  }

  global.TeacherAuth = {
    login: login,
    logout: logout,
    getSession: getSession,
    requireAuth: requireAuth,
    bindLoginForm: bindLoginForm,
    moduleAllowed: moduleAllowed,
  };
})(typeof window !== "undefined" ? window : globalThis);
