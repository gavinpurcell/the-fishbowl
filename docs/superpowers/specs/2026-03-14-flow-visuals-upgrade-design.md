# The Fishbowl — Flow & Visuals Upgrade Design Spec

**Date:** 2026-03-14
**Status:** Approved

## Overview

Add 5 new flow features and upgrade the PixiJS visual quality from wireframe-placeholder to intentional geometric illustrated style. The goal is to make the full user journey feel complete and polished before release.

## 1. Title / Splash Screen

**Route change:** Current setup page moves from `/` to `/setup`. New title screen takes over `/`.

**Layout (top to bottom):**
- PixiJS animated scene (same canvas size as session: 800×600, centered, rounded container with border)
  - 5 characters seated in fishbowl circle arrangement
  - Characters show different states: one gesturing with exclamation lines, one with thinking dots, one arms-raised, one nodding, one skeptical with arms crossed
  - All characters animate (breathing idle loop, state-specific animations)
  - Fishbowl circle dashes pulse gently
  - Room background (wall, floor, window, plant) rendered behind characters
- Title: "THE FISHBOWL" — Outfit font, 48px, weight 800, color `#1a1714`, letter-spacing -1px
- Subtitle: "AI Focus Groups For Your Ideas" — Outfit 18px, weight 400, color `#5a5248`
- CTA button: "Get Started Now" — gold `#c49a2a`, white text, Outfit 18px weight 600, 16px 48px padding, 12px border-radius, box-shadow glow
- Subtext: "No account needed · Bring your own API key" — DM Mono 11px, uppercase, color `#8a8078`

**Behavior:**
- "Get Started Now" navigates to `/setup`
- Scene initializes on mount, cleans up on unmount
- The 5 characters use the same `Character` class from the session scene but with hardcoded demo colors/names

**Title screen PixiJS setup:**
- Create a standalone `scene/TitleScene.ts` that initializes a PixiJS Application (800×600, same config as `FishbowlScene`)
- Instantiate `Room` for the background, 5 `Character` instances with hardcoded config:
  - `{ name: 'MAYA', color: '#4a9e6e', spriteIndex: 0, state: 'gesturing' }`
  - `{ name: 'DEREK', color: '#c45a5a', spriteIndex: 1, state: 'thinking' }`
  - `{ name: 'PRIYA', color: '#5a7ec4', spriteIndex: 2, state: 'talking' }`
  - `{ name: 'SAM', color: '#d4a040', spriteIndex: 3, state: 'reacting' }`
  - `{ name: 'ALEX', color: '#9a6ab4', spriteIndex: 4, state: 'skeptical' }`
- Position characters in the same fishbowl ellipse layout used in `FishbowlScene`
- No speech bubbles, no observer character, no interactivity — purely decorative animation
- The `app/page.tsx` title screen mounts a `<canvas>` ref, creates the `TitleScene` on mount, destroys on unmount

## 2. Onboarding Tooltip Tour

**Trigger:** First visit to `/setup` only. Check `localStorage.getItem('fishbowl_onboarded')`. Set flag after tour completes or is skipped.

**Two-step flow handling:** The setup page uses a two-step local state (`'template' | 'configure'`). Step 1 shows the template picker; step 2 shows panelist builder, idea input, and API config. The tour adapts to this:
- Stop 1 runs on step 1 (template picker visible)
- When the user clicks "Next →" on stop 1, the tour auto-advances the setup page to step 2 (by calling `setStep('configure')` via a callback prop or ref) and waits for the transition before showing stop 2
- Stops 2-4 run on step 2 (all three sections visible)
- The `OnboardingTour` component receives a `setStep` callback from the setup page to control this

**5 tooltip stops + finale:**

| Stop | Setup Step | Target Section | Title | Copy |
|------|-----------|---------------|-------|------|
| 1 | template | Panel template picker | Pick your panel of experts | Choose a pre-built team of AI experts, or build your own custom panel below. Each expert brings a different perspective to your idea. |
| 2 | configure | Panelist builder | Customize your panelists | Edit names, roles, and descriptions to shape each expert's personality. The more detail you give, the more distinct their feedback will be. |
| 3 | configure | Idea input | Describe what you're testing | Paste your pitch, upload a doc, or just describe your idea in plain language. The panel will discuss whatever you give them. |
| 4 | configure | API config | Connect your AI | Choose Claude or GPT, paste your API key, and pick a model. Your key stays in your browser — we never store it on a server. |
| Finale | configure | (no target — centered) | Ready to focus group your stuff! | Set up your panel and hit "Start the Fishbowl" when you're ready. |

**Visual design:**
- Semi-transparent dark overlay (`rgba(26, 23, 20, 0.4)`) dims everything except the active section
- Active section gets a gold border ring (`box-shadow: 0 0 0 4px #c49a2a`) and sits above the overlay via z-index
- Tooltip: dark card (`#1a1714` background, `#f5f0e8` text), 10px border-radius, max-width 320px, drop shadow
  - Title line (Outfit, weight 600)
  - Description (12px, color `#b0a89e`)
  - Footer row: step counter left ("1 / 4", DM Mono 10px) + "Skip" text link + "Next →" gold button right
  - Arrow (CSS triangle) pointing toward the highlighted section
- Finale card: warm gradient (`linear-gradient(135deg, #c47a4a, #c49a2a)`), centered, no overlay, "Let's Go!" white button dismisses

**Behavior:**
- Auto-scrolls to center the active section when advancing
- "Skip" dismisses the entire tour and sets the localStorage flag
- "Next →" advances to next stop
- "Let's Go!" on finale dismisses and sets flag
- No replay mechanism (for now)

## 3. "I'm Done Asking Questions" Button

**What changes:**
- Rename "Wrap Up" → "I'm Done Asking Questions" in `StatusBar.tsx`
- Restyle from ghost/outline button to prominent gold button:
  - Background: `#c49a2a`
  - Color: white
  - Font: Outfit 13px, weight 600
  - Padding: 8px 18px
  - Border-radius: 8px
  - Box-shadow: `0 2px 8px rgba(196, 154, 42, 0.4)`

**No behavior changes.** Same wrap-up flow: panelist takeaways → AI summary generation → redirect to `/results`.

## 4. Redesigned Results / Export Page

**Route:** `/results` (same as current)

**Layout (top to bottom):**

### Header
- DM Mono label: "SESSION COMPLETE" (10px, uppercase, `#8a8078`)
- Title: "Your Fishbowl Results" (Outfit 32px, weight 700)
- Stats line: "4 panelists · 12 minutes · 3 questions asked" (Outfit 15px, `#5a5248`)

### Export Section
Container: `#ebe5da` background, 12px border-radius, 24px padding

**Content selector (toggle):**
- Two cards side by side
- Active card: `#1a1714` background, `#f5f0e8` text (dark = selected)
- Inactive card: `#f5f0e8` background, `#1a1714` text, `#d4cdc2` border
- Options:
  - "AI Summary" — Key insights, points of agreement & disagreement, and top recommendations — synthesized by AI.
  - "Full Transcript" — Every response from every panelist, in order — initial takes, cross-talk, your Q&A, and wrap-up.

**Format buttons (below toggle):**
- "Download Markdown" — gold `#c49a2a`, white text, file icon (SVG)
- "Download PDF" — coral `#c47a4a`, white text, download icon (SVG)
- Both: Outfit 15px weight 600, 14px padding, 10px border-radius, flex: 1

### Preview Area
- White background, 12px border-radius, 1px `#d4cdc2` border
- DM Mono label: "PREVIEW — AI SUMMARY" or "PREVIEW — FULL TRANSCRIPT"
- Renders the selected content with existing Summary or Transcript component

### Session Cost Tally
- Container: `#ebe5da` background, flex row, space-between
- Left side: "SESSION COST" label (DM Mono) + dollar amount (Outfit 28px, weight 700)
- Right side: token breakdown ("Input: X tokens · Output: Y tokens") + model/provider info (DM Mono 11px)
- Cost calculated from store's `sessionCost.inputTokens` and `sessionCost.outputTokens` using model pricing from `lib/models.ts`

### Save JSON (secondary)
- Same `#ebe5da` container, flex row
- Left: "Save Session Data" title + "Export the full session as JSON" subtitle
- Right: outline-style "Save JSON" button (`#f5f0e8` bg, `#d4cdc2` border)

### Divider
- 2px solid `#d4cdc2` horizontal rule

### Video Export (preserved)
- If a video recording was captured during the session, show a "Download Video" button alongside the JSON save row
- Same secondary styling as Save JSON (outline button)
- Uses existing `VideoRecorder` blob download logic from current results page

### Start New Fishbowl CTA
- Centered gold button: "Start a New Fishbowl!" with refresh icon (SVG)
- Same style as title screen CTA (Outfit 18px weight 600, gold bg, glow shadow)
- Subtext: "Your API key is saved · Jump right back in" (DM Mono 11px)
- Navigates to `/setup` (not `/` — skip the splash on return)

**Intentionally removed from current results page:**
- "Feed New Context" / continue session button — rarely used, adds complexity. Users can start a new session instead.
- "Load Session" / import JSON — deferred to a future iteration. Save JSON is preserved.

**PDF generation:**
- Use browser `window.print()` with a print-optimized CSS stylesheet, or
- Use a lightweight client-side PDF library (e.g., `html2pdf.js` or `jspdf` with `html2canvas`)
- Decision: use `html2pdf.js` — single dependency, renders the preview area to PDF with one call

## 5. PixiJS Visual Upgrade — Geometric Illustrated Style

**Goal:** Replace the current wireframe-placeholder graphics (bare circles for heads, plain rectangles for bodies) with a charming geometric illustrated style that looks intentional and polished.

**This is a Phase 1 upgrade.** Phase 2 (future) will replace procedural graphics with generated pixel-art sprite assets.

### Characters (`scene/Character.ts`)

Current → New changes:

**Head:**
- Keep circle shape but add: eye whites (ellipses) with dark pupils and light highlights
- Subtle blush (low-opacity pink ellipses on cheeks)
- Mouth: curved path for smile, ellipse for open/talking mouth
- Increase head radius slightly for better proportions

**Hair:**
- Replace single rectangle with varied styles per character:
  - Wavy/parted (bezier path)
  - Short cropped (arc path)
  - Curly/afro (cluster of circles)
  - Ponytail (arc + trailing ellipse)
  - Straight bangs (overlapping rectangles with rounded edges)
- Hair color independent from body color (brown, black, auburn, blonde, gray tones)

**Body:**
- Keep rounded rectangle but increase border-radius for softer look
- Add collar/neckline detail (smaller rounded rect or v-shape at top)
- Slightly wider proportions for sturdier feel

**Arms & Hands:**
- Rounded rectangle arms positioned at sides
- Circle hands (radius ~3.5-4px) with skin tone fill
- Gesturing state: rotate arms outward, position hands higher
- Arms-crossed state: overlap arms in front of body

**Chair:**
- Keep rounded rectangle but add visible legs (two small rectangles below seat)
- Subtle stroke outline for definition
- Slightly warmer brown tones

**Accessories (per spriteIndex):**
- Glasses: two small unfilled circles with connecting bridge (stroke only)
- Assign 2-3 characters glasses to add visual variety

**Animation states (enhanced):**
- Idle: breathing bob (keep existing sine wave)
- Talking: open mouth ellipse + small lines radiating from head (talk indicators)
- Thinking: floating dots above head with bounce + fade
- Reacting: head nod (sine offset on head y-position) + small colored indicator circle
- NEW — Gesturing: arms rotated outward, talk lines (for title screen)
- NEW — Skeptical: one eyebrow raised (asymmetric eye positions), flat mouth line

**TypeScript type update:** Add `'gesturing' | 'skeptical'` to the `CharacterState` type union in `scene/Character.ts` (currently `'idle' | 'talking' | 'thinking' | 'reacting'`). Add corresponding cases to the `update()` method's state switch.

### Room (`scene/Room.ts`)

Current → New changes:

**Wall:** Keep warm off-white. Add subtle horizontal shadow line at ceiling.

**Floor:** Keep warm wood tone. Enhance floorboard lines with slightly varied spacing and subtle vertical grain marks (already partially there — ensure consistency).

**Window:** Keep current design (frame, glass, crossbars, clouds). Ensure stroke widths and colors are consistent with character line weights.

**Plant:** Keep terracotta pot + green foliage. No changes needed.

**Fishbowl circle:** Keep dashed gold ellipse with pulse animation. No changes.

### Speech Bubbles (`scene/SpeechBubble.ts`)

- Increase border-radius on the bubble rectangle
- Make tail slightly larger/rounder (currently 3px — increase to 6-8px)
- Add very subtle drop shadow (2px offset, low opacity)
- Keep white fill, gray stroke, 11px system-ui text

### Overall Scene Polish
- Ensure consistent line weights across all elements (1-1.5px strokes)
- Characters should feel cohesive — same proportions, same level of detail
- Skin tones: use 3-4 varied warm tones for diversity
- Hair: distribute styles across characters for visual variety

## Technical Notes

### New dependencies
- `html2pdf.js` — client-side PDF generation for results export

### Route changes
- `/` → Title/splash screen (new `app/page.tsx`)
- `/setup` → Setup page (move current `app/page.tsx` content to `app/setup/page.tsx`)
- `/session` → No change
- `/results` → Redesigned (edit existing `app/results/page.tsx`)

**Navigation references to update:** All `router.push('/')` and `router.replace('/')` calls that currently navigate to the setup page must change to `/setup`. Known locations:
- `app/results/page.tsx` — redirect when no session data (line ~19), continue session (line ~25), new session (line ~29)
- `app/session/page.tsx` — any back/cancel navigation
- Search entire codebase for `push('/')` and `replace('/')` to catch any others

### New components
- `app/page.tsx` — Title screen with PixiJS scene
- `app/setup/page.tsx` — Moved setup page
- `scene/TitleScene.ts` — Standalone PixiJS scene for title screen (5 demo characters, no interactivity)
- `components/setup/OnboardingTour.tsx` — Tooltip tour overlay
- `components/results/ExportPanel.tsx` — Content toggle + format buttons
- `components/results/CostTally.tsx` — Session cost display

### Modified components
- `scene/Character.ts` — Visual upgrade
- `scene/Room.ts` — Minor polish
- `scene/SpeechBubble.ts` — Minor polish
- `components/scene/StatusBar.tsx` — Rename button, restyle
- `app/results/page.tsx` — Full redesign
- `lib/store.ts` — Add session duration tracking (start time on session start, compute elapsed)
- `lib/store.ts` — Add moderation question count tracking

### Store additions
- `sessionStartTime: number | null` — set to `Date.now()` inside `startSession()`
- `sessionEndTime: number | null` — set to `Date.now()` inside `completeSession()`
- `moderationQuestionCount: number` — initialized to 0 in `startSession()`
- `incrementModerationCount()` action — called in `engine/conversation.ts` inside `handleModerationQuestion()` (or in the session page's moderation submit handler, whichever calls the orchestrator)

Session duration on the results page is computed as `(sessionEndTime - sessionStartTime)` and formatted as minutes.

### CSS variable reference

All hex colors in this spec correspond to existing CSS variables in `globals.css`. Implementation should use the CSS variables:

| Hex | CSS Variable |
|-----|-------------|
| `#c49a2a` | `--accent-gold` |
| `#1a1714` | `--text-primary` |
| `#f5f0e8` | `--bg-deep` |
| `#5a5248` | `--text-secondary` |
| `#8a8078` | `--text-muted` |
| `#d4cdc2` | `--border` |
| `#c47a4a` | `--accent-warm` |
| `#ebe5da` | `--bg-surface` |
| `#e2dbd0` | `--bg-elevated` |
