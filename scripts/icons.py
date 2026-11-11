#!/usr/bin/env python3
"""Render the PWA icon set from docs/play/icon.svg.

Needs cairosvg and Pillow (`pip install cairosvg pillow`). The PNGs are committed, so a
normal build never runs this — it exists so the icon can be changed in one place.
"""
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
APP = ROOT / "docs" / "play"
ICONS = APP / "icons"

SIZES = [(192, "icon-192.png"), (512, "icon-512.png"), (180, "apple-touch-icon.png")]


def main() -> None:
    try:
        import cairosvg
        from PIL import Image
    except ImportError:
        sys.exit("icons: pip install cairosvg pillow")

    ICONS.mkdir(parents=True, exist_ok=True)
    src = APP / "icon.svg"
    for size, name in SIZES:
        cairosvg.svg2png(url=str(src), write_to=str(ICONS / name), output_width=size, output_height=size)
        print("wrote", (ICONS / name).relative_to(ROOT))

    # maskable: the icon at 80% on the brand field, inside the 40% safe zone
    inner = 410
    tmp = ICONS / "_inner.png"
    cairosvg.svg2png(url=str(src), write_to=str(tmp), output_width=inner, output_height=inner)
    base = Image.new("RGBA", (512, 512), (31, 95, 208, 255))
    art = Image.open(tmp).convert("RGBA")
    base.paste(art, ((512 - inner) // 2, (512 - inner) // 2), art)
    base.save(ICONS / "icon-maskable-512.png")
    tmp.unlink()
    print("wrote", (ICONS / "icon-maskable-512.png").relative_to(ROOT))

    # the release build (EXE + APK) rasterises this one
    Image.open(ICONS / "icon-512.png").save(APP / "icon.png")
    print("wrote", (APP / "icon.png").relative_to(ROOT))


if __name__ == "__main__":
    main()
