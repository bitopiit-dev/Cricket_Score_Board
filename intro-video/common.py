"""Shared helpers for the BPL-2027 intro: easing, fonts, text, compositing."""
import math
import os

from PIL import Image, ImageDraw, ImageFilter, ImageFont

W, H, FPS, DURATION = 1920, 1080, 60, 45.0
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PUBLIC = os.path.join(ROOT, 'public')
FONTS = os.path.join(ROOT, 'node_modules', '@fontsource', 'barlow-condensed', 'files')

NAVY_0 = (7, 11, 20)
NAVY = (11, 17, 32)
NAVY_2 = (15, 23, 42)
CYAN = (6, 182, 212)
EMERALD = (16, 185, 129)
GOLD = (245, 158, 11)
WHITE = (248, 250, 252)
CRIMSON = (225, 29, 72)
MUTED = (148, 163, 184)


# ----------------------------------------------------------------- easing
def clamp(x, a=0.0, b=1.0):
    return max(a, min(b, x))


def prog(t, a, b):
    """0 before a, 1 after b, linear between."""
    return clamp((t - a) / (b - a)) if b > a else float(t >= a)


def ease_out_expo(p):
    return 1.0 if p >= 1 else 1 - 2 ** (-10 * p)


def ease_out_cubic(p):
    return 1 - (1 - p) ** 3


def ease_in_cubic(p):
    return p ** 3


def ease_in_out_cubic(p):
    return 4 * p ** 3 if p < 0.5 else 1 - (-2 * p + 2) ** 3 / 2


def ease_out_back(p, s=1.7):
    p -= 1
    return 1 + (s + 1) * p ** 3 + s * p ** 2


def spring(p, freq=4.5, decay=6.0):
    """Overshooting settle from 0 to 1."""
    if p <= 0:
        return 0.0
    return 1 - math.exp(-decay * p) * math.cos(freq * math.pi * p)


def lerp(a, b, p):
    return a + (b - a) * p


# ------------------------------------------------------------------ fonts
_font_cache = {}


def font(kind, size):
    key = (kind, size)
    if key not in _font_cache:
        path = {
            'display': os.path.join(FONTS, 'barlow-condensed-latin-900-normal.woff'),
            'display800': os.path.join(FONTS, 'barlow-condensed-latin-800-normal.woff'),
            'display700': os.path.join(FONTS, 'barlow-condensed-latin-700-normal.woff'),
            'sans': '/usr/share/fonts/opentype/inter/Inter-SemiBold.otf',
            'sansbold': '/usr/share/fonts/opentype/inter/Inter-ExtraBold.otf',
        }[kind]
        _font_cache[key] = ImageFont.truetype(path, size)
    return _font_cache[key]


# ------------------------------------------------------------------- text
METAL = [(0.0, (255, 255, 255)), (0.42, (226, 232, 240)), (0.5, (120, 136, 160)),
         (0.56, (241, 245, 249)), (1.0, (203, 213, 225))]
GOLD_METAL = [(0.0, (255, 247, 214)), (0.4, (251, 191, 36)), (0.5, (180, 83, 9)),
              (0.58, (253, 230, 138)), (1.0, (245, 158, 11))]


def gradient_v(w, h, stops):
    """Vertical multi-stop gradient, RGB."""
    col = Image.new('RGB', (1, h))
    px = col.load()
    for y in range(h):
        p = y / max(1, h - 1)
        for i in range(len(stops) - 1):
            a, ca = stops[i]
            b, cb = stops[i + 1]
            if a <= p <= b:
                q = (p - a) / (b - a) if b > a else 0
                px[0, y] = tuple(int(lerp(ca[k], cb[k], q)) for k in range(3))
                break
    return col.resize((w, h))


def text_image(text, fnt, fill=WHITE, stops=None, tracking=0, pad=40, glow=None, glow_r=18,
               shadow=True):
    """Tight RGBA image of text: flat colour or metallic gradient, optional glow."""
    # measure with tracking
    widths = [fnt.getbbox(ch)[2] - fnt.getbbox(ch)[0] if ch != ' ' else fnt.getlength(' ')
              for ch in text]
    asc, desc = fnt.getmetrics()
    tw = int(sum(fnt.getlength(ch) for ch in text) + tracking * (len(text) - 1))
    th = asc + desc
    w, h = tw + pad * 2, th + pad * 2
    mask = Image.new('L', (w, h), 0)
    d = ImageDraw.Draw(mask)
    x = pad
    for ch in text:
        d.text((x, pad), ch, font=fnt, fill=255)
        x += fnt.getlength(ch) + tracking
    del widths
    if stops:
        bbox = mask.getbbox() or (0, 0, w, h)
        fill_img = Image.new('RGB', (w, h))
        g = gradient_v(w, bbox[3] - bbox[1] + 1, stops)
        fill_img.paste(g, (0, bbox[1]))
    else:
        fill_img = Image.new('RGB', (w, h), fill)
    out = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    if glow:
        gl = Image.new('RGBA', (w, h), glow + (0,))
        gl.putalpha(mask.filter(ImageFilter.GaussianBlur(glow_r)).point(lambda v: min(255, v * 1.6)))
        out = Image.alpha_composite(out, gl)
    if shadow:
        sh = Image.new('RGBA', (w, h), (0, 0, 0, 0))
        sh.putalpha(mask.filter(ImageFilter.GaussianBlur(6)).point(lambda v: v * 0.7))
        out = Image.alpha_composite(out, sh.transform(sh.size, Image.AFFINE, (1, 0, -4, 0, 1, -6)))
    body = fill_img.convert('RGBA')
    body.putalpha(mask)
    out = Image.alpha_composite(out, body)
    return out.crop(out.getbbox())


# ----------------------------------------------------------- compositing
def with_alpha(img, a):
    if a >= 0.999:
        return img
    img = img.copy()
    img.putalpha(img.getchannel('A').point(lambda v: int(v * a)))
    return img


def scaled(img, s):
    if abs(s - 1) < 0.002:
        return img
    w, h = max(1, int(img.width * s)), max(1, int(img.height * s))
    return img.resize((w, h), Image.BILINEAR)


def place(canvas, img, cx, cy, scale=1.0, alpha=1.0, rotate=0.0):
    """Composite img centred at (cx, cy); handles off-canvas edges."""
    if alpha <= 0.003 or scale <= 0.01:
        return
    im = scaled(img, scale)
    if rotate:
        im = im.rotate(rotate, resample=Image.BICUBIC, expand=True)
    im = with_alpha(im, alpha)
    x, y = int(round(cx - im.width / 2)), int(round(cy - im.height / 2))
    sx, sy = max(0, -x), max(0, -y)
    ex, ey = min(im.width, canvas.width - x), min(im.height, canvas.height - y)
    if ex <= sx or ey <= sy:
        return
    if (sx, sy, ex, ey) != (0, 0, im.width, im.height):
        im = im.crop((sx, sy, ex, ey))
    canvas.alpha_composite(im, (x + sx, y + sy))


def glow_of(img, color, radius, strength=1.5, pad=None):
    """A soft coloured halo from an RGBA image's alpha (precompute once)."""
    pad = pad if pad is not None else radius * 3
    a = Image.new('L', (img.width + pad * 2, img.height + pad * 2), 0)
    a.paste(img.getchannel('A'), (pad, pad))
    small = a.resize((a.width // 4, a.height // 4), Image.BILINEAR)
    small = small.filter(ImageFilter.GaussianBlur(radius / 4))
    a = small.resize(a.size, Image.BILINEAR).point(lambda v: min(255, int(v * strength)))
    out = Image.new('RGBA', a.size, color + (0,))
    out.putalpha(a)
    return out


def radial(size, color, inner=1.0, power=2.0):
    """Radial soft spot, RGBA, alpha falls off from the centre."""
    w, h = size
    import numpy as np
    yy, xx = np.mgrid[0:h, 0:w]
    d = np.sqrt(((xx - w / 2) / (w / 2)) ** 2 + ((yy - h / 2) / (h / 2)) ** 2)
    a = np.clip(1 - d, 0, 1) ** power * 255 * inner
    out = Image.new('RGBA', size, color + (0,))
    out.putalpha(Image.fromarray(a.astype('uint8')))
    return out


def shake_offset(t, impacts, amp=20.0):
    dx = dy = 0.0
    for ti in impacts:
        if ti <= t < ti + 0.55:
            k = amp * math.exp(-(t - ti) * 8)
            dx += k * math.sin((t - ti) * 95)
            dy += k * math.cos((t - ti) * 71)
    return int(dx), int(dy)
