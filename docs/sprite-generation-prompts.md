# Sprite Generation Prompts

Use these prompts with Nano Banana 2 or similar image generation models. Upload the Soldier sprite sheet from the Tiny RPG pack as your **style reference image** with each prompt.

## Tips for Good Results
- Always include the style reference image (Soldier.png or Soldier-Idle.png)
- Ask for **transparent background** or **solid color background** (easier to remove)
- Specify **sprite sheet** format when you want multiple frames
- If the model gives you one pose, generate each animation frame separately
- You may need to do cleanup in Aseprite or Photoshop (remove artifacts, fix pixels)
- Generate at 2x size (200x200) and scale down for crisper pixels

---

## Priority Order (generate these first)

### 1. Seated Characters (MOST IMPORTANT)

These are the panelists sitting in the fishbowl. Generate one per color variant.

**Prompt for each character:**
```
Pixel art character sprite sheet, same style as reference image.
Character is SITTING IN A CHAIR at a meeting/conference, facing slightly
toward camera (3/4 front view). Professional casual clothing in [COLOR].
[HAIR/SKIN DESCRIPTION]. Simple modern chair visible.
4 frames side by side: idle sitting, talking (mouth open, slight gesture),
thinking (hand on chin), listening (slight nod).
100x100 pixels per frame. Transparent background.
Detailed pixel art, warm palette, tiny RPG style.
```

**Generate 8 times, swapping these details:**

| # | Color | Clothing | Hair/Skin |
|---|-------|----------|-----------|
| 1 | green shirt/blouse | professional, buttoned | dark straight hair, light skin |
| 2 | red sweater | casual professional | short dark hair, brown skin |
| 3 | blue blazer | smart casual | brown wavy hair, light skin |
| 4 | pink top | creative casual | light/blonde short hair, medium skin |
| 5 | orange/gold jacket | business casual | curly dark hair, dark skin |
| 6 | purple cardigan | professional | short pixie cut, light skin |
| 7 | teal polo | casual tech | glasses, dark hair, medium skin |
| 8 | brown vest | warm casual | long dark hair, brown skin |

### 2. Conference Room Background

**Prompt:**
```
Pixel art isometric conference room interior, same art style as reference.
Warm wood floor with visible planks. Cream/off-white walls.
Large window on right wall showing blue sky and clouds.
Small potted plant in corner. Bookshelf against back wall.
A circular rug in the center of the room (warm gold/amber color).
Cozy professional atmosphere, warm lighting. No people. No chairs.
800x600 pixels. Detailed pixel art, tiny RPG style.
```

### 3. Meeting Chair

**Prompt:**
```
Pixel art modern meeting chair, same style as reference image.
Simple cushioned chair, gray/brown upholstery, slim metal or wood legs.
Shown from 3/4 isometric view. Single chair, no person sitting.
64x64 pixels. Transparent background. Detailed pixel art.
```

Generate this once, then use it in the scene behind each seated character.

### 4. Close-Up Portraits (for Briefing Screen)

These are larger, front-facing portraits — NOT isometric. Used on the expert briefing card.

**Prompt:**
```
Pixel art character portrait, front-facing head and shoulders.
Same pixel art style as reference but larger and more detailed.
[COLOR] clothing, [HAIR/SKIN DESCRIPTION].
Friendly professional expression, slight smile.
Clean pixel art, no anti-aliasing.
128x128 pixels. Transparent background.
```

Generate 8 times matching the same character descriptions from the seated sprites above.

### 5. Observer Character ("You")

**Prompt:**
```
Pixel art character sprite sheet, same style as reference image.
Character wearing gold/amber colored casual clothing.
3/4 front view. 6 frames side by side:
standing idle (2 frames), walking right (2 frames), sitting down (2 frames).
100x100 pixels per frame. Transparent background.
Detailed pixel art, warm palette, tiny RPG style.
```

---

## Nice-to-Have (generate later)

### Speech Bubble
```
Pixel art speech bubble, white/cream fill, thin dark border,
small triangular tail pointing down. Rounded corners.
64x48 pixels. Transparent background. Clean pixel art.
```

### Thinking Dots
```
Pixel art thought bubble, three small dots in a cloud shape,
thin dark border. 32x24 pixels. Transparent background.
```

### UI Icons
```
Pixel art icon set, same style as reference. 16x16 each.
4 icons in a row: speech lines (talking), three dots (thinking),
exclamation mark (reacting), clock (waiting).
Transparent background.
```

### Whiteboard
```
Pixel art whiteboard on wall, isometric 3/4 view.
White surface with metal frame, slight marker scribbles.
Text "THE FISHBOWL" written in pixel font on the board.
96x64 pixels. Transparent background.
```

---

## After Generation: Integration Steps

1. **Clean up** each sprite in Aseprite or Photoshop:
   - Remove any background artifacts
   - Ensure transparent backgrounds
   - Align frames consistently
   - Scale down to target size if generated at 2x

2. **Assemble sprite sheets:**
   - One row per character, all frames left-to-right
   - Consistent frame size (e.g., 100x100 per frame)
   - Save as PNG with transparency

3. **Place files:**
   ```
   public/sprites/
   ├── characters/
   │   ├── char-green.png      (seated sprite sheet)
   │   ├── char-red.png
   │   ├── char-blue.png
   │   ├── char-pink.png
   │   ├── char-orange.png
   │   ├── char-purple.png
   │   ├── char-teal.png
   │   └── char-brown.png
   ├── portraits/
   │   ├── portrait-green.png  (128x128 close-up)
   │   ├── portrait-red.png
   │   └── ...
   ├── observer.png             (standing/walking/sitting sheet)
   ├── chair.png                (single chair)
   ├── room-bg.png              (800x600 room background)
   └── ui/
       ├── speech-bubble.png
       └── icons.png
   ```

4. **Update code** — I'll swap the PixiJS Graphics drawing to load these sprites. The main changes:
   - `scene/Room.ts` → load `room-bg.png` as a single background sprite
   - `scene/Character.ts` → load character sprite sheet, use `AnimatedSprite` per state
   - `scene/SpeechBubble.ts` → optionally use pixel art bubble graphic
   - Briefing card portraits → load from `portraits/` directory
