# Boring Mode -- Design Spec

**Status:** Draft (research complete, ready to implement)
**Author:** Claude (6 research iterations)
**Date:** 2026-03-23

## TL;DR

| | Broadcast (Default) | Boring Mode |
|---|---|---|
| **Colors** | Warm gold/parchment/brown | Cool gray/blue (`#0078d4`) |
| **Fonts** | Silkscreen + DM Mono + Outfit | System UI + Consolas |
| **Effects** | Dust, scanlines, film grain, gold glow | None (flat) |
| **Labels** | "STANDBY", "LIVE", "REC", "ON AIR" | "Please wait...", "In Session", "Recording", "Active" |
| **Overlays** | Cinematic broadcast transitions | Simple progress cards |
| **Effort** | — | ~6.5 hours, 3 phases, ~20 files |
| **Phase 1 (CSS-only)** | — | ~1.5 hr, gets 70% of the change |

## Overview

"Boring Mode" is an alternate visual theme for The Fishbowl that replaces the pixel-art CRT / broadcast control room aesthetic with a clean, corporate, professional look. Think early-2000s Microsoft, a Zoom meeting room, or generic corporate presentation software. The toggle switches the entire UI -- CSS variables, fonts, PixiJS scene colors, animations, and component styles -- while keeping all functionality identical.

The characters change to simple circle avatars with initials (like Slack/Teams) instead of pixel-art sprites. The room background becomes a flat surface. This commits to the bit — boring mode looks like an actual Zoom meeting tool, not just a reskinned game.

---

## Visual Identity: What "Boring Mode" Looks Like

### Color Palette

| Role | Current (Broadcast) | Boring Mode |
|------|-------------------|-------------|
| Background | `#f5f0e8` warm parchment | `#f0f0f0` flat gray |
| Surface | `#ebe5da` warm surface | `#e8e8e8` lighter gray |
| Elevated | `#e2dbd0` warm elevated | `#dfdfdf` medium gray |
| Card | `#ffffff` white | `#ffffff` white |
| Text Primary | `#1a1714` warm dark | `#333333` neutral dark |
| Text Secondary | `#5a5248` warm brown | `#666666` neutral gray |
| Text Muted | `#8a8078` warm muted | `#999999` neutral muted |
| Accent (gold) | `#c49a2a` warm gold | `#0078d4` Microsoft blue |
| Accent dim | `#a88020` darker gold | `#005a9e` darker blue |
| Accent light | `#f0c866` light gold | `#4da3e8` lighter blue |
| Amber | `#d4a840` amber | `#0078d4` same blue (no amber) |
| Warm | `#c47a4a` warm orange | `#d13438` corporate red |
| Red (live dot) | `#e85a4a` red | `#d13438` corporate red |
| Border | `#d4cdc2` warm border | `#d0d0d0` neutral border |
| Border Light | `#c8c0b4` lighter border | `#c0c0c0` lighter neutral |
| Dark Surface | `#1a1714` warm dark | `#2b2b2b` neutral dark |
| Dark Deep | `#0d0b09` near-black warm | `#1e1e1e` neutral near-black |
| Dark Border | `#2a2520` warm dark border | `#3b3b3b` neutral dark border |
| Dark Divider | `#333333` | `#404040` neutral divider |

### Typography

| Usage | Current | Boring Mode |
|-------|---------|-------------|
| Pixel headings | Silkscreen (400, 700) | Segoe UI / system-ui (600, 700) |
| Mono labels | DM Mono (300-500) | Consolas / 'Courier New', monospace |
| Body text | Outfit (300-800) | Segoe UI / system-ui (300-700) |

The font import line changes from loading Silkscreen + DM Mono + Outfit to loading only system fonts (no import needed for Segoe UI / system-ui). The `.font-pixel` class still exists but resolves to the system font stack instead of Silkscreen.

### Vibe Shift

| Element | Current | Boring Mode |
|---------|---------|-------------|
| Background texture | SVG fractal noise overlay at 1.5% opacity | None (flat color) |
| Ambient glow | Gold radial gradient behind content | None |
| Button style | 3D "game button" with bottom shadow, gold gradient | Flat rectangle, single color, subtle hover |
| Borders | Warm tones, rounded corners | Neutral gray, slightly less rounded |
| Animations | Bouncy easeOutBack, staggered reveals | Simple fade, no bounce |
| Box shadows | Multi-layer warm glows | Single-layer neutral shadow |
| Scanlines | CRT scanline overlay on scene viewport | None |
| Film grain | SVG noise texture on body::before | None |
| Gold glow | Pulsing gold box-shadow on buttons, accents | None |
| LIVE badge | Red pulsing dot with glow | Static green "ONLINE" indicator |
| Section labels | "MISSION BRIEFING", "DOSSIER", "REC" | "Configuration", "Details", "Recording" |

### Broadcast Terminology → Corporate Terminology (Complete Map)

| Current (Broadcast) | Boring Mode (Corporate) | File(s) |
|---------------------|------------------------|---------|
| `STANDBY` | `Please wait...` | TransitionOverlay.tsx:337 |
| `LIVE` | `IN SESSION` | TransitionOverlay.tsx:376, page.tsx:59, session/page.tsx:560 |
| `REC` / `END` | `Recording` / `Done` | StatusBar.tsx:82 |
| `ROUND 1 — INITIAL TAKES` | `Round 1 — First Impressions` | StatusBar.tsx:20 |
| `ROUND 2 — CROSS-TALK` | `Round 2 — Discussion` | StatusBar.tsx:21 |
| `ROUND 3 — Q&A` | `Round 3 — Q&A` | StatusBar.tsx:22 (keep as-is) |
| `FINAL TAKEAWAYS` | `Final Thoughts` | StatusBar.tsx:23 |
| `GENERATING SUMMARY...` | `Generating summary...` | StatusBar.tsx:24 (lowercase only) |
| `ON AIR` | `Active` | ModerationInput.tsx:129 |
| `END SHOW` | `End Session` | StatusBar.tsx:224, ModerationInput.tsx:402 |
| `WRAP SESSION` | `Next Round` | StatusBar.tsx:224 |
| `INITIAL TAKE` | `First Impression` | session/page.tsx:716, test/page.tsx:652 |
| `INITIAL TAKES` / `CROSS-TALK` etc. | `First Impressions` / `Discussion` etc. | LiveTranscript.tsx:37-41, Transcript.tsx:11 |
| `THAT'S A WRAP` | `Session Complete` | WrapUpOverlay.tsx (title) |
| `COMPILING REPORT` | `Generating report...` | WrapUpOverlay.tsx:537 |
| `REPORT READY` | `Report ready` | WrapUpOverlay.tsx:533 |
| `SIGNAL LOST` | `Page Not Found` | not-found.tsx:138 |
| `EXECUTIVE SUMMARY` | `Executive Summary` | results/page.tsx:231 (keep, already corporate) |
| `FULL TRANSCRIPT` | `Full Transcript` | Transcript.tsx:78 (keep, already corporate) |
| `TECHNICAL DIFFICULTY` | `Error` | session/page.tsx:863 |
| `Team Comp` | `Preset` | TemplatePicker.tsx:28 |

Most of these are string literals in component JSX. A clean approach: create a `lib/labels.ts` with broadcast/boring variants, import where needed.

---

## Toggle Mechanism

### Where in the UI

A small toggle in the **bottom-right corner** of every page, fixed-position. Appears on all pages via `layout.tsx`.

```
┌─────────────────────────────────────────┐
│                                         │
│              (page content)             │
│                                         │
│                                         │
│                              ┌────────┐ │
│                              │ 📺 → 💼│ │
│                              └────────┘ │
└─────────────────────────────────────────┘
```

**Component: `ThemeToggle.tsx`** (~40 lines)
- Fixed position `bottom-4 right-4`, `z-index: 9999`
- Small pill button, low-profile (doesn't distract from content)
- Broadcast mode: dark pill with gold accent, monitor/CRT icon, "BROADCAST" label in Silkscreen 8px
- Boring mode: light gray pill with blue accent, briefcase icon, "PROFESSIONAL" label in system font 8px
- Subtle hover: slight scale-up + opacity change
- Keyboard accessible: focusable, Enter/Space to toggle
- During active session (roundtable), auto-hides or becomes more subtle so it doesn't overlap the PixiJS scene

### How It Persists

Create a **separate preferences store** in `lib/preferences.ts`. The main `useFishbowlStore` uses `sessionStorage` (via `partialize`) for session data — mixing `localStorage` preferences into it would require a second `persist` wrapper, which Zustand doesn't cleanly support.

```typescript
// lib/preferences.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface PreferencesState {
  boringMode: boolean;
  setBoringMode: (boring: boolean) => void;
}

export const usePreferences = create<PreferencesState>()(
  persist(
    (set) => ({
      boringMode: false,
      setBoringMode: (boring: boolean) => set({ boringMode: boring }),
    }),
    {
      name: 'fishbowl-preferences',
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
```

This is ~15 lines, persists to `localStorage` under key `fishbowl-preferences`, and survives across sessions/tabs.

### How It Propagates

1. **CSS:** The store value sets a `data-theme="boring"` attribute on `<html>`. All CSS variable overrides live under `html[data-theme="boring"]` in `globals.css`.
2. **PixiJS:** Scene classes read the theme from a shared module (not the React store directly, since PixiJS classes are not React components). A simple `getTheme()` / `onThemeChange()` pub-sub or a direct check at construction time.
3. **React components:** Components that use inline styles with hardcoded colors (StatusBar, TransitionOverlay, etc.) read `boringMode` from the store and choose values accordingly.

---

## CSS Variable Approach

### New `:root` Overrides

Add this block after the existing `:root` in `globals.css`:

```css
html[data-theme="boring"] {
  --bg-deep: #f0f0f0;
  --bg-surface: #e8e8e8;
  --bg-elevated: #dfdfdf;
  --bg-card: #ffffff;
  --text-primary: #333333;
  --text-secondary: #666666;
  --text-muted: #999999;
  --accent-gold: #0078d4;
  --accent-gold-dim: #005a9e;
  --accent-gold-light: #4da3e8;
  --accent-amber: #0078d4;
  --accent-warm: #d13438;
  --accent-red: #d13438;
  --border: #d0d0d0;
  --border-light: #c0c0c0;
  --dark-surface: #2b2b2b;
  --dark-deep: #1e1e1e;
  --dark-border: #3b3b3b;
  --dark-divider: #404040;
}
```

### Font Overrides

```css
html[data-theme="boring"] body {
  font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
}

html[data-theme="boring"] .font-pixel {
  font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
  font-weight: 600;
}

html[data-theme="boring"] .font-mono-ui {
  font-family: Consolas, 'Courier New', monospace;
}

html[data-theme="boring"] .label-mono {
  font-family: Consolas, 'Courier New', monospace;
}
```

### Effects to Disable

```css
/* Kill background noise texture */
html[data-theme="boring"] body::before {
  display: none;
}

/* Kill CRT scanlines on scene viewport */
html[data-theme="boring"] .scene-viewport::after {
  display: none;
}

/* Kill warm inner glow on scene viewport */
html[data-theme="boring"] .scene-viewport::before {
  display: none;
}

/* Flatten game buttons to corporate style */
html[data-theme="boring"] .cta-game-button,
html[data-theme="boring"] .start-button-dramatic,
html[data-theme="boring"] .results-cta {
  font-family: 'Segoe UI', system-ui, sans-serif;
  font-weight: 600;
  background: var(--accent-gold);
  box-shadow: none;
  border-radius: 4px;
  text-transform: none;
  letter-spacing: 0;
  animation: none;
}

html[data-theme="boring"] .cta-game-button:hover,
html[data-theme="boring"] .start-button-dramatic:hover:not(:disabled),
html[data-theme="boring"] .results-cta:hover {
  background: var(--accent-gold-dim);
  transform: none;
  box-shadow: 0 2px 4px rgba(0,0,0,0.15);
}

/* Kill gold glow animations */
html[data-theme="boring"] .glow-gold,
html[data-theme="boring"] .cta-glow {
  box-shadow: none;
  animation: none;
}

/* Kill pulse-ring animation */
html[data-theme="boring"] .pulse-ring {
  animation: none;
}

/* Flatten title text -- no gold gradient */
html[data-theme="boring"] .title-text {
  font-family: 'Segoe UI', system-ui, sans-serif;
  background: none;
  -webkit-background-clip: unset;
  -webkit-text-fill-color: var(--accent-gold);
  background-clip: unset;
  filter: none;
  font-weight: 700;
}

/* Remove gold decorative rule */
html[data-theme="boring"] .title-rule {
  background: var(--border);
  animation: none;
  width: 60px;
  opacity: 1;
}
```

This covers roughly 40+ CSS classes. Most will "just work" because they reference CSS variables that are being overridden. The ones listed above are the exceptions that use hardcoded colors, gradients, or font-family declarations.

---

## PixiJS Scene Changes

The PixiJS scene classes use hardcoded hex color literals -- they do not read CSS variables. Each class needs a theme-aware color system.

### Approach: Theme Color Map

Create a new file `scene/theme.ts`:

```typescript
export type SceneTheme = 'broadcast' | 'boring';

let currentTheme: SceneTheme = 'broadcast';
const listeners: Set<() => void> = new Set();

export function setSceneTheme(theme: SceneTheme) {
  currentTheme = theme;
  listeners.forEach(fn => fn());
}

export function getSceneTheme(): SceneTheme {
  return currentTheme;
}

export function onThemeChange(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
```

### SpeechBubble.ts (Medium effort)

**Current:** Two style objects (`STYLES.response` and `STYLES.question`) with hardcoded warm colors for bg, borders, text, shadow, dots.

**Boring Mode colors:**

| Property | Response (Current) | Response (Boring) | Question (Current) | Question (Boring) |
|----------|-------------------|-------------------|--------------------|--------------------|
| bg | `0xfaf6ee` parchment | `0xffffff` white | `0xfff3c8` gold | `0xe8f4fd` light blue |
| bgAlpha | 0.97 | 0.98 | 0.98 | 0.98 |
| borderOuter | `0x5a4a3a` brown | `0xbbbbbb` gray | `0x8a6a20` gold | `0x0078d4` blue |
| borderInner | `0xd4c8b0` tan | `0xdddddd` light gray | `0xe8c44a` gold | `0x4da3e8` light blue |
| textFill | `0x3a2e22` brown | `0x333333` dark gray | `0x4a3a10` dark gold | `0x1a3a5c` dark blue |
| tailColor | `0xfaf6ee` | `0xffffff` | `0xfff3c8` | `0xe8f4fd` |
| tailBorder | `0x5a4a3a` | `0xbbbbbb` | `0x8a6a20` | `0x0078d4` |
| shadowColor | `0x3a2e1a` | `0xaaaaaa` | `0x5a4a10` | `0x3366aa` |
| dotColor | `0x8a7a66` | `0x999999` | `0xc49a2a` | `0x0078d4` |

**Change:** Add a `STYLES_BORING` constant alongside `STYLES`. The constructor or a `setTheme()` method picks which one to use. The `STYLES` reference in `layout()`, `drawTail()`, etc. should become `this.getStyles()`.

Also change the font from `"DM Mono"` to `Consolas` for text and overflow indicator.

### ThinkingIndicator.ts (Small effort)

**Current hardcoded values:**

| Property | Current | Boring |
|----------|---------|--------|
| DOT_COLOR | `0xe8c44a` gold | `0x0078d4` blue |
| BORDER_COLOR | `0x5a4a3a` brown | `0xbbbbbb` gray |
| BG_COLOR | `0x1e150e` dark brown | `0x2b2b2b` neutral dark |

**Change:** Read theme at construction, use alternate constants. These are `readonly` fields set in the constructor, so reading the theme once at construction time is sufficient (thinking indicators are created fresh per session).

### PanelistTag.ts (Small effort)

**Current hardcoded values:**

| Element | Current | Boring |
|---------|---------|--------|
| Name text fill | `0xfff8e8` warm white | `0xffffff` white |
| Name font | Silkscreen, 11px, 700 | Segoe UI, 11px, 600 |
| Role text fill | `0xc8b898` warm tan | `0xcccccc` gray |
| Role font | DM Mono, 9px | Consolas, 9px |
| BG fill | `0x1e150e` dark brown | `0x2b2b2b` neutral dark |
| Border | `0x000000` at 0.35 alpha | `0x000000` at 0.2 alpha |
| Accent stripe highlight | `0xffffff` at 0.12 | `0xffffff` at 0.08 |

**Change:** Constructor reads theme, uses alternate style block.

### Room.ts (Medium effort)

**Sprite mode (primary):** The room background is a pixel-art sprite image (`room_bg`). The sprite itself stays the same in both modes -- it is a pre-rendered background and re-rendering it is out of scope. What changes:

| Element | Current | Boring |
|---------|---------|--------|
| Ambient overlay color | `0xf5d080` warm gold | Disable (alpha: 0) |
| Light patch color | `0xfff8e0` warm | Disable (alpha: 0) |
| Secondary light patch | `0xffe8b0` warm | Disable (alpha: 0) |
| Dust particle tints | Warm gold palette | Disable particles entirely |
| Bokeh particles | Warm gold | Disable |

In boring mode, the entire room goes flat — hide the pixel-art sprite, show a plain background, kill all ambient effects.

**Implementation approach:** Add a `setBoringMode(boring: boolean)` method to Room:
- Hide the background sprite (`bgSprite.visible = false`)
- Draw a flat `#e8e8e8` rectangle as the room background (or a very subtle gradient)
- Optionally draw a minimal conference table outline (thin gray rectangle) where the fishbowl table sits
- Hide all ambient effects: `ambientOverlay`, `lightPatch`, `lightPatchSecondary`, all particles
- Hide the fishbowl table sprite and its shadow
- In `update()`, skip the particle/light animation loop when boring mode is active
- Keep all objects alive (not destroyed) so toggling back works

**Procedural fallback:** Low priority — rarely triggered, and the boring mode flat background is simpler than both the sprite and procedural paths anyway.

### Character.ts (Medium effort — alternate rendering path)

In boring mode, characters skip sprite loading entirely and render as **circle avatars with initials** (like Slack, Teams, or Google Meet).

| Element | Broadcast | Boring |
|---------|-----------|--------|
| Visual | Animated pixel-art sprite | Colored circle with white initial letter |
| Size | Sprite sheet frames | 48px diameter circle |
| Idle state | Standing animation loop | Static circle |
| Talking state | Talking animation loop | Subtle ring pulse around circle |
| Thinking state | Same as idle | Same as idle (ThinkingIndicator handles the dots) |
| Ground shadow | Ellipse shadow below sprite | Smaller ellipse shadow below circle |
| Name/role labels | DM Mono 10px/8px | Consolas 10px/8px |

**Implementation:** Add a `setBoringMode(boring: boolean)` method or check theme at construction:
- Hide the sprite container, show a `Graphics` circle filled with `panelist.color` and a centered `Text` with the first letter of the name in white
- Talking state: draw a second ring at `alpha: 0.3` that pulses via the existing `update()` tick
- ~40 lines of alternate rendering code
- The position, scale, zIndex, and facing logic stays identical (circle just sits where the sprite would)

### TitleScene.ts (Small effort)

Uses the same scene classes (Room, Character, SpeechBubble, PanelistTag). No additional hardcoded theme colors beyond what those classes already contain. No changes needed here beyond what propagates from the child classes.

### FishbowlScene.ts (Small effort)

Same as TitleScene -- orchestrates child objects. No additional hardcoded colors. Changes propagate from Room, Character, SpeechBubble, PanelistTag, ThinkingIndicator.

---

## Component-Level Changes

### Components with inline styles that reference CSS variables (auto-handled)

These components use `var(--accent-gold)`, `var(--dark-surface)`, etc. in inline styles. They will automatically pick up the boring mode colors when the CSS variables change. **No code changes needed:**

- `SpeakerCard.tsx` -- uses `var(--bg-surface)`, `var(--border)`, `var(--text-primary)`, `var(--text-secondary)`
- `ActiveSessionBanner.tsx` -- uses `var(--dark-surface)`, `var(--accent-gold)`, `var(--accent-red)`

### Components with hardcoded inline colors (need changes)

#### StatusBar.tsx (Medium effort)

Inline styles with hardcoded `rgba()` values for backgrounds, borders, text colors. Also uses `'Silkscreen'` and `'DM Mono'` in inline `fontFamily` strings.

Changes needed:
- Replace `fontFamily: "'Silkscreen', monospace"` with a theme-aware font
- Replace `fontFamily: "'DM Mono', monospace"` similarly
- Replace hardcoded `rgba(196, 154, 42, ...)` (gold) with theme-aware accent
- Replace hardcoded `rgba(232, 90, 74, ...)` (red) values
- Replace text like "REC" with "Recording", "END SHOW" with "End Session"

#### TransitionOverlay.tsx (Large effort)

This component renders a full-screen broadcast transition with inline `<style>` tags containing:
- `'Silkscreen'` font in 6+ places
- `'DM Mono'` font in 3+ places
- `var(--accent-gold)` and `var(--accent-gold-light)` (will auto-update)
- `var(--accent-red)` (will auto-update)
- `var(--dark-deep)` (will auto-update)
- Hardcoded `rgba(196, 154, 42, ...)` gold values in animation keyframes
- Hardcoded `rgba(232, 90, 74, ...)` red values in animations
- "STANDBY" and "LIVE" text

Boring mode changes:
- "STANDBY" becomes "Please wait..."
- "LIVE" becomes "IN SESSION"
- Fonts swap to system fonts
- Film grain overlay disabled
- Scanline animation disabled
- Simpler fade transition instead of dramatic broadcast punch-in
- Panelist lineup uses clean table layout instead of cinematic slide-in

**Alternative:** In boring mode, skip the transition overlay entirely and just show a brief loading spinner. This would be dramatically less effort.

#### ModerationInput.tsx (Small effort)

Uses inline styles with `var(--dark-surface)`, `var(--dark-border)`, hardcoded `rgba(196,154,42,...)` gold, and `'Silkscreen'`/`'DM Mono'` fonts. Font and gold references need theme-aware values.

#### WrapUpOverlay.tsx (Medium effort)

Similar to TransitionOverlay -- a choreographed full-screen overlay. In boring mode, this could be simplified to a progress bar with "Generating summary..." text.

#### LiveTranscript.tsx (Small effort)

Uses inline styles referencing CSS variables and some hardcoded fonts. Mostly auto-handled by variable overrides.

#### KeyboardHelp.tsx (Small effort)

Dark overlay panel. Likely uses hardcoded fonts and colors.

### Pages

#### Title Page (`app/page.tsx`) (Small effort)

- Ambient glow div: hide in boring mode (the `radial-gradient` div)
- LIVE badge: change to "ONLINE" with a static green dot
- Roster dots: keep but use muted colors
- Title: handled by CSS override of `.title-text`
- CTA button: handled by CSS override of `.cta-game-button`

#### Setup Page (`app/setup/page.tsx`) (Small effort)

- Ambient glow div: hide
- Most styling comes from CSS classes already covered (`.character-card`, `.mission-briefing`, `.template-card`, `.provider-pill`, etc.)
- Section label text ("MISSION BRIEFING", "CHOOSE YOUR PANEL") could stay as-is or get corporate-ized

#### Session Page (`app/session/page.tsx`) (Small effort)

Wraps FishbowlCanvas, StatusBar, LiveTranscript, ModerationInput. Individual component changes cover it.

#### Results Page (`app/results/page.tsx`) (Small effort)

- Report header: uses `.report-header`, `.report-stamp`, `.report-field-*` classes -- all CSS variable driven
- Document tabs: `.doc-tab` -- CSS variable driven
- Summary content: `.summary-content` -- CSS variable driven
- Transcript: `.transcript-*` classes -- CSS variable driven

### CSS Classes That Need Boring Mode Overrides (beyond variables)

These classes use hardcoded colors, font-family declarations, or effects that must be explicitly overridden:

| Class | Issue | Priority |
|-------|-------|----------|
| `.title-text` | Hardcoded gold gradient, Silkscreen font | High |
| `.title-subtitle` | DM Mono font | Medium |
| `.font-pixel` | Silkscreen font | High |
| `.font-mono-ui` | DM Mono font | High |
| `.label-mono` | DM Mono font | High |
| `.cta-game-button` | Hardcoded gold gradient, Silkscreen, 3D shadow | High |
| `.start-button-dramatic` | Same as above | High |
| `.results-cta` | Same as above | High |
| `.character-nameplate` | Silkscreen font | Medium |
| `.scene-badge` | Hardcoded rgba bg | Low |
| `.scene-viewport::after` | Scanline overlay | High |
| `.scene-viewport::before` | Gold inner glow | High |
| `body::before` | Noise texture | High |
| `.glow-gold` | Hardcoded gold rgba shadow | Medium |
| `.cta-glow` | Hardcoded gold animation | Medium |
| `.pulse-ring` | Hardcoded gold animation | Low |
| `.topic-banner` | DM Mono font | Low |
| `.topic-banner-label` | Silkscreen by inheritance | Low |
| `.broadcast-*` (TransitionOverlay) | Full restyle needed | Medium |
| `.tour-*` (OnboardingTour) | Silkscreen, gold, dark panel | Low |
| `.prompt-editor-*` | Silkscreen, DM Mono, dark panel | Low |
| `.dossier-*` | DM Mono, gold chevron, dark panel | Medium |
| `.template-card-name` | Silkscreen font | Medium |
| `.template-card-label` | DM Mono font, gold color | Medium |
| `.report-stamp` | Silkscreen font | Low |
| `.doc-tab` | Silkscreen font | Low |
| `.summary-content h2, h3` | Silkscreen font | Medium |
| `.transcript-speaker` | Silkscreen font | Low |
| `.cost-badge-label` | Silkscreen font | Low |

---

## What Stays the Same

- **All functionality** -- panelist creation, AI calls, transcript, summary, export
- **Layout/structure** -- same page flow, same component hierarchy
- **Animations that are purely functional** (fade-in for content, slide-down for panels) -- these stay, just without bounce easing
- **VideoRecorder** (`scene/VideoRecorder.ts`) -- canvas recording utility, no visual theming
- **Inline SVG icons** -- almost all use `var(--accent-gold)` or `currentColor`, so they auto-update. One exception: `StatusBar.tsx:112` has hardcoded `rgba(196,154,42,0.7)` for the clock icon stroke (fix in Phase 2, Step 4)
- **Green success indicators** -- the green dots on results page (`#4ade80`) are already neutral/professional. Keep as-is.

---

## What Changes Per Mode (Summary Table)

| Area | Broadcast (Default) | Boring Mode |
|------|-------------------|-------------|
| Colors | Warm gold/parchment/brown | Cool gray/blue/neutral |
| Fonts | Silkscreen + DM Mono + Outfit | System UI + Consolas |
| Background | Noise texture + warm tones | Flat gray |
| Buttons | 3D gold game buttons | Flat blue rectangles |
| Scene effects | Dust, shimmer, scanlines, glow | None |
| Transition | "STANDBY" / "LIVE" broadcast | "Please wait..." / "In Session" |
| Labels | "MISSION BRIEFING", "REC", "DOSSIER" | "Configuration", "Recording", "Details" |
| LIVE badge | Pulsing red dot + "LIVE" | Static green dot + "ONLINE" |
| Speech bubbles | Warm parchment, brown borders | White, gray borders |
| Panelist tags | Dark brown panel, Silkscreen text | Dark gray panel, system font |
| Thinking dots | Gold dots on dark brown pill | Blue dots on dark gray pill |

---

## Effort Estimates

| Area | Effort | Notes |
|------|--------|-------|
| **Zustand store + toggle component** | Small | ~50 lines. New boolean, localStorage persist, toggle button component |
| **CSS variable overrides** | Small | ~80 lines in `globals.css`. One `html[data-theme="boring"]` block |
| **CSS class overrides (fonts, effects)** | Medium | ~150 lines. Every class using Silkscreen/DM Mono or hardcoded rgba gold |
| **SpeechBubble.ts** | Medium | Add boring style constants, make style lookup theme-aware |
| **ThinkingIndicator.ts** | Small | Swap 3 color constants based on theme |
| **PanelistTag.ts** | Small | Swap font families and 4-5 color values |
| **Room.ts** | Small | Disable ambient effects (particles, light patches) when boring |
| **Character.ts** | Small | Swap font families on name/role labels |
| **StatusBar.tsx** | Medium | Replace 10+ inline fontFamily/color references with theme-aware values |
| **TransitionOverlay.tsx** | Large | Full restyle of broadcast animation, OR skip overlay in boring mode (small) |
| **WrapUpOverlay.tsx** | Medium | Similar to TransitionOverlay |
| **ModerationInput.tsx** | Small | Font and a few color swaps |
| **LiveTranscript.tsx** | Small | Mostly CSS-variable driven, minor font swaps |
| **Title page (page.tsx)** | Small | Hide ambient glow, change LIVE to ONLINE |
| **Layout (layout.tsx)** | Small | Apply `data-theme` attribute based on store |
| **scene/theme.ts (new)** | Small | ~20 lines, theme pub-sub for PixiJS classes |

**Total estimated effort:** Medium-Large. The CSS variable system handles maybe 60% of the work automatically. The remaining 40% is font overrides, hardcoded inline styles in React components, and PixiJS scene color constants.

**Recommended approach:** Ship in two phases:
1. **Phase 1 (CSS + Store + Toggle):** Variable overrides + font overrides + effect disabling + toggle UI. Gets 70% of the visual change with ~200 lines of CSS. Components using `var(--*)` inline styles auto-update. Hardcoded font-family and rgba values stay unchanged.
2. **Phase 2 (Component + PixiJS):** Fix remaining inline styles (~30 font refs across 11 files), add PixiJS theme support, restyle or simplify overlays.

---

## 404 Page (`app/not-found.tsx`)

**Current:** "Signal Lost" broadcast error page with film grain, flicker animation, ambient gold glow, Silkscreen heading, DM Mono code label.

**Boring Mode changes:**
- "SIGNAL LOST" → "Page Not Found"
- "ERR 404 - NO BROADCAST FOUND" → "Error 404 - Page Not Found"
- Remove scanlines overlay, ambient gold glow, flicker animation
- Font swaps: Silkscreen → system-ui, DM Mono → Consolas
- Remove gold text-shadow from heading
- 4 inline fontFamily refs to update

**Effort:** Small.

---

## Complete Inline Font Inventory

Every file with hardcoded `fontFamily` in inline styles (not CSS classes):

| File | Font | Count | Notes |
|------|------|-------|-------|
| `components/scene/StatusBar.tsx` | Silkscreen, DM Mono | ~6 | Round labels, timer, model badge, REC |
| `components/scene/TransitionOverlay.tsx` | Silkscreen, DM Mono | 5 | In `<style>` tag, all broadcast classes |
| `components/scene/WrapUpOverlay.tsx` | Silkscreen, DM Mono | 5 | In `<style>` tag, wrap title/stats/labels |
| `components/scene/ModerationInput.tsx` | Silkscreen, DM Mono | ~3 | ON AIR label, placeholder, hints |
| `components/setup/PanelistBuilder.tsx` | Silkscreen, DM Mono | ~3 | Panelist count, role badges |
| `components/setup/ApiKeyConfig.tsx` | DM Mono | ~2 | Connected badge, code block |
| `components/setup/IdeaInput.tsx` | DM Mono | ~2 | Mission briefing badge |
| `components/results/Transcript.tsx` | Silkscreen, DM Mono | ~3 | Header, count, speaker names |
| `components/results/Summary.tsx` | Silkscreen | ~2 | Section headings |
| `app/results/page.tsx` | Silkscreen | 1 | EXECUTIVE SUMMARY label |
| `app/not-found.tsx` | Silkscreen, DM Mono, Outfit | 4 | Heading, watermark, desc, code |
| `app/session/page.tsx` | DM Mono | ~2 | Briefing card labels |
| `app/test/page.tsx` | DM Mono | ~2 | Mirror of session page |

**Total: ~40 inline fontFamily references across 13 files.**

All can be addressed with a shared helper (e.g., `getFont('pixel' | 'mono' | 'body')` that returns the right family based on theme), or by moving these inline styles to CSS classes that respond to `html[data-theme="boring"]` overrides.

---

## Overlay Strategy Decision

Both TransitionOverlay and WrapUpOverlay are the highest-effort components. Two approaches:

### Option A: Simplified Boring Overlays (Recommended)
In boring mode, replace the cinematic overlays with minimal versions:
- **Transition:** Simple centered card with "Starting session..." text and a progress bar. No panelist lineup, no STANDBY/LIVE sequence. ~30 lines of JSX.
- **Wrap-up:** Simple centered card with "Generating report..." and a progress bar. Stats shown in a plain table. ~40 lines of JSX.
- **Effort:** Small per overlay. Just an early-return `if (boringMode)` branch.

### Option B: Full Restyle
Keep the same animation structure but swap all fonts, colors, effects. Requires updating ~10 font refs, ~6 hardcoded rgba values, and disabling film grain/scanlines per overlay.
- **Effort:** Medium-Large per overlay. More code to maintain.

**Recommendation:** Option A. The cinematic overlays ARE the broadcast aesthetic. Restyling them to be boring defeats the purpose and creates more maintenance surface. A simple spinner/progress card is genuinely more "boring" and way less code.

---

## Components That Need No Changes

These are entirely CSS-variable and class-driven:

- `OnboardingTour.tsx` — all borders use `var(--accent-gold)`, no inline fonts
- `SpeakerCard.tsx` — uses `var(--bg-surface)`, `var(--border)`, etc.
- `ActiveSessionBanner.tsx` — uses `var(--dark-surface)`, `var(--accent-gold)`
- `TemplatePicker.tsx` — uses `.role-badge`, `.template-card` classes
- `KeyboardHelp.tsx` — dark overlay, class-driven

---

## Implementation Notes

### Applying the Theme Attribute

In `app/layout.tsx`, the `<html>` tag needs a dynamic `data-theme` attribute. Since this is a server component by default, the attribute should be applied client-side. Options:

1. **useEffect in a client component** that wraps the body or mounts early and sets `document.documentElement.dataset.theme`.
2. **A tiny client component** `<ThemeApplicator />` placed in `layout.tsx` that reads the store and sets the attribute.

### Flash of Wrong Theme Prevention

Read `boringMode` from `localStorage` synchronously in a `<script>` tag in `layout.tsx` (before React hydrates) to set `data-theme` on `<html>` immediately. This prevents a flash of broadcast theme when the user has boring mode enabled.

### PixiJS Font Loading

In boring mode, Silkscreen is still loaded (via the Google Fonts import in `globals.css`). This is fine -- the font just is not used. If bundle size matters, the import could be made conditional, but it is a minor optimization.

### Testing Checklist

- [ ] Toggle on title page, verify colors + fonts change
- [ ] Toggle on setup page, verify template cards, character cards, mission briefing
- [ ] Toggle during live session, verify StatusBar, SpeechBubble, PanelistTag
- [ ] Verify transition overlay in boring mode (simplified card)
- [ ] Verify wrap-up overlay in boring mode (simplified progress)
- [ ] Verify 404 page in boring mode
- [ ] Verify results page (report header, summary, transcript)
- [ ] Verify persistence -- reload page, mode should stick
- [ ] Verify no flash of wrong theme on page load (theme should apply before paint)
- [ ] Verify PixiJS scene updates (bubbles, tags, thinking indicators, room effects)
- [ ] Verify mobile responsiveness in boring mode
- [ ] Verify keyboard navigation focus rings use new accent color

---

## Implementation Plan (Ordered Steps)

### Phase 1: Foundation + CSS (gets you 70% of the visual change)

**Step 1: Preferences store + toggle component** (~30 min)
- Create `lib/preferences.ts` (separate Zustand store, localStorage)
- Create `components/ThemeToggle.tsx` (fixed-position toggle button)
- Create `components/ThemeApplicator.tsx` (client component that sets `data-theme` on `<html>`)
- Add `<ThemeApplicator />` and `<ThemeToggle />` to `app/layout.tsx`
- Add flash-prevention `<script>` in layout that reads localStorage before React hydrates
- **Files:** `lib/preferences.ts` (new), `components/ThemeToggle.tsx` (new), `components/ThemeApplicator.tsx` (new), `app/layout.tsx` (edit)

**Step 2: CSS variable overrides + font overrides + effect disabling** (~1 hr)
- Add `html[data-theme="boring"] { ... }` block in `globals.css` (~80 lines of variable overrides)
- Add font-family overrides for `.font-pixel`, `.label-mono`, `.font-mono-ui`, `body` (~20 lines)
- Add effect disabling: `body::before`, `.scene-viewport::after/::before`, `.glow-gold`, `.cta-glow`, `.pulse-ring` (~40 lines)
- Add button flattening: `.cta-game-button`, `.start-button-dramatic`, `.results-cta` (~30 lines)
- Add title flattening: `.title-text`, `.title-rule` (~15 lines)
- Override remaining CSS classes with hardcoded fonts: `.character-nameplate`, `.template-card-name`, `.template-card-label`, `.topic-banner`, `.dossier-*`, `.report-stamp`, `.doc-tab`, `.summary-content h2/h3`, `.transcript-speaker`, `.cost-badge-label` (~40 lines)
- **Files:** `app/globals.css` (edit, ~225 lines added)

**At this point:** All pages will look ~70% correct in boring mode. Colors, fonts (in CSS classes), backgrounds, effects, and buttons all switch. Inline styles with hardcoded fonts/colors won't update yet.

### Phase 2: Component inline styles (~2 hr)

**Step 3: Labels module** (~20 min)
- Create `lib/labels.ts` with broadcast/boring text variants
- Export a `useLabel(key)` hook or `getLabel(key, boring)` function
- **Files:** `lib/labels.ts` (new)

**Step 4: StatusBar + ModerationInput** (~30 min)
- Replace inline `fontFamily` strings with theme-aware values
- Replace "REC"/"END SHOW"/"WRAP SESSION" with label lookups
- Replace hardcoded `rgba(196, 154, 42, ...)` gold values
- **Files:** `components/scene/StatusBar.tsx`, `components/scene/ModerationInput.tsx`

**Step 5: Simplified overlays** (~30 min)
- Add early-return `if (boringMode)` branches in TransitionOverlay and WrapUpOverlay
- Boring transition: centered card with "Starting session..." text and progress bar
- Boring wrap-up: centered card with "Generating report..." and progress bar, plain stats table
- **Files:** `components/scene/TransitionOverlay.tsx`, `components/scene/WrapUpOverlay.tsx`

**Step 6: Remaining component font swaps** (~30 min)
- PanelistBuilder, ApiKeyConfig, IdeaInput: swap inline fontFamily refs
- Transcript, Summary, ExportPanel: swap inline fontFamily refs
- results/page.tsx: swap EXECUTIVE SUMMARY font
- not-found.tsx: swap fonts, text, remove effects
- session/page.tsx, test/page.tsx: swap briefing card fonts + "INITIAL TAKE" text
- **Files:** 9 files, mechanical search-and-replace

### Phase 3: PixiJS scene theming (~3 hr)

**Step 7: Scene theme module** (~15 min)
- Create `scene/theme.ts` with `getSceneTheme()`, `setSceneTheme()`, `onThemeChange()`
- Wire it to the preferences store in `FishbowlScene.ts` or the session page
- **Files:** `scene/theme.ts` (new), `app/session/page.tsx` (edit)

**Step 8: SpeechBubble theming** (~30 min)
- Add `STYLES_BORING` constant alongside `STYLES`
- Make `layout()`, `drawTail()`, `drawTypingDots()` use `this.getStyles()` instead of `SpeechBubble.STYLES[this.mode]`
- Swap font from DM Mono to Consolas
- **Files:** `scene/SpeechBubble.ts`

**Step 9: ThinkingIndicator + PanelistTag** (~30 min)
- ThinkingIndicator: swap 3 color constants based on theme
- PanelistTag: swap font families and 5 color values
- **Files:** `scene/ThinkingIndicator.ts`, `scene/PanelistTag.ts`

**Step 10: Character circle avatars** (~45 min)
- Add alternate rendering path: colored circle + white initial letter
- Skip sprite loading when boring mode active
- Talking state: subtle ring pulse animation
- Keep position/scale/zIndex logic identical
- **Files:** `scene/Character.ts`

**Step 11: Room flat background** (~30 min)
- Hide pixel-art sprite + fishbowl table + all ambient effects
- Draw flat gray rectangle background
- Optional: minimal conference table outline
- **Files:** `scene/Room.ts`

### Total: ~6.5 hours of implementation across 3 phases, ~20 files touched
