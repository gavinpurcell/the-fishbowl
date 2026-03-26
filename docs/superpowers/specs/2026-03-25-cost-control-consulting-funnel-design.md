# The Fishbowl — Cost Control & Consulting Funnel

**Date:** 2026-03-25
**Status:** Draft

## Problem

The Fishbowl costs $0.15–0.50 per session (Sonnet 4.6). With AI For Humans episodes reaching 10K+ listeners and content going viral on X, an unprotected hosted demo could easily rack up $500–1000 in API costs from a single spike. There's also no mechanism to capture leads for Gavin's consulting work — the results page currently just offers "New Session" with no next step.

## Goals

1. **Cap API spend** so costs stay within ~$100–200/month, with a hard daily ceiling
2. **Capture consulting leads** at the moment of peak engagement (right after a session)
3. **Open-source the repo** so developers can self-host with their own API key, offloading cost
4. **Zero auth, zero friction** for the hosted demo — decision-makers, AI company folks, and podcast listeners should never hit a login wall

## Target Audience

- B-level decision-makers (marketing leads, content leads) who see Fishbowl and think "we need this person's AI expertise on our team"
- Conference organizers / corporate training buyers who see it as proof Gavin can make AI accessible
- AI company people (Anthropic, OpenAI) — cool factor
- AI For Humans listeners who want to try the thing Gavin mentioned
- Distribution is primarily targeted: X posts, AI4H mentions, direct shares. But viral spikes are realistic.

## Design

### 1. IP-Based Rate Limiting

**3 sessions per IP per day.** Tracked server-side.

- Store session counts in Redis (Upstash — same provider as ai4h-site) with keys like `rate:{ip}` and a 24-hour TTL
- Check rate limit in the `/api/llm` route before proxying to Claude
- When limit hit: return a `429` response. Client shows a friendly message: "You've used your free sessions for today. Come back tomorrow, or run your own instance from GitHub."
- The "run your own instance" link goes to the GitHub repo — converts rate-limited users into self-hosters instead of losing them

**Why IP and not fingerprinting or cookies:** Simple, server-side, not trivially bypassed by clearing localStorage. Not bulletproof (VPNs, shared IPs), but good enough for the threat model. We're preventing casual overuse, not determined attackers.

### 2. Daily Spend Cap

**$50/day to start.** Configurable via environment variable (`DAILY_SPEND_CAP`).

- Track daily token spend in Redis with key `spend:{YYYY-MM-DD}` and 48-hour TTL
- After each successful Claude API response, increment the spend counter using the response's `usage.input_tokens` and `usage.output_tokens` multiplied by the Sonnet 4.6 rates ($3/M input, $15/M output)
- Before each request, check if daily spend has exceeded the cap
- When cap hit: return a `503` response. Client shows: "The Fishbowl is at capacity for today. Try again tomorrow, or run your own instance." with GitHub link
- Monthly worst case at $50/day: $1,500 (but realistically, most days will be $5–20)
- Easy to bump the cap up via env var if Fishbowl is clearly driving consulting conversations

**Why daily and not monthly:** A daily cap limits blast radius from a single viral moment. A $50 spike on one day is fine; $500 in one afternoon because a tweet blew up is not.

### 3. Consulting Lead Capture Popup

**Appears on the results page before the summary is visible.** Modal overlay, not a page gate.

#### Content:
- Heading: **"I build AI experiences like this."**
- Body: "I help companies and teams see how AI actually works — and get the most out of it. If what you just experienced was interesting, let's talk."
- **Email input field** with placeholder "your@email.com"
- **"Get in Touch" button** (primary, prominent) — submits the email
- **"Just Give Me The Results" button** (secondary, understated) — dismisses the popup, no email required
- After email submit: brief "Thanks — I'll be in touch" confirmation, then auto-dismiss to results

#### Behavior:
- Shows once per user (localStorage flag: `fishbowl-lead-shown`)
- If dismissed or submitted, never shows again on that browser
- Does NOT block access to results — "Just Give Me The Results" is always available
- Email stored in Redis list (`leads` key) with timestamp. Simple, no user table needed.
- Optional: also fire the email to Gavin via the existing Formspree endpoint (same one used on gavinpurcell.com contact form) so he gets a notification

#### Design:
- Matches existing Fishbowl dark mode aesthetic (dark card, gold accents, Silkscreen headings)
- Modal centered on screen with subtle backdrop blur
- Email input is large and obvious
- "Get in Touch" button is gold, same style as other Fishbowl CTAs
- "Just Give Me The Results" is text-only, smaller, below the primary button

### 4. Open-Source the Repo

**License: AGPL-3.0** — open source but requires anyone hosting a modified version to publish their source. Effectively prevents "I'll take this and run a competing SaaS" without blocking personal/educational use.

#### What this involves:
- Add `LICENSE` file (AGPL-3.0 text)
- Update `README.md` with:
  - What it is (one paragraph)
  - Live demo link
  - Self-hosting instructions: clone, `npm install`, add `.env.local` with `ANTHROPIC_API_KEY`, `npm run dev`
  - Note about Redis being optional (only needed for rate limiting / spend cap on hosted version)
  - Screenshots (Gavin still needs to capture these)
  - Credit: "Built by Gavin Purcell" with links to gavinpurcell.com and AI For Humans
- Make the GitHub repo public
- Ensure `.env.local` is in `.gitignore` (it already is)
- The Redis/rate-limit/spend-cap features should gracefully no-op when `REDIS_URL` is not set (self-hosters don't need them)

### 5. Redis Integration

**Provider: Upstash Redis** (via Vercel Marketplace, same as ai4h-site).

Keys:
- `rate:{ip}` — integer, TTL 86400s (24h). Incremented per session start.
- `spend:{YYYY-MM-DD}` — float (dollars), TTL 172800s (48h). Incremented per API response.
- `leads` — Redis list. Each entry: `{email, timestamp, ideaText}` as JSON string.

All Redis operations are best-effort: if Redis is down or unconfigured, requests proceed without rate limiting or spend tracking. The app should never fail because of Redis.

### 6. Environment Variables (New)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `REDIS_URL` | No | — | Upstash Redis URL. If unset, rate limiting and spend cap are disabled. |
| `DAILY_SPEND_CAP` | No | `50` | Max daily API spend in USD before new sessions are blocked. |
| `DAILY_SESSION_LIMIT` | No | `3` | Max sessions per IP per day. |

### 7. Footer / Attribution Update

The existing footer says "Built by Gavin Purcell, a human" with a link to gavinpurcell.com and "and Claude, an AI" linking to claude.ai.

**Add:** A small "View Source" or GitHub icon link to the repo, reinforcing the open-source angle.

## What This Does NOT Include

- **User accounts / OAuth** — not needed for the threat model or funnel
- **Session persistence / history** — still stateless, no saved sessions
- **Payment / paid tier** — premature; revisit if Fishbowl generates real consulting pipeline
- **Email marketing automation** — just capture and notify for now, no drip campaigns
- **Analytics beyond cost tracking** — Vercel Web Analytics is already installed for traffic

## Files Likely Affected

- `app/api/llm/route.ts` — rate limit check, spend tracking, Redis integration
- `app/results/page.tsx` — lead capture popup
- `components/results/LeadCapturePopup.tsx` — new component
- `lib/redis.ts` — new, Redis client + helper functions
- `LICENSE` — new, AGPL-3.0
- `README.md` — rewrite with self-hosting instructions
- `.env.local` / `.env.example` — new env vars documented
- `package.json` — add `@upstash/redis` dependency

## Success Criteria

- Daily spend never exceeds the configured cap
- A viral X post drives 500 users and costs stay under $50
- Consulting leads appear in Redis / Gavin's inbox
- Self-hosters can clone and run with just an Anthropic key
- Zero friction for the hosted demo — no login, no signup, no paywall
