#!/usr/bin/env python3
"""Draw the README badges into docs/assets/badge-*.svg.

Committed as SVG so they render on GitHub without a badge service — an offline-first
project should not fetch its own status from someone else's server.
"""
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "docs" / "assets"

GREEN = "#0f8a5f"
BLUE = "#1f5fd0"
SLATE = "#334155"
GREY = "#64748b"
AMBER = "#b26b00"
VIOLET = "#5b4bd6"

# name, label, value, label colour, value colour, width estimate per char
BADGES = [
    ("live",     "live",    "demo",        SLATE, BLUE),
    ("offline",  "offline", "no network",  SLATE, GREEN),
    ("tests",    "tests",   "91 passing",  SLATE, GREEN),
    ("deps",     "runtime deps", "0",      SLATE, GREEN),
    ("licence",  "licence", "PolyForm NC", SLATE, AMBER),
    ("size",     "single file", "~130 KB", SLATE, VIOLET),
    ("storage",  "storage", "this device", SLATE, BLUE),
    ("build",    "builds",  "exe · apk · html", SLATE, SLATE),
]

CHAR = 6.4  # average advance of 11px sans


def esc(s: str) -> str:
    return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def badge(label: str, value: str, lc: str, vc: str) -> str:
    lw = round(len(label) * CHAR + 12)
    vw = round(len(value) * CHAR + 12)
    w = lw + vw
    h = 20
    return f'''<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" role="img" aria-label="{esc(label)}: {esc(value)}">
  <title>{esc(label)}: {esc(value)}</title>
  <linearGradient id="s" x2="0" y2="100%"><stop offset="0" stop-color="#fff" stop-opacity=".12"/><stop offset="1" stop-opacity=".08"/></linearGradient>
  <rect width="{w}" height="{h}" rx="3" fill="{lc}"/>
  <rect x="{lw}" width="{vw}" height="{h}" rx="3" fill="{vc}"/>
  <rect x="{lw}" width="6" height="{h}" fill="{vc}"/>
  <rect width="{w}" height="{h}" rx="3" fill="url(#s)"/>
  <g fill="#fff" font-family="-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif" font-size="11" font-weight="600">
    <text x="{lw/2}" y="14" text-anchor="middle">{esc(label)}</text>
    <text x="{lw + vw/2}" y="14" text-anchor="middle">{esc(value)}</text>
  </g>
</svg>
'''


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    for name, label, value, lc, vc in BADGES:
        p = OUT / f"badge-{name}.svg"
        p.write_text(badge(label, value, lc, vc), encoding="utf-8")
        print("wrote", p.relative_to(ROOT))


if __name__ == "__main__":
    main()
