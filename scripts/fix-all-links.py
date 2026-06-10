#!/usr/bin/env python3
"""Batch-fix gamification nav links and script injection across IUB repos."""
from __future__ import annotations

import re
from pathlib import Path

REPOS = {
    "ADM18": Path("/Users/diegodomingueztapia/Library/CloudStorage/OneDrive-Unibarranquilla/DiegoIcloud/2026/copilot/ProcesamientoInformacion"),
    "TGA04": Path("/Users/diegodomingueztapia/code/tga04-neurobiz"),
    "TGA05": Path("/Users/diegodomingueztapia/code/tga05-neurobiz"),
    "TD": Path("/Users/diegodomingueztapia/Library/CloudStorage/OneDrive-Unibarranquilla/DiegoIcloud/2026/copilot/TD"),
}

ACADEMIC_HEAD = """  <script src="{prefix}js/supabase-config.js"></script>
  <script src="{prefix}js/gamification-sdk.js"></script>
  <script src="{prefix}js/academic-rules.js"></script>
  <script src="{prefix}js/academic-status-bar.js"></script>
  <script src="{prefix}js/celebration.js"></script>
"""

ACADEMIC_ROOT = """  <script src="js/supabase-config.js"></script>
  <script src="js/gamification-sdk.js"></script>
  <script src="js/academic-rules.js"></script>
  <script src="js/academic-status-bar.js"></script>
  <script src="js/celebration.js"></script>
"""

REPLACEMENTS_COMMON = [
    (r'href="../profesor.html"', 'href="../dashboard/profesor.html"'),
    (r'href="profesor.html"(?!#)', 'href="dashboard/profesor.html"'),  # root only - careful
    (r'href="participacion.html"', 'href="dashboard/participacion.html"'),
    (r'href="progreso.html"', 'href="dashboard/index.html"'),
    (r'href="../progreso.html"', 'href="../dashboard/index.html"'),
    (r'href="../setup/CONFIGURAR_SUPABASE.html"', ''),
    (r'href="notas.html"', 'href="../notas.html"'),  # only in dashboard/
]

def patch_file(path: Path, rules: list[tuple[str, str]], skip_if: str | None = None) -> bool:
    if not path.exists() or path.suffix != ".html":
        return False
    text = path.read_text(encoding="utf-8")
    if skip_if and skip_if in text and "SKIP_PATCH" in text:
        return False
    orig = text
    for pat, repl in rules:
        if repl == "":
            text = re.sub(r'\s*<a[^>]*' + pat.replace("href=", "href=") + r'[^>]*>[^<]*</a>\s*', "\n", text)
            text = re.sub(pat, "", text)
        else:
            text = re.sub(pat, repl, text)
    if text != orig:
        path.write_text(text, encoding="utf-8")
        return True
    return False

def inject_academic(path: Path, prefix: str = "../") -> bool:
    if not path.exists():
        return False
    text = path.read_text(encoding="utf-8")
    if "academic-status-bar.js" in text:
        if "gamification-sdk.js" in text and "celebration.js" in text:
            return False
        # partial - add missing
        insert = ""
        if "gamification-sdk.js" not in text:
            insert += f'  <script src="{prefix}js/gamification-sdk.js"></script>\n'
        if "celebration.js" not in text:
            insert += f'  <script src="{prefix}js/celebration.js"></script>\n'
        if insert and "</head>" in text:
            text = text.replace("</head>", insert + "</head>", 1)
            path.write_text(text, encoding="utf-8")
            return True
        return False
    bundle = ACADEMIC_HEAD.format(prefix=prefix) if prefix else ACADEMIC_ROOT
    if "</head>" not in text:
        return False
    text = text.replace("</head>", bundle + "</head>", 1)
    path.write_text(text, encoding="utf-8")
    return True

def fix_dashboard_participacion_profesor_link(path: Path) -> bool:
    if "dashboard/participacion.html" not in str(path):
        return False
    text = path.read_text(encoding="utf-8")
    new = text.replace('href="../profesor.html"', 'href="profesor.html"')
    if new != text:
        path.write_text(new, encoding="utf-8")
        return True
    return False

def fix_progreso_nav(path: Path) -> bool:
    if path.name != "progreso.html":
        return False
    text = path.read_text(encoding="utf-8")
    new = text
    new = new.replace('href="profesor.html"', 'href="dashboard/profesor.html"')
    new = new.replace('href="participacion.html"', 'href="dashboard/participacion.html"')
    new = new.replace('href="progreso.html" class="active"', 'href="dashboard/index.html" class="active"')
    if new != text:
        path.write_text(new, encoding="utf-8")
        return True
    return False

def fix_profesor_dashboard_notas(path: Path) -> bool:
    if "dashboard/profesor.html" not in str(path):
        return False
    text = path.read_text(encoding="utf-8")
    new = text.replace('href="notas.html"', 'href="../notas.html"')
    new = re.sub(r'\s*<a href="../setup/CONFIGURAR_SUPABASE.html">Setup</a>\s*', "\n", new)
    if new != text:
        path.write_text(new, encoding="utf-8")
        return True
    return False

def fix_index_cta(path: Path) -> bool:
    if path.name != "index.html" or "dashboard" in str(path.parent):
        return False
    text = path.read_text(encoding="utf-8")
    new = text.replace('href="progreso.html"', 'href="dashboard/index.html"')
    # add participacion nav if missing
    if "dashboard/participacion.html" not in new and 'class="nav"' in new or 'header-nav' in new:
        new = new.replace(
            'href="dashboard/profesor.html"',
            'href="dashboard/participacion.html">Participación</a>\n   <a href="dashboard/profesor.html"',
            1,
        ) if "dashboard/participacion.html" not in new else new
    if new != text:
        path.write_text(new, encoding="utf-8")
        return True
    return False

def main():
    changed = []
    for name, root in REPOS.items():
        if not root.exists():
            continue
        for html in root.rglob("*.html"):
            rel = html.relative_to(root)
            if fix_progreso_nav(html):
                changed.append(f"{name}:{rel} progreso-nav")
            if fix_dashboard_participacion_profesor_link(html):
                changed.append(f"{name}:{rel} participacion-profesor")
            if fix_profesor_dashboard_notas(html):
                changed.append(f"{name}:{rel} profesor-notas")
            if fix_index_cta(html) and html.name == "index.html" and html.parent == root:
                changed.append(f"{name}:{rel} index-cta")

            # semana pages
            if re.search(r"semana", str(rel), re.I):
                prefix = "../" if html.parent.name.startswith("semana") or "semana-" in html.parent.name else ""
                if html.name == "index.html" or "guia-docente" in html.name:
                    if inject_academic(html, prefix or "../"):
                        changed.append(f"{name}:{rel} inject-academic")

            # root legacy pages
            if html.name in ("notas.html", "profesor.html", "participacion.html") and html.parent == root:
                for pat, repl in [
                    (r'href="progreso.html"', 'href="dashboard/index.html"'),
                    (r'href="profesor.html"', 'href="dashboard/profesor.html"'),
                    (r'href="participacion.html"', 'href="dashboard/participacion.html"'),
                ]:
                    t = html.read_text(encoding="utf-8")
                    t2 = re.sub(pat, repl, t)
                    if t2 != t:
                        html.write_text(t2, encoding="utf-8")
                        changed.append(f"{name}:{rel} root-nav")

        # index academic scripts
        idx = root / "index.html"
        if idx.exists() and inject_academic(idx, ""):
            changed.append(f"{name}:index.html inject-root")

        # dashboard pages
        for dash in ["dashboard/index.html", "dashboard/profesor.html", "dashboard/participacion.html"]:
            p = root / dash
            if p.exists() and inject_academic(p, "../"):
                changed.append(f"{name}:{dash} inject-dash")

        # ahorcado
        ah = root / "JuegoDelAhorcado/index.html"
        if ah.exists():
            t = ah.read_text(encoding="utf-8")
            t2 = t.replace('href="../profesor.html"', 'href="../dashboard/profesor.html"')
            if t2 != t:
                ah.write_text(t2, encoding="utf-8")
                changed.append(f"{name}:JuegoDelAhorcado profesor-link")
            if inject_academic(ah, "../"):
                changed.append(f"{name}:JuegoDelAhorcado inject")

    print("Changed", len(changed), "items")
    for c in changed:
        print(" -", c)

if __name__ == "__main__":
    main()
