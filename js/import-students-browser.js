(function () {
  const DOCUMENT_TYPES = "CC|TI|CE|PA|RC|NUIP";

  function cleanSpaces(value) {
    return String(value ?? "").replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
  }

  function detectGroup(text) {
    const explicit = text.match(/GRUPO\s*:?\s*([0-9]+_[A-Z0-9ÁÉÍÓÚÑ]+_[A-Z0-9ÁÉÍÓÚÑ]+)/i);
    if (explicit) return explicit[1].trim();
    const compact = text.match(/\b[0-9]+_[A-Z0-9ÁÉÍÓÚÑ]+_[A-Z0-9ÁÉÍÓÚÑ]+\b/i);
    return compact ? compact[0].trim() : "";
  }

  function uniqueStudents(students) {
    const byDocument = new Map();
    for (const student of students) {
      if (!student.cc) continue;
      byDocument.set(student.cc, student);
    }
    return [...byDocument.values()];
  }

  function parseAcademusoftStudents(rawText) {
    const text = String(rawText ?? "").normalize("NFC").replace(/\u00a0/g, " ");
    const lines = text.split(/\r?\n/).map(cleanSpaces).filter(Boolean);
    const meta = { grupo: detectGroup(text), horario: "" };
    const students = [];
    const unmatched = [];
    const documentRow = new RegExp(`^\\s*\\d+\\s+(${DOCUMENT_TYPES})\\s*-\\s*(\\d{5,12})\\s+\\d{1,12}\\s+(.+?)\\s*$`, "iu");
    const legacySameLine = /^\s*\d+\s+([A-ZÁÉÍÓÚÑa-záéíóúñ\s.'-]{4,})\s+(\d{5,12})\s*$/u;
    const legacyNameOnly = /^\s*\d+\s+([A-ZÁÉÍÓÚÑa-záéíóúñ\s.'-]{3,})$/u;
    const documentOnly = /^\s*\d{5,12}\s*$/;
    let pendingName = null;

    for (const line of lines) {
      const documentMatch = line.match(documentRow);
      if (documentMatch) {
        students.push({ name: cleanSpaces(documentMatch[3]), cc: documentMatch[2], grupo: meta.grupo, horario: meta.horario });
        pendingName = null;
        continue;
      }

      const legacyMatch = line.match(legacySameLine);
      if (legacyMatch && !/\b(CC|TI|CE|PA|RC|NUIP)\b/i.test(legacyMatch[1])) {
        students.push({ name: cleanSpaces(legacyMatch[1]), cc: legacyMatch[2], grupo: meta.grupo, horario: meta.horario });
        pendingName = null;
        continue;
      }

      if (pendingName) {
        const documentMatchOnly = line.match(documentOnly);
        if (documentMatchOnly) {
          students.push({ name: pendingName, cc: documentMatchOnly[0], grupo: meta.grupo, horario: meta.horario });
          pendingName = null;
          continue;
        }
        unmatched.push(`(nombre sin documento): ${pendingName}`);
        pendingName = null;
      }

      const legacyNameMatch = line.match(legacyNameOnly);
      if (legacyNameMatch && !/^(Fecha|Listado|Materia|No\.?|Documento|Codigo|Código|Horario|Señor|Página|Pag\b)/i.test(legacyNameMatch[1])) {
        pendingName = cleanSpaces(legacyNameMatch[1]);
      }
    }

    if (pendingName) unmatched.push(`(ultima linea sin documento): ${pendingName}`);
    return { students: uniqueStudents(students), meta, unmatched };
  }

  function bytesToBinary(bytes) {
    const chunks = [];
    const size = 0x8000;
    for (let i = 0; i < bytes.length; i += size) chunks.push(String.fromCharCode(...bytes.subarray(i, i + size)));
    return chunks.join("");
  }

  function trimPdfStreamBytes(bytes) {
    let start = 0;
    let end = bytes.length;
    if (bytes[start] === 13 && bytes[start + 1] === 10) start += 2;
    else if (bytes[start] === 10 || bytes[start] === 13) start += 1;
    while (end > start && (bytes[end - 1] === 10 || bytes[end - 1] === 13 || bytes[end - 1] === 32)) end -= 1;
    return bytes.subarray(start, end);
  }

  async function inflatePdfBytes(bytes) {
    if (typeof DecompressionStream !== "undefined") {
      const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("deflate"));
      return new Uint8Array(await new Response(stream).arrayBuffer());
    }
    throw new Error("Este navegador no puede descomprimir el PDF localmente. Exporta el reporte como TXT o abre esta pagina en Chrome/Edge actualizado.");
  }

  function decodePdfString(value) {
    let out = "";
    for (let i = 0; i < value.length; i += 1) {
      const ch = value[i];
      if (ch !== "\\") {
        out += ch;
        continue;
      }
      const next = value[++i];
      if (next === "n") out += "\n";
      else if (next === "r") out += "\r";
      else if (next === "t") out += "\t";
      else if (next === "b") out += "\b";
      else if (next === "f") out += "\f";
      else if (next === "(" || next === ")" || next === "\\") out += next;
      else if (/[0-7]/.test(next || "")) {
        let octal = next;
        for (let j = 0; j < 2 && /[0-7]/.test(value[i + 1] || ""); j += 1) octal += value[++i];
        out += String.fromCharCode(parseInt(octal, 8));
      } else {
        out += next || "";
      }
    }
    return out;
  }

  function extractPdfTextFromContent(content) {
    const items = [];
    const textObjectPattern = /1\s+0\s+0\s+-1\s+0\s+(-?\d+(?:\.\d+)?)\s+cm\s+BT\s+(-?\d+(?:\.\d+)?)\s+0\s+Td[\s\S]*?\(((?:\\.|[^\\()])*)\)\s*Tj/g;
    let match;
    while ((match = textObjectPattern.exec(content))) {
      const text = cleanSpaces(decodePdfString(match[3]));
      if (!text) continue;
      items.push({ y: Math.round(Number(match[1])), x: Number(match[2]), text });
    }

    if (!items.length) return [...content.matchAll(/\(((?:\\.|[^\\()])*)\)\s*Tj/g)].map(m => decodePdfString(m[1])).join("\n");

    const rows = new Map();
    for (const item of items) {
      if (!rows.has(item.y)) rows.set(item.y, []);
      rows.get(item.y).push(item);
    }

    return [...rows.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([, row]) => row.sort((a, b) => a.x - b.x).map(item => item.text).join(" "))
      .join("\n");
  }

  async function extractPdfTextFromArrayBuffer(buffer) {
    const bytes = new Uint8Array(buffer);
    const binary = bytesToBinary(bytes);
    const texts = [];
    let cursor = 0;

    while (true) {
      const streamMarker = binary.indexOf("stream", cursor);
      if (streamMarker === -1) break;
      const streamStart = streamMarker + "stream".length;
      const streamEnd = binary.indexOf("endstream", streamStart);
      if (streamEnd === -1) break;
      const dictionary = binary.slice(Math.max(0, streamMarker - 500), streamMarker);
      if (dictionary.includes("FlateDecode")) {
        const streamBytes = trimPdfStreamBytes(bytes.subarray(streamStart, streamEnd));
        try {
          const inflated = await inflatePdfBytes(streamBytes);
          const text = extractPdfTextFromContent(bytesToBinary(inflated));
          if (text.trim()) texts.push(text);
        } catch (_err) {
          // Some Flate streams are images; keep scanning text streams.
        }
      }
      cursor = streamEnd + "endstream".length;
    }

    const text = texts.join("\n").trim();
    if (!text) throw new Error("No se pudo extraer texto del PDF. Verifica que no sea una imagen escaneada.");
    return text;
  }

  async function extractTextFromStudentFile(file) {
    if (!file) throw new Error("Selecciona un archivo primero.");
    const name = file.name || "";
    const type = file.type || "";
    if (/\.pdf$/i.test(name) || type === "application/pdf") return extractPdfTextFromArrayBuffer(await file.arrayBuffer());
    return file.text();
  }

  window.IUBImportStudents = {
    parseAcademusoftStudents,
    extractPdfTextFromArrayBuffer,
    extractTextFromStudentFile,
  };
  window.TGA04ImportStudents = window.IUBImportStudents;
})();
