# The Fishbowl: Code Review Brief

## What This Is

AI-powered focus group simulator. Users pick a panel of AI expert personas, pitch an idea, and watch the panelists debate it in a live pixel art scene. Think AI Town meets usability testing.

**Live at:** [fishbowl.show](https://fishbowl.show)
**Demo (no API key):** [fishbowl.show/demo](https://fishbowl.show/demo)
**Repo:** [github.com/gavinpurcell/the-fishbowl](https://github.com/gavinpurcell/the-fishbowl)

## Stack

- Next.js 16, App Router, React 19, TypeScript
- PixiJS 8 for the 2D scene (characters, speech bubbles, animations)
- Zustand for state management (sessionStorage persistence)
- Tailwind CSS v4
- Deployed on Vercel, auto-deploys from `main`

## Architecture Overview

### Pages / Routes

| Route | What |
|-------|------|
| `/` | Title screen with PixiJS animated scene |
| `/setup` | Template picker, panelist builder, idea input |
| `/session` | Live session: PixiJS roundtable + speech bubbles + moderation |
| `/results` | Post-session summary, transcript, export options |
| `/demo` | Pre-recorded session with hardcoded dialogue, no API calls |
| `/about` | "Why I Made This" page |
| `/test` | Full test session with fake data (dev tool) |
| `/api/llm` | API proxy for Anthropic (POST) |
| `/api/claude-code` | Claude Code CLI provider route |

### Key Directories

```
app/            Next.js App Router pages and API routes
components/     React components
  setup/        Template picker, panelist builder, API config, idea input
  scene/        Session UI: canvas wrapper, status bar, transcript, overlays
  results/      Summary, transcript, export, lead capture
engine/         Conversation orchestration, panelist creation, type definitions
scene/          PixiJS classes: Character, Room, SpeechBubble, TitleScene, etc.
providers/      LLM provider adapters (Claude API, Claude Code CLI, OpenAI, Ollama stubs)
lib/            Store (Zustand), templates, models config, sprite loader, file parser
public/sprites/ Pixel art assets: characters (8 chars x 6 states), portraits, room, UI
```

### Conversation Flow

The conversation engine (`engine/conversation.ts`) runs sequentially, not as parallel agents:

1. **Initial takes** - each panelist reacts to the idea independently (prefetched in parallel for speed)
2. **Cross-talk (x2 rounds)** - each panelist sees the full transcript so far, references others by name
3. **Moderation** - user can interject with follow-up questions
4. **Wrap-up** - each panelist gives their single most important takeaway
5. **Summary** - AI synthesizes key insights

All responses stream in real-time through the PixiJS scene with speech bubbles.

### Hosted vs Self-Hosted

`NEXT_PUBLIC_HOSTED_MODE=true` (set in Vercel env vars) hides the API key/provider config on the setup page. The server-side `ANTHROPIC_API_KEY` handles all requests.

Self-hosted installs (no env flag) show the full provider picker, model selector, and API key input. The API proxy at `/api/llm` accepts a client-provided `apiKey` field, falling back to the server env var.

### State Management

Zustand store (`lib/store.ts`) with sessionStorage persistence. Holds:
- Panel config (panelists, idea, provider, model, API key)
- Session state (status, transcript, current round)
- UI state

Sessions don't survive tab close (no server-side persistence yet).

## Known Issues / Gaps

- **No rate limiting** on the API proxy. Anyone can hit `/api/llm` directly.
- **No server-side session storage.** Sessions live in browser sessionStorage only. Redis integration is planned (Upstash via Vercel Marketplace) for rate limiting, session persistence, and email collection.
- **Lead capture popup** on results page collects emails but has nowhere to store them yet (needs Redis).
- **No image support** in the conversation pipeline. Everything is text-only (`FileContent = string`, `Message.content = string`). This blocks visual templates like "Rate My Outfit" which would need base64/multimodal content blocks.
- **Onboarding tour** is disabled. It referenced a removed DOM section (`section-api`) and the overlay was blocking all clicks.
- **Some sprite edge artifacts** remain on a few character states (light pixel fringe from transparent background cleanup).
- **OpenAI and Ollama providers** exist as stubs in `providers/` but are not fully tested or advertised.

## Security Notes

A security hardening pass was done (commit `18db349`):
- Input validation on API routes
- Error message sanitization (no stack traces leaked to client)
- API key only sent to Anthropic, never logged or stored server-side

The `.env.local` file contains the Anthropic API key and is gitignored. The `NEXT_PUBLIC_HOSTED_MODE` flag is intentionally public (just the string "true").

## Recent Work

Latest commits focus on:
- Demo page polish (auto-start, readability fixes, tighter ending)
- Homepage "watch the demo" link
- Hosted mode flag for self-hosted vs deployed setup flow
- README rewrite for fishbowl.show launch
- Cost estimate badge removed from setup page
- Custom domain: fishbowl.show connected via Vercel
