# The Fishbowl — Dev Review Brief

**Live:** [fishbowl.show](https://fishbowl.show)
**Repo:** [github.com/gavinpurcell/the-fishbowl](https://github.com/gavinpurcell/the-fishbowl)
**Goal:** Ship this publicly this week. Looking for a second pair of eyes before it goes out.

---

## What It Is

AI focus group simulator. Users pick a panel of AI expert personas, pitch an idea, and watch the panelists debate it in a live PixiJS pixel-art scene. Think AI Town meets usability testing.

The hosted version at fishbowl.show runs on Gavin's Anthropic API key (Sonnet 4.6). Self-hosters bring their own key.

## Stack

- Next.js 16, App Router, React 19, TypeScript
- PixiJS 8 (800x450 canvas — characters, speech bubbles, animations)
- Zustand (sessionStorage persistence)
- Tailwind CSS v4
- Upstash Redis (rate limiting, spend cap, lead capture)
- Deployed on Vercel, auto-deploys from `main`

## Architecture at a Glance

```
/setup          → pick template, build panelists, write idea, upload files
/session        → PixiJS scene, streaming LLM responses, spacebar pacing
/results        → summary, transcript, PDF export, quote cards, lead capture
/demo           → pre-recorded session, no API calls
/about          → "Why I Made This" editorial page
/capacity       → shown when daily budget is exhausted
/api/llm        → edge proxy to Anthropic API (streaming + usage tracking)
/api/capacity   → pre-session check (spend cap + rate limit)
/api/lead       → email capture → Redis
/api/claude-code → local CLI provider (disabled in hosted/Vercel deploys)
```

## What to Look At

### Security / Abuse Surface

The main risk is the `/api/llm` route — it's an edge function that proxies to Anthropic with Gavin's API key. Current protections:

- Origin checking
- Input validation (message count, size, total payload caps)
- Model allowlist (only 3 Claude models accepted)
- In hosted mode, client-supplied API keys are ignored (server key only)
- Rate limiting: 3 sessions/IP/day via Redis sets
- Daily spend cap: $100 (configurable via `DAILY_SPEND_CAP` env var)
- Spend tracking: real token counts from streaming responses, recorded to Redis
- Error messages sanitized (no API keys leaked)
- Security headers: Referrer-Policy, X-Content-Type-Options, Permissions-Policy
- `/api/claude-code` disabled on hosted/Vercel deployments

**Things I'd want a second opinion on:**
- Is the origin check sufficient? It allows requests with no Origin header (for non-browser clients).
- Rate limiting is per-IP — trivially bypassable with VPN/proxy. Is that OK for a portfolio piece?
- The edge function timeout is 30s on Vercel free tier. Streaming responses handle this, but summary generation can be slow.

### State Management

All session state lives in Zustand with sessionStorage persistence. No server-side session storage. If you close the tab, the session is gone. This is intentional — no accounts, no database, zero friction.

### Conversation Engine

`engine/conversation.ts` is the orchestrator. Key design:
- NOT a multi-agent swarm — sequential calls to the same LLM with different system prompts
- Each panelist's response includes the full transcript so far (shared context)
- Retry logic: 2 retries with exponential backoff for 429/503/timeout
- Graceful degradation: single panelist failure → skip + continue. 3+ consecutive failures → abort session.
- Prefetching: initial takes generated in parallel during intro animation

### Known Issues / Rough Edges

- **React Strict Mode disabled** — the PixiJS + async flow + refs don't play well with double-mounting. `reactStrictMode: false` in next.config.ts.
- **OpenAI and Ollama providers** — stub code exists in `providers/` but isn't fully tested or advertised.
- **No image support in prompts** — everything is text-only. PDF text extraction works but scanned-image PDFs won't extract.
- **Character sprite flicker** — occasional visual flicker in PixiJS scene, throttled but not fully eliminated.
- **Video export** — WebM via MediaRecorder exists but is untested.
- **`UPSTASH_REDIS_REST_REDIS_URL`** — stale env var in Vercel from a Redis Cloud integration that was abandoned. Should be deleted.

### Recent Work (April 13)

Just finished a hardening pass:
- Security: API route hardening, npm audit clean, lint cleanup (19 errors → 0)
- Capacity gate: `/capacity` page when budget exhausted
- Lead capture wired to Redis (was localStorage-only)
- PDF upload support (pdfjs-dist)
- Mobile fixes: intro text overflow, wrap-up bubble pagination, moderation button clipping
- Image optimization: `public/` went from 104MB → 41MB (removed 31 unused backgrounds, PNG→JPEG conversion)
- About page: full copy rewrite, real images, links

### What I'm NOT Asking You to Review

- The pixel art / visual design (that's locked in)
- The copy on the about page (Gavin wrote it)
- Whether this is a good idea (it is, trust me)

### What I AM Asking

1. Anything in the security/abuse surface that's obviously wrong
2. Any deployment gotchas with the Vercel + edge runtime setup
3. React 19 / Next.js 16 patterns that look off
4. Anything that would embarrass Gavin if a senior engineer looked at the repo

---

*Built by Gavin Purcell and Claude. This brief was also written by Claude. It's Claudes all the way down.*
