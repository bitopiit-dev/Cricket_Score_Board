"""
BPL-2027 intro video: 45 s, 1920x1080, 60 fps.

    python3 render.py                 # full render -> bpl-2027-intro.mp4 (needs audio.wav)
    python3 render.py --stills 3,9.8  # PNG stills at those seconds, for checking

Every frame is drawn with Pillow; ffmpeg encodes. No external services.
"""
import math
import os
import random
import subprocess
import sys

import numpy as np
from PIL import Image, ImageChops, ImageDraw, ImageFilter

from common import (CRIMSON, CYAN, DURATION, EMERALD, FPS, GOLD, GOLD_METAL, H, METAL, MUTED,
                    NAVY, NAVY_0, NAVY_2, PUBLIC, WHITE, W, clamp, ease_in_cubic,
                    ease_in_out_cubic, ease_out_back, ease_out_cubic, ease_out_expo, font,
                    glow_of, lerp, place, prog, radial, scaled, shake_offset, spring, text_image,
                    with_alpha)

HERE = os.path.dirname(os.path.abspath(__file__))
rng = random.Random(2027)

# ================================================================ assets
PAD = 60  # backgrounds are larger than the frame so the camera can drift
BW, BH = W + PAD * 2, H + PAD * 2


def build_stadium():
    """Dark sky, stadium bowl silhouette and pitch; plus one additive layer per floodlight."""
    yy = np.linspace(0, 1, BH)[:, None]
    top, bot = np.array(NAVY_0), np.array(NAVY)
    sky = (top + (bot - top) * yy[..., None] * np.ones((1, BW, 1))).astype('uint8')
    base = Image.fromarray(sky, 'RGB').convert('RGBA')
    d = ImageDraw.Draw(base)
    # stands: two curved tiers
    d.ellipse((-400, BH * 0.52, BW + 400, BH * 1.9), fill=(9, 14, 26))
    d.ellipse((-200, BH * 0.60, BW + 200, BH * 1.75), fill=(12, 19, 34))
    d.ellipse((150, BH * 0.70, BW - 150, BH * 1.45), fill=(10, 32, 26))  # outfield
    d.polygon([(BW / 2 - 34, BH * 0.80), (BW / 2 + 34, BH * 0.80), (BW / 2 + 70, BH * 1.02),
               (BW / 2 - 70, BH * 1.02)], fill=(46, 58, 42))  # pitch strip, in perspective
    # rows of seat specks
    for row in range(5):
        y = BH * 0.58 + row * 18
        for i in range(140):
            x = (i / 140) * BW + (row * 7)
            dy = ((x - BW / 2) / (BW / 2)) ** 2 * -60
            c = rng.choice([(40, 55, 80), (55, 70, 95), (30, 42, 66)])
            d.rectangle((x, y + dy, x + 3, y + dy + 2), fill=c)
    towers = [(260, 150), (700, 95), (BW - 700, 95), (BW - 260, 150)]
    lights = []
    for (tx, ty) in towers:
        layer = Image.new('RGB', (BW, BH), (0, 0, 0))
        # beam: soft cone to the middle of the field
        cone = Image.new('L', (BW, BH), 0)
        cd = ImageDraw.Draw(cone)
        fx = BW / 2 + (tx - BW / 2) * 0.25
        cd.polygon([(tx - 30, ty), (tx + 30, ty), (fx + 420, BH * 0.95), (fx - 420, BH * 0.95)],
                   fill=38)
        cone = cone.resize((BW // 4, BH // 4)).filter(ImageFilter.GaussianBlur(14)).resize((BW, BH))
        layer.paste((150, 170, 200), mask=cone)
        # lamp panel glow + flare
        spot = radial((520, 520), (255, 244, 214), 1.0, 2.4)
        layer.paste((255, 240, 205), (tx - 260, ty - 260), spot)
        core = radial((120, 120), (255, 255, 255), 1.0, 1.2)
        tmp = Image.new('RGBA', (BW, BH), (0, 0, 0, 0))
        tmp.alpha_composite(core, (tx - 60, ty - 60))
        # anamorphic streak
        streak = radial((900, 26), (180, 220, 255), 0.9, 1.6)
        tmp.alpha_composite(streak, (tx - 450, ty - 13))
        layer = Image.alpha_composite(layer.convert('RGBA'), tmp)
        lights.append(layer)
        # tower pole + lamp grid on the base (always visible as a silhouette)
        d.line((tx, ty + 30, tx + (8 if tx < BW / 2 else -8), BH * 0.62), fill=(20, 28, 44), width=8)
        d.rectangle((tx - 46, ty - 20, tx + 46, ty + 24), fill=(18, 24, 38))
        for i in range(4):
            for j in range(3):
                d.rectangle((tx - 40 + i * 21, ty - 14 + j * 13, tx - 26 + i * 21, ty - 5 + j * 13),
                            fill=(38, 46, 64))
    return base, lights, towers


print('building assets…', file=sys.stderr)
STADIUM, LIGHTS, TOWERS = build_stadium()
LIT = STADIUM.copy()
for L in LIGHTS:
    LIT = ImageChops.add(LIT, L)
LIT_DIM = Image.blend(STADIUM, LIT, 0.55)

LOGO = Image.open(os.path.join(PUBLIC, 'images', 'bpl-2027-logo.png')).convert('RGBA')
LOGO = LOGO.crop(LOGO.getbbox())
LOGO = LOGO.resize((760, int(760 * LOGO.height / LOGO.width)), Image.LANCZOS)
LOGO_GLOW = glow_of(LOGO, GOLD, 36, 1.3)
LOGO_RIM = glow_of(LOGO, (255, 214, 120), 8, 2.2, pad=24)

# sheen band: a soft diagonal white stripe, slid across the logo
_band = Image.new('L', (LOGO.width * 3, LOGO.height), 0)
ImageDraw.Draw(_band).rectangle((LOGO.width * 1.4, 0, LOGO.width * 1.4 + 90, LOGO.height), fill=170)
SHEEN = _band.filter(ImageFilter.GaussianBlur(22)).rotate(-18, resample=Image.BICUBIC)

def _hex(h):
    return tuple(int(h[i:i + 2], 16) for i in (1, 3, 5))


# All 12 teams with their colours (src/data/teams.ts), in name order so the
# video says nothing about which group a team is in.
TEAMS = sorted([
    ('Finishing Victorians', 'finishing-victorians.png', _hex('#7c3aed')),
    ('Power House X1', 'power-house-x1.jpg', _hex('#ea580c')),
    ('MCD Super Stars', 'mcd-super-stars.png', _hex('#ca8a04')),
    ('Power (Printing & Washing)', 'power-printing-washing.jpg', _hex('#16a34a')),
    ('Quality Flying Fighter', 'quality-flying-fighter.jpg', _hex('#2563eb')),
    ('Rainbow Cutting', 'rainbow-cutting.png', _hex('#db2777')),
    ('Engineer Warrior', 'engineer-warriors.png', _hex('#0d9488')),
    ('HR Vikings', 'hr-vikings.png', _hex('#4f46e5')),
    ('Power Player', 'power-player.jpg', _hex('#dc2626')),
    ('DDC', 'ddc.png', _hex('#64748b')),
    ('Red Bulls Warriors', 'red-bulls-warriors.png', _hex('#b91c1c')),
    ('Sky Warrior', 'sky-warrior.png', _hex('#0284c7')),
], key=lambda x: x[0].lower())


def badge(name, file, ring):
    s = 150
    logo = Image.open(os.path.join(PUBLIC, 'icons', 'teams', file)).convert('RGBA')
    logo.thumbnail((s - 26, s - 26), Image.LANCZOS)
    b = Image.new('RGBA', (s + 40, s + 40), (0, 0, 0, 0))
    gl = glow_of(Image.new('RGBA', (s, s), (0, 0, 0, 0)), ring, 1)  # placeholder size helper
    del gl
    d = ImageDraw.Draw(b)
    d.ellipse((20, 20, 20 + s, 20 + s), fill=(255, 255, 255, 255), outline=ring + (255,), width=6)
    b.alpha_composite(logo, (20 + (s - logo.width) // 2, 20 + (s - logo.height) // 2))
    # name under the badge, shrunk to fit
    size = 30
    while font('display800', size).getlength(name.upper()) > 215 and size > 16:
        size -= 1
    label = text_image(name.upper(), font('display800', size), WHITE, tracking=1, pad=8,
                       shadow=False)
    out = Image.new('RGBA', (270, s + 40 + 60), (0, 0, 0, 0))
    out.alpha_composite(b, ((270 - b.width) // 2, 0))
    out.alpha_composite(label, ((270 - label.width) // 2, s + 46))
    return out


BADGES = {n: badge(n, f, col) for n, f, col in TEAMS}

# ------------------------------------------------------------------ text
T_WAIT = text_image('THE WAIT IS OVER', font('display', 190), stops=METAL, tracking=6,
                    glow=GOLD, glow_r=30)
T_TEAMS = text_image('12 TEAMS.', font('display', 200), stops=METAL, tracking=6, glow=CYAN,
                     glow_r=30)
T_GLORY = text_image('ONE GLORY.', font('display', 200), stops=GOLD_METAL, tracking=6, glow=GOLD,
                     glow_r=34)
T_SUB = text_image('BARIDHI PREMIER LEAGUE 2027', font('display800', 64), WHITE, tracking=10,
                   glow=(0, 0, 0), glow_r=10)
T_SUB2 = text_image('BITOPI GROUP', font('display800', 46), GOLD, tracking=16, glow=(0, 0, 0),
                    glow_r=10)
T_FORMAT = text_image('THE CONTENDERS', font('display800', 46), CYAN, tracking=14,
                      shadow=False)
T_12 = text_image('12 TEAMS', font('display', 140), stops=METAL, tracking=6, glow=EMERALD,
                  glow_r=24)
T_RR = text_image('48 MATCHES  •  ONE CHAMPION', font('display800', 40), NAVY_0,
                  tracking=4, shadow=False)
T_ROAD = text_image('ROAD TO GLORY', font('display', 140), stops=GOLD_METAL, tracking=6,
                    glow=GOLD, glow_r=26)
STAGES = [
    ('GROUP STAGE', '30 MATCHES  •  2 GROUPS', EMERALD),
    ('SUPER SIX', 'TOP 3 OF EACH GROUP', CYAN),
    ('SEMI-FINALS', '1ST v 4TH  •  2ND v 3RD', CYAN),
    ('GRAND FINAL', '19 DECEMBER 2026', GOLD),
]


def stage_chip(title, sub, color, final=False):
    w, h = 380, 170
    c = Image.new('RGBA', (w + 60, h + 60), (0, 0, 0, 0))
    d = ImageDraw.Draw(c)
    d.rounded_rectangle((30, 30, 30 + w, 30 + h), 24, fill=(30, 41, 59, 240),
                        outline=color + (255,), width=4 if final else 3)
    d.rounded_rectangle((30, 30, 30 + w, 44), 8, fill=color + (255,))
    t = text_image(title, font('display', 64), stops=GOLD_METAL if final else METAL, tracking=3,
                   pad=6, shadow=False)
    s = text_image(sub, font('display700', 30), color if final else MUTED, tracking=2, pad=6,
                   shadow=False)
    c.alpha_composite(t, (30 + (w - t.width) // 2, 72))
    c.alpha_composite(s, (30 + (w - s.width) // 2, 72 + t.height + 6))
    if final:
        c = Image.alpha_composite(glow_of(c, GOLD, 18, 0.9, pad=0), c)
    return c


CHIPS = [stage_chip(a, b, c, i == 3) for i, (a, b, c) in enumerate(STAGES)]
TICKER = text_image(
    '   BPL-2027   •   12 TEAMS   •   48 MATCHES   •   GROUP STAGE   •   SUPER SIX   •   '
    'SEMI-FINALS   •   GRAND FINAL 19 DEC 2026   •   BARIDHI GARMENTS LIMITED   •   BITOPI GROUP   •',
    font('display800', 38), NAVY_0, tracking=4, pad=4, shadow=False)

T_SIX = text_image('SIX!', font('display', 300), stops=GOLD_METAL, tracking=8, glow=GOLD,
                   glow_r=40)
T_YORKER = text_image('YORKER', font('display', 240), stops=METAL, tracking=8, glow=CYAN,
                      glow_r=36)
T_PASSION = text_image('PASSION', font('display', 120), CRIMSON, tracking=12, glow=CRIMSON,
                       glow_r=24)
T_TEAMWORK = text_image('TEAMWORK', font('display', 120), CYAN, tracking=12, glow=CYAN, glow_r=24)
T_SPIRIT = text_image('CHAMPIONSHIP SPIRIT', font('display', 110), stops=GOLD_METAL, tracking=10,
                      glow=GOLD, glow_r=26)
T_TRIAD = text_image('PASSION  •  TEAMWORK  •  CHAMPIONSHIP SPIRIT', font('display800', 58),
                     WHITE, tracking=8, glow=(0, 0, 0), glow_r=10)
T_FOLLOW = text_image('FOLLOW EVERY BALL LIVE', font('display', 112), stops=METAL, tracking=10,
                      glow=CYAN, glow_r=26)
URL = 'bitopiit-dev.github.io/Cricket_Score_Board'


def url_pill():
    t = text_image(URL, font('sans', 40), WHITE, pad=4, shadow=False)
    w, h = t.width + 120, 92
    p = Image.new('RGBA', (w + 80, h + 80), (0, 0, 0, 0))
    d = ImageDraw.Draw(p)
    d.rounded_rectangle((40, 40, 40 + w, 40 + h), h // 2, fill=(15, 23, 42, 235),
                        outline=CYAN + (255,), width=4)
    d.ellipse((40 + 34, 40 + h / 2 - 9, 40 + 52, 40 + h / 2 + 9), fill=CRIMSON + (255,))
    p.alpha_composite(t, (40 + 76, 40 + (h - t.height) // 2))
    return Image.alpha_composite(glow_of(p, CYAN, 22, 0.8, pad=0), p)


PILL = url_pill()


def trophy():
    """Stylised cup silhouette in championship gold."""
    w, h = 460, 600
    m = Image.new('L', (w, h), 0)
    d = ImageDraw.Draw(m)
    cx = w // 2
    # bowl
    bowl = [(cx - 150, 70)] + [(cx - 150 + 150 * (1 - math.cos(a)) * 0 + (-150 * math.cos(a)) + 0,
                                 70 + 230 * math.sin(a)) for a in np.linspace(0, math.pi / 2, 20)]
    bowl = [(cx + 150 * math.cos(a), 70 + 240 * math.sin(a) ** 1.3)
            for a in np.linspace(0, math.pi, 40)]
    d.polygon([(cx + 160, 60), (cx - 160, 60)] + bowl[::-1][::-1], fill=255)
    d.ellipse((cx - 160, 40, cx + 160, 84), fill=255)
    # handles
    for side in (-1, 1):
        box = (cx + side * 120 - 75, 100, cx + side * 120 + 75, 250)
        d.arc(box, 270 if side > 0 else 90, 90 if side > 0 else 270, fill=255, width=22)
    # stem, knot and base
    d.polygon([(cx - 26, 300), (cx + 26, 300), (cx + 18, 430), (cx - 18, 430)], fill=255)
    d.ellipse((cx - 46, 360, cx + 46, 396), fill=255)
    d.polygon([(cx - 120, 470), (cx + 120, 470), (cx + 140, 540), (cx - 140, 540)], fill=255)
    d.rectangle((cx - 90, 430, cx + 90, 472), fill=255)
    d.rectangle((cx - 150, 540, cx + 150, 570), fill=255)
    fill = gradient_h_gold(w, h)
    out = fill.convert('RGBA')
    out.putalpha(m)
    # highlight streak and rim
    hl = Image.new('L', (w, h), 0)
    ImageDraw.Draw(hl).rectangle((cx - 90, 70, cx - 60, 300), fill=120)
    hl = ImageChops.multiply(hl.filter(ImageFilter.GaussianBlur(12)), m)
    out = Image.alpha_composite(out, Image.merge('RGBA', (*Image.new('RGB', (w, h), (255, 250, 230)).split(), hl)))
    return out


def gradient_h_gold(w, h):
    xs = np.linspace(0, 1, w)
    stops = np.array([[180, 83, 9], [251, 191, 36], [255, 247, 214], [245, 158, 11], [146, 64, 14]])
    pos = np.array([0, 0.3, 0.45, 0.65, 1])
    row = np.stack([np.interp(xs, pos, stops[:, k]) for k in range(3)], -1)
    return Image.fromarray(np.repeat(row[None], h, 0).astype('uint8'), 'RGB')


TROPHY = trophy()
TROPHY_GLOW = glow_of(TROPHY, GOLD, 40, 1.4)

# ============================================================== particles
DUST = [(rng.random() * W, rng.random() * H, rng.uniform(0.6, 2.6), rng.uniform(8, 30),
         rng.random() * 6.28) for _ in range(140)]


def draw_dust(canvas, t, alpha=1.0, color=(255, 214, 140)):
    if alpha <= 0:
        return
    d = ImageDraw.Draw(canvas)
    for x0, y0, r, sp, ph in DUST:
        y = (y0 - t * sp) % H
        x = x0 + math.sin(t * 0.6 + ph) * 18
        tw = 0.5 + 0.5 * math.sin(t * 3 + ph * 3)
        a = int(255 * alpha * (0.25 + 0.6 * tw))
        d.ellipse((x - r, y - r, x + r, y + r), fill=color + (a,))


CONFETTI = [(rng.random() * W, rng.uniform(-900, -20), rng.uniform(140, 320), rng.uniform(-60, 60),
             rng.random() * 6.28, rng.choice([GOLD, GOLD, EMERALD, CYAN, WHITE, (253, 230, 138)]),
             rng.uniform(8, 16)) for _ in range(170)]


def draw_confetti(canvas, t):
    if t <= 0:
        return
    d = ImageDraw.Draw(canvas)
    for x0, y0, vy, vx, ph, c, s in CONFETTI:
        y = y0 + vy * t
        if y > H + 20:
            continue
        x = x0 + vx * t + math.sin(t * 3 + ph) * 26
        ang = t * 5 + ph
        cw = abs(math.cos(ang)) * s + 2
        pts = [(x + math.cos(ph) * cw - math.sin(ph) * s * 0.45, y + math.sin(ph) * cw + math.cos(ph) * s * 0.45),
               (x - math.cos(ph) * cw - math.sin(ph) * s * 0.45, y - math.sin(ph) * cw + math.cos(ph) * s * 0.45),
               (x - math.cos(ph) * cw + math.sin(ph) * s * 0.45, y - math.sin(ph) * cw - math.cos(ph) * s * 0.45),
               (x + math.cos(ph) * cw + math.sin(ph) * s * 0.45, y + math.sin(ph) * cw - math.cos(ph) * s * 0.45)]
        d.polygon(pts, fill=c + (235,))


EMBERS = [(rng.random() * W, rng.random() * H, rng.uniform(1.2, 3.4), rng.uniform(25, 70),
           rng.random() * 6.28) for _ in range(90)]


def draw_embers(canvas, t, alpha=1.0):
    d = ImageDraw.Draw(canvas)
    for x0, y0, r, sp, ph in EMBERS:
        y = (y0 - t * sp) % H
        x = x0 + math.sin(t * 0.9 + ph) * 30
        a = int(255 * alpha * (0.35 + 0.5 * math.sin(t * 2.4 + ph) ** 2))
        d.ellipse((x - r, y - r, x + r, y + r), fill=(255, 170, 60, a))


# ================================================================ helpers
def background(t, img, drift=1.0):
    """Crop the padded backdrop with a slow parallax drift (never static)."""
    ox = PAD + math.sin(t * 0.21) * 40 * drift
    oy = PAD + math.cos(t * 0.17) * 22 * drift
    return img.crop((int(ox), int(oy), int(ox) + W, int(oy) + H))


def slam(canvas, img, cx, cy, t, t0, t_out=None, out_dur=0.35, big=1.7):
    """Slams in from big and transparent; on t_out pushes forward and fades."""
    if t < t0:
        return
    p = prog(t, t0, t0 + 0.32)
    s = 1 + (big - 1) * (1 - ease_out_expo(p))
    a = clamp(p * 2.5)
    if t_out is not None and t >= t_out:
        q = prog(t, t_out, t_out + out_dur)
        s *= 1 + 0.12 * ease_in_cubic(q)
        a *= 1 - q
    s *= 1 + (t - t0) * 0.012  # slow push-in, no static frame
    place(canvas, img, cx, cy, s, a)


def flash(canvas, t, t0, dur=0.25, color=(255, 255, 255), peak=0.85):
    if t0 <= t < t0 + dur:
        a = peak * (1 - prog(t, t0, t0 + dur)) ** 2
        canvas.alpha_composite(Image.new('RGBA', (W, H), color + (int(255 * a),)))


def vignette():
    yy, xx = np.mgrid[0:H, 0:W]
    d = np.sqrt(((xx - W / 2) / (W * 0.62)) ** 2 + ((yy - H / 2) / (H * 0.62)) ** 2)
    a = np.clip((d - 0.55) * 1.4, 0, 1) ** 1.6 * 200
    v = Image.new('RGBA', (W, H), (2, 4, 10, 0))
    v.putalpha(Image.fromarray(a.astype('uint8')))
    return v


VIGNETTE = vignette()
GRID = None


def build_grid():
    g = Image.new('RGBA', (W, H + 120), (0, 0, 0, 0))
    d = ImageDraw.Draw(g)
    for y in range(0, H + 120, 60):
        d.line((0, y, W, y), fill=CYAN + (22,), width=1)
    for x in range(0, W, 60):
        d.line((x, 0, x, H + 120), fill=CYAN + (14,), width=1)
    return g


GRID = build_grid()


def stumps(canvas, cx, base_y, t_hit, t, tilt_max=14, color=CYAN, scale=1.0):
    """Three glowing digital stumps; after t_hit they tilt and the bails fly."""
    d = ImageDraw.Draw(canvas)
    hgt, gap = 230 * scale, 44 * scale
    after = t - t_hit if t_hit is not None else -1
    for i, off in enumerate((-gap, 0, gap)):
        ang = 0.0
        if after > 0:
            ang = math.radians([-1, 0.4, 1][i] * tilt_max * ease_out_cubic(clamp(after / 0.5)))
        x0, y0 = cx + off, base_y
        x1, y1 = x0 + math.sin(ang) * hgt, y0 - math.cos(ang) * hgt
        for wdt, a in ((26 * scale, 50), (16 * scale, 110), (9 * scale, 255)):
            d.line((x0, y0, x1, y1), fill=(color if a < 255 else WHITE) + (a,), width=int(wdt))
    # bails
    top = base_y - hgt
    for j, (bx, vx, vr) in enumerate(((cx - gap / 2, -260, -540), (cx + gap / 2, 300, 620))):
        if after <= 0:
            x, y, rot = bx, top - 6 * scale, 0
        else:
            tt = after * 0.55  # slow motion
            x = bx + vx * tt
            y = top - 6 * scale - 520 * tt + 900 * tt * tt
            rot = vr * tt
        L = 40 * scale
        dx, dy = math.cos(math.radians(rot)) * L / 2, math.sin(math.radians(rot)) * L / 2
        d.line((x - dx, y - dy, x + dx, y + dy), fill=GOLD + (255,), width=int(10 * scale))


def ball(canvas, x, y, r=24, glow=True):
    d = ImageDraw.Draw(canvas)
    if glow:
        for k, a in ((2.6, 40), (1.8, 80)):
            d.ellipse((x - r * k, y - r * k, x + r * k, y + r * k), fill=(255, 80, 60, a))
    d.ellipse((x - r, y - r, x + r, y + r), fill=(200, 16, 36, 255))
    d.ellipse((x - r * 0.75, y - r * 0.8, x + r * 0.1, y - r * 0.05), fill=(255, 120, 120, 120))
    d.arc((x - r * 0.9, y - r * 0.9, x + r * 0.9, y + r * 0.9), 200, 340, fill=(255, 255, 255, 230),
          width=3)


def trail(canvas, pts, c1, c2, width=34):
    """Fiery trail through recent ball positions, fading to its tail."""
    if len(pts) < 2:
        return
    layer = Image.new('RGBA', (W // 2, H // 2), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    n = len(pts)
    for i in range(1, n):
        q = i / n
        col = tuple(int(lerp(c1[k], c2[k], q)) for k in range(3))
        wd = max(1, int(width * q / 2))
        (x0, y0), (x1, y1) = pts[i - 1], pts[i]
        d.line((x0 / 2, y0 / 2, x1 / 2, y1 / 2), fill=col + (int(220 * q),), width=wd)
    glow = layer.filter(ImageFilter.GaussianBlur(8)).resize((W, H), Image.BILINEAR)
    canvas.alpha_composite(glow)
    canvas.alpha_composite(layer.resize((W, H), Image.BILINEAR))


def path_points(fn, t, t0, length=0.32, steps=26):
    return [fn(t - length + length * i / steps) for i in range(steps + 1) if t - length + length * i / steps >= t0]


def logo_reveal(canvas, t, t0, cx, cy, base_scale=1.0, sheen_t=None):
    p = prog(t, t0, t0 + 0.9)
    if p <= 0:
        return
    s = base_scale * (0.62 + 0.38 * ease_out_back(p, 1.4)) * (1 + 0.01 * (t - t0))
    a = clamp(p * 3)
    pulse = 0.85 + 0.15 * math.sin(t * 2.2)
    place(canvas, LOGO_GLOW, cx, cy, s, a * pulse)
    place(canvas, LOGO_RIM, cx, cy, s, a * 0.9)
    lg = LOGO
    if sheen_t is not None and t >= sheen_t:
        q = prog(t, sheen_t, sheen_t + 1.1)
        if 0 < q < 1:
            off = int(lerp(LOGO.width * 2.0, 0, ease_in_out_cubic(q)))
            band = SHEEN.crop((off, 0, off + LOGO.width, LOGO.height))
            band = ImageChops.multiply(band, LOGO.getchannel('A'))
            lg = LOGO.copy()
            lg.alpha_composite(Image.merge('RGBA', (*Image.new('RGB', LOGO.size, (255, 255, 255)).split(), band)))
    place(canvas, lg, cx, cy, s, a)


# ================================================================= scenes
def scene1(t):
    """0-8 s: floodlights flicker on, THE WAIT IS OVER, 12 TEAMS. ONE GLORY."""
    c = background(t, STADIUM).copy()
    ign = [0.5, 1.15, 1.75, 2.3]
    frame_lights = Image.new('RGB', (W, H), (0, 0, 0))
    for i, L in enumerate(LIGHTS):
        t0 = ign[i]
        if t < t0:
            continue
        dt = t - t0
        if dt < 0.35:  # flicker while the lamp strikes
            k = [0.9, 0.1, 0.7, 0.0, 1.0, 0.3, 1.0][int(dt * 20) % 7]
        else:
            k = 0.82 + 0.18 * math.sin(t * 1.3 + i)
        lb = background(t, L)
        frame_lights = ImageChops.add(frame_lights, lb.convert('RGB').point(lambda v, k=k: int(v * k)))
    c = ImageChops.add(c, frame_lights.convert('RGBA'))
    draw_dust(c, t, alpha=clamp((t - 1.0) / 1.5))
    c.alpha_composite(VIGNETTE)
    slam(c, T_WAIT, W / 2, H / 2 - 20, t, 3.0, t_out=4.9)
    slam(c, T_TEAMS, W / 2, H / 2 - 110, t, 5.3, t_out=7.6)
    slam(c, T_GLORY, W / 2, H / 2 + 110, t, 5.95, t_out=7.6)
    return c


def ball_path_s2(u):
    """Ball from top-left to the stumps (u in seconds since launch)."""
    p = clamp(u / 1.15)
    x = lerp(-80, W / 2 + 4, p)
    y = lerp(160, 640, p) - math.sin(p * math.pi) * 160
    return x, y


HIT2 = 9.35


def scene2(t):
    """8-16 s: ball streaks into stumps; the logo bursts out with a gold rim and sheen."""
    c = background(t, LIT_DIM).copy()
    draw_dust(c, t, 0.6)
    c.alpha_composite(VIGNETTE)
    launch = 8.2
    stumps_a = 1 - prog(t, 10.2, 10.8)
    if stumps_a > 0:
        layer = Image.new('RGBA', (W, H), (0, 0, 0, 0))
        stumps(layer, W / 2, 760, HIT2, t)
        c.alpha_composite(with_alpha(layer, stumps_a))
    if launch <= t < HIT2:
        u = t - launch
        pts = path_points(lambda v: ball_path_s2(v - launch), t, launch, 0.55)
        trail(c, pts, EMERALD, GOLD, 70)
        x, y = ball_path_s2(u)
        ball(c, x, y)
    # impact sparks
    if HIT2 <= t < HIT2 + 1.2:
        d = ImageDraw.Draw(c)
        u = t - HIT2
        r = random.Random(7)
        for _ in range(70):
            ang = r.uniform(0, math.tau)
            sp = r.uniform(300, 1300)
            ln = r.uniform(20, 70)
            x = W / 2 + math.cos(ang) * sp * u
            y = 560 + math.sin(ang) * sp * u + 400 * u * u
            a = int(255 * (1 - u / 1.2))
            col = r.choice([GOLD, EMERALD, WHITE, (253, 230, 138)])
            d.line((x, y, x - math.cos(ang) * ln, y - math.sin(ang) * ln), fill=col + (a,), width=4)
        # shock ring
        rr = 60 + 900 * ease_out_expo(clamp(u / 0.8))
        d.ellipse((W / 2 - rr, 560 - rr, W / 2 + rr, 560 + rr), outline=GOLD + (int(200 * (1 - clamp(u / 0.8))),), width=6)
    logo_reveal(c, t, HIT2 + 0.12, W / 2, 440, 1.0, sheen_t=10.6)
    # subtitle with expanding gold rules
    p = prog(t, 11.1, 11.7)
    if p > 0:
        e = ease_out_expo(p)
        place(c, T_SUB, W / 2, 800 + 30 * (1 - e), 1.0, e)
        d = ImageDraw.Draw(c)
        half = 520 * e
        # gold rules either side of BITOPI GROUP
        d.line((W / 2 - half, 885, W / 2 - 200, 885), fill=GOLD + (int(255 * e),), width=3)
        d.line((W / 2 + 200, 885, W / 2 + half, 885), fill=GOLD + (int(255 * e),), width=3)
    p2 = prog(t, 11.5, 12.1)
    if p2 > 0:
        place(c, T_SUB2, W / 2, 885, 1.0, ease_out_expo(p2))
    flash(c, t, HIT2, 0.35, (255, 246, 220), 0.9)
    flash(c, t, 8.0, 0.18)
    # exit: everything pushes forward and dims
    if t > 15.4:
        q = prog(t, 15.4, 16.0)
        c.alpha_composite(Image.new('RGBA', (W, H), NAVY_0 + (int(255 * ease_in_cubic(q)),)))
    return c


def scene3(t):
    """16-28 s: all 12 teams (no groups shown), then the road to the final."""
    c = Image.new('RGBA', (W, H), NAVY + (255,))
    # moving diagonal stripes for life
    c.alpha_composite(GRID.crop((0, int((t * 40) % 60), W, int((t * 40) % 60) + H)))
    out = prog(t, 22.3, 22.9)
    o = ease_in_cubic(out)
    if o < 1:
        # soft emerald and cyan pools of light behind the grid
        c.alpha_composite(with_alpha(radial((W, H), EMERALD, 0.16, 1.8), 1 - o))
        hp = ease_out_expo(prog(t, 16.2, 16.8)) * (1 - o)
        place(c, T_FORMAT, W / 2, 80, 1, hp)
        place(c, T_12, W / 2, 205 - 30 * (1 - hp), 1 + 0.01 * (t - 16.2), hp)
        # all twelve badges, six to a row, popping in one after another
        for k, (n, _, _) in enumerate(TEAMS):
            t0 = 16.9 + k * 0.14
            bp = prog(t, t0, t0 + 0.5)
            if bp <= 0:
                continue
            col, row = k % 6, k // 6
            x = W / 2 + (col - 2.5) * 290
            y = 455 + row * 265 + math.sin(t * 1.4 + k) * 4 - 40 * o * (1 if row == 0 else -1)
            place(c, BADGES[n], x, y, (0.4 + 0.6 * spring(bp)) * (1 - 0.3 * o),
                  clamp(bp * 3) * (1 - o))
        rp = ease_out_expo(prog(t, 18.9, 19.5)) * (1 - o)
        if rp > 0:
            pw, ph = T_RR.width + 70, 74
            pill = Image.new('RGBA', (pw, ph), (0, 0, 0, 0))
            ImageDraw.Draw(pill).rounded_rectangle((0, 0, pw - 1, ph - 1), ph // 2, fill=EMERALD + (255,))
            pill.alpha_composite(T_RR, ((pw - T_RR.width) // 2, (ph - T_RR.height) // 2))
            place(c, pill, W / 2, 925 + 20 * (1 - rp), 1, rp)
    # road to glory
    if t >= 22.6:
        hp = ease_out_expo(prog(t, 22.7, 23.3))
        place(c, T_ROAD, W / 2, 300 - 40 * (1 - hp), 1 + 0.01 * (t - 22.7), hp)
        xs = [W / 2 + (i - 1.5) * 445 for i in range(4)]
        y = 600
        lp = prog(t, 23.2, 26.6)
        head = lerp(xs[0], xs[3], ease_in_out_cubic(lp))
        d = ImageDraw.Draw(c)
        if lp > 0:
            d.line((xs[0], y, head, y), fill=EMERALD + (255,), width=8)
            d.line((xs[0], y, head, y), fill=(167, 243, 208, 255), width=2)
            for k, a in ((26, 60), (16, 120), (8, 255)):
                d.ellipse((head - k, y - k, head + k, y + k), fill=(255, 255, 255, a))
        for i, chip in enumerate(CHIPS):
            reached = head >= xs[i] - 1 or i == 0
            t_reach = 23.2 + 3.4 * ([0, 0.33, 0.66, 1.0][i]) if i else 23.25
            cp = prog(t, t_reach, t_reach + 0.5)
            if not reached or cp <= 0:
                continue
            s = (0.5 + 0.5 * spring(cp)) * (1 + (0.03 * math.sin(t * 3) if i == 3 else 0))
            place(c, chip, xs[i], y, s, clamp(cp * 3))
    # bottom ticker bar for the whole scene
    tb = ease_out_expo(prog(t, 16.6, 17.2)) * (1 - prog(t, 27.6, 28.0))
    if tb > 0:
        bar = Image.new('RGBA', (W, 64), GOLD + (255,))
        span = TICKER.width + 60  # gap so the last bullet doesn't touch the next lap
        off = int((t - 16) * 170) % span
        for k in range(3):
            x = -off + k * span
            if x < W:
                bar.alpha_composite(TICKER, (x, (64 - TICKER.height) // 2)) if x >= 0 else \
                    bar.alpha_composite(TICKER.crop((-x, 0, TICKER.width, TICKER.height)), (0, (64 - TICKER.height) // 2))
        place(c, bar, W / 2, H - 32 + 70 * (1 - tb), 1, 1)
    c.alpha_composite(VIGNETTE)
    if t < 16.25:
        c.alpha_composite(Image.new('RGBA', (W, H), NAVY_0 + (int(255 * (1 - prog(t, 16.0, 16.25))),)))
    return c


COUNTERS = [('FOURS', 212, 0), ('SIXES', 148, 0), ('WICKETS', 96, 0), ('STRIKE RATE', 162.4, 1)]


def hud(c, t):
    """Live broadcast HUD: LIVE pill top-left and a bottom bar of ticking counters."""
    a = ease_out_expo(prog(t, 28.1, 28.6)) * (1 - prog(t, 37.6, 38.0))
    if a <= 0:
        return
    layer = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    # LIVE pill
    d.rounded_rectangle((60, 50, 236, 104), 27, fill=CRIMSON + (255,))
    pr = 9 + 5 * (0.5 + 0.5 * math.sin(t * 7))
    d.ellipse((88 - pr, 77 - pr, 88 + pr, 77 + pr), fill=(255, 255, 255, 90))
    d.ellipse((81, 70, 95, 84), fill=(255, 255, 255, 255))
    d.text((106, 52), 'LIVE', font=font('display', 48), fill=WHITE)
    d.text((262, 52), 'BPL-2027', font=font('display800', 48), fill=WHITE + (220,))
    # bottom glass bar
    d.rounded_rectangle((60, 890, W - 60, 1040), 26, fill=(15, 23, 42, 215), outline=(51, 65, 85, 255), width=2)
    seg = (W - 120) / 4
    for i, (label, target, dec) in enumerate(COUNTERS):
        x0 = 60 + seg * i
        if i:
            d.line((x0, 915, x0, 1015), fill=(51, 65, 85, 255), width=2)
        p = ease_out_cubic(prog(t, 28.4 + i * 0.25, 33.5 + i * 0.6))
        v = target * p
        val = f'{v:.1f}' if dec else f'{int(v):d}'
        col = [CYAN, GOLD, CRIMSON, EMERALD][i]
        f_val = font('display', 76)
        # tabular look: draw each digit in a fixed-width cell
        cell = f_val.getlength('0')
        total = sum(cell if ch.isdigit() else f_val.getlength(ch) for ch in val)
        x = x0 + seg / 2 - total / 2
        for ch in val:
            wch = cell if ch.isdigit() else f_val.getlength(ch)
            d.text((x + (wch - f_val.getlength(ch)) / 2, 900), ch, font=f_val, fill=WHITE)
            x += wch
        lab = font('display800', 30)
        d.text((x0 + seg / 2 - lab.getlength(label) / 2, 990), label, font=lab, fill=col)
    c.alpha_composite(with_alpha(layer, a))


def bat(canvas, cx, cy, ang, alpha=1.0, color=(226, 232, 240)):
    """Cricket bat silhouette rotated around the grip."""
    L, Wd = 300, 54
    pts = [(-Wd / 2, 0), (Wd / 2, 0), (Wd / 2, L * 0.72), (Wd * 0.18, L * 0.78),
           (Wd * 0.14, L), (-Wd * 0.14, L), (-Wd * 0.18, L * 0.78), (-Wd / 2, L * 0.72)]
    ca, sa = math.cos(ang), math.sin(ang)
    poly = [(cx + x * ca - (L - y) * sa * -1 * 0 - (y - L) * sa, cy + x * sa + (y - L) * ca) for x, y in pts]
    ImageDraw.Draw(canvas).polygon(poly, fill=color + (int(255 * alpha),))


def six_path(u):
    p = clamp(u / 1.3)
    x = lerp(470, W + 120, p)
    y = 760 - 1300 * p + 1050 * p * p
    return x, y


def yorker_path(u):
    p = clamp(u / 0.5)
    return lerp(W / 2 + 40, W / 2, p), lerp(-60, 690, ease_in_cubic(p) * 0.4 + p * 0.6)


def scene4(t):
    """28-38 s: broadcast HUD montage — lofted six, yorker, trophy in confetti."""
    c = background(t, LIT_DIM).copy()
    c.alpha_composite(Image.new('RGBA', (W, H), NAVY_0 + (130,)))
    off = int((t * 60) % 60)
    c.alpha_composite(GRID.crop((0, off, W, off + H)))
    # --- beat a: lofted six
    if t < 31.4:
        swing = prog(t, 28.25, 28.5)
        if t < 29.6:
            fade = 1 - prog(t, 29.1, 29.6)
            for k in range(5, -1, -1):  # motion-blur ghosts of the swing
                q = clamp(swing - k * 0.06)
                ang = lerp(math.radians(-150), math.radians(40), ease_out_cubic(q))
                bat(c, 430, 830, ang, alpha=fade * (0.15 if k else 1.0))
        if 28.48 <= t < 29.9:
            pts = path_points(lambda v: six_path(v - 28.48), t, 28.48, 0.45)
            trail(c, pts, CYAN, GOLD, 30)
            x, y = six_path(t - 28.48)
            ball(c, x, y, 20)
        slam(c, T_SIX, W / 2 + 120, 430, t, 29.15, t_out=31.0, big=2.0)
        slam(c, T_PASSION, W / 2 + 120, 700, t, 29.7, t_out=31.0)
    # --- beat b: yorker
    if 31.3 <= t < 34.8:
        hit = 31.95
        if t < hit:
            pts = path_points(lambda v: yorker_path(v - 31.45), t, 31.45, 0.25)
            trail(c, pts, CYAN, WHITE, 28)
            if t >= 31.45:
                x, y = yorker_path(t - 31.45)
                ball(c, x, y, 18)
        sa = 1 - prog(t, 34.2, 34.7)
        layer = Image.new('RGBA', (W, H), (0, 0, 0, 0))
        stumps(layer, W / 2, 760, hit, t, tilt_max=22, scale=0.8)
        c.alpha_composite(with_alpha(layer, sa * clamp((t - 31.3) / 0.2)))
        flash(c, t, hit, 0.22, (200, 245, 255), 0.6)
        slam(c, T_YORKER, W / 2, 330, t, 32.1, t_out=34.3, big=1.9)
        sp = ease_out_cubic(prog(t, 32.2, 33.4))
        spd = text_image(f'{143.8 * sp:5.1f} KM/H', font('display800', 64), CYAN, tracking=4, pad=6,
                         shadow=False)
        place(c, spd, W / 2, 480, 1, clamp((t - 32.2) * 4) * (1 - prog(t, 34.2, 34.6)))
        slam(c, T_TEAMWORK, W / 2, 815 - 90, t, 32.8, t_out=34.3)
    # --- beat c: trophy and confetti
    if t >= 34.6:
        rays_a = ease_out_cubic(prog(t, 34.7, 35.4)) * (1 - prog(t, 37.6, 38.0))
        if rays_a > 0:
            rays = Image.new('RGBA', (W, H), (0, 0, 0, 0))
            d = ImageDraw.Draw(rays)
            for k in range(14):
                a0 = t * 0.4 + k * math.tau / 14
                d.polygon([(W / 2, 420), (W / 2 + math.cos(a0) * 1400, 420 + math.sin(a0) * 1400),
                           (W / 2 + math.cos(a0 + 0.12) * 1400, 420 + math.sin(a0 + 0.12) * 1400)],
                          fill=GOLD + (int(26 * rays_a),))
            c.alpha_composite(rays)
        tp = prog(t, 34.7, 35.5)
        s = 0.75 * ease_out_back(tp, 1.3) if tp > 0 else 0
        y = 430 + 260 * (1 - ease_out_cubic(tp)) + math.sin(t * 1.6) * 6
        ta = clamp(tp * 3) * (1 - prog(t, 37.6, 38.0))
        place(c, TROPHY_GLOW, W / 2, y, s, ta * (0.8 + 0.2 * math.sin(t * 3)))
        place(c, TROPHY, W / 2, y, s, ta)
        draw_confetti(c, t - 35.0)
        if t < 36.5:
            slam(c, T_SPIRIT, W / 2, 790 - 40, t, 35.5, t_out=36.3)
        else:
            p = ease_out_expo(prog(t, 36.5, 37.0)) * (1 - prog(t, 37.6, 38.0))
            place(c, T_TRIAD, W / 2, 770 + 20 * (1 - p), 1, p)
    hud(c, t)
    c.alpha_composite(VIGNETTE)
    flash(c, t, 28.0, 0.2, (255, 255, 255), 0.7)
    return c


CONVERGE = [(rng.random() * W, rng.random() * H, rng.choice([GOLD, EMERALD, CYAN, WHITE]),
             rng.uniform(2, 5)) for _ in range(160)]


def scene5(t):
    """38-45 s: everything converges into the logo; follow every ball live; fade out."""
    c = background(t, LIT_DIM).copy()
    c.alpha_composite(Image.new('RGBA', (W, H), NAVY_0 + (150,)))
    draw_embers(c, t, clamp((t - 38.6) / 0.8))
    cp = prog(t, 38.0, 38.85)
    if cp < 1:
        d = ImageDraw.Draw(c)
        e = ease_in_cubic(cp)
        for x0, y0, col, r in CONVERGE:
            x = lerp(x0, W / 2, e)
            y = lerp(y0, 430, e)
            px, py = lerp(x0, W / 2, max(0, e - 0.08)), lerp(y0, 430, max(0, e - 0.08))
            d.line((px, py, x, y), fill=col + (160,), width=int(r))
            d.ellipse((x - r, y - r, x + r, y + r), fill=col + (255,))
    logo_reveal(c, t, 38.85, W / 2, 400, 0.95, sheen_t=39.8)
    flash(c, t, 38.85, 0.4, (255, 240, 200), 0.8)
    fp = ease_out_expo(prog(t, 40.0, 40.7))
    place(c, T_FOLLOW, W / 2, 790 + 30 * (1 - fp), 1 + 0.008 * max(0, t - 40), fp)
    pp = prog(t, 40.8, 41.4)
    place(c, PILL, W / 2, 925, 0.85 + 0.15 * spring(pp) if pp > 0 else 0, clamp(pp * 3))
    c.alpha_composite(VIGNETTE)
    if t < 38.3:
        c.alpha_composite(Image.new('RGBA', (W, H), NAVY_0 + (int(255 * (1 - prog(t, 38.0, 38.3))),)))
    if t > 44.0:
        c.alpha_composite(Image.new('RGBA', (W, H), (0, 0, 0, int(255 * ease_in_out_cubic(prog(t, 44.0, 45.0))))))
    return c


IMPACTS = [3.0, 5.3, 5.95, HIT2, 29.15, 31.95, 32.1, 38.85]


def frame(t):
    if t < 8:
        c = scene1(t)
    elif t < 16:
        c = scene2(t)
    elif t < 28:
        c = scene3(t)
    elif t < 38:
        c = scene4(t)
    else:
        c = scene5(t)
    dx, dy = shake_offset(t, IMPACTS)
    if dx or dy:
        c = ImageChops.offset(c, dx, dy)
    return c.convert('RGB')


def main():
    if len(sys.argv) > 2 and sys.argv[1] == '--stills':
        os.makedirs(os.path.join(HERE, 'stills'), exist_ok=True)
        for s in sys.argv[2].split(','):
            frame(float(s)).save(os.path.join(HERE, 'stills', f'{float(s):05.2f}.png'))
        return
    if len(sys.argv) > 2 and sys.argv[1] == '--part':
        # Render frames [a, b) to parts/NNNN.mp4 (video only); see --join
        a, b = (int(x) for x in sys.argv[2].split(':'))
        os.makedirs(os.path.join(HERE, 'parts'), exist_ok=True)
        part = os.path.join(HERE, 'parts', f'{a:04d}.mp4')
        enc = subprocess.Popen(['ffmpeg', '-y', '-loglevel', 'error', '-f', 'rawvideo',
                                '-pix_fmt', 'rgb24', '-s', f'{W}x{H}', '-r', str(FPS), '-i', '-',
                                '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '19',
                                '-pix_fmt', 'yuv420p', part], stdin=subprocess.PIPE)
        for i in range(a, b):
            enc.stdin.write(frame(i / FPS).tobytes())
        enc.stdin.close()
        enc.wait()
        print('part', part, file=sys.stderr)
        return
    if len(sys.argv) > 1 and sys.argv[1] == '--join':
        parts = sorted(f for f in os.listdir(os.path.join(HERE, 'parts')) if f.endswith('.mp4'))
        lst = os.path.join(HERE, 'parts', 'list.txt')
        with open(lst, 'w') as fh:
            fh.writelines(f"file '{p}'\n" for p in parts)
        subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0',
                        '-i', lst, '-i', os.path.join(HERE, 'audio.wav'), '-c:v', 'copy',
                        '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', '-shortest',
                        os.path.join(HERE, 'bpl-2027-intro.mp4')], check=True)
        print('joined', len(parts), 'parts', file=sys.stderr)
        return
    out = os.path.join(HERE, 'bpl-2027-intro.mp4')
    audio = os.path.join(HERE, 'audio.wav')
    cmd = ['ffmpeg', '-y', '-loglevel', 'error', '-f', 'rawvideo', '-pix_fmt', 'rgb24',
           '-s', f'{W}x{H}', '-r', str(FPS), '-i', '-']
    if os.path.exists(audio):
        cmd += ['-i', audio, '-c:a', 'aac', '-b:a', '192k']
    cmd += ['-c:v', 'libx264', '-preset', 'veryfast', '-crf', '19', '-pix_fmt', 'yuv420p',
            '-movflags', '+faststart', '-shortest', out]
    enc = subprocess.Popen(cmd, stdin=subprocess.PIPE)
    total = int(DURATION * FPS)
    for i in range(total):
        enc.stdin.write(frame(i / FPS).tobytes())
        if i % 120 == 0:
            print(f'frame {i}/{total}', file=sys.stderr, flush=True)
    enc.stdin.close()
    enc.wait()
    print('done', out, file=sys.stderr)


if __name__ == '__main__':
    main()
