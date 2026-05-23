# Specimen Tag — Design Refresh Spec

**Date:** 2026-05-22
**Status:** Design approved, ready for implementation plan
**Scope:** Card-style surfaces across `/setup`, `/session` intro overlays, `/results`, plus global cleanup of repeating AI-tell patterns
**Out of scope:** PixiJS scene, sprites, speech bubbles, the live roundtable visualization itself

## Goal

Remove the "AI-built app" visual tells across the product without abandoning the existing pixel-warm identity. Replace generic SaaS card patterns (gradient accent strips, tinted-chip badges, gold glow halos, Silkscreen-overuse) with a coherent **Specimen Tag** design language that is brand-native to The Fishbowl.

Every refreshed surface should read as part of one product. The pixel scene and the chrome around it should both feel deliberately *Fishbowl*, not "well-executed retro UI."

## Design Language: Specimen Tag

The product is called The Fishbowl. The new card language treats every framed surface as a catalogued specimen plate — like the brass ID plates on an aquarium tank. Tongue-in-cheek, brand-native, and the visual gag rewards the user once they get it.

### Visual vocabulary (the recurring motifs that bind surfaces together)

1. **Brass plate header.** Top strip on every framed surface.
   - `background: linear-gradient(180deg, #2a2422 0%, #1c1918 100%)` — reads as metal, NOT as an "AI accent strip"
   - `padding: 6px 10px` on small surfaces, scale up proportionally for larger ones
   - Inside: small screw dot, center label in DM Mono caps with `letter-spacing: 0.18em`, marker on the right (single Silkscreen letter or sequence number), small screw dot
   - `border-bottom: 2px solid var(--accent)` — this is where the per-surface color shows up

2. **Specimen number.** Every framed thing gets a catalog identifier.
   - Format: `SPECIMEN · 01 / 04` (panel cards), `EXHIBIT · 01` (templates), `OBSERVATION REQUEST · 01` (briefing), `NOW IN THE FISHBOWL · 01 / 04` (live intro), `FROM THE FISHBOWL · № 047` (quote card), `FINDINGS · DEBRIEF` (results summary), `FIELD LOG · FULL TRANSCRIPT` (transcript)
   - DM Mono, `font-size: 9px` (small surfaces) to `14px` (quote card), `letter-spacing: 0.18em-0.22em`, color `#8a8278`

3. **Pixel-frame portrait.** Portrait sprite wrapped in a solid 3px color border, no rounding.
   ```jsx
   <div style={{ padding: '3px', background: color }}>
     <Image src={...} className="sprite" />
   </div>
   ```
   Replaces both the rounded portrait border AND the gradient strip — the color now lives on the portrait frame and the brass-plate bottom rule, and nowhere else.

4. **Color as signal, not decoration.** The character's color appears in exactly three places per surface:
   - The 2px rule under the brass plate
   - The pixel frame around the portrait
   - The role/genus label text
   No tinted-chip backgrounds. No gradient strips. No glow halos. If the color isn't carrying signal, it isn't there.

5. **Dashed file-folder dividers.** Internal section breaks use `border-top: 1px dashed #524a44`. Reads as "filed document" rather than "default UI rule."

6. **Specimen-voice copy.** Light, restrained, on signature moments only:
   - "ANNOTATE" / "RELEASE" (panel card actions)
   - "ASSEMBLE PANEL" (template select)
   - "OBSERVATION REQUEST" (mission briefing header)
   - "EVIDENCE" (file uploads)
   - "Genus:" / "Native habitat:" (role and bio framing on panel cards)
   - "FINDINGS · DEBRIEF" / "FIELD LOG" (results section headers)
   Don't touch error messages, technical strings, or anything where being plain matters more than being clever.

### Motion vocabulary

Replaces the "soft gold glow hover" AI tell with tactile pixel motion.

```css
.surf:hover {
  transform: translate(-2px, -2px);
  box-shadow: 4px 4px 0 var(--accent);
  transition: transform 0.08s ease, box-shadow 0.08s ease;
}
.surf:active {
  transform: translate(0, 0);
  box-shadow: 0 0 0 transparent;
}
```

Pixel-honest. No `rgba(196, 154, 42, 0.x)` soft halos anywhere.

### Typography rules

Constrain Silkscreen without abandoning it. Allowed uses going forward:

- Panelist names
- The brand wordmark ("THE FISHBOWL")
- The brass-plate marker letter (single-char specimen initial)
- One signature label per surface ("▸ ASSEMBLE PANEL")
- Section headlines on results ("THE CONSENSUS")

Everything else currently in Silkscreen becomes **DM Mono caps** with `letter-spacing: 0.14-0.18em`. Removes the "pixel font everywhere" tell without losing the signature.

No new fonts added. (Specifically *not* re-introducing the editorial serif from the May 13 rejected refresh.)

## Surface-by-Surface Specifications

### Tier 1 — Visible card surfaces

#### Surface A · Panel card
**Component:** `components/setup/PanelistBuilder.tsx`
**Current state:** Rounded card with `.character-card-border` gradient strip at top, tinted-chip role badge using `color + '18'` background / `color + '30'` border.

**Refreshed:**
- Wrapper: `background: var(--bg-card)`, `border: 1px solid #2a2422`, no border-radius
- Header: brass plate strip with screws, label `SPECIMEN · NN / 04`, marker = first letter of name in Silkscreen, 2px solid color rule below
- Body: pixel-frame portrait (3px solid color border), name in Silkscreen, role as "Genus: [role]" in DM Mono caps in the character's color (no chip background)
- Description: `font-size: 10-11px`, color `#8a8278`, line-clamp 2
- Footer divider: `border-top: 1px dashed #524a44`
- Actions: "▸ ANNOTATE" (gold) on left, "RELEASE" (muted) on right, both DM Mono caps `9px`, `letter-spacing: 0.1em`
- Hover: pixel-shadow per motion vocabulary

#### Surface B · Template picker card
**Component:** `components/setup/TemplatePicker.tsx`
**Current state:** Card with `.template-card-accent` gradient strip and `:hover` gold glow.

**Refreshed:**
- Same wrapper + brass plate header pattern, label `EXHIBIT · NN`, marker = `★` for featured / empty for others
- Body: large template name in Silkscreen `14px`, "4 specimens · [theme]" in DM Mono caps below
- Mini description paragraph
- **Inhabitant row:** four 28×28 mini-portraits, each with a 2px solid color border matching the panelist's accent. Visual at-a-glance of the panel composition.
- Footer: "▸ ASSEMBLE PANEL" in Silkscreen `9px`, gold
- Hover: pixel-shadow per motion vocabulary

#### Surface C · Mission Briefing
**Component:** `components/setup/IdeaInput.tsx`
**Current state:** Card with gold gradient strip header and "YOUR IDEA" pixel label.

**Refreshed:**
- Brass plate header, label `OBSERVATION REQUEST · 01`, right marker `DRAFT` or `READY` in DM Mono `8px`
- Textarea section: DM Mono caps section label "▸ The subject" in gold, then the textarea (unchanged structure, dashed border, `background: #14110f`)
- Files section: separated by dashed border-top, label "▸ Evidence (optional)", helper text "Submit .pdf, .md, or .txt — up to 3 specimens", same browse/drop UX
- Char count: same position, same warn threshold
- File row flash: keep the gold flash animation already shipped

### Tier 2 — Adjacent surfaces

#### Surface D · Live-session briefing card
**Component:** `components/scene/IntroOverlay.tsx` (or equivalent per-panelist intro card during the broadcast transition)
**Current state:** Chunky colored card during the on-air panelist intro.

**Refreshed:**
- Same Specimen language at session-scale: brass plate label `NOW IN THE FISHBOWL · NN / 04`, right marker `LIVE` in Silkscreen + character accent color
- Larger pixel-frame portrait (72×72), name in Silkscreen `16px`, role in DM Mono caps in character color
- Short bio paragraph in `#8a8278`

#### Surface E · Quote share card (the share asset)
**Component:** `components/results/QuoteCard.tsx`
**Current state:** Canvas-rendered 1200×630 with dark background, character portrait in gold circle, quote text.

**Refreshed:**
- Full Specimen language at OG-card scale
- Brass plate header running full width: large screws (8px), center label `FROM THE FISHBOWL` in DM Mono caps `14px` `letter-spacing: 0.22em`, right marker `№ 047` (catalog number) in Silkscreen
- 2-column body grid (200px portrait column + flexible quote column)
- Left: pixel-frame portrait (4px frame, full square), name in Silkscreen 18px under it, role in DM Mono caps
- Right: large open-quote glyph in Silkscreen gold, quote text in Outfit 22px (the only Outfit-heavy surface — quote needs the readability)
- Bottom strip: dashed divider, left = "Observation Request: [topic]" in DM Mono caps, right = "fishbowl.show" in gold DM Mono caps
- Subtle scanlines overlay across the whole card (`repeating-linear-gradient` 1-2% white)

#### Surface F · Results module headers
**Components:** `components/results/Summary.tsx`, `components/results/Transcript.tsx`, `components/results/ExportPanel.tsx`
**Current state:** Pill-style tabs and module containers.

**Refreshed:**
- Each module gets a brass plate header
- Summary: `FINDINGS · DEBRIEF`, right marker `04 SPECIMENS` (panelist count)
- Transcript: `FIELD LOG · FULL TRANSCRIPT`, right marker `42 ENTRIES`
- Export: `EXPORT · ARCHIVE`, right marker file format icons
- Section sub-headers inside modules ("THE CONSENSUS", per-panelist quote labels) stay Silkscreen — that's an allowed use

### Tier 3 — Global cleanup (mechanical sweep)

#### Rule 1 — Replace all gold-glow hover with pixel-shadow
- Search: any `box-shadow` containing `rgba(196, 154, 42` or `rgba(0, 0, 0, 0.x)` with `blur > 0` on interactive surfaces
- Replace with motion vocabulary pattern above
- Surfaces: panel cards, template cards, briefing card, every CTA button, quote-card tab buttons

#### Rule 2 — Kill 90deg gradient accent strips
- Search: `linear-gradient(90deg, var(--accent-gold)...)` and `linear-gradient(90deg, ...color...)` patterns
- Replace with the brass plate header pattern (vertical `180deg` brass + solid color rule)
- Surfaces: `.template-card-accent`, `.character-card-border`, mission briefing header bar, any other found

#### Rule 3 — Kill tinted-chip role badges
- Search: `backgroundColor: ` patterns matching `color + '18'` / `color + '10'` and `border: ... + '30'` / `'20'`
- Replace per surface context:
  - Dark surfaces: plain colored text in DM Mono caps, no fill
  - Light/inverted surfaces: black label-maker tag `background: #1a1714` with colored text

#### Rule 4 — Constrain Silkscreen
- Audit all `font-family: 'Silkscreen'` usages
- For each, check if it falls into an allowed bucket (names, brand wordmark, brass-plate marker letter, one signature label, results section headlines)
- If not, replace with DM Mono caps + appropriate letter-spacing

#### Rule 5 — Apply Specimen-voice copy
- Touch the strings listed in Design Language section
- Skip error messages, technical strings, anything where plainness wins

## What Stays Untouched

- PixiJS scene (Room, Character, SpeechBubble, FishbowlScene, TitleScene)
- Sprite assets
- Speech bubbles / RPG dialog boxes
- Roundtable layout
- The session orchestrator and conversation engine
- Hosted-mode security gates, Redis rate limiting, capacity gate
- The `/api/llm`, `/api/claude-code`, `/api/capacity` routes
- Onboarding tour (currently disabled — leave alone)
- `/about` page — uses some sibling patterns (`grep` flagged it) but was not part of the approved Tier 1/2/3 scope. Out of scope for this refresh.
- Homepage / title scene — out of scope (the rejected May 13 refresh attempted this surface and Gavin pulled back; this refresh deliberately stays away from it)

## Constraints

- **No new fonts.** Specifically not re-introducing the editorial serif from the rejected May 13 refresh.
- **No new dependencies.** Everything achievable with existing CSS + React.
- **Light theme parity.** Every Specimen surface must also work in the light/cream theme via existing `[data-theme="light"]` overrides. The brass plate becomes a printed-paper plate (`linear-gradient(180deg, #ebe5d8, #faf6f0)`) in light mode.
- **Mobile parity.** Brass plate scales down (smaller screws, tighter padding) but the language stays consistent at mobile breakpoints.
- **`prefers-reduced-motion`.** All hover transforms wrapped in a media query that disables transform/shadow for users who set the preference.
- **Existing animations preserved.** `animate-card-pop`, `stagger-N`, file-row gold flash all keep working.

## Success Criteria

- A user landing on `/setup` for the first time should immediately see a product that does not read as "another AI app." The brass plates and specimen language should be the first thing that registers, before the pixel art.
- A user who shares a quote card on X should produce an image that is unmistakably from The Fishbowl when scrolling a timeline.
- Every refreshed surface should feel like the same product. If you screenshot a panel card and a results-page module header side by side, they should share the same DNA.
- No surface in the refreshed scope should retain any of the four AI tells flagged in Section 1 of brainstorming: gradient strips, tinted-chip badges, soft gold glow hover, Silkscreen-overuse.

## Open Questions for Implementation Plan

These don't block the spec but should be resolved during planning:

1. **Quote card canvas rendering.** Current QuoteCard uses canvas API. Either port the new design to canvas (more work, faithful to the spec) or render the brass-plated card as DOM and use `html2canvas`/equivalent (lighter, possibly less crisp). Recommend canvas for fidelity.
2. **Per-template accent color.** Templates currently don't have an explicit color — they use a gold default. Either assign each Exhibit a curated accent color or keep them all gold and let the inhabitant portrait borders carry the variety. Recommend the latter (less arbitrary).
3. **Specimen voice copy review.** Several proposed strings ("ANNOTATE", "RELEASE", "Native habitat:", etc.) should get a final pass for tone before shipping. Gavin makes the call per-string at implementation time.
4. **Onboarding tour.** Currently disabled. If re-enabled later, it needs Specimen treatment — but out of scope for this refresh.
