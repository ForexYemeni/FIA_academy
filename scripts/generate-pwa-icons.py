#!/usr/bin/env python3
"""Generate all required PWA icon sizes from the source logo."""
from PIL import Image
import os

SRC = '/home/z/my-project/public/fia/logo-app-icon.png'
OUT_DIR = '/home/z/my-project/public/fia'

# Make sure the source has a transparent background where appropriate.
# For maskable icons, the safe zone is the center 80% (so the logo
# doesn't get clipped by circular masks on Android).
SIZES = [192, 256, 384, 512]

def make_icon(size: int, maskable: bool = False):
    src = Image.open(SRC).convert('RGBA')
    # Square canvas with white background (PWA icons need opaque bg)
    canvas = Image.new('RGBA', (size, size), (251, 247, 236, 255))
    if maskable:
        # For maskable: scale logo to 80% of canvas (safe zone)
        logo_size = int(size * 0.80)
    else:
        # For any: scale logo to 90% of canvas
        logo_size = int(size * 0.90)
    logo = src.resize((logo_size, logo_size), Image.LANCZOS)
    # Center the logo on the canvas
    offset = ((size - logo_size) // 2, (size - logo_size) // 2)
    canvas.paste(logo, offset, logo)
    suffix = '-maskable' if maskable else ''
    out = os.path.join(OUT_DIR, f'icon-{size}{suffix}.png')
    canvas.save(out, 'PNG', optimize=True)
    print(f'✓ {out} ({size}x{size})')

for size in SIZES:
    make_icon(size, maskable=False)
    make_icon(size, maskable=True)

# Also generate the favicon (32x32 + 16x16) and apple-touch-icon (180x180)
for size in [16, 32, 180]:
    make_icon(size, maskable=False)
    if size == 180:
        os.rename(os.path.join(OUT_DIR, f'icon-{size}.png'),
                  os.path.join(OUT_DIR, 'apple-touch-icon.png'))
        print(f'✓ {OUT_DIR}/apple-touch-icon.png')

# Replace the main logo-fia.png with the new icon
import shutil
shutil.copy(SRC, os.path.join(OUT_DIR, 'logo-fia.png'))
print(f'✓ Replaced logo-fia.png')

print('\n✅ All PWA icons generated successfully')
