#!/usr/bin/env python3
"""Dual-rail fork-witness GIF — first frame already shows upstream ✕ vs fork ●."""
from PIL import Image, ImageDraw, ImageFont
from pathlib import Path

W, H = 960, 420
BG = (7, 11, 16)
FG = (238, 243, 251)
MUTED = (139, 155, 176)
ALIVE = (61, 214, 140)
WIPED = (255, 77, 77)
CARD = (18, 24, 33)
LINE = (39, 49, 65)

try:
    font_lg = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 30)
    font_md = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 18)
    font_sm = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 15)
    font_xs = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 16)
except OSError:
    font_lg = font_md = font_sm = font_xs = ImageFont.load_default()

# Shared tip SHA — the punchline
EVENTS = [
    ("alive", "alive", "Stabilize release…"),
    ("wiped", "alive", "Ship telemetry probe"),  # shared tip
    ("alive", "absent", "Rewind main tip"),
]
XS = [140, 300, 460]


def draw_header(d):
    for i in range(70):
        shade = max(0, 24 - i // 4)
        if shade:
            d.rectangle([0, i, W, i + 1], fill=(shade + 8, 6, 14))
    d.text((36, 22), "forcepush-ghost  ·  fork-witness (offline V0.2)", fill=MUTED, font=font_sm)
    d.text((36, 48), "Upstream wiped it. The fork still remembers.", fill=FG, font=font_lg)
    d.text((36, 90), "Same SHA  ·  upstream ✕  /  fork ●", fill=MUTED, font=font_sm)


def draw_mark(d, x, y, status, pulse=0):
    r = 20
    if status == "alive":
        d.ellipse([x - r, y - r, x + r, y + r], fill=ALIVE)
        d.text((x - 5, y - 10), "●", fill=(6, 36, 22), font=font_xs)
    elif status == "wiped":
        for g in range(1, 5 + pulse):
            shade = max(24, 85 - g * 10)
            d.ellipse(
                [x - r - g * 3, y - r - g * 3, x + r + g * 3, y + r + g * 3],
                outline=(shade, 18, 18),
            )
        d.rounded_rectangle([x - r, y - r, x + r, y + r], radius=5, fill=WIPED)
        d.text((x - 7, y - 11), "✕", fill=(42, 5, 5), font=font_xs)
    else:
        d.ellipse([x - r, y - r, x + r, y + r], outline=LINE, width=2)
        d.text((x - 4, y - 10), "·", fill=MUTED, font=font_xs)


def draw_rail(d, y, label, color, statuses, msgs, pulse=0, highlight_idx=1):
    d.text((36, y - 28), label, fill=color, font=font_md)
    d.line([(60, y), (520, y)], fill=LINE, width=3)
    for i, (st, msg) in enumerate(zip(statuses, msgs)):
        x = XS[i]
        draw_mark(d, x, y, st, pulse=pulse if (st == "wiped") else 0)
        # SHA under shared tip
        if i == highlight_idx:
            d.text((x - 28, y + 28), "9f2d7b1", fill=(255, 212, 168), font=font_xs)


def frame(pulse: int = 0, dim_caption: bool = False) -> Image.Image:
    img = Image.new("RGB", (W, H), BG)
    d = ImageDraw.Draw(img)
    draw_header(d)

    up_status = [e[0] for e in EVENTS]
    fk_status = [e[1] for e in EVENTS]
    msgs = [e[2] for e in EVENTS]

    draw_rail(d, 170, "UPSTREAM", WIPED, up_status, msgs, pulse=pulse)
    draw_rail(d, 290, "FORK", ALIVE, fk_status, msgs, pulse=0)

    # Side card calling out the shared tip
    card = [560, 140, 920, 340]
    d.rounded_rectangle(card, radius=14, fill=CARD, outline=WIPED, width=2)
    d.text((580, 160), "Shared tip SHA", fill=MUTED, font=font_sm)
    d.text((580, 190), "9f2d7b1", fill=FG, font=font_lg)
    d.text((580, 235), "Upstream   ✕ WIPED", fill=WIPED, font=font_md)
    d.text((580, 265), "Fork       ● ALIVE", fill=ALIVE, font=font_md)
    cap = "Upstream force-pushed. Fork still has the tip."
    d.text((580, 305), cap[:42], fill=MUTED if dim_caption else FG, font=font_sm)

    d.text((36, 380), "offline fixture  ·  names/SHAs fictional  ·  not a live --vs", fill=MUTED, font=font_sm)
    return img


frames = [
    frame(pulse=3),
    frame(pulse=1),
    frame(pulse=4),
    frame(pulse=2),
    frame(pulse=3),
]
durations = [1400, 500, 500, 500, 1200]

out_dir = Path("/workspace/forcepush-ghost/demo")
gif = out_dir / "fork-witness.gif"
png = out_dir / "fork-witness.png"
frames[0].save(
    gif,
    save_all=True,
    append_images=frames[1:],
    duration=durations,
    loop=0,
    optimize=True,
)
frames[0].save(png)
print("ok", gif, gif.stat().st_size, "bytes")
print("ok", png, png.stat().st_size, "bytes")
