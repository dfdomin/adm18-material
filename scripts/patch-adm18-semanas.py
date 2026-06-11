#!/usr/bin/env python3
"""Inyecta supabase-client + adm18-week-boot y simplifica inline UI en semana-*/index.html."""
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
SUPA = '  <script src="../js/supabase-client.js"></script>\n'
BOOT = '<script src="../js/adm18-week-boot.js"></script>\n'

UI_BLOCK = re.compile(
    r"\n\s*const progress = JSON\.parse\(localStorage\.getItem\('adm18_progress'.*?"
    r"if \(widgetName\) widgetName\.textContent = userName;\n",
    re.DOTALL,
)


def patch_file(path: Path) -> list[str]:
    changes = []
    text = path.read_text(encoding="utf-8")
    original = text

    if "supabase-client.js" not in text:
        if 'reading-xp-policy.js' in text:
            text = text.replace(
                '  <script src="../js/reading-xp-policy.js"></script>\n',
                '  <script src="../js/reading-xp-policy.js"></script>\n' + SUPA,
                1,
            )
        elif 'adm18-reading.js' in text:
            text = text.replace(
                '  <script src="../js/adm18-reading.js"></script>\n',
                '  <script src="../js/adm18-reading.js"></script>\n' + SUPA,
                1,
            )
        changes.append("supabase-client")

    if "adm18-week-boot.js" not in text and '<script src="../js/app.js"></script>' in text:
        text = text.replace(
            '<script src="../js/app.js"></script>\n',
            BOOT + '<script src="../js/app.js"></script>\n',
            1,
        )
        changes.append("week-boot")

    if UI_BLOCK.search(text):
        text = UI_BLOCK.sub("\n", text, count=1)
        changes.append("trim-inline-ui")

    if text != original:
        path.write_text(text, encoding="utf-8")
    return changes


def main():
    for path in sorted(ROOT.glob("semana-*/index.html")):
        changes = patch_file(path)
        print(f"{path.name}: {changes or ['ok']}")


if __name__ == "__main__":
    main()
