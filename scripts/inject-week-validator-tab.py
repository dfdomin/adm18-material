#!/usr/bin/env python3
"""Add Validar semana tab + teacher-week-validator.js to dashboard/participacion.html"""
from pathlib import Path
import shutil
import re

REPOS = [
    Path("/Users/diegodomingueztapia/Library/CloudStorage/OneDrive-Unibarranquilla/DiegoIcloud/2026/copilot/ProcesamientoInformacion"),
    Path("/Users/diegodomingueztapia/code/tga04-neurobiz"),
    Path("/Users/diegodomingueztapia/code/tga05-neurobiz"),
    Path("/Users/diegodomingueztapia/Library/CloudStorage/OneDrive-Unibarranquilla/DiegoIcloud/2026/copilot/TD"),
]

CANON_JS = REPOS[0] / "js" / "teacher-week-validator.js"
CANON_GAMIF = REPOS[0] / "js" / "gamification-sdk.js"

SCRIPT_TAG = '  <script src="../js/teacher-week-validator.js"></script>\n'
TAB_BTN = '        <button class="tab-btn" onclick="showTab(\'validate\')">Validar semana</button>\n'
TAB_PANEL = """
      <!-- TAB: Validar XP semanal (celular) -->
      <div class="tab-panel" id="tab-validate">
        <div id="teacherWeekValidatorRoot"></div>
      </div>

"""


def copy_js(root: Path) -> None:
    if root == REPOS[0]:
        return
    for name in ("teacher-week-validator.js", "gamification-sdk.js"):
        src = REPOS[0] / "js" / name
        dest = root / "js" / name
        if src.exists():
            shutil.copy2(src, dest)


def dedupe_head_scripts(text: str) -> str:
    """Remove duplicate script block before </style> if present."""
    block = (
        '  <script src="../js/supabase-config.js"></script>\n'
        '  <script src="../js/gamification-sdk.js"></script>\n'
        '  <script src="../js/academic-rules.js"></script>\n'
        '  <script src="../js/academic-status-bar.js"></script>\n'
        '  <script src="../js/celebration.js"></script>\n'
    )
    if text.count(block) > 1:
        text = text.replace(block, "", 1)
    return text


def patch(path: Path) -> bool:
    text = path.read_text(encoding="utf-8")
    changed = False
    text = dedupe_head_scripts(text)

    if "teacher-week-validator.js" not in text:
        anchor = '  <script src="../js/teacher-auth.js"></script>\n'
        if anchor in text:
            text = text.replace(anchor, anchor + SCRIPT_TAG, 1)
            changed = True
        elif '  <script src="../js/celebration.js"></script>\n' in text:
            text = text.replace(
                '  <script src="../js/celebration.js"></script>\n',
                '  <script src="../js/celebration.js"></script>\n' + SCRIPT_TAG,
                1,
            )
            changed = True

    if "showTab('validate')" not in text:
        text = text.replace(
            '        <button class="tab-btn" onclick="showTab(\'history\')">Historial</button>\n',
            '        <button class="tab-btn" onclick="showTab(\'history\')">Historial</button>\n' + TAB_BTN,
            1,
        )
        changed = True

    if 'id="tab-validate"' not in text:
        text = text.replace(
            '      <!-- TAB: Historial -->\n',
            TAB_PANEL + '      <!-- TAB: Historial -->\n',
            1,
        )
        changed = True

    if 'if (name === "history") renderHistory();' in text and 'validate' not in text.split("showTab")[0]:
        pass

    if 'if (name === "history") renderHistory();' in text and 'IUBTeacherWeekValidator' not in text:
        text = text.replace(
            '      if (name === "history") renderHistory();\n',
            '      if (name === "history") renderHistory();\n'
            '      if (name === "validate" && window.IUBTeacherWeekValidator) IUBTeacherWeekValidator.mount("teacherWeekValidatorRoot");\n',
            1,
        )
        changed = True

    if 'location.hash === "#history"' in text and '#validar-semana' not in text:
        text = text.replace(
            '      if (location.hash === "#history") return "history";\n',
            '      if (location.hash === "#validar-semana" || location.hash === "#validate") return "validate";\n'
            '      if (location.hash === "#history") return "history";\n',
            1,
        )
        changed = True

    if 'IUBTeacherWeekValidator.mount' not in text and "initTeacherGate" in text:
        text = text.replace(
            "          showTab(tabFromHash());\n",
            "          showTab(tabFromHash());\n"
            '          if (window.IUBTeacherWeekValidator) IUBTeacherWeekValidator.mount("teacherWeekValidatorRoot");\n',
            1,
        )
        changed = True

    nav_anchor = '        <a href="#live">Clase en vivo</a>\n'
    nav_link = '        <a href="#validar-semana">Validar semana</a>\n'
    if nav_anchor in text and nav_link not in text:
        text = text.replace(nav_anchor, nav_anchor + nav_link, 1)
        changed = True

    if changed:
        path.write_text(text, encoding="utf-8")
    return changed


def main():
    n = 0
    for root in REPOS:
        if not root.exists():
            continue
        copy_js(root)
        p = root / "dashboard" / "participacion.html"
        if p.exists() and patch(p):
            n += 1
            print("patched", p.relative_to(root))
    print("total", n)


if __name__ == "__main__":
    main()
