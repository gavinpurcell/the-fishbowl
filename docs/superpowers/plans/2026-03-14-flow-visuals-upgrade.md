# Flow & Visuals Upgrade Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add title screen, onboarding tooltips, improved results/export page, and upgrade PixiJS visuals from placeholder to polished geometric illustrated style.

**Architecture:** Route restructure (setup moves to `/setup`, new splash at `/`), new `TitleScene.ts` for splash PixiJS, `OnboardingTour.tsx` tooltip overlay on setup, redesigned results page with export toggle and cost tally. Character/Room/SpeechBubble get visual polish. Store gets session timing and question count fields.

**Tech Stack:** Next.js 16, React 19, PixiJS 8, Zustand, Tailwind CSS v4, html2pdf.js (new dep)

**Testing:** This project has no test harness. All work is UI/visual — verify by running `npm run dev` and visually inspecting each change in the browser at `http://localhost:3000`. Run `npm run build` before each commit to catch TypeScript errors.

**Spec:** `docs/superpowers/specs/2026-03-14-flow-visuals-upgrade-design.md`

**CSS variables:** Always use CSS variables, not raw hex values. Reference table in spec section "CSS variable reference."

---

## Chunk 1: Foundation (Store + Routes + Nav)

### Task 1: Add store fields for session timing and question count

**Files:**
- Modify: `lib/store.ts`

- [ ] **Step 1: Add new state fields**

In `lib/store.ts`, add these fields to the state interface and initial state (around line 56-67):

```typescript
sessionStartTime: number | null     // after summary field
sessionEndTime: number | null
moderationQuestionCount: number
```

Initial values: `null`, `null`, `0`.

- [ ] **Step 2: Add incrementModerationCount action**

Add to the actions section (around line 80):

```typescript
incrementModerationCount: () => set((s) => ({ moderationQuestionCount: s.moderationQuestionCount + 1 })),
```

- [ ] **Step 3: Update startSession to set sessionStartTime**

In `startSession()` (line 88), add to the set call:

```typescript
sessionStartTime: Date.now(),
sessionEndTime: null,
moderationQuestionCount: 0,
```

- [ ] **Step 4: Update completeSession to set sessionEndTime**

In `completeSession()` (line 103), add to the set call:

```typescript
sessionEndTime: Date.now(),
```

- [ ] **Step 5: Update resetSession to clear new fields**

In `resetSession()` (line 111), add to the set call:

```typescript
sessionStartTime: null,
sessionEndTime: null,
moderationQuestionCount: 0,
```

- [ ] **Step 6: Add new fields to persist partialize**

In the persist config `partialize` function (around line 140), add `sessionStartTime`, `sessionEndTime`, `moderationQuestionCount` to the returned object.

- [ ] **Step 7: Call incrementModerationCount in session page**

In `app/session/page.tsx`, inside the `handleModeration` callback (around line 287), add `storeRef.current.incrementModerationCount()` before calling `orchestrator.handleModerationQuestion(question)` (line 296).

- [ ] **Step 8: Build check**

Run: `cd ~/the-fishbowl && npm run build`
Expected: Build succeeds with no type errors.

- [ ] **Step 9: Commit**

```bash
cd ~/the-fishbowl && git add lib/store.ts app/session/page.tsx && git commit -m "feat: add session timing and moderation count to store"
```

---

### Task 2: Move setup page to /setup route

**Files:**
- Create: `app/setup/page.tsx`
- Modify: `app/page.tsx` (will be replaced in Task 5, but needs a placeholder now)

- [ ] **Step 1: Create setup directory**

```bash
mkdir -p ~/the-fishbowl/app/setup
```

- [ ] **Step 2: Move setup page content**

Copy the current `app/page.tsx` to `app/setup/page.tsx`. The file content stays identical — it's the same `SetupPage` component. Just move it.

```bash
cp ~/the-fishbowl/app/page.tsx ~/the-fishbowl/app/setup/page.tsx
```

- [ ] **Step 3: Create temporary placeholder at /**

Replace `app/page.tsx` with a temporary redirect to `/setup` (will be replaced by title screen in Task 5):

```tsx
'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function Home() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/setup');
  }, [router]);
  return null;
}
```

- [ ] **Step 4: Build check**

Run: `cd ~/the-fishbowl && npm run build`
Expected: Build succeeds. Navigating to `/` redirects to `/setup`.

- [ ] **Step 5: Commit**

```bash
cd ~/the-fishbowl && git add app/page.tsx app/setup/page.tsx && git commit -m "feat: move setup page to /setup route"
```

---

### Task 3: Update all navigation references from / to /setup

**Files:**
- Modify: `app/results/page.tsx`
- Modify: `app/session/page.tsx`

- [ ] **Step 1: Search for all router references to /**

```bash
cd ~/the-fishbowl && grep -rn "push('/'" app/ && grep -rn "replace('/'" app/
```

Confirm all locations match what the spec lists.

- [ ] **Step 2: Update results page**

In `app/results/page.tsx`:
- Line 18: Change `router.replace('/')` → `router.replace('/setup')`
- Line 24: Change `router.push('/')` → `router.push('/setup')`
- Line 29: Change `router.push('/')` → `router.push('/setup')`

- [ ] **Step 3: Update session page**

In `app/session/page.tsx`:
- Line 57: Change `router.replace('/')` → `router.replace('/setup')`
- Line 348: Change `router.replace('/')` → `router.replace('/setup')` (mobile fallback "Go Back" button)

- [ ] **Step 4: Verify no other references remain**

```bash
cd ~/the-fishbowl && grep -rn "push('/'" app/ && grep -rn "replace('/'" app/
```

Only `push('/results')` and `push('/session')` should remain.

- [ ] **Step 5: Build check and visual verify**

Run: `cd ~/the-fishbowl && npm run build`
Expected: Build succeeds. Test in browser: complete a session → results page → "New Session" navigates to `/setup`.

- [ ] **Step 6: Commit**

```bash
cd ~/the-fishbowl && git add app/results/page.tsx app/session/page.tsx && git commit -m "fix: update navigation references from / to /setup"
```

---

## Chunk 2: PixiJS Visual Upgrade

### Task 4: Upgrade Character.ts — geometric illustrated style

**Files:**
- Modify: `scene/Character.ts`

This is the largest single task. The entire `draw` section of the Character class gets rewritten.

- [ ] **Step 1: Update CharacterState type**

At line 3, change:
```typescript
export type CharacterState = 'idle' | 'talking' | 'thinking' | 'reacting';
```
to:
```typescript
export type CharacterState = 'idle' | 'talking' | 'thinking' | 'reacting' | 'gesturing' | 'skeptical';
```

- [ ] **Step 2: Add character appearance data**

Add a constant array after the type definition (around line 5) for per-character visual variety:

```typescript
const CHARACTER_APPEARANCES = [
  { hairStyle: 'wavy', hairColor: 0x5a3a1a, skinTone: 0xf5d0a9, hasGlasses: false },
  { hairStyle: 'short', hairColor: 0x2a1a0a, skinTone: 0xe0bc8a, hasGlasses: true },
  { hairStyle: 'curly', hairColor: 0x1a1a2a, skinTone: 0xd4a878, hasGlasses: false },
  { hairStyle: 'ponytail', hairColor: 0xc47040, skinTone: 0xf5d0a9, hasGlasses: false },
  { hairStyle: 'cropped', hairColor: 0x4a4a5a, skinTone: 0xe8c8a0, hasGlasses: true },
  { hairStyle: 'bangs', hairColor: 0x8a5a2a, skinTone: 0xd4a878, hasGlasses: false },
  { hairStyle: 'wavy', hairColor: 0x1a1a2a, skinTone: 0xe0bc8a, hasGlasses: true },
  { hairStyle: 'curly', hairColor: 0x5a3a1a, skinTone: 0xf5d0a9, hasGlasses: false },
];
```

- [ ] **Step 3: Add spriteIndex to constructor options**

Update the constructor options interface to accept `spriteIndex`:

```typescript
constructor(options: {
  panelistId: string;
  name: string;
  color: string;
  spriteIndex?: number;
  isObserver?: boolean;
})
```

Store `this.spriteIndex = options.spriteIndex ?? 0` and `this.appearance = CHARACTER_APPEARANCES[this.spriteIndex % CHARACTER_APPEARANCES.length]`.

- [ ] **Step 4: Rewrite the character drawing code**

Replace the character construction block (lines 62-96) with the new geometric illustrated style. The drawing order (bottom to top):

1. **Chair**: rounded rect seat + two leg rects below. Fill `0xc9b896`, stroke `0xb0a080`, 0.8px.
2. **Body**: rounded rect, border-radius 8px, fill with character color. Slightly wider (30px wide × 30px tall).
3. **Collar**: smaller rounded rect at top of body, 2 shades darker than body color.
4. **Arms**: two rounded rects at sides (8px wide × 16px tall, rx=4), same color as body.
5. **Hands**: two circles at bottom of arms (radius 3.5px), fill with `this.appearance.skinTone`.
6. **Head**: circle radius 16px (up from 14), fill `this.appearance.skinTone`.
7. **Hair**: call `this.drawHair()` method based on `this.appearance.hairStyle`.
8. **Eyes**: for each eye — white ellipse (rx=3.5, ry=3), dark pupil circle (r=1.8), tiny white highlight (r=0.7).
9. **Blush**: two low-opacity (`0.35`) pink ellipses (`0xf0b0a0`) on cheeks.
10. **Mouth**: curved path (bezier) for resting smile.
11. **Glasses** (if `this.appearance.hasGlasses`): two unfilled circles (r=5, stroke `0x4a4a4a` 0.8px) + bridge line.
12. **Name label**: keep existing DM Mono label below.

- [ ] **Step 5: Add drawHair method**

Add a private `drawHair(g: Graphics)` method that switches on `this.appearance.hairStyle`:

- `'wavy'`: bezier path across top of head, slight wave
- `'short'`: rounded rect on top, sideburn rects on sides
- `'curly'`: 5 small circles clustered above head
- `'ponytail'`: arc path + trailing ellipse to one side
- `'cropped'`: arc path across top only
- `'bangs'`: overlapping rounded rects with staggered heights

All filled with `this.appearance.hairColor`.

- [ ] **Step 6: Add gesturing animation state**

In the `update()` method, add a case for `'gesturing'`:
- Rotate arm graphics outward (left arm -20°, right arm +15°)
- Position hands higher
- Draw 2-3 small lines radiating from head area (like exclamation indicators)
- Pulsing opacity on the lines

- [ ] **Step 7: Add skeptical animation state**

In the `update()` method, add a case for `'skeptical'`:
- Shift one eyebrow up (offset y position of right eye group by -3px)
- Replace mouth curve with flat horizontal line
- Cross arms in front of body (if feasible with current graphics approach, otherwise just the face changes)

- [ ] **Step 8: Update FishbowlScene to pass spriteIndex**

In `scene/FishbowlScene.ts`, where characters are created (around lines 60-65), update the `Character` constructor call to pass `spriteIndex`. The `Panelist` type already has a `spriteIndex` field:

```typescript
const character = new Character({
  panelistId: panelist.id,
  name: panelist.name,
  color: panelist.color,
  spriteIndex: panelist.spriteIndex,  // ADD THIS LINE
});
```

Without this, all session characters would get `spriteIndex: 0` and look identical.

- [ ] **Step 9: Verify visually**

Run dev server, navigate to `/session` with a test panel. Verify characters render with the new style — distinct hair, eyes with whites/pupils, blush, varied skin tones. Check all animation states work (press space through briefing, observe idle/talking/thinking).

- [ ] **Step 9: Build check**

Run: `cd ~/the-fishbowl && npm run build`
Expected: No type errors.

- [ ] **Step 10: Commit**

```bash
cd ~/the-fishbowl && git add scene/Character.ts scene/FishbowlScene.ts && git commit -m "feat: upgrade Character to geometric illustrated style with varied appearances"
```

---

### Task 5: Polish Room.ts and SpeechBubble.ts

**Files:**
- Modify: `scene/Room.ts`
- Modify: `scene/SpeechBubble.ts`

- [ ] **Step 1: Add ceiling shadow to Room**

In `Room.ts` `drawBackWall()` method, after drawing the wall rectangle, add a subtle horizontal shadow line at the top edge:

```typescript
// Ceiling shadow
const shadow = new Graphics();
shadow.rect(50, 100, 700, 3);
shadow.fill({ color: 0x000000, alpha: 0.05 });
this.addChild(shadow);
```

Adjust y-position to match where the wall starts in the current code.

- [ ] **Step 2: Enhance floor grain**

In `drawFloorGrid()`, ensure floorboard horizontal lines have slightly varied spacing (not perfectly uniform). Add 2-3 subtle vertical grain lines with very low opacity (0.03-0.05).

- [ ] **Step 3: Ensure consistent stroke widths**

Review `drawWindow()` and `drawPlant()` — ensure all strokes use 1-1.5px width to match the character line weights from Task 4.

- [ ] **Step 4: Upgrade SpeechBubble**

In `scene/SpeechBubble.ts`, in the `layout()` method:

- Increase bubble border-radius from current value to 10px
- Make tail larger: increase from 3px to 7px triangle size
- Add subtle drop shadow: draw a second bubble rect behind the main one, offset by (1, 2), filled with `0x000000` at 0.06 alpha, same border-radius

- [ ] **Step 5: Verify visually**

Check room looks polished, speech bubbles have rounder corners and soft shadow. Cross-talk phase is best for seeing both.

- [ ] **Step 6: Build check**

Run: `cd ~/the-fishbowl && npm run build`

- [ ] **Step 7: Commit**

```bash
cd ~/the-fishbowl && git add scene/Room.ts scene/SpeechBubble.ts && git commit -m "feat: polish Room and SpeechBubble visuals"
```

---

## Chunk 3: Title Screen

### Task 6: Create TitleScene.ts

**Files:**
- Create: `scene/TitleScene.ts`

- [ ] **Step 1: Create TitleScene class**

Create `scene/TitleScene.ts` modeled after `FishbowlScene.ts` but simpler:

```typescript
import { Application, Container } from 'pixi.js';
import { Character } from './Character';
import { Room } from './Room';

const DEMO_CHARACTERS = [
  { id: 'maya', name: 'MAYA', color: '#4a9e6e', spriteIndex: 0, state: 'gesturing' as const },
  { id: 'derek', name: 'DEREK', color: '#c45a5a', spriteIndex: 1, state: 'thinking' as const },
  { id: 'priya', name: 'PRIYA', color: '#5a7ec4', spriteIndex: 2, state: 'talking' as const },
  { id: 'sam', name: 'SAM', color: '#d4a040', spriteIndex: 3, state: 'reacting' as const },
  { id: 'alex', name: 'ALEX', color: '#9a6ab4', spriteIndex: 4, state: 'skeptical' as const },
];

export class TitleScene {
  private app: Application | null = null;
  private characters: Character[] = [];
  private room: Room | null = null;

  // Same ellipse layout as FishbowlScene
  private CIRCLE_CX = 400;
  private CIRCLE_CY = 390;
  private CIRCLE_RX = 180;
  private CIRCLE_RY = 55;

  async init(container: HTMLElement): Promise<void> {
    this.app = new Application();
    await this.app.init({
      width: 800,
      height: 600,
      background: 0xf0e8d8,
      antialias: false,
      autoDensity: true,
      resolution: window.devicePixelRatio || 1,
    });

    container.appendChild(this.app.canvas);

    // Room background
    this.room = new Room();
    this.app.stage.addChild(this.room);

    // 5 characters in ellipse
    for (let i = 0; i < DEMO_CHARACTERS.length; i++) {
      const cfg = DEMO_CHARACTERS[i];
      const angle = (i / DEMO_CHARACTERS.length) * Math.PI * 2 - Math.PI / 2;
      const x = this.CIRCLE_CX + Math.cos(angle) * this.CIRCLE_RX;
      const y = this.CIRCLE_CY + Math.sin(angle) * this.CIRCLE_RY;

      const character = new Character({
        panelistId: cfg.id,
        name: cfg.name,
        color: cfg.color,
        spriteIndex: cfg.spriteIndex,
      });
      character.position.set(x, y);
      character.setState(cfg.state);
      this.app.stage.addChild(character);
      this.characters.push(character);
    }

    // Z-sorting
    this.app.stage.sortableChildren = true;
    this.characters.forEach(c => { c.zIndex = Math.floor(c.y); });

    // Animation loop
    this.app.ticker.add((ticker) => {
      const delta = ticker.deltaTime;
      this.room?.update(delta);
      this.characters.forEach(c => c.update(delta));
    });
  }

  destroy(): void {
    this.app?.destroy(true, { children: true });
    this.app = null;
    this.characters = [];
    this.room = null;
  }
}
```

- [ ] **Step 2: Build check**

Run: `cd ~/the-fishbowl && npm run build`

- [ ] **Step 3: Commit**

```bash
cd ~/the-fishbowl && git add scene/TitleScene.ts && git commit -m "feat: add TitleScene for splash page"
```

---

### Task 7: Create title screen page

**Files:**
- Modify: `app/page.tsx` (replace the temporary redirect)

- [ ] **Step 1: Write the title screen component**

Replace `app/page.tsx` with:

```tsx
'use client';

import { useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { TitleScene } from '@/scene/TitleScene';

export default function TitlePage() {
  const router = useRouter();
  const canvasRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<TitleScene | null>(null);

  useEffect(() => {
    if (!canvasRef.current || sceneRef.current) return;
    const scene = new TitleScene();
    sceneRef.current = scene;
    scene.init(canvasRef.current);

    return () => {
      scene.destroy();
      sceneRef.current = null;
    };
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center">
      {/* Ambient glow */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] opacity-[0.08] rounded-full blur-[120px] pointer-events-none"
           style={{ background: 'var(--accent-gold)' }} />

      {/* PixiJS Scene */}
      <div className="relative">
        <div
          ref={canvasRef}
          className="rounded-xl overflow-hidden border-2"
          style={{
            width: 420,
            height: 280,
            borderColor: 'var(--border)',
            background: 'var(--bg-surface)',
          }}
        />
        <div className="absolute bottom-1.5 right-2.5 label-mono text-[8px]"
             style={{ color: 'var(--text-muted)' }}>
          Live Scene
        </div>
      </div>

      {/* Title */}
      <h1 className="text-5xl font-800 tracking-tight mt-8"
          style={{ color: 'var(--text-primary)', letterSpacing: '-1px' }}>
        THE FISHBOWL
      </h1>
      <p className="text-lg mt-2" style={{ color: 'var(--text-secondary)' }}>
        AI Focus Groups For Your Ideas
      </p>

      {/* CTA */}
      <button
        onClick={() => router.push('/setup')}
        className="mt-8 px-12 py-4 rounded-xl text-lg font-semibold text-white cursor-pointer transition-all duration-200 hover:brightness-110"
        style={{
          background: 'var(--accent-gold)',
          boxShadow: '0 4px 16px rgba(196, 154, 42, 0.3)',
        }}
      >
        Get Started Now
      </button>
      <p className="label-mono mt-4 text-[11px] tracking-widest"
         style={{ color: 'var(--text-muted)' }}>
        No account needed · Bring your own API key
      </p>
    </div>
  );
}
```

Note: The canvas container is 420×280 (scaled down from 800×600). The PixiJS `autoDensity` and `resolution` handle the scaling. If the canvas renders at full 800×600 inside the smaller div, add CSS `canvas { width: 100%; height: 100%; }` scoped to the container, or adjust `TitleScene` to use the container dimensions.

- [ ] **Step 2: Verify visually**

Navigate to `http://localhost:3000/`. Should see the animated PixiJS scene with 5 characters, title text, gold CTA button. Click "Get Started Now" → navigates to `/setup`.

- [ ] **Step 3: Build check**

Run: `cd ~/the-fishbowl && npm run build`

- [ ] **Step 4: Commit**

```bash
cd ~/the-fishbowl && git add app/page.tsx && git commit -m "feat: add title/splash screen with animated PixiJS scene"
```

---

## Chunk 4: Onboarding Tour

### Task 8: Create OnboardingTour component

**Files:**
- Create: `components/setup/OnboardingTour.tsx`

- [ ] **Step 1: Define tour data and component**

```tsx
'use client';

import { useState, useEffect, useCallback } from 'react';

interface TourStop {
  targetId: string;
  setupStep: 'template' | 'configure';
  title: string;
  description: string;
}

const TOUR_STOPS: TourStop[] = [
  {
    targetId: 'section-templates',
    setupStep: 'template',
    title: 'Pick your panel of experts',
    description: 'Choose a pre-built team of AI experts, or build your own custom panel below. Each expert brings a different perspective to your idea.',
  },
  {
    targetId: 'section-panelists',
    setupStep: 'configure',
    title: 'Customize your panelists',
    description: "Edit names, roles, and descriptions to shape each expert's personality. The more detail you give, the more distinct their feedback will be.",
  },
  {
    targetId: 'section-idea',
    setupStep: 'configure',
    title: 'Describe what you\'re testing',
    description: 'Paste your pitch, upload a doc, or just describe your idea in plain language. The panel will discuss whatever you give them.',
  },
  {
    targetId: 'section-api',
    setupStep: 'configure',
    title: 'Connect your AI',
    description: 'Choose Claude or GPT, paste your API key, and pick a model. Your key stays in your browser — we never store it on a server.',
  },
];

interface OnboardingTourProps {
  setStep: (step: 'template' | 'configure') => void;
}

export default function OnboardingTour({ setStep }: OnboardingTourProps) {
  const [currentStop, setCurrentStop] = useState(0);
  const [showFinale, setShowFinale] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (localStorage.getItem('fishbowl_onboarded')) return;
    setVisible(true);
  }, []);

  const dismiss = useCallback(() => {
    localStorage.setItem('fishbowl_onboarded', 'true');
    setVisible(false);
  }, []);

  const advance = useCallback(() => {
    if (currentStop >= TOUR_STOPS.length - 1) {
      setShowFinale(true);
      return;
    }
    const nextStop = currentStop + 1;
    const nextData = TOUR_STOPS[nextStop];

    // If next stop needs a different setup step, switch it
    if (nextData.setupStep !== TOUR_STOPS[currentStop].setupStep) {
      setStep(nextData.setupStep);
      // Small delay for the DOM to update before scrolling
      setTimeout(() => {
        setCurrentStop(nextStop);
        scrollToTarget(nextData.targetId);
      }, 300);
    } else {
      setCurrentStop(nextStop);
      scrollToTarget(nextData.targetId);
    }
  }, [currentStop, setStep]);

  const scrollToTarget = (targetId: string) => {
    const el = document.getElementById(targetId);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  useEffect(() => {
    if (visible && !showFinale) {
      scrollToTarget(TOUR_STOPS[currentStop].targetId);
    }
  }, [visible, currentStop, showFinale]);

  if (!visible) return null;

  if (showFinale) {
    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
        <div
          className="rounded-2xl p-8 text-center text-white max-w-md"
          style={{ background: 'linear-gradient(135deg, var(--accent-warm), var(--accent-gold))' }}
        >
          <div className="label-mono text-[10px] mb-2 opacity-80">ALL SET</div>
          <h2 className="text-2xl font-700 mb-2">Ready to focus group your stuff!</h2>
          <p className="text-sm opacity-85 mb-6">
            Set up your panel and hit &quot;Start the Fishbowl&quot; when you&apos;re ready.
          </p>
          <button
            onClick={dismiss}
            className="px-6 py-2.5 rounded-lg font-semibold text-sm cursor-pointer"
            style={{ background: 'white', color: 'var(--text-primary)' }}
          >
            Let&apos;s Go!
          </button>
        </div>
      </div>
    );
  }

  const stop = TOUR_STOPS[currentStop];

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 z-[9990]"
        style={{ background: 'rgba(26, 23, 20, 0.4)' }}
        onClick={dismiss}
      />

      {/* Highlight ring on target — applied via CSS class */}
      <style>{`
        #${stop.targetId} {
          position: relative;
          z-index: 9995 !important;
          box-shadow: 0 0 0 4px var(--accent-gold) !important;
          border-radius: 12px;
        }
      `}</style>

      {/* Tooltip */}
      <div
        className="fixed z-[9999] max-w-xs"
        style={{
          // Position will be calculated relative to the target element
          // For now, center horizontally and place near top
          left: '50%',
          transform: 'translateX(-50%)',
          top: '20%',
        }}
        ref={(el) => {
          if (!el) return;
          const target = document.getElementById(stop.targetId);
          if (!target) return;
          const rect = target.getBoundingClientRect();
          el.style.left = `${rect.left + rect.width / 2}px`;
          el.style.top = `${rect.top - 10}px`;
          el.style.transform = 'translateX(-50%) translateY(-100%)';
        }}
      >
        <div
          className="rounded-xl p-4 shadow-xl"
          style={{ background: 'var(--text-primary)', color: 'var(--bg-deep)' }}
        >
          <div className="font-semibold text-sm mb-1">{stop.title}</div>
          <div className="text-xs leading-relaxed" style={{ color: '#b0a89e' }}>
            {stop.description}
          </div>
          <div className="flex justify-between items-center mt-3">
            <span className="label-mono text-[10px]" style={{ color: 'var(--text-muted)' }}>
              {currentStop + 1} / {TOUR_STOPS.length}
            </span>
            <div className="flex gap-2 items-center">
              <button
                onClick={dismiss}
                className="text-xs cursor-pointer"
                style={{ color: 'var(--text-muted)' }}
              >
                Skip
              </button>
              <button
                onClick={advance}
                className="px-4 py-1.5 rounded-md text-xs font-semibold text-white cursor-pointer"
                style={{ background: 'var(--accent-gold)' }}
              >
                Next →
              </button>
            </div>
          </div>
          {/* Arrow pointing down */}
          <div
            className="absolute left-1/2 -translate-x-1/2"
            style={{
              bottom: '-8px',
              width: 0,
              height: 0,
              borderLeft: '8px solid transparent',
              borderRight: '8px solid transparent',
              borderTop: '8px solid var(--text-primary)',
            }}
          />
        </div>
      </div>
    </>
  );
}
```

- [ ] **Step 2: Build check**

Run: `cd ~/the-fishbowl && npm run build`

- [ ] **Step 3: Commit**

```bash
cd ~/the-fishbowl && git add components/setup/OnboardingTour.tsx && git commit -m "feat: add OnboardingTour tooltip component"
```

---

### Task 9: Integrate OnboardingTour into setup page

**Files:**
- Modify: `app/setup/page.tsx`

- [ ] **Step 1: Add section IDs to setup page**

In `app/setup/page.tsx`, add `id` attributes to the wrapper divs of each section so the tour can target them:
- Template picker wrapper: `id="section-templates"`
- Panelist builder wrapper: `id="section-panelists"`
- Idea input wrapper: `id="section-idea"`
- API config wrapper: `id="section-api"`

Find the JSX for each component (`<TemplatePicker>`, `<PanelistBuilder>`, `<IdeaInput>`, `<ApiKeyConfig>`) and wrap or add `id` to their parent `div`.

- [ ] **Step 2: Import and render OnboardingTour**

Add import:
```typescript
import OnboardingTour from '@/components/setup/OnboardingTour';
```

Pass the `setStep` function to the tour. Render it inside the page component's JSX (at the top level, before other content):

```tsx
<OnboardingTour setStep={setStep} />
```

- [ ] **Step 3: Verify visually**

Clear localStorage (`localStorage.removeItem('fishbowl_onboarded')` in console), navigate to `/setup`. Tour should appear with overlay, highlight the template picker, show tooltip. Click "Next →" to advance through all 4 stops + finale.

- [ ] **Step 4: Verify it doesn't show again**

Refresh the page. Tour should NOT appear (localStorage flag is set).

- [ ] **Step 5: Build check**

Run: `cd ~/the-fishbowl && npm run build`

- [ ] **Step 6: Commit**

```bash
cd ~/the-fishbowl && git add app/setup/page.tsx && git commit -m "feat: integrate onboarding tour into setup page"
```

---

## Chunk 5: StatusBar + Results Page

### Task 10: Rename and restyle the Wrap Up button

**Files:**
- Modify: `components/scene/StatusBar.tsx`

- [ ] **Step 1: Rename button text**

Change the button text from "Wrap Up" to "I'm Done Asking Questions".

- [ ] **Step 2: Restyle button**

Update the button's inline styles:

```tsx
style={{
  background: 'var(--accent-gold)',
  color: 'white',
  fontFamily: "'Outfit', sans-serif",
  fontSize: '13px',
  fontWeight: 600,
  padding: '8px 18px',
  borderRadius: '8px',
  border: 'none',
  cursor: 'pointer',
  boxShadow: '0 2px 8px rgba(196, 154, 42, 0.4)',
}}
```

- [ ] **Step 3: Verify visually**

Run a session, get to moderation phase. The button should be prominent gold, clearly visible, with text "I'm Done Asking Questions".

- [ ] **Step 4: Build check and commit**

```bash
cd ~/the-fishbowl && npm run build && git add components/scene/StatusBar.tsx && git commit -m "feat: rename and restyle Wrap Up button to 'I'm Done Asking Questions'"
```

---

### Task 11: Create CostTally component

**Files:**
- Create: `components/results/CostTally.tsx`

- [ ] **Step 1: Write CostTally component**

```tsx
'use client';

import { useFishbowlStore } from '@/lib/store';
import { getModelById } from '@/lib/models';

export default function CostTally() {
  const { sessionCost, modelId, provider } = useFishbowlStore();
  const model = getModelById(modelId);

  const inputCost = model
    ? (sessionCost.inputTokens / 1_000_000) * model.inputPer1M
    : 0;
  const outputCost = model
    ? (sessionCost.outputTokens / 1_000_000) * model.outputPer1M
    : 0;
  const totalCost = inputCost + outputCost;

  const isOllama = provider === 'ollama';

  return (
    <div
      className="rounded-xl p-5 flex items-center justify-between"
      style={{ background: 'var(--bg-surface)' }}
    >
      <div>
        <div className="label-mono text-[10px] mb-1.5" style={{ color: 'var(--text-muted)' }}>
          Session Cost
        </div>
        <div className="text-3xl font-700" style={{ color: 'var(--text-primary)' }}>
          {isOllama ? 'Free' : `$${totalCost.toFixed(2)}`}
        </div>
      </div>
      <div className="text-right">
        <div className="label-mono text-[11px]" style={{ color: 'var(--text-secondary)' }}>
          <span style={{ color: 'var(--text-muted)' }}>Input:</span>{' '}
          {sessionCost.inputTokens.toLocaleString()} tokens ·{' '}
          <span style={{ color: 'var(--text-muted)' }}>Output:</span>{' '}
          {sessionCost.outputTokens.toLocaleString()} tokens
        </div>
        <div className="label-mono text-[11px] mt-1" style={{ color: 'var(--text-secondary)' }}>
          <span style={{ color: 'var(--text-muted)' }}>Model:</span>{' '}
          {model?.label ?? modelId} ·{' '}
          <span style={{ color: 'var(--text-muted)' }}>Provider:</span>{' '}
          {provider.charAt(0).toUpperCase() + provider.slice(1)}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Build check and commit**

```bash
cd ~/the-fishbowl && npm run build && git add components/results/CostTally.tsx && git commit -m "feat: add CostTally component for results page"
```

---

### Task 12: Create ExportPanel component

**Files:**
- Create: `components/results/ExportPanel.tsx`

- [ ] **Step 1: Install html2pdf.js**

```bash
cd ~/the-fishbowl && npm install html2pdf.js
```

Note: html2pdf.js may not have TypeScript types. If not, create a `types/html2pdf.d.ts`:
```typescript
declare module 'html2pdf.js' {
  interface Html2PdfOptions {
    margin?: number | number[];
    filename?: string;
    image?: { type: string; quality: number };
    html2canvas?: { scale: number };
    jsPDF?: { unit: string; format: string; orientation: string };
  }
  function html2pdf(): {
    set(opt: Html2PdfOptions): ReturnType<typeof html2pdf>;
    from(element: HTMLElement): ReturnType<typeof html2pdf>;
    save(): Promise<void>;
  };
  export default html2pdf;
}
```

- [ ] **Step 2: Write ExportPanel component**

```tsx
'use client';

import { useState, useRef } from 'react';
import type { TranscriptEntry } from '@/engine/types';

interface ExportPanelProps {
  transcript: TranscriptEntry[];
  summary: string | null;
}

type ContentMode = 'summary' | 'transcript';

function transcriptToMarkdown(transcript: TranscriptEntry[]): string {
  let md = '# Fishbowl Session — Full Transcript\n\n';
  let currentRound = '';
  for (const entry of transcript) {
    if (entry.round !== currentRound) {
      currentRound = entry.round;
      md += `\n## ${currentRound.replace('-', ' ').replace(/\b\w/g, c => c.toUpperCase())}\n\n`;
    }
    md += `**${entry.panelistName}:** ${entry.content}\n\n`;
  }
  return md;
}

function summaryToMarkdown(summary: string): string {
  return `# Fishbowl Session — AI Summary\n\n${summary}\n`;
}

export default function ExportPanel({ transcript, summary }: ExportPanelProps) {
  const [mode, setMode] = useState<ContentMode>('summary');
  const previewRef = useRef<HTMLDivElement>(null);

  const getMarkdown = () => {
    if (mode === 'summary' && summary) return summaryToMarkdown(summary);
    return transcriptToMarkdown(transcript);
  };

  const handleDownloadMarkdown = () => {
    const md = getMarkdown();
    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fishbowl-${mode}-${Date.now()}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadPDF = async () => {
    const el = previewRef.current;
    if (!el) return;
    const html2pdf = (await import('html2pdf.js')).default;
    html2pdf()
      .set({
        margin: [10, 10, 10, 10],
        filename: `fishbowl-${mode}-${Date.now()}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      })
      .from(el)
      .save();
  };

  return (
    <div className="rounded-xl p-6" style={{ background: 'var(--bg-surface)' }}>
      <div className="label-mono text-[10px] mb-4" style={{ color: 'var(--text-muted)' }}>
        What do you want to export?
      </div>

      {/* Content toggle */}
      <div className="flex gap-3 mb-5">
        <button
          onClick={() => setMode('summary')}
          className="flex-1 p-4 rounded-xl text-left cursor-pointer transition-colors duration-200"
          style={{
            background: mode === 'summary' ? 'var(--text-primary)' : 'var(--bg-deep)',
            color: mode === 'summary' ? 'var(--bg-deep)' : 'var(--text-primary)',
            border: mode === 'summary' ? '2px solid var(--text-primary)' : '2px solid var(--border)',
          }}
        >
          <div className="font-semibold text-sm mb-1">AI Summary</div>
          <div className="text-xs leading-relaxed" style={{ opacity: 0.7 }}>
            Key insights, points of agreement & disagreement, and top recommendations.
          </div>
        </button>
        <button
          onClick={() => setMode('transcript')}
          className="flex-1 p-4 rounded-xl text-left cursor-pointer transition-colors duration-200"
          style={{
            background: mode === 'transcript' ? 'var(--text-primary)' : 'var(--bg-deep)',
            color: mode === 'transcript' ? 'var(--bg-deep)' : 'var(--text-primary)',
            border: mode === 'transcript' ? '2px solid var(--text-primary)' : '2px solid var(--border)',
          }}
        >
          <div className="font-semibold text-sm mb-1">Full Transcript</div>
          <div className="text-xs leading-relaxed" style={{ opacity: 0.7 }}>
            Every response from every panelist, in order.
          </div>
        </button>
      </div>

      {/* Format buttons */}
      <div className="flex gap-3">
        <button
          onClick={handleDownloadMarkdown}
          className="flex-1 flex items-center justify-center gap-2.5 py-3.5 rounded-xl text-white font-semibold text-sm cursor-pointer transition-all duration-200 hover:brightness-110"
          style={{ background: 'var(--accent-gold)' }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
          Download Markdown
        </button>
        <button
          onClick={handleDownloadPDF}
          className="flex-1 flex items-center justify-center gap-2.5 py-3.5 rounded-xl text-white font-semibold text-sm cursor-pointer transition-all duration-200 hover:brightness-110"
          style={{ background: 'var(--accent-warm)' }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><polyline points="9 15 12 18 15 15"/></svg>
          Download PDF
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Build check and commit**

```bash
cd ~/the-fishbowl && npm run build && git add components/results/ExportPanel.tsx types/ package.json package-lock.json && git commit -m "feat: add ExportPanel with markdown and PDF export"
```

---

### Task 13: Redesign results page

**Files:**
- Modify: `app/results/page.tsx`

- [ ] **Step 1: Rewrite results page**

Replace the full content of `app/results/page.tsx` with the new design. Keep the same redirect guard at the top (checking `status !== 'completed'`). The new layout:

```tsx
'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useFishbowlStore } from '@/lib/store';
import { exportSession } from '@/lib/session';
import Summary from '@/components/results/Summary';
import Transcript from '@/components/results/Transcript';
import ExportPanel from '@/components/results/ExportPanel';
import CostTally from '@/components/results/CostTally';

export default function ResultsPage() {
  const router = useRouter();
  const store = useFishbowlStore();
  const previewRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (store.status !== 'completed' || store.transcript.length === 0) {
      router.replace('/setup');
    }
  }, [store.status, store.transcript.length, router]);

  if (store.status !== 'completed') return null;

  const handleSaveJSON = () => {
    exportSession(store.getSessionConfig(), store.transcript, store.summary);
  };

  const handleExportVideo = () => {
    const url = sessionStorage.getItem('fishbowl-video-url');
    if (url) {
      const a = document.createElement('a');
      a.href = url;
      a.download = `fishbowl-session-${Date.now()}.webm`;
      a.click();
    }
  };

  const handleNewSession = () => {
    store.resetSession();
    router.push('/setup');
  };

  const hasVideo = typeof window !== 'undefined' && !!sessionStorage.getItem('fishbowl-video-url');

  // Session duration
  const durationMinutes = store.sessionStartTime && store.sessionEndTime
    ? Math.round((store.sessionEndTime - store.sessionStartTime) / 60000)
    : null;

  return (
    <div className="min-h-screen">
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] opacity-[0.08] rounded-full blur-[120px] pointer-events-none"
           style={{ background: 'var(--accent-gold)' }} />

      <div className="max-w-3xl mx-auto px-6 py-16 relative animate-fade-in">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="label-mono text-[10px] mb-3" style={{ color: 'var(--text-muted)' }}>
            Session Complete
          </div>
          <h1 className="text-3xl font-700" style={{ color: 'var(--text-primary)' }}>
            Your Fishbowl Results
          </h1>
          <p className="text-sm mt-2" style={{ color: 'var(--text-secondary)' }}>
            {store.panelists.length} panelists
            {durationMinutes !== null && ` · ${durationMinutes} minutes`}
            {store.moderationQuestionCount > 0 && ` · ${store.moderationQuestionCount} questions asked`}
          </p>
        </div>

        {/* Export Panel */}
        <div className="mb-5">
          <ExportPanel transcript={store.transcript} summary={store.summary} />
        </div>

        {/* Preview */}
        <div
          ref={previewRef}
          className="rounded-xl p-6 mb-5"
          style={{ background: 'white', border: '1px solid var(--border)' }}
        >
          <div className="label-mono text-[10px] mb-4" style={{ color: 'var(--text-muted)' }}>
            Preview
          </div>
          {store.summary ? (
            <Summary summary={store.summary} />
          ) : (
            <Transcript transcript={store.transcript} panelists={store.panelists} />
          )}
        </div>

        {/* Cost Tally */}
        <div className="mb-5">
          <CostTally />
        </div>

        {/* Save JSON + Video */}
        <div
          className="rounded-xl p-4 mb-5 flex items-center justify-between"
          style={{ background: 'var(--bg-surface)' }}
        >
          <div>
            <div className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
              Save Session Data
            </div>
            <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              Export the full session as JSON — reload it later to review.
            </div>
          </div>
          <div className="flex gap-2">
            {hasVideo && (
              <button
                onClick={handleExportVideo}
                className="px-4 py-2.5 rounded-lg text-xs font-semibold cursor-pointer"
                style={{
                  background: 'var(--bg-deep)',
                  border: '1px solid var(--border)',
                  color: 'var(--text-primary)',
                }}
              >
                Download Video
              </button>
            )}
            <button
              onClick={handleSaveJSON}
              className="px-4 py-2.5 rounded-lg text-xs font-semibold cursor-pointer"
              style={{
                background: 'var(--bg-deep)',
                border: '1px solid var(--border)',
                color: 'var(--text-primary)',
              }}
            >
              Save JSON
            </button>
          </div>
        </div>

        {/* Divider */}
        <div className="my-6" style={{ borderTop: '2px solid var(--border)' }} />

        {/* Start New CTA */}
        <div className="text-center">
          <button
            onClick={handleNewSession}
            className="inline-flex items-center gap-3 px-10 py-4 rounded-xl text-lg font-semibold text-white cursor-pointer transition-all duration-200 hover:brightness-110"
            style={{
              background: 'var(--accent-gold)',
              boxShadow: '0 4px 16px rgba(196, 154, 42, 0.3)',
            }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
            Start a New Fishbowl!
          </button>
          <p className="label-mono text-[11px] mt-3 tracking-widest"
             style={{ color: 'var(--text-muted)' }}>
            Your API key is saved · Jump right back in
          </p>
        </div>
      </div>
    </div>
  );
}
```

Note: The preview area currently always shows Summary if available, Transcript otherwise. This should be wired to the ExportPanel's mode toggle. To do this, either:
- Lift the `mode` state up to the results page and pass it down to ExportPanel
- Or use a shared ref/callback

The simplest approach: lift state. Add `mode` state to the results page, pass `mode` and `setMode` to ExportPanel, and conditionally render Summary or Transcript in the preview based on `mode`.

- [ ] **Step 2: Wire preview to export mode toggle**

Refactor: add `const [exportMode, setExportMode] = useState<'summary' | 'transcript'>('summary');` to the results page. Pass `mode={exportMode}` and `onModeChange={setExportMode}` to `ExportPanel`. Update `ExportPanel` props to accept external mode control instead of internal state.

Update the preview section:
```tsx
{exportMode === 'summary' && store.summary ? (
  <Summary summary={store.summary} />
) : (
  <Transcript transcript={store.transcript} panelists={store.panelists} />
)}
```

Update the preview label:
```tsx
Preview — {exportMode === 'summary' ? 'AI Summary' : 'Full Transcript'}
```

- [ ] **Step 3: Verify visually**

Run through a full session → results. Check:
- Header shows panelist count, duration, question count
- Toggle between AI Summary and Full Transcript works
- Markdown download works (check downloaded file)
- PDF download works (opens save dialog)
- Cost tally shows correct amount
- Save JSON works
- "Start a New Fishbowl!" navigates to `/setup`

- [ ] **Step 4: Build check**

Run: `cd ~/the-fishbowl && npm run build`

- [ ] **Step 5: Commit**

```bash
cd ~/the-fishbowl && git add app/results/page.tsx components/results/ExportPanel.tsx && git commit -m "feat: redesign results page with export panel, cost tally, and new CTA"
```

---

## Final Verification

### Task 14: End-to-end flow test

- [ ] **Step 1: Full flow test**

Walk through the entire app:
1. `/` — Title screen loads with animated PixiJS scene, 5 characters, "Get Started Now" button
2. Click CTA → `/setup`
3. First visit: tooltip tour appears, walk through all 4 stops + finale
4. Pick a template, enter an idea, configure API key
5. Start session → `/session` — characters render with new geometric illustrated style
6. Briefing phase → cross-talk → moderation
7. "I'm Done Asking Questions" button is prominent gold
8. Click it → wrap-up → summary generation → `/results`
9. Results page: toggle AI Summary / Full Transcript, download MD, download PDF
10. Cost tally shows total
11. "Start a New Fishbowl!" → `/setup` (no tour on second visit)

- [ ] **Step 2: Build check**

Run: `cd ~/the-fishbowl && npm run build`
Expected: Clean build, no errors.

- [ ] **Step 3: Final commit if any fixes needed**

```bash
cd ~/the-fishbowl && git add -A && git commit -m "fix: end-to-end flow polish"
```
