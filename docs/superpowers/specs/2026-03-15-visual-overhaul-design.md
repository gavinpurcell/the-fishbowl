# The Fishbowl — Full Visual Overhaul Design Spec

**Date:** 2026-03-15
**Status:** Approved

## Overview

Transform The Fishbowl from procedural geometric shapes to a living pixel-art simulation with Game Dev Story / Habbo Hotel aesthetic. 32×32 character sprites, detailed conference room background, idle behaviors, ambient environmental effects, and cinematic phase transitions.

This spec covers 5 sub-projects executed in order. SP1 (art asset generation) is the critical path — all code work is blocked on having art.

## Visual Direction

- **Style:** 32×32 isometric pixel art, warm palette, black 1px outlines
- **Vibe:** Game Dev Story office / Habbo Hotel room — charming, alive, detailed
- **Room:** Cozy conference room with small round coffee table in center, chairs in a circle, window, plant, warm wood floors
- **Characters:** Full-body seated sprites with distinct hair, skin, clothing, accessories per variant
- **Scale:** 800×600 canvas, 4-5 characters + observer + room + props

## UX Changes (Independent of Art)

These behavior changes apply regardless of art style and should be implemented alongside the visual work:

### Observer ("You") Behavior
- **Hidden until moderation phase.** The observer character does not exist in the scene during briefing and cross-talk. No chair, no sprite, nothing.
- **Labeled "You"** — not "Observer" or any other name.
- **Entrance animation:** When moderation phase begins, the "You" character walks in from the right edge of the screen. The existing 4 panelist chairs animate outward/apart to create space. A new chair appears at top center of the circle. The observer walks to it and sits down. Total duration: ~2-3 seconds.
- **Chair rearrangement:** The 4 panelists start in a tighter arrangement during briefing/cross-talk (no gap at top). When observer enters, they spread to a 5-seat circle layout with the observer at top center (the most prominent position — facing the "camera").

**Layout math (ellipse center at (400, 390), rx=180, ry=55):**

*4-seat layout (briefing/cross-talk):* Evenly distributed around the full ellipse.
```
angle[i] = (i / 4) * 2π - π/2
Seat 0: angle=-π/2 (top)       → (400, 335)
Seat 1: angle=0 (right)        → (580, 390)
Seat 2: angle=π/2 (bottom)     → (400, 445)
Seat 3: angle=π (left)         → (220, 390)
```

*5-seat layout (moderation):* Observer at top center (angle=-π/2). 4 panelists redistribute evenly across the remaining 4/5 of the ellipse.
```
Observer: angle=-π/2            → (400, 335)  ← top center
Panelist 0: angle=-π/2 + 1*(2π/5) = -π/2 + 72° → (~572, 357)
Panelist 1: angle=-π/2 + 2*(2π/5) = -π/2 + 144° → (~506, 434)
Panelist 2: angle=-π/2 + 3*(2π/5) = -π/2 + 216° → (~294, 434)
Panelist 3: angle=-π/2 + 4*(2π/5) = -π/2 + 288° → (~228, 357)
```

Each panelist tweens from their 4-seat position to their 5-seat position over ~1 second with ease-out.

### Your Questions in Speech Bubbles
- During moderation, when the user submits a question, it appears as a speech bubble above the "You" character in the PixiJS scene (not just in the HTML input).
- The bubble shows for 2-3 seconds (or until the first panelist starts responding), then fades out (new: `SpeechBubble` needs a `fadeOut(durationMs)` method — alpha tween to 0, then hide).
- This makes moderation feel like you're actually participating in the discussion, not just typing into a form.

**Implementation details:**
- `addObserver()` must also create a `SpeechBubble` for the observer and add it to the bubbles map with key `'__observer__'`.
- In `app/session/page.tsx`, the `handleModeration` callback must call `scene.showSpeechBubble('__observer__', question)` before dispatching to the orchestrator. Then call `scene.fadeOutBubble('__observer__', 2500)` (or let the first panelist's `showSpeechBubble` hide it automatically since the existing code hides all bubbles before showing a new one).
- `SpeechBubble` gains a new `fadeOut(ms)` method that tweens alpha to 0 over the given duration, then calls `hide()`.

### "Next Speaker" Thinking Dots
- Between spacebar presses (waiting for user to advance), show animated `...` dots above the character who will speak next.
- This gives a visual hint of who's coming up and makes the pause feel intentional, not broken.
- Dots appear immediately after the previous speaker finishes. Disappear when that speaker starts talking.

**How the next speaker is known:**
- During **briefing and cross-talk**: The loops in `session/page.tsx` iterate deterministically through panelists by index. The page computes `nextPanelistId = PANELISTS[i + 1].id` and calls `scene.showNextSpeakerDots(nextPanelistId)` after each speaker finishes, before the `waitForSpace()` call. When the user presses space and the next speaker begins, `scene.hideNextSpeakerDots()` is called.
- During **moderation**: All panelists respond in order (the orchestrator loops through `this.panelists`). Same pattern — page knows the order and passes the next speaker ID.
- The scene exposes two methods: `showNextSpeakerDots(panelistId: string)` and `hideNextSpeakerDots()`.

---

## Sub-Project 1: Art Asset Generation

**Owner:** Gavin (manual work in PixelLab + cleanup)
**Blocked by:** Nothing
**Blocks:** SP2, SP3

### Tool & Workflow

**Primary tool:** [PixelLab](https://www.pixellab.ai/) — purpose-built for game sprites, supports isometric, has style reference feature for consistency.

**Workflow:**
1. Generate one "hero" character sprite that nails the style you want
2. Use PixelLab's style reference feature — feed the hero sprite as reference for all subsequent characters
3. Generate 20+ variations per character, pick the best
4. Clean up in a pixel editor (Aseprite, Piskel, or PixelLab's export → Photoshop) — fix inconsistencies, align to grid, ensure transparent backgrounds
5. Pack frames into sprite sheets using TexturePacker, ShoeBox, or manual arrangement

### Prompt Anchoring Template

Include these keywords in EVERY prompt to maintain consistency:

```
"32x32 pixel art, isometric 2:1 perspective, warm color palette,
black 1px outline, Game Dev Story style, [SCENE/CHARACTER DETAILS],
transparent background, clean pixel edges"
```

### Asset Manifest

#### A. Character Sprites (×8 variants)

Each character needs a sprite sheet with these animation states:

| State | Frames | Loop | Description |
|-------|--------|------|-------------|
| `seated_idle` | 2-4 | yes | Subtle breathing, slight movement |
| `seated_talking` | 3-4 | yes | Mouth open, hand gesture, animated |
| `seated_thinking` | 2-3 | yes | Hand on chin or looking up |
| `seated_reacting` | 2-3 | once | Nodding, leaning forward |
| `seated_gesturing` | 3-4 | yes | Arms moving, emphatic |
| `seated_skeptical` | 2 | yes | Arms crossed, slight lean back |

**Total frames per character:** ~16-20
**Total characters:** 8 variants with visual variety (sessions use 3-5 panelists; 8 variants ensure variety across different sessions and templates. `spriteIndex` on `Panelist` maps to the variant — already assigned by `createPanelistFromTemplate()`).

**Character variety across the 8 variants:**

| Variant | Hair | Skin | Shirt Color | Accessory |
|---------|------|------|------------|-----------|
| 0 | Wavy brown | Light | Green | None |
| 1 | Short black | Medium | Red | Glasses |
| 2 | Curly dark | Dark | Blue | None |
| 3 | Ponytail auburn | Light | Yellow/Gold | None |
| 4 | Cropped gray | Medium-light | Purple | Glasses |
| 5 | Bangs brown | Medium | Teal | None |
| 6 | Wavy black | Medium | Orange | Glasses |
| 7 | Curly brown | Light | Pink | None |

**Prompt example for variant 0, idle:**
```
"32x32 pixel art, isometric 2:1, warm palette, black 1px outline,
Game Dev Story style, character seated in office chair,
wavy brown hair, light skin, green shirt, relaxed idle pose,
subtle breathing animation, transparent background, sprite sheet 4 frames"
```

#### B. Observer ("You") Sprite (×1)

| State | Frames | Description |
|-------|--------|-------------|
| `standing_idle` | 2-3 | Standing at right edge, waiting |
| `walking` | 4-6 | Walking left toward the circle |
| `sitting_down` | 3-4 | Transition from standing to seated |
| `seated_idle` | 2-4 | Same as character idle |
| `seated_talking` | 3-4 | For when user's question is shown |

**Visual distinction:** Gold/amber shirt color, slightly different style to signal "this is you, not an AI."

#### C. Room Background (×1)

**Size:** 800×600 pixels (full canvas)
**Style:** Isometric pixel-art cozy conference room

**Required elements:**
- Warm wood floor with visible grain/planks
- Back wall (warm off-white or light beige)
- Large window on back wall — view of trees/sky/city (your choice)
- Potted plant in corner (left side)
- Subtle warm lighting feel (not harsh fluorescent)
- Optional: wall clock, whiteboard, bookshelf, framed art

**What NOT to include in the background:**
- Chairs (rendered as separate sprites for positioning flexibility)
- Table (rendered as separate sprite for depth layering)
- Characters (obviously)

**Prompt:**
```
"800x600 pixel art, isometric 2:1, warm palette, cozy conference room,
wood floor with planks, back wall with large window showing trees,
potted plant in left corner, warm lighting, Game Dev Story style,
no furniture in center, empty room ready for chairs and characters"
```

#### D. Furniture & Props

| Asset | Size | Count | Notes |
|-------|------|-------|-------|
| Office chair | 32×32 | 1 (recolor ×8) | Simple rolling chair, viewed from isometric angle |
| Coffee table | 48×32 | 1 | Small round table for center of circle |
| Coffee cup | 8×8 | 2-3 variants | On table, optional steam particle |
| Notebook | 10×8 | 1-2 | Open notebook on table |
| Laptop | 12×10 | 1 | Optional, on table |

#### E. UI Pixel Elements

| Asset | Size | Notes |
|-------|------|-------|
| Speech bubble | Scalable 9-patch | Pixel-art border, white fill, tail pointing down. 9-patch format so it scales to any text size. |
| Thinking dots | 16×8 | Animated `...` with bouncing dots, 3-4 frames |
| Talk indicator | 16×8 | Small lines radiating from speaker |
| Reaction mark | 8×8 | Exclamation, nod lines, etc. |

### File Naming Convention

```
public/sprites/
├── characters/
│   ├── char_0.png          (sprite sheet)
│   ├── char_0.json         (atlas — frame coordinates)
│   ├── char_1.png
│   ├── char_1.json
│   ├── ... (through char_7)
│   ├── observer.png
│   └── observer.json
├── room/
│   ├── background.png      (800×600 room)
│   ├── chair.png           (single chair, recolored in code or pre-colored variants)
│   ├── coffee_table.png
│   └── props.png           (small items sheet)
├── ui/
│   ├── speech_bubble.png   (9-patch)
│   ├── thinking_dots.png   (animation strip)
│   ├── talk_indicator.png
│   └── reaction_marks.png
```

### Atlas JSON Format (PixiJS Spritesheet)

Each character sprite sheet needs an accompanying JSON in PixiJS Spritesheet format:

```json
{
  "frames": {
    "seated_idle_0": { "frame": { "x": 0, "y": 0, "w": 32, "h": 32 } },
    "seated_idle_1": { "frame": { "x": 32, "y": 0, "w": 32, "h": 32 } },
    "seated_idle_2": { "frame": { "x": 64, "y": 0, "w": 32, "h": 32 } },
    "seated_talking_0": { "frame": { "x": 0, "y": 32, "w": 32, "h": 32 } },
    "seated_talking_1": { "frame": { "x": 32, "y": 32, "w": 32, "h": 32 } }
  },
  "animations": {
    "seated_idle": ["seated_idle_0", "seated_idle_1", "seated_idle_2"],
    "seated_talking": ["seated_talking_0", "seated_talking_1"]
  },
  "meta": {
    "image": "char_0.png",
    "size": { "w": 128, "h": 128 },
    "scale": 1
  }
}
```

---

## Sub-Project 2: Sprite Integration

**Owner:** Claude (code)
**Blocked by:** SP1
**Blocks:** SP4

### Character.ts Rewrite

Replace all procedural `Graphics` drawing with PixiJS `AnimatedSprite` loaded from sprite sheet atlas.

**Key changes:**
- **Assets are preloaded globally** at app startup via `Assets.loadBundle('sprites')` (see Technical Notes). The Character constructor pulls textures from the already-loaded cache synchronously. The constructor is NOT async — it accesses `Assets.get('char_0')` which returns immediately from cache.
- `setState()` swaps the active animation clip
- `update()` no longer manually draws — PixiJS AnimatedSprite handles frame cycling
- Character appearance (variant 0-7) determined by `spriteIndex` — loads the corresponding sprite sheet
- Name label and role label remain as PixiJS `Text` (rendered on top of sprite)
- Scale sprite up from 32×32 native to display size (~2-3x) with `PIXI.SCALE_MODES.NEAREST` for crisp pixel art

**Animation speed:** ~6-8 FPS for idle, ~10 FPS for talking/gesturing (slower than the 60fps ticker — AnimatedSprite handles this with `animationSpeed`).

**State naming convention:** The public `CharacterState` type keeps the current unprefixed names (`'idle' | 'talking' | 'thinking' | 'reacting' | 'gesturing' | 'skeptical'`). The sprite atlas frame names use `seated_` prefix internally (`seated_idle_0`, `seated_talking_0`, etc.). The `setState()` method maps `'talking'` → `'seated_talking'` animation clip internally. No call sites need updating.

**Observer-only states:** The observer sprite has additional states: `standing_idle`, `walking`, `sitting_down`. These are NOT part of the public `CharacterState` type — they're used only internally during the `addObserver()` entrance animation sequence. The observer character class manages this transition internally: walk → sit → switch to normal `idle` state. After sitting down, the observer behaves like any other character (uses the same `CharacterState` type).

### FishbowlScene.ts Changes

- **Remove existing observer creation from `initWithContainer()`.** The current code creates the observer at init and places it at (680, 460). Delete this — the observer must not exist until moderation.
- Characters start in a 4-seat circle layout (no gap at top) during briefing/cross-talk.
- New method: `async addObserver(): Promise<void>` — creates the observer Character + SpeechBubble, starts walk-in animation, triggers chair rearrangement. **Returns a Promise that resolves when the full animation sequence is complete** (chairs repositioned + observer seated). The session page `await`s this before showing the moderation input.
- Chair rearrangement: tween all 4 panelist positions from 4-seat layout to 5-seat layout over ~1 second using easing (see layout math in UX Changes section).
- Observer walks from off-screen right (~850, 400) to the top-center chair position (~400, 335).
- Delete the existing `moveObserverIn()` method — replaced entirely by `addObserver()`.

### TitleScene.ts Changes

- Same sprite-based characters but in a 5-seat layout (all visible, pre-seated)
- No observer in title scene

### Asset Loading

- Preload all sprite sheets on app init (show loading indicator if needed)
- Use PixiJS `Assets.load()` with a manifest
- Cache loaded textures — don't reload between page navigations

---

## Sub-Project 3: Room & Environment

**Owner:** Claude (code)
**Blocked by:** SP1
**Blocks:** SP4

### Room.ts Rewrite

Replace all procedural drawing with:
1. **Background sprite:** Single 800×600 pixel-art image at z-index 0
2. **Coffee table sprite:** Positioned at circle center, z-index between background and characters
3. **Chair sprites:** One per panelist, positioned slightly behind/below each character. Can be a single chair image recolored with PixiJS tint.
4. **Table props:** Small sprites (coffee cups, notebooks) scattered on the coffee table — randomized per session for variety

**Depth sorting (z-index order):**
1. Background (0)
2. Coffee table (100)
3. Table props (101-105)
4. Chairs (200 + y-position)
5. Characters (300 + y-position)
6. Speech bubbles (1000)
7. UI indicators — thinking dots, etc. (1001)

### Fishbowl Circle

The dashed gold ellipse is removed — the circular chair arrangement IS the fishbowl now. The concept is implied by the layout, not drawn explicitly.

---

## Sub-Project 4: Living Simulation

**Owner:** Claude (code)
**Blocked by:** SP2, SP3
**Blocks:** SP5

### Idle Behavior System

New class: `IdleBehaviorManager` — runs on the PixiJS ticker, assigns random idle behaviors to non-active characters.

**Behaviors (random, weighted):**
| Behavior | Weight | Duration | Description |
|----------|--------|----------|-------------|
| `look_at_speaker` | 40% | sustained | Face turns toward active speaking character (subtle x-flip or no-op if already facing) |
| `shift_in_chair` | 20% | 0.5s | Tiny position offset (±1-2px), then return |
| `fidget` | 15% | 1s | Play a brief alternate idle frame sequence |
| `glance_at_notes` | 10% | 1.5s | Brief look-down animation if we have the frame |
| `sip_coffee` | 10% | 2s | Reach toward table, return (if we have the frame) |
| `nothing` | 5% | — | Do nothing extra, just breathe |

**Timing:** Each non-active character gets a behavior assigned every 3-8 seconds (random interval). Active speaker is exempt. Behaviors don't interrupt state animations (talking, thinking) — they only fire during idle.

**Implementation:** Simple state machine per character. The `IdleBehaviorManager` holds timers and dispatches behavior callbacks. Characters expose a `playIdleBehavior(type)` method.

### Environmental Ambient

**Dust motes / particles:**
- 10-20 small white/gold 1px particles floating slowly across the scene
- PixiJS `ParticleContainer` or simple sprite pool
- Slow sine-wave motion, low opacity (0.15-0.3)
- Confined to the area near the window (light beam region)

**Coffee steam:**
- 2-3 tiny rising particles above coffee cups on the table
- Fade in at cup, rise 10-15px, fade out
- Loop continuously, subtle

**Light shift (optional, low priority):**
- Very subtle color overlay on the window area that shifts warm→cool over ~60 seconds
- Just a tinted rectangle with animated alpha, nothing complex

### "Next Speaker" Dots

- New component/behavior: `NextSpeakerIndicator`
- Shows animated `...` pixel dots above the character who will speak next
- Appears immediately when the previous speaker finishes (before user presses spacebar)
- Disappears when that character's speaking state begins
- Uses the `thinking_dots.png` sprite asset (3-4 frame loop)

---

## Sub-Project 5: Polish & Transitions

**Owner:** Claude (code)
**Blocked by:** SP4
**Blocks:** Nothing (final sub-project)

### Phase Transitions

**Briefing → Cross-talk transition:**
- Current: text overlay screen, then scene appears
- New: Scene is already visible during briefing (small, in a picture-in-picture style, or full but with briefing card overlaid). When cross-talk begins, the briefing card slides away and the scene takes focus. Alternatively, keep the current approach but add a brief "camera settle" — scene fades in with a slight scale tween (1.05 → 1.0) for polish.

**Moderation entry (the big moment):**
1. Hint text: "Press SPACE to step into the fishbowl"
2. User presses space
3. `await scene.addObserver()` — this internally:
   a. All 4 panelist chairs tween outward to 5-seat positions (~1s, ease-out)
   b. A new chair sprite appears at top-center (fade in during the tween)
   c. Observer character walks in from right edge to the chair (~1.5s)
   d. Observer sits down (sitting animation plays)
   e. Promise resolves
4. Moderation input appears in the HTML UI (only AFTER the promise resolves)
5. Hint: "Ask the panel anything."

**Session page pseudocode for moderation entry:**
```typescript
setHint("Press SPACE to step into the fishbowl");
await waitForSpace();
setHint(""); // clear hint during animation
await scene.addObserver(); // blocks until animation finishes
setInModeration(true);
setHint("You're in the fishbowl. Ask the panel a question below.");
```

**Session end:**
- After wrap-up, brief pause, then fade scene to warm cream/gold tint
- Redirect to results page

### Speech Bubble Upgrade

- Replace the procedural speech bubble with pixel-art 9-patch sprite
- Tail precisely points at the speaking character (calculate angle)
- Text rendered inside the bubble still uses PixiJS `Text` (system font, not pixel font — readability matters more than aesthetic purity for the actual content)
- Bubble appears with a brief scale tween (0 → 1) for polish
- For the observer's question bubble: gold-tinted border to distinguish from panelist bubbles

### Title Screen Polish

- Same room and 5 demo characters, all seated, various idle behaviors running
- Occasional random character plays a talking animation (they're "discussing" before you arrive)
- Ambient particles and environmental effects active
- Scene feels alive and inviting

---

## Technical Notes

### PixiJS Asset Loading

All sprites loaded via `Assets.load()` at app startup. Use a loading screen if total asset size exceeds ~500KB (unlikely at 32×32 scale).

```typescript
const manifest = {
  bundles: [{
    name: 'sprites',
    assets: [
      { alias: 'char_0', src: '/sprites/characters/char_0.json' },
      { alias: 'char_1', src: '/sprites/characters/char_1.json' },
      // ... etc
      { alias: 'room_bg', src: '/sprites/room/background.png' },
      { alias: 'chair', src: '/sprites/room/chair.png' },
      { alias: 'coffee_table', src: '/sprites/room/coffee_table.png' },
    ],
  }],
};

await Assets.init({ manifest });
await Assets.loadBundle('sprites');
```

### Sprite Scaling

32×32 sprites displayed at 2-3x scale on the 800×600 canvas. Use `NEAREST` scale mode for crisp pixel art:

```typescript
sprite.texture.source.scaleMode = 'nearest';
```

Or set globally:
```typescript
TextureSource.defaultOptions.scaleMode = 'nearest';
```

### Fallback

If any sprite asset fails to load, fall back to the current procedural `Graphics` rendering. This means the procedural code stays in the codebase (renamed to `CharacterFallback.ts` or behind a flag) as a safety net during development.

### New Files

- `scene/IdleBehaviorManager.ts` — idle behavior timer and dispatch
- `scene/NextSpeakerIndicator.ts` — animated dots above upcoming speaker
- `scene/EnvironmentEffects.ts` — dust particles, coffee steam, light shifts
- `scene/CharacterSprite.ts` — new sprite-based Character class (replaces current `Character.ts` once art is ready)
- `lib/spriteLoader.ts` — asset manifest and preloading

### Modified Files

- `scene/FishbowlScene.ts` — observer entry animation, chair rearrangement, 4-seat→5-seat layout
- `scene/TitleScene.ts` — sprite-based characters, idle behaviors
- `scene/Room.ts` — full rewrite (background image + layered props)
- `scene/SpeechBubble.ts` — 9-patch pixel art bubble
- `app/session/page.tsx` — show user question in scene bubble, next-speaker dots integration
- `app/test/page.tsx` — mirrors all session page changes: observer hidden until moderation, `addObserver()` call replaces `moveObserverIn()`, user question shown in scene bubble, next-speaker dots. Test page uses the same FishbowlScene instance so these changes propagate automatically through the scene API. The only test-page-specific change is updating the `runDemo` function to call the new scene methods (`addObserver()`, `showNextSpeakerDots()`, `showSpeechBubble('__observer__', ...)`) instead of the old ones.
