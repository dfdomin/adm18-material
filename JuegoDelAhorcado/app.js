const STORAGE_STUDENTS = "adm18_students_v1";
const alphabet = "ABCDEFGHIJKLMNÑOPQRSTUVWXYZ".split("");
const bodyOrder = ["head", "torso", "left-arm", "right-arm", "left-leg", "right-leg"];

const WORD_BANK = {
  "LatamBox": [
    "LATAMBOX", "COURIER", "FLETE", "AWB", "MANIFIESTO", "ADUANA",
    "NACIONALIZACION", "INCOTERM", "FOB", "CIF", "DAP", "DDP",
    "TRACKING", "BODEGA", "DESPACHO", "FACTURA", "GUIA AEREA",
  ],
  "Documentos": [
    "GTC 185", "ISO 15489", "LEY 594", "METADATO", "TRD", "TVF",
    "ARCHIVO", "EXPEDIENTE", "PROTOCOLO", "MEMO", "ACTA", "CORREO",
  ],
  "Comercio exterior": [
    "IMPORTACION", "EXPORTACION", "LOGISTICA", "COMERCIO", "CLIENTE",
    "PROVEEDOR", "ORDEN", "EMBARQUE", "CONTENEDOR", "PUERTO", "MIAMI",
  ],
  "Organización": [
    "INFORMACION", "DATO", "PROCESO", "DECISION", "CALIDAD", "TRAZABILIDAD",
    "CLASIFICACION", "NOMENCLATURA", "CARPETA", "VERSION", "RESPALDO",
  ],
};

let selectedStudent = null;

function getStudents() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_STUDENTS) || "[]");
  } catch (e) {
    return [];
  }
}

function setStudents(students) {
  localStorage.setItem(STORAGE_STUDENTS, JSON.stringify(students));
}

function supabaseCredentials() {
  if (typeof GamifSDK !== "undefined") {
    return { url: GamifSDK.sbUrl(), key: GamifSDK.sbKey() };
  }
  return {
    url: window.SUPABASE_URL || localStorage.getItem("adm18_supabase_url"),
    key: window.SUPABASE_KEY || localStorage.getItem("adm18_supabase_key"),
  };
}

async function fetchStudentsFromSupabase() {
  const creds = supabaseCredentials();
  if (!creds.url || !creds.key) return false;
  const offering = encodeURIComponent(
    (typeof GamifSDK !== "undefined" && GamifSDK.getOfferingCode()) || "ADM18-2026-2"
  );
  try {
    let res = await fetch(
      creds.url + "/rest/v1/v_legacy_students?select=cc,name,grupo,horario&offering_code=eq." + offering + "&order=name",
      { headers: { apikey: creds.key, Authorization: "Bearer " + creds.key } }
    );
    if (!res.ok) {
      res = await fetch(creds.url + "/rest/v1/students?select=*&order=name", {
        headers: { apikey: creds.key, Authorization: "Bearer " + creds.key },
      });
    }
    if (!res.ok) return false;
    const data = await res.json();
    if (data && data.length) {
      setStudents(data.map(function(s) {
        return { name: s.name, cc: s.cc, grupo: s.grupo || "", horario: s.horario || "" };
      }));
      return true;
    }
  } catch (e) {
    console.warn("fetchStudentsFromSupabase:", e.message);
  }
  return false;
}

async function initStudents() {
  await fetchStudentsFromSupabase();
  populateStudentSelect();
}

function firstName(fullName) {
  return String(fullName || "").trim().split(/\s+/)[0] || "";
}

function populateStudentSelect() {
  const select = document.getElementById("studentSelect");
  const hint = document.getElementById("studentHint");
  if (!select) return;
  const students = getStudents().slice().sort(function(a, b) {
    return a.name.localeCompare(b.name, "es");
  });
  select.innerHTML = '<option value="">— Elegir estudiante —</option>' +
    students.map(function(s) {
      return '<option value="' + s.cc + '">' + escapeHtml(s.name) + " (" + s.cc + ")</option>";
    }).join("");
  if (hint) {
    hint.textContent = students.length
      ? students.length + " estudiantes cargados (importa más en Participación)."
      : "Sin lista importada. Ve a dashboard/participacion.html → Configuración.";
  }
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, function(m) {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m];
  });
}

function pickStudentByCc(cc) {
  if (!cc) {
    selectedStudent = null;
    updateStudentBadge();
    return;
  }
  selectedStudent = getStudents().find(function(s) { return s.cc === cc; }) || null;
  updateStudentBadge();
}

function pickRandomStudent() {
  const students = getStudents();
  if (!students.length) {
    elements.message.textContent = "Importa estudiantes primero en Participación y Asistencia.";
    return;
  }
  selectedStudent = students[Math.floor(Math.random() * students.length)];
  const select = document.getElementById("studentSelect");
  if (select) select.value = selectedStudent.cc;
  updateStudentBadge();
  elements.message.textContent = "Sorteo: " + selectedStudent.name + " — elige palabra o usa su nombre.";
}

function updateStudentBadge() {
  const badge = document.getElementById("studentBadge");
  if (!badge) return;
  if (!selectedStudent) {
    badge.textContent = "Ningún estudiante seleccionado";
    badge.className = "student-badge";
    return;
  }
  badge.textContent = "🎯 Jugando: " + selectedStudent.name;
  badge.className = "student-badge active";
}

function useStudentFirstName() {
  if (!selectedStudent) {
    elements.message.textContent = "Primero elige o sortea un estudiante.";
    return;
  }
  const name = firstName(selectedStudent.name);
  if (!name || name.length < 3) {
    elements.message.textContent = "El nombre es muy corto para jugar.";
    return;
  }
  elements.input.type = "text";
  elements.input.value = name.toUpperCase();
  elements.input.type = "password";
  renderWord();
  elements.message.textContent = "Palabra = nombre de " + selectedStudent.name + ". Presiona Iniciar.";
}

function loadRandomWord(category) {
  const words = WORD_BANK[category];
  if (!words) return;
  const word = words[Math.floor(Math.random() * words.length)];
  elements.input.type = "text";
  elements.input.value = word;
  elements.input.type = "password";
  renderWord();
  elements.message.textContent = 'Categoría "' + category + '" — presiona Iniciar cuando estés listo.';
  const panel = document.getElementById("word-bank-panel");
  if (panel) panel.style.display = "none";
}

function loadRandomAny() {
  const categories = Object.keys(WORD_BANK);
  loadRandomWord(categories[Math.floor(Math.random() * categories.length)]);
}

const state = {
  secret: "",
  normalizedSecret: "",
  guessed: new Set(),
  mistakes: 0,
  active: false,
  finished: false,
};

const elements = {
  form: document.querySelector("#secretForm"),
  input: document.querySelector("#secretInput"),
  start: document.querySelector("#startButton"),
  clear: document.querySelector("#clearButton"),
  reveal: document.querySelector("#revealButton"),
  newRound: document.querySelector("#newRoundButton"),
  toggleSecret: document.querySelector("#toggleSecretButton"),
  fullscreen: document.querySelector("#fullscreenButton"),
  keyboard: document.querySelector("#keyboard"),
  word: document.querySelector("#wordDisplay"),
  message: document.querySelector("#gameMessage"),
  used: document.querySelector("#usedLetters"),
  mistakes: document.querySelector("#mistakesCount"),
  maxMistakes: document.querySelector("#maxMistakes"),
  status: document.querySelector("#statusChip"),
  parts: document.querySelectorAll(".body-part"),
};

elements.maxMistakes.textContent = String(bodyOrder.length);

function normalizeText(value) {
  return value
    .toLocaleUpperCase("es-CO")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function isGuessableCharacter(character) {
  return /[A-ZÑ]/.test(character);
}

function renderKeyboard() {
  elements.keyboard.innerHTML = "";
  alphabet.forEach(function(letter) {
    const button = document.createElement("button");
    button.className = "key";
    button.type = "button";
    button.textContent = letter;
    button.disabled = !state.active || state.finished || state.guessed.has(letter);
    if (state.guessed.has(letter)) {
      button.classList.add(state.normalizedSecret.includes(letter) ? "correct" : "wrong");
    }
    button.addEventListener("click", function() { guessLetter(letter); });
    elements.keyboard.append(button);
  });
}

function renderWord(reveal) {
  elements.word.innerHTML = "";
  const source = state.secret || elements.input.value || "";
  const normalized = normalizeText(source);
  if (!source.trim()) {
    const empty = document.createElement("span");
    empty.className = "letter-slot";
    empty.textContent = "?";
    elements.word.append(empty);
    return;
  }
  Array.from(source).forEach(function(character, index) {
    const normalizedCharacter = normalized[index] || character;
    const slot = document.createElement("span");
    slot.className = "letter-slot";
    if (character === " ") {
      slot.classList.add("space");
      slot.textContent = "";
    } else if (!isGuessableCharacter(normalizedCharacter)) {
      slot.textContent = character;
    } else if (reveal || state.guessed.has(normalizedCharacter)) {
      slot.textContent = character.toLocaleUpperCase("es-CO");
    } else {
      slot.textContent = "";
    }
    elements.word.append(slot);
  });
}

function renderDrawing() {
  elements.parts.forEach(function(part) {
    const partName = part.dataset.part;
    const partIndex = bodyOrder.indexOf(partName);
    part.classList.toggle("lost", partIndex > -1 && partIndex < state.mistakes);
  });
}

function renderStatus() {
  elements.mistakes.textContent = String(state.mistakes);
  const guessedLetters = Array.from(state.guessed).sort(function(a, b) {
    return a.localeCompare(b, "es");
  });
  elements.used.textContent = guessedLetters.length ? guessedLetters.join(" · ") : "Sin letras usadas";
  elements.status.classList.remove("danger", "win");
  if (!state.active) {
    elements.status.textContent = "Esperando palabra";
  } else if (state.finished && isWinner()) {
    elements.status.textContent = "¡Descubierto!";
    elements.status.classList.add("win");
  } else if (state.finished) {
    elements.status.textContent = "Ronda terminada";
    elements.status.classList.add("danger");
  } else {
    elements.status.textContent = "Adivinando";
  }
}

function renderAll(options) {
  renderWord(options && options.reveal);
  renderDrawing();
  renderStatus();
  renderKeyboard();
}

async function awardWinToStudent() {
  if (!selectedStudent || typeof GamifSDK === "undefined") return;
  await GamifSDK.syncParticipation([{
    cc: selectedStudent.cc,
    points: 3,
    type: "ahorcado",
    name: selectedStudent.name,
    ts: new Date().toISOString(),
  }]);
}

function startGame() {
  const secret = elements.input.value.trim().replace(/\s+/g, " ");
  if (!secret) {
    elements.message.textContent = "Escribe una palabra, usa el banco o el nombre del estudiante.";
    elements.input.focus();
    return;
  }
  state.secret = secret;
  state.normalizedSecret = normalizeText(secret);
  state.guessed = new Set();
  state.mistakes = 0;
  state.active = true;
  state.finished = false;
  elements.input.type = "password";
  const who = selectedStudent ? " (" + selectedStudent.name + ")" : "";
  elements.message.textContent = "Ronda iniciada" + who + " — pide letras al grupo.";
  renderAll();
}

function clearGame() {
  state.secret = "";
  state.normalizedSecret = "";
  state.guessed = new Set();
  state.mistakes = 0;
  state.active = false;
  state.finished = false;
  elements.input.value = "";
  elements.input.type = "password";
  elements.message.textContent = "Elige estudiante, palabra o nombre y presiona Iniciar.";
  renderAll();
  elements.input.focus();
}

function newRound() {
  state.secret = "";
  state.normalizedSecret = "";
  state.guessed = new Set();
  state.mistakes = 0;
  state.active = false;
  state.finished = false;
  elements.input.value = "";
  elements.input.type = "password";
  elements.message.textContent = "Listo para otra ronda.";
  renderAll();
  elements.input.focus();
}

function guessLetter(letter) {
  if (!state.active || state.finished || state.guessed.has(letter)) return;
  state.guessed.add(letter);
  if (!state.normalizedSecret.includes(letter)) {
    state.mistakes += 1;
  }
  if (isWinner()) {
    state.finished = true;
    elements.message.textContent = "¡Acertaron!";
    awardWinToStudent();
  } else if (state.mistakes >= bodyOrder.length) {
    state.finished = true;
    elements.message.textContent = "Se acabaron los intentos. Era: " + state.secret;
  } else if (state.normalizedSecret.includes(letter)) {
    elements.message.textContent = "Bien: la letra " + letter + " está en la palabra.";
  } else {
    elements.message.textContent = "La letra " + letter + " no está.";
  }
  renderAll();
}

function isWinner() {
  if (!state.normalizedSecret) return false;
  return Array.from(state.normalizedSecret).every(function(character) {
    return !isGuessableCharacter(character) || state.guessed.has(character);
  });
}

function toggleSecretVisibility() {
  elements.input.type = elements.input.type === "password" ? "text" : "password";
  elements.input.focus();
}

function revealSecret() {
  if (!state.secret) {
    elements.message.textContent = "No hay palabra activa para revelar.";
    return;
  }
  state.finished = true;
  elements.message.textContent = "La palabra era: " + state.secret;
  renderAll({ reveal: true });
}

function toggleFullscreen() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen && document.documentElement.requestFullscreen();
  } else {
    document.exitFullscreen && document.exitFullscreen();
  }
}

function toggleWordBank() {
  const panel = document.getElementById("word-bank-panel");
  if (!panel) return;
  panel.style.display = panel.style.display === "none" || !panel.style.display ? "flex" : "none";
}

elements.form.addEventListener("submit", function(event) {
  event.preventDefault();
  startGame();
});
elements.start.addEventListener("click", startGame);
elements.clear.addEventListener("click", clearGame);
elements.newRound.addEventListener("click", newRound);
elements.reveal.addEventListener("click", revealSecret);
elements.toggleSecret.addEventListener("click", toggleSecretVisibility);
elements.fullscreen.addEventListener("click", toggleFullscreen);
elements.input.addEventListener("input", function() {
  if (!state.active) renderWord();
});

document.getElementById("studentSelect").addEventListener("change", function(e) {
  pickStudentByCc(e.target.value);
});
document.getElementById("randomStudentBtn").addEventListener("click", pickRandomStudent);
document.getElementById("useNameBtn").addEventListener("click", useStudentFirstName);

renderAll();
initStudents();
