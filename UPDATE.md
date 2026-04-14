# The Fishbowl Pre-Publish Update

Date: March 30, 2026

## What This Pass Covered

This was a pre-publish hardening and readiness review focused on:

- API security and abuse surface
- Secret handling
- dependency vulnerabilities
- build and lint health
- under-the-hood production readiness

This review explicitly treated Redis/rate limiting as a known separate workstream, per project direction.

## High-Level Outcome

The app is in noticeably better shape after this pass.

- `npm audit` is now clean
- the production build passes
- the highest-value API/security issues I found were fixed
- the biggest remaining launch risk is still the known lack of rate limiting on the LLM endpoint

Outside of that, the remaining issues are mostly code-health and React 19 lint cleanup rather than hidden critical security flaws.

## What I Found

### 1. Outdated Next.js Version With Active Advisories

The project was on `next 16.1.6`, and `npm audit` flagged active advisories against that version.

This was the biggest concrete security issue in the dependency tree.

### 2. `/api/llm` Was Too Open for a Hosted Public App

The LLM proxy route needed stronger guardrails.

Issues found:

- no origin check
- minimal validation on incoming messages
- hosted mode still accepted a client-supplied API key
- responses were not explicitly marked `no-store`

### 3. `/api/claude-code` Was the Higher-Risk Route

This route shells out to the local `claude` CLI via `child_process`.

Issues found:

- no strong validation on incoming requests
- no host/origin check
- it could still exist on hosted deployments
- error output could reveal more environment detail than necessary

For a self-hosted local workflow this is fine. For a public hosted app, it should not be available.

### 4. API Keys Were Persisted Too Durably in the Browser

The setup flow was storing provider API keys in `localStorage`.

That’s convenient, but it means keys can hang around longer than needed on the machine/browser profile. For a near-publish security pass, this was worth tightening.

### 5. Missing Basic Security Headers

There were no explicit baseline security headers configured in `next.config.ts`.

This is not a dramatic exploit by itself, but it is part of standard production hardening.

### 6. Lint Was Misleading

ESLint was crawling generated cache output from `.next_cache_*`, which made the report much noisier than the real codebase deserved.

That made it harder to tell what the actual remaining app issues were.

## What I Changed

### Dependency and Security Updates

Updated:

- `next` -> `16.2.1`
- `eslint-config-next` -> `16.2.1`

Then ran:

- `npm audit fix`

Result:

- `npm audit` now reports `0 vulnerabilities`

### Hardening for `/api/llm`

File:

- [`app/api/llm/route.ts`](/Users/gavinpurcell/the-fishbowl/app/api/llm/route.ts)

Changes made:

- added origin checking
- added request/message validation
- capped message count and message size
- capped total message payload size
- standardized JSON error responses
- added `Cache-Control: no-store`
- in hosted mode, the route now ignores client-supplied API keys and only uses the server-side Anthropic key

That last point matters because it prevents the hosted app from acting like a generic relay for arbitrary user-supplied keys.

### Hardening for `/api/claude-code`

File:

- [`app/api/claude-code/route.ts`](/Users/gavinpurcell/the-fishbowl/app/api/claude-code/route.ts)

Changes made:

- disabled the route on hosted/Vercel deployments
- added origin checking
- added request validation
- added model allowlisting
- added request size limits
- sanitized error output
- added `Cache-Control: no-store`

This is a meaningful improvement because it keeps the local CLI execution path local.

### Safer API Key Handling in the Browser

File:

- [`components/setup/ApiKeyConfig.tsx`](/Users/gavinpurcell/the-fishbowl/components/setup/ApiKeyConfig.tsx)

Changes made:

- removed ongoing `localStorage` persistence of API keys
- migrated and removed any legacy stored key
- updated copy to clarify keys are only kept in the current session/tab

This reduces the risk of stale keys hanging around in the browser after use.

### Added Baseline Security Headers

File:

- [`next.config.ts`](/Users/gavinpurcell/the-fishbowl/next.config.ts)

Added:

- `Referrer-Policy: strict-origin-when-cross-origin`
- `X-Content-Type-Options: nosniff`
- `Permissions-Policy: camera=(), microphone=(), geolocation=(), browsing-topics=()`

### Cleaned Up ESLint Ignore Behavior

File:

- [`eslint.config.mjs`](/Users/gavinpurcell/the-fishbowl/eslint.config.mjs)

Updated ignores so lint no longer crawls:

- `.next/**`
- `.next_cache_*/**`
- `.vercel/**`

That makes the lint report reflect the real app, not generated artifacts.

## Verification

### Dependency Audit

Command:

```bash
npm audit
```

Result:

- `0 vulnerabilities`

### Production Build

Command:

```bash
npm run build
```

Result:

- passes on `Next.js 16.2.1`

### Lint

Command:

```bash
npm run lint
```

Result:

- still failing
- now failing on real app code, not cache output

Current remaining lint total after cleanup:

- `18 errors`
- `18 warnings`

## What Still Needs Attention

### 1. No Rate Limiting on `/api/llm`

This remains the main real publish risk.

If the hosted site is public and server-funded, someone can still hit the route repeatedly and spend Anthropic credits.

This was already a known issue in the brief, and it remains true after this pass.

### 2. React 19 Purity / Ref / Effect Cleanup

The remaining lint issues are largely in this category.

Important files still needing cleanup:

- [`app/test/page.tsx`](/Users/gavinpurcell/the-fishbowl/app/test/page.tsx)
- [`app/demo/page.tsx`](/Users/gavinpurcell/the-fishbowl/app/demo/page.tsx)
- [`components/scene/LiveTranscript.tsx`](/Users/gavinpurcell/the-fishbowl/components/scene/LiveTranscript.tsx)
- [`components/scene/StatusBar.tsx`](/Users/gavinpurcell/the-fishbowl/components/scene/StatusBar.tsx)
- [`components/scene/TransitionOverlay.tsx`](/Users/gavinpurcell/the-fishbowl/components/scene/TransitionOverlay.tsx)
- [`components/ThemeToggle.tsx`](/Users/gavinpurcell/the-fishbowl/components/ThemeToggle.tsx)
- [`components/ActiveSessionBanner.tsx`](/Users/gavinpurcell/the-fishbowl/components/ActiveSessionBanner.tsx)
- [`components/setup/OnboardingTour.tsx`](/Users/gavinpurcell/the-fishbowl/components/setup/OnboardingTour.tsx)
- [`components/scene/IntroOverlay.tsx`](/Users/gavinpurcell/the-fishbowl/components/scene/IntroOverlay.tsx)
- [`components/results/Summary.tsx`](/Users/gavinpurcell/the-fishbowl/components/results/Summary.tsx)

These are not the same class of issue as the API/security risks, but they are worth fixing before calling the codebase fully launch-ready.

## Bottom Line

At the end of this pass:

- the dependency/security posture is substantially better
- the production build works
- the highest-value API issues were tightened
- browser-side API key handling is safer
- the hosted Claude Local shell route is no longer exposed

The one big known infrastructure gap still standing is rate limiting / abuse control on the LLM route.

Outside of that, the remaining work is mostly code-health cleanup, not hidden catastrophic security issues.

## Files Changed During This Pass

- [`app/api/llm/route.ts`](/Users/gavinpurcell/the-fishbowl/app/api/llm/route.ts)
- [`app/api/claude-code/route.ts`](/Users/gavinpurcell/the-fishbowl/app/api/claude-code/route.ts)
- [`components/setup/ApiKeyConfig.tsx`](/Users/gavinpurcell/the-fishbowl/components/setup/ApiKeyConfig.tsx)
- [`next.config.ts`](/Users/gavinpurcell/the-fishbowl/next.config.ts)
- [`eslint.config.mjs`](/Users/gavinpurcell/the-fishbowl/eslint.config.mjs)
- [`package.json`](/Users/gavinpurcell/the-fishbowl/package.json)
- [`package-lock.json`](/Users/gavinpurcell/the-fishbowl/package-lock.json)

---

# Hosted Security Follow-Up

Date: April 14, 2026

## Why This Pass Happened

After the pre-publish review, there were still two meaningful hosted-mode risks:

- the public `/api/llm` route could still be hit directly by non-browser clients without a real app session
- spend tracking assumed Sonnet pricing for all models, which would undercount cost if Opus was ever used

This pass tightened the hosted deployment path specifically for `fishbowl.show`.

## What Changed

### 1. Hosted Mode Is Now Sonnet-Only

File:

- [`app/api/llm/route.ts`](/Users/gavinpurcell/the-fishbowl/app/api/llm/route.ts)

Hosted requests now only accept:

- `claude-sonnet-4-6`

In hosted mode, the route rejects any other model ID even if the client tries to send one manually.

### 2. Hosted Sessions Must Start From `/setup`

Files:

- [`app/api/capacity/route.ts`](/Users/gavinpurcell/the-fishbowl/app/api/capacity/route.ts)
- [`lib/hostedSession.ts`](/Users/gavinpurcell/the-fishbowl/lib/hostedSession.ts)
- [`app/setup/page.tsx`](/Users/gavinpurcell/the-fishbowl/app/setup/page.tsx)
- [`lib/store.ts`](/Users/gavinpurcell/the-fishbowl/lib/store.ts)
- [`providers/claude.ts`](/Users/gavinpurcell/the-fishbowl/providers/claude.ts)
- [`providers/index.ts`](/Users/gavinpurcell/the-fishbowl/providers/index.ts)
- [`providers/types.ts`](/Users/gavinpurcell/the-fishbowl/providers/types.ts)
- [`app/session/page.tsx`](/Users/gavinpurcell/the-fishbowl/app/session/page.tsx)

Flow now:

1. `/setup` creates a fresh `sessionId`
2. it calls `/api/capacity?sessionId=...`
3. the server reserves the session slot in Redis
4. the server returns a signed hosted session token
5. that token is stored in session state and sent with all hosted `/api/llm` calls

The LLM route now rejects hosted requests unless they have:

- a real `sessionId`
- a valid signed hosted session token
- a same-origin browser `Origin` header

This closes the main “curl the paid endpoint directly” hole from the review.

### 3. Spend Tracking Now Uses Per-Model Pricing

File:

- [`lib/redis.ts`](/Users/gavinpurcell/the-fishbowl/lib/redis.ts)

`recordSpend()` now takes `modelId` and uses model-specific pricing for:

- Haiku 4.5
- Sonnet 4.6
- Opus 4.6

That makes the daily spend cap accounting honest even if someone later expands model use.

### 4. The Public `/test` Route Is Hidden In Hosted Mode

File:

- [`proxy.ts`](/Users/gavinpurcell/the-fishbowl/proxy.ts)

Hosted deployments now return `404` for `/test`.

This does not remove the route for local/dev work. It only keeps the public site cleaner and less surprising.

## Verification

Commands run:

```bash
npm run build
npm run lint
```

Results:

- production build passes
- lint still has the same 7 warnings as before
- no new lint errors were introduced by this pass

## Notes For Claude

If Claude picks this up next, the important context is:

- hosted mode is intentionally locked to Sonnet 4.6 now
- hosted sessions now require a server-issued signed token from `/api/capacity`
- self-hosted behavior should remain unchanged
- `/test` should stay hidden on hosted deploys unless there is a deliberate reason to expose it again

### Env Vars To Check In Vercel

- `ANTHROPIC_API_KEY`
- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`
- optional but recommended: `HOSTED_SESSION_SECRET`

`HOSTED_SESSION_SECRET` currently falls back to `ANTHROPIC_API_KEY` if unset, which is functional but not ideal long-term.

## Files Changed During This Pass

- [`app/api/capacity/route.ts`](/Users/gavinpurcell/the-fishbowl/app/api/capacity/route.ts)
- [`app/api/llm/route.ts`](/Users/gavinpurcell/the-fishbowl/app/api/llm/route.ts)
- [`app/session/page.tsx`](/Users/gavinpurcell/the-fishbowl/app/session/page.tsx)
- [`app/setup/page.tsx`](/Users/gavinpurcell/the-fishbowl/app/setup/page.tsx)
- [`lib/hostedSession.ts`](/Users/gavinpurcell/the-fishbowl/lib/hostedSession.ts)
- [`lib/redis.ts`](/Users/gavinpurcell/the-fishbowl/lib/redis.ts)
- [`lib/store.ts`](/Users/gavinpurcell/the-fishbowl/lib/store.ts)
- [`providers/claude.ts`](/Users/gavinpurcell/the-fishbowl/providers/claude.ts)
- [`providers/index.ts`](/Users/gavinpurcell/the-fishbowl/providers/index.ts)
- [`providers/types.ts`](/Users/gavinpurcell/the-fishbowl/providers/types.ts)
- [`proxy.ts`](/Users/gavinpurcell/the-fishbowl/proxy.ts)
