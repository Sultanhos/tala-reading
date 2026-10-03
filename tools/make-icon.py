# Draws the app icon (the game's own scenery: night sky, rainbow, the sun with a face, green hills) and saves the sizes
# the browsers and phones ask for. Run: python tools/make-icon.py
import os
from PIL import Image, ImageDraw

S = 2048  # drawn large, then scaled down so the edges are smooth
root = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
INK = (43, 35, 80)

img = Image.new('RGB', (S, S))
d = ImageDraw.Draw(img)
top, bot = (42, 42, 114), (122, 106, 216)
for y in range(S):  # the sky
    t = min(1, y / (S * 0.78))
    d.line([(0, y), (S, y)], fill=tuple(round(top[k] + (bot[k] - top[k]) * t) for k in range(3)))

def circle(cx, cy, r, **kw):
    d.ellipse([cx - r, cy - r, cx + r, cy + r], **kw)

# rainbow: five bands around the middle of the lower edge
cx, cy = S * 0.5, S * 0.72
bands = [(255, 107, 107), (255, 181, 71), (255, 227, 106), (95, 208, 138), (107, 184, 255)]
r, w = S * 0.47, S * 0.058
for i, c in enumerate(bands):
    circle(cx, cy, r - i * w, fill=c)
circle(cx, cy, r - len(bands) * w, fill=tuple(round(top[k] + (bot[k] - top[k]) * 0.72) for k in range(3)))  # sky inside the arch

# the sun with its glow and face, under the arch
sx, sy, sr = S * 0.5, S * 0.60, S * 0.15
glow = Image.new('RGBA', (S, S), (0, 0, 0, 0))
g = ImageDraw.Draw(glow)
g.ellipse([sx - sr * 1.16, sy - sr * 1.16, sx + sr * 1.16, sy + sr * 1.16], fill=(255, 210, 63, 90))
img.paste(glow, (0, 0), glow)
d = ImageDraw.Draw(img)
circle(sx, sy, sr, fill=(255, 210, 63), outline=INK, width=round(S * 0.016))
er = S * 0.016
circle(sx - sr * 0.38, sy - sr * 0.12, er, fill=INK)
circle(sx + sr * 0.38, sy - sr * 0.12, er, fill=INK)
d.arc([sx - sr * 0.42, sy - sr * 0.2, sx + sr * 0.42, sy + sr * 0.55], start=25, end=155, fill=INK, width=round(S * 0.013))

# two green hills in front
ow = round(S * 0.012)
d.ellipse([S * -0.45, S * 0.72, S * 0.80, S * 1.40], fill=(47, 158, 99), outline=INK, width=ow)
d.ellipse([S * 0.18, S * 0.78, S * 1.50, S * 1.50], fill=(33, 122, 75), outline=INK, width=ow)

out = os.path.join(root, 'icons')
os.makedirs(out, exist_ok=True)
for name, size in [('icon-512.png', 512), ('icon-192.png', 192), ('apple-touch-icon.png', 180), ('favicon-32.png', 32)]:
    img.resize((size, size), Image.LANCZOS).save(os.path.join(out, name), optimize=True)
print('icons written')
