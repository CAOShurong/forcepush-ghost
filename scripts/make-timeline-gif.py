#!/usr/bin/env python3
"""Punchier scandal GIF — first frame already shows the red wipe (README freeze-frame safe)."""
from PIL import Image, ImageDraw, ImageFont

W, H = 960, 420
BG = (7, 11, 16)
FG = (238, 243, 251)
MUTED = (139, 155, 176)
ALIVE = (61, 214, 140)
WIPED = (255, 77, 77)
CARD = (18, 24, 33)
LINE = (39, 49, 65)

try:
    font_lg = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 36)
    font_md = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 20)
    font_sm = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 16)
    font_xs = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 18)
except OSError:
    font_lg = font_md = font_sm = font_xs = ImageFont.load_default()

EVENTS = [
    ("wiped", "Add production API keys…"),
    ("alive", "Revert: rewrite history"),
    ("alive", "Docs: never commit secrets"),
]
XS = [180, 480, 780]


def draw_base(d):
    for i in range(90):
        shade = max(0, 28 - i // 4)
        if shade:
            d.rectangle([0, i, W, i + 1], fill=(shade + 8, 6, 14))
    d.text((40, 28), "forcepush-ghost", fill=MUTED, font=font_sm)
    d.text((40, 58), "Force-push scandal timeline", fill=FG, font=font_lg)
    d.text((40, 108), "Green = still on main    Red = wiped", fill=MUTED, font=font_sm)
    d.line([(60, 220), (900, 220)], fill=LINE, width=4)


def draw_node(d, i, status, msg, pulse=0):
    x, y = XS[i], 220
    r = 24 if status == "wiped" else 22
    if status == "alive":
        d.ellipse([x - r, y - r, x + r, y + r], fill=ALIVE)
        d.text((x - 5, y - 12), "●", fill=(6, 36, 22), font=font_xs)
        label, color = "ALIVE", ALIVE
        outline = LINE
    else:
        for g in range(1, 7 + pulse):
            shade = max(24, 90 - g * 9)
            d.ellipse(
                [x - r - g * 3, y - r - g * 3, x + r + g * 3, y + r + g * 3],
                outline=(shade, 18, 18),
            )
        d.rounded_rectangle([x - r, y - r, x + r, y + r], radius=6, fill=WIPED)
        d.text((x - 8, y - 13), "✕", fill=(42, 5, 5), font=font_xs)
        label, color, outline = "WIPED", WIPED, WIPED

    cw, ch = 250, 70
    cx0, cy0 = x - cw // 2, y + 48
    d.rounded_rectangle(
        [cx0, cy0, cx0 + cw, cy0 + ch],
        radius=12,
        fill=CARD,
        outline=outline,
        width=2,
    )
    d.text((cx0 + 14, cy0 + 12), label, fill=color, font=font_xs)
    d.text((cx0 + 14, cy0 + 36), msg[:28], fill=FG if status == "wiped" else MUTED, font=font_sm)


def frame(mode: str, pulse: int = 0) -> Image.Image:
    img = Image.new("RGB", (W, H), BG)
    d = ImageDraw.Draw(img)
    draw_base(d)

    if mode == "pre":
        # Before wipe: three alive nodes (history looks clean)
        for i, (_, msg) in enumerate(EVENTS):
            draw_node(d, i, "alive", msg if i else "Add production API keys…")
        d.text((40, 370), "example-org/docs-site  ·  looking clean…", fill=MUTED, font=font_sm)
    elif mode == "strike":
        for i, (status, msg) in enumerate(EVENTS):
            draw_node(d, i, status, msg, pulse=pulse)
        d.text((40, 370), "example-org/docs-site  ·  fixture A (sanitized)", fill=MUTED, font=font_sm)
        d.text((640, 370), "✕ commit was wiped", fill=WIPED, font=font_xs)
    else:  # hold
        for i, (status, msg) in enumerate(EVENTS):
            draw_node(d, i, status, msg, pulse=3)
        d.text((40, 370), "example-org/docs-site  ·  fixture A (sanitized)", fill=MUTED, font=font_sm)
        d.text((640, 370), "✕ commit was wiped", fill=WIPED, font=font_xs)
    return img


# Frame 0 = already scandalous (README freeze-frame). Then flash pre→strike for motion.
frames = [
    frame("hold"),
    frame("pre"),
    frame("strike", pulse=1),
    frame("strike", pulse=4),
    frame("hold"),
    frame("hold"),
]
durations = [1200, 700, 450, 450, 900, 1100]

out = "/workspace/forcepush-ghost/demo/timeline.gif"
frames[0].save(
    out,
    save_all=True,
    append_images=frames[1:],
    duration=durations,
    loop=0,
    optimize=True,
)
frames[0].save("/workspace/forcepush-ghost/demo/timeline.png")
print("ok", out, "bytes", __import__("os").path.getsize(out))
