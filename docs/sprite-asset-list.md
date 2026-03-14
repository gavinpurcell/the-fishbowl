# The Fishbowl — Sprite Asset List

Reference for AI-generating pixel art assets. Target style: isometric pixel art, warm palette, Game Dev Story / Habbo Hotel / AI Town aesthetic. 32x32 or 48x48 base grid.

## Art Direction

- **Perspective:** Isometric (30° angle, ~2:1 pixel ratio)
- **Scale:** Characters ~48px tall seated, ~64px tall standing
- **Palette:** Warm — wood tones, cream, soft greens, warm lighting
- **Style:** Detailed pixel art with visible pixels, not smooth/anti-aliased
- **Mood:** Cozy professional — like a nice meeting room in a creative office

---

## 1. Room / Environment

### Floor
- Isometric wood floor tileset (warm brown, visible planks/grain)
- Should tile seamlessly
- Size: 32x16 per isometric tile (standard iso grid)

### Walls
- Back wall with warm off-white/cream color
- Baseboard detail
- Should feel like a real room, not floating in space

### Window
- Isometric window with frame, glass pane, light coming through
- Optional: curtains or blinds
- Shows sky/clouds outside

### Decorative Elements
- **Potted plant** — medium size, leafy, in terracotta pot
- **Whiteboard/screen** — on the wall, could show "THE FISHBOWL" text
- **Bookshelf** — small, with colorful book spines
- **Coffee table** — small side table with mugs
- **Rug** — circular rug on the floor under the chairs (the "fishbowl" circle)
- **Lamp** — floor lamp or desk lamp for warm lighting feel
- **Clock** — wall clock
- **Water cooler** — optional, adds office vibe

---

## 2. Furniture

### Chairs (CRITICAL)
- Isometric office/meeting chairs
- Need **4 directional views** (facing NW, NE, SW, SE) for characters sitting around a circle
- Style: modern meeting chair with cushion, not a desk chair
- Color: neutral (gray/brown) so characters stand out
- Size: ~32x32 per chair

### Round Table (Optional)
- Small round coffee table in the center of the circle
- Or no table — just chairs in a circle works too

---

## 3. Characters — Seated (CRITICAL)

These are the panelists sitting in the fishbowl circle. Need **8 distinct character variants** (different hair, skin tone, clothing color) so each panelist looks unique.

### Per Character Variant, Need:
- **Seated idle** — sitting in chair, subtle breathing/movement (2-4 frames)
- **Seated talking** — mouth open, maybe hand gesture (2-4 frames)
- **Seated thinking** — hand on chin or looking up (2-4 frames)
- **Seated reacting** — nodding, slight lean forward (2-4 frames)

### Character Variants (8 total):
1. **Green outfit** — female, dark hair, professional look
2. **Red outfit** — male, short dark hair, casual professional
3. **Blue outfit** — female, brown hair, relaxed look
4. **Pink outfit** — male/NB, light hair, creative look
5. **Orange outfit** — male, curly hair, energetic look
6. **Purple outfit** — female, short hair, confident look
7. **Teal outfit** — male, glasses, analytical look
8. **Brown outfit** — female, long hair, warm look

### Color Mapping
Characters should have a **dominant clothing color** that maps to the panelist colors in the app:
- `#4a9a7a` (green)
- `#e74c4c` (red)
- `#4477ee` (blue)
- `#e44a9a` (pink)
- `#eea444` (orange/gold)
- `#9a44ee` (purple)
- `#44aacc` (teal)
- `#cc7744` (brown)

### Sprite Sheet Format
- All frames for one character on a single row
- Columns: idle1, idle2, idle3, idle4, talk1, talk2, talk3, talk4, think1, think2, think3, think4, react1, react2, react3, react4
- 16 frames per character, 8 characters = 128 frames total
- Or separate sheets per character

---

## 4. Observer Character ("You")

- Distinct from panelists — gold/yellow clothing
- Same seated animations as panelists
- **Plus:** standing/walking frames for the "entering the circle" animation
  - Standing idle (2 frames)
  - Walking SE direction (4 frames) — walking toward the circle
  - Sitting down transition (2-3 frames)

---

## 5. Close-Up Portraits (for Briefing Screen)

Large character portraits shown during the individual briefing phase. NOT isometric — these are front-facing or 3/4 view portraits.

### Per Character Variant (8 total):
- **Size:** 128x128 or 256x256 pixels
- **View:** Front-facing or slight 3/4 angle
- **Style:** Same pixel art style as the isometric sprites, just bigger and more detailed
- **Expression:** Neutral/professional, slightly friendly
- **Background:** Transparent (character only)

These appear in the briefing card next to the expert's name, role, and streaming text.

---

## 6. UI Elements

### Speech Bubble
- Pixel art speech bubble with tail
- White/cream fill, subtle border
- Tail pointing down (toward character)
- Size: scalable, but the border/corner pixels should be consistent
- Optional: thinking bubble variant (cloud-shaped with dots)

### Fishbowl Circle
- Dashed or dotted circle/ellipse rendered on the floor
- Could be a subtle glow effect or a rug texture
- Should read as "the boundary of the fishbowl"

### Status Icons
- Small icons for: talking (speech lines), thinking (dots), reacting (exclamation)
- 16x16 each
- Float above character heads

---

## 7. Generation Prompts (Starting Points)

These are starting prompts to adapt for your AI image generation tool:

### Room:
```
isometric pixel art meeting room, warm wood floor, cream walls, large window with natural light, potted plant, small bookshelf, cozy professional atmosphere, game dev story style, 32-bit pixel art, no people
```

### Seated Character:
```
isometric pixel art character sitting in meeting chair, [COLOR] shirt, professional casual, facing [DIRECTION], detailed pixel art, warm palette, 48x48 pixels, game dev story style, transparent background
```

### Close-Up Portrait:
```
pixel art character portrait, front-facing, [COLOR] shirt, [HAIR DESCRIPTION], professional friendly expression, detailed pixel art, 128x128, warm palette, transparent background
```

### Chair:
```
isometric pixel art modern meeting chair, gray cushion, metal legs, 32x32 pixels, warm palette, transparent background
```

---

## Sprite Integration Notes

Once sprites are generated, they need to be:
1. **Assembled into sprite sheets** (PNG, one row per character)
2. **Placed in** `public/sprites/` directory
3. **Referenced in** `scene/Character.ts` — update to load from sprite sheet instead of drawing with Graphics primitives
4. **Frame data** defined in a JSON map (which frames are idle, talking, etc.)

The current `Character.ts` draws everything with PixiJS Graphics. To swap to sprites:
- Load the sprite sheet with `PIXI.Assets.load()`
- Create a `PIXI.Spritesheet` with frame definitions
- Replace the Graphics drawing with `PIXI.AnimatedSprite` per state
- Each animation state maps to a set of frames from the sheet

The `Room.ts` similarly needs to swap from Graphics to a pre-rendered room background image.
