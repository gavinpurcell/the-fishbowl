# Specimen Tag Design Refresh Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply the Specimen Tag design language across panel cards, template picker, mission briefing, live-session intro, results headers, and the quote share card, plus a mechanical sweep that strips gold-glow hover halos, 90deg gradient strips, tinted-chip badges, and Silkscreen overuse.

**Architecture:** Define the new visual primitives (`.brass-plate`, `.specimen-card`, `.pixel-frame`, motion tokens) as reusable utility classes in `app/globals.css`. Each surface component is then refactored to compose those primitives — no per-component bespoke styling. Mechanical sweeps grep for the four AI-tell patterns and replace them per file.

**Tech Stack:** Next.js 16, React 19, Tailwind v4, CSS variables, existing fonts (Silkscreen / DM Mono / Outfit). No new dependencies.

**Spec:** `docs/superpowers/specs/2026-05-22-specimen-tag-design-refresh.md`

**Verification approach:** Pure unit tests don't work for visual design. Each task ends with one of:
- a `grep` that asserts a tell pattern is gone (mechanical sweeps),
- a manual dev-server visual check at a specific URL (rendered surfaces),
- a typecheck run (`npx tsc --noEmit`).
The dev server runs on `http://localhost:3001` (or whatever port Next picks if 3000 is busy). Use `next dev` without `--turbopack` if the Turbopack memory leak recurs.

---

## File Structure

**New utilities added to** `app/globals.css`:
- `.specimen-card` — the framed wrapper (no border-radius, 1px border, `--bg-card` background)
- `.brass-plate` — the header strip (vertical gradient, screws, label, 2px color rule bottom)
- `.brass-screw` — the screw dot
- `.brass-label` — DM Mono caps for the center catalog string
- `.brass-marker` — Silkscreen single-char marker on the right
- `.pixel-frame` — 3px solid color wrapper for portraits
- `.dashed-divider` — `border-top: 1px dashed #524a44`
- `.specimen-hover` — the motion vocabulary (translate + hard pixel shadow + reduced-motion guard)
- Light theme overrides via `[data-theme="light"]` for each of the above

**Files modified per phase:**

| Phase | Files |
|-------|-------|
| 1 — Foundation | `app/globals.css` |
| 2 — Tier 1 | `components/setup/PanelistBuilder.tsx`, `components/setup/TemplatePicker.tsx`, `components/setup/IdeaInput.tsx`, `app/globals.css` (per-surface tweaks) |
| 3 — Tier 2 | `components/scene/IntroOverlay.tsx`, `components/results/Summary.tsx`, `components/results/Transcript.tsx`, `components/results/ExportPanel.tsx`, `components/results/QuoteCard.tsx` |
| 4 — Tier 3 sweep | repository-wide grep + per-file replacements |
| 5 — Light theme + mobile | `app/globals.css` only (everything else inherits via CSS variables) |

---

## Phase 1 — Foundation Primitives

### Task 1: Add Specimen Tag CSS primitives

**Files:**
- Modify: `app/globals.css` — add new utility classes near the existing component-style classes (after the existing `@keyframes spin` block around line 127, before the focus-visible rules)

- [ ] **Step 1: Write the new utility class block**

Add this CSS block after the `@keyframes spin` block and before the global `:focus-visible` rules in `app/globals.css`:

```css
/* ============================================================
   Specimen Tag design language — see spec
   docs/superpowers/specs/2026-05-22-specimen-tag-design-refresh.md
   ============================================================ */

.specimen-card {
  background: var(--bg-card);
  border: 1px solid #2a2422;
  border-radius: 0;
  position: relative;
  overflow: hidden;
}

.brass-plate {
  background: linear-gradient(180deg, #2a2422 0%, #1c1918 100%);
  padding: 6px 10px;
  display: flex;
  align-items: center;
  gap: 8px;
  border-bottom: 2px solid var(--brass-accent, var(--accent-gold));
}

.brass-screw {
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: #524a44;
  box-shadow: inset 1px 1px 0 #6a6258;
  flex-shrink: 0;
}

.brass-label {
  font-family: 'DM Mono', monospace;
  font-size: 9px;
  color: #8a8278;
  letter-spacing: 0.18em;
  flex: 1;
}

.brass-marker {
  font-family: 'Silkscreen', monospace;
  font-size: 9px;
  color: var(--brass-accent, var(--accent-gold));
}

.pixel-frame {
  padding: 3px;
  background: var(--brass-accent, var(--accent-gold));
  display: inline-block;
  line-height: 0;
}

.dashed-divider {
  border-top: 1px dashed #524a44;
}

/* Hard pixel-shadow hover — replaces gold-glow halos */
.specimen-hover {
  transition: transform 0.08s ease, box-shadow 0.08s ease;
}
.specimen-hover:hover {
  transform: translate(-2px, -2px);
  box-shadow: 4px 4px 0 var(--brass-accent, var(--accent-gold));
}
.specimen-hover:active {
  transform: translate(0, 0);
  box-shadow: 0 0 0 transparent;
}

@media (prefers-reduced-motion: reduce) {
  .specimen-hover:hover,
  .specimen-hover:active {
    transform: none;
    box-shadow: none;
  }
}

/* Light-theme overrides */
[data-theme="light"] .specimen-card {
  background: #ffffff;
  border-color: #d4ccc2;
}

[data-theme="light"] .brass-plate {
  background: linear-gradient(180deg, #ebe5d8 0%, #faf6f0 100%);
}

[data-theme="light"] .brass-screw {
  background: #c0b8a8;
  box-shadow: inset 1px 1px 0 #d4ccc2;
}

[data-theme="light"] .brass-label {
  color: #5a5248;
}
```

- [ ] **Step 2: Verify typecheck passes**

Run: `cd ~/the-fishbowl && npx tsc --noEmit 2>&1 | tail -5`
Expected: no output (clean)

- [ ] **Step 3: Verify the dev server still renders the current /setup page**

Start the dev server if not running: `cd ~/the-fishbowl && npm run dev`
Open: `http://localhost:3001/setup`
Expected: page renders unchanged (no component uses the new utilities yet — this task only defines them)

- [ ] **Step 4: Commit**

```bash
cd ~/the-fishbowl && git add app/globals.css && git commit -m "Add Specimen Tag CSS primitives (brass plate, pixel frame, motion)"
```

---

## Phase 2 — Tier 1 Surfaces

### Task 2: Refresh Panel card (PanelistBuilder)

**Files:**
- Modify: `components/setup/PanelistBuilder.tsx` lines 94-177 (the panelist card markup)
- Modify: `app/globals.css` — remove the `.character-card-border` gradient strip class if still referenced (search first to confirm)

- [ ] **Step 1: Replace the panelist card JSX**

In `components/setup/PanelistBuilder.tsx`, find the block starting at line 94 with `{panelists.map((p, i) => (`. Replace the entire card markup (from line 95 opening `<div key={p.id}` through its closing `</div>` for the card, before the Edit prompt panel comment on line 179) with:

```jsx
<div
  key={p.id}
  className={`specimen-card specimen-hover animate-card-pop stagger-${i + 1}`}
  style={{ ['--brass-accent' as string]: p.color }}
>
  {/* Brass plate header */}
  <div className="brass-plate">
    <div className="brass-screw" />
    <span className="brass-label">SPECIMEN · {String(i + 1).padStart(2, '0')} / 04</span>
    <span className="brass-marker">{p.name.charAt(0).toUpperCase()}</span>
    <div className="brass-screw" />
  </div>

  {/* Card body */}
  <div className="p-3">
    <div className="flex items-start gap-3">
      {/* Pixel-frame portrait */}
      <div className="pixel-frame">
        <Image
          src={`/sprites/portraits/char_${p.spriteIndex}_portrait.png`}
          alt={`${p.name} portrait`}
          width={56}
          height={56}
          style={{ imageRendering: 'pixelated', display: 'block' }}
        />
      </div>

      {/* Name and role */}
      <div className="flex-1 min-w-0">
        <div className="character-nameplate" style={{ color: 'var(--text-primary)' }}>
          {p.name}
        </div>
        <div
          className="mt-1"
          style={{
            color: p.color,
            fontFamily: "'DM Mono', monospace",
            fontSize: '9px',
            letterSpacing: '0.16em',
            textTransform: 'uppercase',
          }}
        >
          Genus: {p.role}
        </div>
      </div>
    </div>

    {/* Description */}
    <p
      className="text-xs mt-2 leading-relaxed"
      style={{
        color: 'var(--text-muted)',
        display: '-webkit-box',
        WebkitLineClamp: 2,
        WebkitBoxOrient: 'vertical',
        overflow: 'hidden',
      }}
    >
      {p.description}
    </p>

    {/* Actions */}
    <div className="flex items-center gap-2 mt-3 pt-2 dashed-divider">
      <button
        onClick={() => editingId === p.id ? setEditingId(null) : startEditing(p)}
        className="text-[10px] font-500 px-2 py-1 rounded transition-colors"
        style={{
          color: 'var(--accent-gold)',
          background: editingId === p.id ? 'rgba(196, 154, 42, 0.1)' : 'transparent',
          fontFamily: "'DM Mono', monospace",
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
        }}
      >
        {editingId === p.id ? 'Close' : '▸ Annotate'}
      </button>
      <div style={{ flex: 1 }} />
      <button
        onClick={() => removePanelist(p.id)}
        className="text-[10px] px-2 py-1 rounded transition-colors"
        style={{
          color: 'var(--text-muted)',
          fontFamily: "'DM Mono', monospace",
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
        }}
        onMouseEnter={(e) => e.currentTarget.style.color = 'var(--accent-red)'}
        onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
      >
        Release
      </button>
    </div>
  </div>

  {/* Edit prompt panel — character backstory editor (keep existing markup that follows) */}
```

Keep the Edit prompt panel JSX that follows the actions div intact — it begins with `{/* Edit prompt panel — character backstory editor */}` and should be left as-is.

- [ ] **Step 2: Remove the `.character-card` / `.character-card-border` styles from globals.css if no longer referenced**

Run: `cd ~/the-fishbowl && grep -rn "character-card\b\|character-card-border" components/ app/ 2>/dev/null | grep -v ".next"`

If the only hits are in `app/globals.css`, delete those class definitions (search for `.character-card {` and `.character-card-border {` blocks in globals.css and remove them along with any associated `:hover` / `[data-theme="light"]` variants).

If there are still references in `.tsx` files, skip this step — those will be handled in later tasks.

- [ ] **Step 3: Visual verification**

Open `http://localhost:3001/setup`. Add a panelist via a template if the panel is empty. Confirm:
- Brass plate header with screws, "SPECIMEN · 01 / 04" label, character-initial marker
- Pixel frame around portrait (chunky solid border in character color, no rounding)
- "Genus: Venture Capitalist" in the character color, no chip background
- "▸ ANNOTATE" / "RELEASE" actions in DM Mono caps
- Hover: card translates -2px, hard color shadow drops bottom-right
- No gradient strip, no tinted chip badge, no soft gold glow

- [ ] **Step 4: Commit**

```bash
cd ~/the-fishbowl && git add components/setup/PanelistBuilder.tsx app/globals.css && git commit -m "Refresh panel card with Specimen Tag language"
```

---

### Task 3: Refresh Template picker card

**Files:**
- Modify: `components/setup/TemplatePicker.tsx`
- Modify: `app/globals.css` lines 740-895 (the `.template-card*` classes)

- [ ] **Step 1: Read the current TemplatePicker JSX to understand the existing structure**

Run: `cd ~/the-fishbowl && cat components/setup/TemplatePicker.tsx | head -90`

Note the existing structure — `template-card`, `template-card-accent`, `template-card-body`, `template-card-label`, `template-card-name`, `template-card-desc`, and the portrait row. The new design keeps all the data but reframes the chrome.

- [ ] **Step 2: Replace the card JSX**

In `components/setup/TemplatePicker.tsx`, replace the `<button key={template.id} ... className={template-card animate-card-pop stagger-...}>` element and its full body with:

```jsx
<button
  key={template.id}
  onClick={() => onSelect(template)}
  className={`specimen-card specimen-hover animate-card-pop stagger-${i + 1} text-left w-full`}
  style={{ ['--brass-accent' as string]: 'var(--accent-gold)', cursor: 'pointer', padding: 0 }}
>
  <div className="brass-plate">
    <div className="brass-screw" />
    <span className="brass-label">EXHIBIT · {String(i + 1).padStart(2, '0')}</span>
    <span className="brass-marker">{template.featured ? '★' : ''}</span>
    <div className="brass-screw" />
  </div>

  <div className="p-4">
    <div
      style={{
        color: 'var(--text-primary)',
        fontFamily: "'Silkscreen', monospace",
        fontSize: '14px',
        letterSpacing: '0.04em',
      }}
    >
      {template.name}
    </div>
    <div
      style={{
        marginTop: '4px',
        color: 'var(--text-muted)',
        fontFamily: "'DM Mono', monospace",
        fontSize: '9px',
        letterSpacing: '0.14em',
        textTransform: 'uppercase',
      }}
    >
      {template.panelists.length} specimens · {template.tagline ?? template.theme ?? 'curated panel'}
    </div>
    <p
      className="text-xs mt-2 leading-relaxed"
      style={{ color: 'var(--text-muted)' }}
    >
      {template.description}
    </p>

    {/* Inhabitant row — 4 mini portraits with color borders */}
    <div className="flex gap-1.5 mt-3">
      {template.panelists.slice(0, 4).map((p, idx) => (
        <div
          key={idx}
          style={{
            width: '28px',
            height: '28px',
            border: `2px solid ${p.color ?? 'var(--accent-gold)'}`,
            lineHeight: 0,
          }}
        >
          <Image
            src={`/sprites/portraits/char_${p.spriteIndex ?? idx}_portrait.png`}
            alt=""
            width={24}
            height={24}
            style={{ imageRendering: 'pixelated', display: 'block', width: '100%', height: '100%' }}
          />
        </div>
      ))}
    </div>

    <div className="dashed-divider mt-3 pt-2 flex justify-between">
      <span
        style={{
          color: 'var(--accent-gold)',
          fontFamily: "'Silkscreen', monospace",
          fontSize: '9px',
          letterSpacing: '0.06em',
        }}
      >
        ▸ ASSEMBLE PANEL
      </span>
    </div>
  </div>
</button>
```

**Note for the engineer:** If `template.tagline` or `template.theme` doesn't exist on the `PanelTemplate` type, fall back to a literal string like `'curated panel'`. Check `engine/types.ts` to confirm the field names — use whichever single-line summary already exists. If neither exists, just hardcode the literal.

**Note for the engineer:** If `p.color` and `p.spriteIndex` aren't on the template's panelist objects (they may only exist on materialized `Panelist` instances), check `lib/templates.ts` for what shape the template panelists have. If they don't carry color/sprite info pre-materialization, use a curated array of placeholder colors per Exhibit and the panelist index for `spriteIndex`.

- [ ] **Step 3: Remove obsolete .template-card* CSS**

In `app/globals.css`, delete the `.template-card-accent` block (around line 774-782 — the `linear-gradient(90deg, ...)` strip). Keep `.template-card-body`, `.template-card-label`, `.template-card-name`, `.template-card-desc` only if they're still used by JSX you didn't replace; otherwise delete them too.

Run after editing: `cd ~/the-fishbowl && grep -n "template-card" app/globals.css components/setup/TemplatePicker.tsx`
Expected: only class references that match what's still in the JSX, no orphaned `.template-card-accent`.

- [ ] **Step 4: Visual verification**

Open `http://localhost:3001/setup` (panel must be empty to show template picker). Confirm:
- Each template has brass plate "EXHIBIT · 01"
- Inhabitant row of 4 mini-portraits with colored 2px borders
- "▸ ASSEMBLE PANEL" footer in Silkscreen
- Hover: card translates -2px with gold pixel shadow

- [ ] **Step 5: Commit**

```bash
cd ~/the-fishbowl && git add components/setup/TemplatePicker.tsx app/globals.css && git commit -m "Refresh template picker as Exhibit roster"
```

---

### Task 4: Refresh Mission Briefing (IdeaInput)

**Files:**
- Modify: `components/setup/IdeaInput.tsx`
- Modify: `app/globals.css` — remove the `.mission-briefing-drag-overlay` header gradient if applicable

- [ ] **Step 1: Replace the IdeaInput card chrome**

In `components/setup/IdeaInput.tsx`, find the `<div className="mission-briefing" ...>` block (around line 90). Replace the entire mission-briefing div and its inner header bar with this structure, preserving the textarea + file-list + dragoverlay logic exactly:

```jsx
<div
  className="specimen-card"
  style={{
    position: 'relative',
    ['--brass-accent' as string]: 'var(--accent-gold)',
  }}
  onDragOver={handleDragOver}
  onDragEnter={handleDragEnter}
  onDragLeave={handleDragLeave}
  onDrop={handleDrop}
>
  {/* Full-card drag overlay — keep existing markup */}
  {isDragging && (
    <div className="mission-briefing-drag-overlay">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" style={{ marginBottom: '8px' }}>
        <path d="M12 3v14M5 10l7 7 7-7" stroke="var(--accent-gold)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span>Drop evidence here</span>
    </div>
  )}

  {/* Brass plate header */}
  <div className="brass-plate" style={{ position: 'relative', zIndex: 2 }}>
    <div className="brass-screw" />
    <span className="brass-label">OBSERVATION REQUEST · 01</span>
    <span
      style={{
        fontFamily: "'DM Mono', monospace",
        fontSize: '8px',
        color: '#6a6258',
        letterSpacing: '0.14em',
      }}
    >
      {hasContent ? 'READY' : 'DRAFT'}
    </span>
    <div className="brass-screw" />
  </div>

  {/* Subject section */}
  <div className="p-4" style={{ background: 'var(--bg-card)' }}>
    <div
      style={{
        fontFamily: "'DM Mono', monospace",
        fontSize: '9px',
        color: 'var(--accent-gold)',
        letterSpacing: '0.14em',
        textTransform: 'uppercase',
        marginBottom: '8px',
      }}
    >
      ▸ The subject
    </div>
    <textarea
      value={ideaText}
      onChange={(e) => onTextChange(e.target.value)}
      placeholder="What do you want the panel to evaluate? Describe your startup idea, product feature, marketing campaign, creative concept..."
      className="w-full h-36 resize-none text-sm leading-relaxed mission-briefing-textarea"
      aria-label="Your topic or pitch"
      maxLength={MAX_DISPLAY}
      style={{
        background: 'transparent',
        border: 'none',
        color: 'var(--text-primary)',
        outline: 'none',
        fontFamily: "'Outfit', system-ui, sans-serif",
      }}
    />
    {/* Char count */}
    {charCount > 0 && (
      <div
        className="mission-briefing-charcount text-right"
        style={{
          color: isNearLimit ? 'var(--accent-warm)' : 'var(--text-muted)',
          fontFamily: "'DM Mono', monospace",
          fontSize: '9px',
          letterSpacing: '0.06em',
        }}
      >
        {charCount.toLocaleString()}/{MAX_DISPLAY.toLocaleString()}
      </div>
    )}
  </div>

  {/* Evidence section */}
  <div className="dashed-divider" style={{ background: 'var(--bg-surface)' }}>
    <div className="px-4 py-3">
      <div
        style={{
          fontFamily: "'DM Mono', monospace",
          fontSize: '9px',
          color: 'var(--accent-gold)',
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          marginBottom: '6px',
        }}
      >
        ▸ Evidence (optional)
      </div>
      <div className="flex items-center gap-2">
        <svg width="12" height="12" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0, opacity: 0.4 }}>
          <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
          Submit .pdf, .md, or .txt — or{' '}
          <label className="cursor-pointer" style={{ color: 'var(--accent-gold)' }}>
            browse
            <input type="file" accept=".pdf,.md,.txt" multiple onChange={handleFileSelect} className="hidden" />
          </label>
        </p>
        <span className="text-[10px] ml-auto" style={{ color: 'var(--text-muted)', opacity: 0.5 }}>
          Up to 3 specimens
        </span>
      </div>
    </div>

    {fileError && (
      <p className="text-xs px-4 pb-2" style={{ color: 'var(--accent-red)' }}>{fileError}</p>
    )}

    {ideaFiles.length > 0 && (
      <div className="px-4 pb-3 space-y-1.5">
        {/* Keep existing file row JSX intact, including the file-row-flash class */}
        {/* ...existing code... */}
      </div>
    )}
  </div>
</div>
```

**Note:** The `{/* ...existing code... */}` placeholder is just a guide — you must keep the actual existing file-row mapping markup that's currently there (lines ~199-225 of the file). Don't re-type it; just leave that block intact.

- [ ] **Step 2: Update "Your Idea" section header label**

Find the section header above the briefing card (around line 67 in IdeaInput.tsx — the `<div className="section-header">` block). The visible text is "Mission Briefing". Leave it alone — that's already on-brand. If the engineer believes a different word fits better ("Observation"), they can ask Gavin at this step.

- [ ] **Step 3: Remove obsolete styles**

Run: `cd ~/the-fishbowl && grep -n "mission-briefing\b" app/globals.css`

If the `.mission-briefing` class definition still contains a `linear-gradient(90deg,` style for the gold accent line at top, remove that gradient declaration. Keep the drag-overlay, charcount, textarea, and files-area styles.

- [ ] **Step 4: Visual verification**

Open `http://localhost:3001/setup`. Confirm:
- Brass plate header "OBSERVATION REQUEST · 01" with DRAFT/READY indicator on right
- "▸ The subject" label in gold DM Mono caps
- Textarea unchanged in behavior
- "▸ Evidence (optional)" section with dashed top divider
- "Submit .pdf, .md, or .txt" / "Up to 3 specimens" copy
- "Drop evidence here" text on drag-over
- File row flash on successful upload (already working from prior PR)

- [ ] **Step 5: Commit**

```bash
cd ~/the-fishbowl && git add components/setup/IdeaInput.tsx app/globals.css && git commit -m "Refresh mission briefing as Observation Request"
```

---

## Phase 3 — Tier 2 Surfaces

### Task 5: Refresh live-session briefing card (IntroOverlay)

**Files:**
- Modify: `components/scene/IntroOverlay.tsx`

- [ ] **Step 1: Read the current IntroOverlay to understand its render structure**

Run: `cd ~/the-fishbowl && cat components/scene/IntroOverlay.tsx | head -100`

Identify where the per-panelist intro card markup lives. The component shows each panelist briefly as the session starts — find the wrapper div for that card.

- [ ] **Step 2: Apply the same Specimen Tag composition**

Replace the panelist intro card wrapper with:

```jsx
<div
  className="specimen-card"
  style={{ ['--brass-accent' as string]: panelist.color, maxWidth: '460px' }}
>
  <div className="brass-plate">
    <div className="brass-screw" />
    <span className="brass-label">NOW IN THE FISHBOWL · {String(index + 1).padStart(2, '0')} / {String(totalPanelists).padStart(2, '0')}</span>
    <span
      className="brass-marker"
      style={{ color: panelist.color }}
    >
      LIVE
    </span>
    <div className="brass-screw" />
  </div>
  <div className="p-4">
    <div className="flex gap-3 items-center">
      <div className="pixel-frame">
        <Image
          src={`/sprites/portraits/char_${panelist.spriteIndex}_portrait.png`}
          alt={panelist.name}
          width={72}
          height={72}
          style={{ imageRendering: 'pixelated', display: 'block' }}
        />
      </div>
      <div className="flex-1">
        <div
          style={{
            color: 'var(--text-primary)',
            fontFamily: "'Silkscreen', monospace",
            fontSize: '16px',
          }}
        >
          {panelist.name}
        </div>
        <div
          style={{
            color: panelist.color,
            fontFamily: "'DM Mono', monospace",
            fontSize: '10px',
            letterSpacing: '0.16em',
            textTransform: 'uppercase',
            marginTop: '4px',
          }}
        >
          {panelist.role}
        </div>
        <p
          className="mt-2 text-xs leading-relaxed"
          style={{ color: 'var(--text-muted)' }}
        >
          {panelist.description}
        </p>
      </div>
    </div>
  </div>
</div>
```

Adapt the variable names (`panelist`, `index`, `totalPanelists`) to whatever they're called in the actual component.

- [ ] **Step 3: Visual verification**

Start a fresh session at `http://localhost:3001/setup` → submit → reach the intro overlay phase. Confirm:
- Each panelist intro card has the brass plate with "NOW IN THE FISHBOWL · 01 / 04" + "LIVE" marker
- Pixel-frame portrait, name in Silkscreen, role in DM Mono caps in character color

- [ ] **Step 4: Commit**

```bash
cd ~/the-fishbowl && git add components/scene/IntroOverlay.tsx && git commit -m "Refresh live-session briefing card with Specimen language"
```

---

### Task 6: Refresh Results module headers (Summary + Transcript + Export)

**Files:**
- Modify: `components/results/Summary.tsx`
- Modify: `components/results/Transcript.tsx`
- Modify: `components/results/ExportPanel.tsx`

- [ ] **Step 1: Wrap Summary in a specimen-card with brass plate**

In `components/results/Summary.tsx`, find the top-level wrapper of the rendered summary (the outer div that contains the summary content). Wrap it in:

```jsx
<div className="specimen-card" style={{ ['--brass-accent' as string]: 'var(--accent-gold)' }}>
  <div className="brass-plate">
    <div className="brass-screw" />
    <span className="brass-label">FINDINGS · DEBRIEF</span>
    <span
      style={{
        fontFamily: "'DM Mono', monospace",
        fontSize: '8px',
        color: '#6a6258',
        letterSpacing: '0.14em',
      }}
    >
      {panelistCount} SPECIMENS
    </span>
    <div className="brass-screw" />
  </div>
  <div className="p-4">
    {/* existing summary content */}
  </div>
</div>
```

`panelistCount` should come from props or wherever the component knows the number of panelists; if it's not available, drop the right marker entirely.

- [ ] **Step 2: Wrap Transcript with FIELD LOG brass plate**

In `components/results/Transcript.tsx`, apply the same wrapper pattern. Brass label: `FIELD LOG · FULL TRANSCRIPT`. Right marker: `{entryCount} ENTRIES` where entryCount is the transcript array length.

- [ ] **Step 3: Wrap Export panel with EXPORT · ARCHIVE brass plate**

In `components/results/ExportPanel.tsx`, apply the same wrapper pattern. Brass label: `EXPORT · ARCHIVE`. Right marker: leave blank (file format icons would over-complicate; skip).

- [ ] **Step 4: Visual verification**

Open the results page (you may need to complete a session, or there might be a `/test` route for results — check `app/results/page.tsx` for any dev hooks). Confirm each module now has a brass plate header.

- [ ] **Step 5: Commit**

```bash
cd ~/the-fishbowl && git add components/results/Summary.tsx components/results/Transcript.tsx components/results/ExportPanel.tsx && git commit -m "Refresh results modules with brass plate headers"
```

---

### Task 7: Refresh Quote share card (canvas-rendered)

**Files:**
- Modify: `components/results/QuoteCard.tsx`

This is the biggest task and the most complex because the card is rendered via Canvas API, not DOM. The visual must match the mockup but expressed in canvas drawing calls.

- [ ] **Step 1: Read the current QuoteCard implementation**

Run: `cd ~/the-fishbowl && cat components/results/QuoteCard.tsx`

Identify: the canvas init, the size (1200×630), the existing drawing sequence (background, portrait, quote text, branding).

- [ ] **Step 2: Replace the canvas drawing logic with the Specimen layout**

Rewrite the canvas rendering pass to draw:

1. **Background:** Fill `#14110f`. Then overlay subtle scanlines by drawing horizontal 1px lines at `rgba(255,255,255,0.012)` every 4px.

2. **Brass plate header (full width, 56px tall):**
   - Draw vertical gradient from `#2a2422` to `#1c1918`
   - Draw a 2px solid line at the bottom in `panelistColor`
   - Draw two screws (8px circles) — left at x=28, right at x=1172, both vertically centered, fill `#524a44` with inner highlight `#6a6258`
   - Center text: `"FROM THE FISHBOWL"` in DM Mono Caps, 14px, letter-spacing 0.22em, color `#8a8278`, vertically centered, horizontally at x=64 (anchored after left screw)
   - Right marker: `"№ NNN"` in Silkscreen 14px gold (`#c49a2a`), positioned right of center text before right screw

3. **Body layout (starts at y=56+36=92):**
   - **Left column (portrait):** at x=28, y=128. Draw a 200×200 box. Outer 4px solid `panelistColor` border, inner 192×192 area filled with portrait sprite (drawn pixelated via `imageSmoothingEnabled = false`). Overlay scanlines on the portrait only.
   - **Portrait label:** under portrait at y=340, "Silkscreen" 18px, color `#faf6f0`, centered above name text width, panelist name.
   - **Role caption:** below name at y=362, DM Mono caps 10px letter-spacing 0.18em color `panelistColor`, panelist role.
   - **Right column (quote):** at x=260, y=128, width=912.
     - Open-quote glyph: Silkscreen 56px gold `#c49a2a`, "
     - Quote text: Outfit Semibold 28px, color `#faf6f0`, line height 1.4. Wrap to 912px width. Anchor below open-quote.

4. **Bottom strip (y=570):**
   - Dashed horizontal line at y=560, from x=28 to x=1172, color `#524a44`
   - Left text at x=28, y=590: `"Observation Request: " + topicText` in DM Mono caps 12px letter-spacing 0.14em color `#8a8278`. Truncate topicText with ellipsis if it overflows the available width.
   - Right text at x=1172 (right-anchored), y=590: `"fishbowl.show"` in DM Mono caps 12px gold `#c49a2a`.

**Note for the engineer:** Look at the existing canvas rendering for font-loading patterns (likely there's a font-ready guard before drawing). Reuse the existing pattern — Silkscreen, DM Mono, Outfit are already loaded by the page.

**Note for the engineer:** The portrait image needs to be loaded into a `HTMLImageElement` before drawImage works in canvas. The existing component likely already has this pattern; preserve it.

- [ ] **Step 3: Verify canvas exports correctly**

Open `http://localhost:3001/results` after a completed session (or use any local test mechanism). Click through to the share card view. Confirm:
- The card renders end-to-end without canvas errors
- The exported PNG (right-click > save image, or via the existing share button copy-to-clipboard flow) matches the mockup
- Multi-panelist switching still works (each panelist generates their own quote card)
- The pasted-to-X version still works (existing clipboard copy)

- [ ] **Step 4: Commit**

```bash
cd ~/the-fishbowl && git add components/results/QuoteCard.tsx && git commit -m "Refresh quote share card as brass aquarium plate"
```

---

## Phase 4 — Tier 3 Mechanical Sweep

### Task 8: Audit and kill remaining gold-glow hover halos

**Files:**
- Modify: any files revealed by grep below

- [ ] **Step 1: Find all gold-glow hover patterns**

Run:
```bash
cd ~/the-fishbowl && grep -rn "rgba(196,\s*154,\s*42,\s*0\." app/ components/ 2>/dev/null | grep -v ".next"
```

List every match. For each match, determine if it's:
- (a) A hover/active state on an interactive element → replace with the motion vocabulary
- (b) A non-hover decoration (e.g., subtle gold tint on a label background) → leave alone
- (c) An animation keyframe (e.g., `ctaGlow`) → flag for separate decision

- [ ] **Step 2: Replace category (a) with `.specimen-hover` class**

For each interactive surface with a soft glow hover state, either:
- Add the `specimen-hover` class to its JSX (and set `--brass-accent` via inline style), removing the bespoke `:hover` glow rule from globals.css
- Or, if the surface needs a unique hover color, replace the box-shadow line in globals.css directly:

```css
/* Before */
.some-card:hover {
  box-shadow: 0 0 0 1px var(--accent-gold), 0 8px 24px rgba(196, 154, 42, 0.15), 0 0 40px rgba(196, 154, 42, 0.08);
}

/* After */
.some-card {
  transition: transform 0.08s ease, box-shadow 0.08s ease;
}
.some-card:hover {
  transform: translate(-2px, -2px);
  box-shadow: 4px 4px 0 var(--accent-gold);
}
.some-card:active {
  transform: translate(0, 0);
  box-shadow: 0 0 0 transparent;
}
```

- [ ] **Step 3: Verify the sweep**

Run again:
```bash
cd ~/the-fishbowl && grep -rn "rgba(196,\s*154,\s*42,\s*0\." app/ components/ 2>/dev/null | grep -v ".next"
```

Expected: only matches that were intentionally kept (animation keyframes like `ctaGlow`, or non-hover decorations).

- [ ] **Step 4: Commit**

```bash
cd ~/the-fishbowl && git add -u && git commit -m "Replace gold-glow hover halos with pixel-shadow motion"
```

---

### Task 9: Kill 90deg gradient accent strips

**Files:**
- Modify: any files revealed by grep below

- [ ] **Step 1: Find all 90deg gradient strips**

Run:
```bash
cd ~/the-fishbowl && grep -rn "linear-gradient(90deg" app/ components/ 2>/dev/null | grep -v ".next"
```

- [ ] **Step 2: Per file, replace each `linear-gradient(90deg, ...)` with the appropriate Specimen primitive**

For each match:
- If it's a header accent strip on a card → already replaced by Phase 2 tasks. Confirm by re-grepping.
- If it's a button background gradient → replace with a flat `var(--accent-gold)` background.
- If it's a divider rule → replace with a solid 1px line.
- If it's an animation effect (e.g., shimmer) → leave alone, flag for separate review.

- [ ] **Step 3: Verify the sweep**

Run again:
```bash
cd ~/the-fishbowl && grep -rn "linear-gradient(90deg" app/ components/ 2>/dev/null | grep -v ".next"
```

Expected: only intentional uses (animation, illustrative gradients, etc.).

- [ ] **Step 4: Commit**

```bash
cd ~/the-fishbowl && git add -u && git commit -m "Strip 90deg accent gradient bars across components"
```

---

### Task 10: Kill tinted-chip role badges

**Files:**
- Modify: any files revealed by grep below

- [ ] **Step 1: Find all tinted-chip patterns**

Run these two greps:
```bash
cd ~/the-fishbowl && grep -rn "+ '18'\|+ '10'\|+ '20'\|+ '30'" app/ components/ 2>/dev/null | grep -v ".next"
cd ~/the-fishbowl && grep -rn "role-badge\|character-card .*badge" app/ components/ 2>/dev/null | grep -v ".next"
```

- [ ] **Step 2: For each chip, replace with colored text or label-maker tag**

The default replacement (on dark surfaces) is:

```jsx
{/* Before */}
<div
  className="role-badge"
  style={{
    backgroundColor: color + '18',
    color: color,
    border: `1px solid ${color}30`,
  }}
>
  {role}
</div>

{/* After */}
<div
  style={{
    color,
    fontFamily: "'DM Mono', monospace",
    fontSize: '10px',
    letterSpacing: '0.14em',
    textTransform: 'uppercase',
  }}
>
  {role}
</div>
```

Phase 2 tasks already handled the most prominent cases — this task catches the stragglers.

- [ ] **Step 3: Re-grep to confirm**

```bash
cd ~/the-fishbowl && grep -rn "+ '18'\|+ '10'\|+ '20'\|+ '30'" app/ components/ 2>/dev/null | grep -v ".next"
```

Expected: only intentional uses (e.g., the existing semitransparent overlay on the active "Edit Prompt" state in the panel card footer, which is `rgba(196, 154, 42, 0.1)` and represents an active toggle, not a role badge).

- [ ] **Step 4: Commit**

```bash
cd ~/the-fishbowl && git add -u && git commit -m "Replace tinted-chip role badges with plain colored caps"
```

---

### Task 11: Constrain Silkscreen usage

**Files:**
- Modify: any files revealed by grep below

- [ ] **Step 1: Find all Silkscreen usages**

Run:
```bash
cd ~/the-fishbowl && grep -rn "Silkscreen" app/ components/ 2>/dev/null | grep -v ".next" | grep -v ".css"
```

- [ ] **Step 2: For each use, determine if it's allowed**

Allowed buckets (keep Silkscreen):
- Panelist names (e.g., `<div className="character-nameplate">VICTORIA</div>`)
- The brand wordmark "THE FISHBOWL"
- Brass-plate marker letter (single-char specimen initial)
- One signature label per surface (e.g., "▸ ASSEMBLE PANEL" footer)
- Results section headlines ("THE CONSENSUS")
- The marquee letters on the homepage hero

Not allowed (replace with DM Mono caps + letter-spacing):
- General-purpose buttons
- Metadata labels
- Navigation chrome
- Empty-state text
- Status indicators

- [ ] **Step 3: Replace each disallowed use**

Pattern:
```jsx
{/* Before */}
<span style={{ fontFamily: "'Silkscreen', monospace", fontSize: '10px' }}>OPTION</span>

{/* After */}
<span style={{
  fontFamily: "'DM Mono', monospace",
  fontSize: '10px',
  letterSpacing: '0.16em',
  textTransform: 'uppercase',
}}>OPTION</span>
```

- [ ] **Step 4: Visual verification**

Open `http://localhost:3001/setup`, `/session` (start one), and `/results` (or any reachable test path). Confirm Silkscreen now reads as a signature font reserved for names and headlines, not as the default font for everything.

- [ ] **Step 5: Commit**

```bash
cd ~/the-fishbowl && git add -u && git commit -m "Constrain Silkscreen to names and signature labels"
```

---

### Task 12: Apply Specimen-voice copy on signature moments

**Files:**
- Modify: setup, briefing, results components for label strings

- [ ] **Step 1: Audit existing copy**

For each of these strings, find them via grep and update only on signature surfaces. Don't touch them on transient UI like error messages, loaders, or build-system strings.

Mapping (find → replace):
- "Drop files here" → "Drop evidence here" (mission briefing only)
- "Up to 3 files" → "Up to 3 specimens" (mission briefing only)
- "Remove" button on panel cards → "Release" (panel card only — handled in Task 2 already, double-check)
- "Edit prompt" button on panel cards → "▸ Annotate" (panel card only — handled in Task 2)
- "Assemble" → "Assemble panel" on template select buttons (handled in Task 3)
- Empty state "No panelists yet" → "No specimens in the bowl" (only if it exists in a setup empty-state component)

For each, run a quick grep to find any remaining instances. Replace only on the listed surfaces.

- [ ] **Step 2: Visual verification**

Walk through `/setup` → `/session` intro → `/results` and confirm the specimen voice shows up only on the surfaces in scope.

- [ ] **Step 3: Commit**

```bash
cd ~/the-fishbowl && git add -u && git commit -m "Apply Specimen-voice copy on signature moments"
```

---

## Phase 5 — Light Theme + Mobile Parity

### Task 13: Verify light theme renders correctly across all refreshed surfaces

**Files:**
- Modify: `app/globals.css` — add any missing `[data-theme="light"]` overrides

- [ ] **Step 1: Toggle light theme and audit each refreshed surface**

In the running app, click the sun/moon theme toggle to switch to light mode. Walk through:
- `/setup` (panel cards, template picker, mission briefing)
- `/session` intro overlay
- `/results` modules + quote card

For each surface, note any contrast / color issues — typical problems:
- Brass plate gradient too dark for light theme (Task 1 already added the cream override)
- Pixel-frame border colors muddy
- DM Mono caps text too pale to read on cream
- Dashed dividers invisible

- [ ] **Step 2: Add missing overrides to globals.css**

For each issue, add the appropriate `[data-theme="light"]` selector with a corrected value. Stay within the existing palette tokens; don't introduce new colors.

- [ ] **Step 3: Re-audit**

Re-walk all surfaces in light mode. Confirm everything readable and on-brand.

- [ ] **Step 4: Commit**

```bash
cd ~/the-fishbowl && git add app/globals.css && git commit -m "Light theme parity for Specimen Tag surfaces"
```

---

### Task 14: Mobile-breakpoint pass

**Files:**
- Modify: `app/globals.css` — `@media (max-width: 640px)` rules for the new primitives

- [ ] **Step 1: Test each surface at 375px width**

Open Chrome dev tools, set viewport to 375×667 (iPhone SE). Walk through `/setup` and `/results`. Identify any breakage in:
- Brass plate label overflow (the catalog string is the longest single-line element)
- Inhabitant row in template cards (4 mini-portraits — should still fit)
- Quote card preview (large — confirm it gracefully scales)

- [ ] **Step 2: Add mobile overrides in globals.css**

Tighten padding on `.specimen-card` and `.brass-plate` at mobile breakpoints:

```css
@media (max-width: 640px) {
  .brass-plate {
    padding: 5px 8px;
    gap: 6px;
  }
  .brass-label {
    font-size: 8px;
    letter-spacing: 0.14em;
  }
  .brass-screw {
    width: 3px;
    height: 3px;
  }
}
```

If the brass label still overflows, abbreviate the long catalog strings: `OBSERVATION REQUEST · 01` → `OBS. REQUEST · 01` on `<640px`. Implementation: add a class on the inner span to toggle a shorter text variant via CSS `content`, or use Tailwind's responsive hidden classes to swap two `<span>`s.

- [ ] **Step 3: Re-test on 375px**

Confirm all surfaces render cleanly.

- [ ] **Step 4: Commit**

```bash
cd ~/the-fishbowl && git add app/globals.css components/setup/IdeaInput.tsx && git commit -m "Mobile breakpoint tightening for Specimen Tag surfaces"
```

---

## Self-Review Output

After writing this plan, I checked it against the spec:

**Spec coverage check:**
- Tier 1 (Panel card, Template picker, Mission Briefing) → Tasks 2, 3, 4 ✓
- Tier 2 (Live-session briefing, Quote card, Results headers) → Tasks 5, 7, 6 ✓
- Tier 3 mechanical sweeps (gold glow, gradient strips, tinted chips, Silkscreen, specimen-voice copy) → Tasks 8, 9, 10, 11, 12 ✓
- Design language vocabulary (brass plate, pixel frame, motion, etc.) → Task 1 ✓
- Light theme + mobile parity → Tasks 13, 14 ✓
- "What stays untouched" constraints respected → no tasks touch PixiJS scene, sprites, /about, homepage ✓

**Placeholder scan:** Two intentional "Note for the engineer" callouts in Tasks 3 and 7 where data shape uncertainty requires the implementer to verify against the codebase before coding. These are honest "you need to check this" notes, not placeholders for missing design.

**Type consistency:** Class names (`specimen-card`, `specimen-hover`, `brass-plate`, `brass-screw`, `brass-label`, `brass-marker`, `pixel-frame`, `dashed-divider`) used consistently across tasks. CSS variable name (`--brass-accent`) used consistently.

Plan is ready.
