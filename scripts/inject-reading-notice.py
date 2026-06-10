#!/usr/bin/env python3
"""Inject reading-xp-policy.js (+ tracker when missing) into semana index.html files."""
from pathlib import Path
import shutil

REPOS = [
    Path("/Users/diegodomingueztapia/Library/CloudStorage/OneDrive-Unibarranquilla/DiegoIcloud/2026/copilot/ProcesamientoInformacion"),
    Path("/Users/diegodomingueztapia/code/tga04-neurobiz"),
    Path("/Users/diegodomingueztapia/code/tga05-neurobiz"),
    Path("/Users/diegodomingueztapia/Library/CloudStorage/OneDrive-Unibarranquilla/DiegoIcloud/2026/copilot/TD"),
]

CANON = REPOS[0] / "js" / "reading-xp-policy.js"

BLOCK = """  <script src="../js/reading-tracker.js"></script>
  <script src="../js/reading-xp-policy.js"></script>
"""


def copy_policy_js(root: Path) -> None:
    dest = root / "js" / "reading-xp-policy.js"
    if root == REPOS[0]:
        return
    if CANON.exists():
        dest.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(CANON, dest)
        print("copied policy ->", dest.relative_to(root))


def inject(path: Path) -> bool:
    text = path.read_text(encoding="utf-8")
    if "reading-xp-policy.js" in text:
        return False
    anchor = '  <script src="../js/week-auto-sync.js"></script>\n'
    if anchor in text:
        text = text.replace(anchor, anchor + BLOCK, 1)
    elif '  <script src="../js/celebration.js"></script>\n' in text:
        text = text.replace(
            '  <script src="../js/celebration.js"></script>\n',
            '  <script src="../js/celebration.js"></script>\n' + BLOCK,
            1,
        )
    elif "</head>" in text:
        text = text.replace("</head>", BLOCK + "</head>", 1)
    else:
        return False
    path.write_text(text, encoding="utf-8")
    return True


def main():
    patched = 0
    for root in REPOS:
        if not root.exists():
            print("skip missing", root)
            continue
        copy_policy_js(root)
        for html in sorted(root.rglob("index.html")):
            if "semana" not in str(html.parent).lower():
                continue
            if inject(html):
                patched += 1
                print("patched", html.relative_to(root))
    print("total patched", patched)


if __name__ == "__main__":
    main()
