#!/usr/bin/env python3
"""Build the single-file app: docs/play/ (multi-file) -> dist/opd-register.html

One HTML file you can email, put on a USB stick, or open from a desktop shortcut —
no server, no install, no network. The multi-file version in docs/play/ stays the
source of truth; this is a packaging step, not a fork.
"""
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
APP = ROOT / "docs" / "play"
OUT = ROOT / "dist" / "opd-register.html"


def read(p: Path) -> str:
    if not p.exists():
        sys.exit(f"build: missing {p.relative_to(ROOT)}")
    return p.read_text(encoding="utf-8")


def main() -> None:
    html = read(APP / "index.html")

    # 1. inline the stylesheet
    css_tag = re.compile(r'<link rel="stylesheet" href="([^"]+)"\s*/?>')
    m = css_tag.search(html)
    if not m:
        sys.exit("build: no stylesheet link found")
    css = read(APP / m.group(1))
    html = html[: m.start()] + "<style>\n" + css + "\n</style>" + html[m.end():]

    # 2. inline every script, in order
    script_tag = re.compile(r'<script src="([^"]+)"></script>')
    for m in list(script_tag.finditer(html)):
        js = read(APP / m.group(1))
        html = html.replace(m.group(0), "<script>\n" + js + "\n</script>", 1)

    # 3. a single file cannot use a manifest or a service worker: drop them,
    #    and carry the icon inside the file as a data URI instead.
    html = re.sub(r'\n<link rel="manifest"[^>]*>', "", html)
    html = re.sub(r'\n<link rel="apple-touch-icon"[^>]*>', "", html)
    icon = (APP / "icon.svg").read_text(encoding="utf-8")
    icon_uri = "data:image/svg+xml;charset=utf-8," + (
        icon.replace('"', "'").replace("\n", " ").replace("#", "%23").replace("<", "%3C").replace(">", "%3E")
    )
    html = re.sub(r'<link rel="icon"[^>]*>', f'<link rel="icon" href="{icon_uri}">', html)

    # 4. a marker so anyone can tell which build they are looking at
    html = html.replace(
        "<title>OPD Register</title>",
        "<title>OPD Register</title>\n<meta name=\"build\" content=\"single-file\">",
        1,
    )

    left = re.findall(r'(?:src|href)="(assets/[^"]+)"', html)
    if left:
        sys.exit(f"build: assets were not inlined: {left}")

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(html, encoding="utf-8")
    kb = OUT.stat().st_size / 1024
    print(f"built {OUT.relative_to(ROOT)}  ({kb:.1f} KB, single file, no network)")


if __name__ == "__main__":
    main()
