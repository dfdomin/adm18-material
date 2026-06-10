#!/usr/bin/env python3
"""Inject week-auto-sync.js into all semana index.html files."""
from pathlib import Path

REPOS = [
    Path("/Users/diegodomingueztapia/Library/CloudStorage/OneDrive-Unibarranquilla/DiegoIcloud/2026/copilot/ProcesamientoInformacion"),
    Path("/Users/diegodomingueztapia/code/tga04-neurobiz"),
    Path("/Users/diegodomingueztapia/code/tga05-neurobiz"),
    Path("/Users/diegodomingueztapia/Library/CloudStorage/OneDrive-Unibarranquilla/DiegoIcloud/2026/copilot/TD"),
]

TAG = '  <script src="../js/week-auto-sync.js"></script>\n'

def inject(path: Path) -> bool:
    text = path.read_text(encoding="utf-8")
    if "week-auto-sync.js" in text:
        return False
    if "celebration.js" in text:
        text = text.replace(
            '  <script src="../js/celebration.js"></script>\n',
            '  <script src="../js/celebration.js"></script>\n' + TAG,
            1,
        )
    elif "</head>" in text:
        text = text.replace("</head>", TAG + "</head>", 1)
    else:
        return False
    path.write_text(text, encoding="utf-8")
    return True

def main():
    n = 0
    for root in REPOS:
        if not root.exists():
            continue
        for html in root.rglob("index.html"):
            if "semana" not in str(html.parent).lower():
                continue
            if inject(html):
                n += 1
                print("patched", html.relative_to(root))
    print("total", n)

if __name__ == "__main__":
    main()
