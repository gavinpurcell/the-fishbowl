#!/usr/bin/env python3
"""
Clean white/light fringe artifacts from character and room sprites.
More aggressive pass — catches semi-transparent pixels of any lightness,
not just near-white ones.
"""

import os
from PIL import Image
import glob

SPRITES_DIR = os.path.join(os.path.dirname(__file__), '..', 'public', 'sprites')
CHARACTERS_DIR = os.path.join(SPRITES_DIR, 'characters')
OBSERVER_DIR = os.path.join(SPRITES_DIR, 'observer')


def clean_fringe(img: Image.Image) -> Image.Image:
    """
    Remove fringe artifacts around sprite edges:
    1. Any semi-transparent pixel (alpha 1-200) with high luminance → transparent
    2. Fully opaque near-white pixels surrounded by transparency → transparent
    3. Any pixel with very low alpha (1-20) → transparent (noise)
    """
    img = img.convert('RGBA')
    pixels = img.load()
    w, h = img.size

    for y in range(h):
        for x in range(w):
            r, g, b, a = pixels[x, y]

            if a == 0:
                continue

            # Very low alpha noise — just kill it
            if a < 20:
                pixels[x, y] = (0, 0, 0, 0)
                continue

            # Luminance of the pixel
            lum = 0.299 * r + 0.587 * g + 0.114 * b

            # Semi-transparent + light → fringe artifact
            if a < 200 and lum > 180:
                pixels[x, y] = (0, 0, 0, 0)
                continue

            # Semi-transparent + medium-light → reduce alpha to darken fringe
            if a < 180 and lum > 140:
                pixels[x, y] = (r, g, b, max(0, a - 80))
                continue

            # Fully opaque near-white pixels: check if isolated (edge artifact)
            if a >= 240 and lum > 230:
                transparent_neighbors = 0
                total_neighbors = 0
                for dy in range(-1, 2):
                    for dx in range(-1, 2):
                        if dx == 0 and dy == 0:
                            continue
                        nx, ny = x + dx, y + dy
                        if 0 <= nx < w and 0 <= ny < h:
                            total_neighbors += 1
                            if pixels[nx, ny][3] < 50:
                                transparent_neighbors += 1
                if total_neighbors > 0 and transparent_neighbors >= 3:
                    pixels[x, y] = (0, 0, 0, 0)

    return img


def process_all():
    # Character sprites
    char_files = sorted(glob.glob(os.path.join(CHARACTERS_DIR, 'char_*.png')))
    print(f"Cleaning {len(char_files)} character sprites...")
    for filepath in char_files:
        img = Image.open(filepath)
        cleaned = clean_fringe(img)
        cleaned.save(filepath)
    print("  Done.")

    # Observer sprites
    obs_files = sorted(glob.glob(os.path.join(OBSERVER_DIR, 'observer_*.png')))
    print(f"Cleaning {len(obs_files)} observer sprites...")
    for filepath in obs_files:
        img = Image.open(filepath)
        cleaned = clean_fringe(img)
        cleaned.save(filepath)
    print("  Done.")

    # Table sprite
    table_path = os.path.join(SPRITES_DIR, 'room', 'fishbowl_table.png')
    if os.path.exists(table_path):
        print("Cleaning fishbowl_table.png...")
        img = Image.open(table_path)
        cleaned = clean_fringe(img)
        cleaned.save(table_path)
        print("  Done.")

    print("\nAll sprites cleaned.")


if __name__ == '__main__':
    process_all()
