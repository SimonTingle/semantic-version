from PIL import Image, ImageDraw, ImageFont
import math, os

W, H = 1200, 630
out = "/home/user/semantic-version/public/og-image.png"

img = Image.new("RGB", (W, H), "#0a0d1f")
draw = ImageDraw.Draw(img)

# Starfield
import random
random.seed(42)
for _ in range(300):
    x, y = random.randint(0, W), random.randint(0, H)
    r = random.randint(1, 2)
    alpha = random.randint(80, 220)
    draw.ellipse([x-r, y-r, x+r, y+r], fill=(alpha, alpha, alpha+10))

# Orbit rings
cx, cy = 420, 315
for radius, color in [(170, "#1a2a4a"), (250, "#1a2a4a"), (340, "#1a2a4a")]:
    draw.ellipse([cx-radius, cy-radius*0.38, cx+radius, cy+radius*0.38],
                 outline=color, width=1)

# Folder nodes (planets)
planets = [
    (cx, cy, 36, "#6366f1"),          # root — indigo
    (cx+170, cy-5, 20, "#22d3ee"),    # src
    (cx-155, cy+12, 18, "#a78bfa"),   # lib
    (cx+10, cy-250*0.38, 15, "#34d399"),  # top orbit
    (cx-340, cy+2, 14, "#f59e0b"),    # far left
    (cx+340, cy-4, 13, "#f43f5e"),    # far right
]
for px, py, pr, color in planets:
    draw.ellipse([px-pr, py-pr, px+pr, py+pr], fill=color)

# File nodes (small dots)
file_dots = [
    (cx+120, cy-60, 6, "#94a3b8"),
    (cx+200, cy+40, 5, "#94a3b8"),
    (cx-100, cy-50, 5, "#94a3b8"),
    (cx-190, cy+50, 4, "#94a3b8"),
    (cx+260, cy-20, 4, "#94a3b8"),
    (cx-260, cy+30, 4, "#94a3b8"),
    # hot files — amber glow
    (cx+145, cy+30, 7, "#fbbf24"),
    (cx-130, cy-30, 6, "#fbbf24"),
]
for px, py, pr, color in file_dots:
    draw.ellipse([px-pr, py-pr, px+pr, py+pr], fill=color)

# Link lines from root
for px, py, pr, _ in planets[1:]:
    draw.line([cx, cy, px, py], fill="#1e3a5f", width=1)

# Gradient-ish right panel background
for i in range(440, W):
    t = (i - 440) / (W - 440)
    r2 = int(10 + t * 5)
    g2 = int(13 + t * 5)
    b2 = int(31 + t * 15)
    draw.line([(i, 0), (i, H)], fill=(r2, g2, b2))

# Vertical divider
draw.line([(440, 40), (440, H-40)], fill="#1e2d4a", width=1)

# Right panel — text
try:
    font_big  = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 56)
    font_med  = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 24)
    font_small= ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf", 18)
except Exception:
    font_big = font_med = font_small = ImageFont.load_default()

# Planet emoji substitute: a filled circle with ring
ex, ey, er = 545, 175, 45
draw.ellipse([ex-er, ey-er, ex+er, ey+er], fill="#6366f1")
draw.ellipse([ex-er-18, ey-12, ex+er+18, ey+12], outline="#818cf8", width=3)

draw.text((610, 148), "VersionLens", font=font_big, fill="#ffffff")

# Cyan underline accent
draw.rectangle([610, 220, 900, 223], fill="#22d3ee")

draw.text((610, 238), "Infer semver from commit history.", font=font_med, fill="#94a3b8")
draw.text((610, 270), "Heuristic first. AI for the rest.", font=font_med, fill="#94a3b8")

# Version badge
bx, by = 610, 330
draw.rounded_rectangle([bx, by, bx+160, by+36], radius=8, fill="#1e3a5f", outline="#22d3ee", width=1)
draw.text((bx+14, by+8), "v2.4.1  →  v3.0.0", font=font_small, fill="#22d3ee")

# Tech pills
pills = ["Next.js 15", "Three.js", "Claude AI", "Supabase"]
px2 = 610
for pill in pills:
    bbox = draw.textbbox((0,0), pill, font=font_small)
    pw = bbox[2] - bbox[0] + 20
    draw.rounded_rectangle([px2, 395, px2+pw, 423], radius=6, fill="#0f172a", outline="#334155")
    draw.text((px2+10, 400), pill, font=font_small, fill="#64748b")
    px2 += pw + 10

# Bottom URL
draw.text((610, H-60), "versionlens.simontingle.com", font=font_small, fill="#334155")

img.save(out, "PNG")
print(f"Saved {out}  ({W}x{H})")
