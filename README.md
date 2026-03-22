# The Fishbowl: AI Focus Groups

**Watch AI experts debate your idea — in pixel art.**

The Fishbowl is an AI-powered focus group simulator. You assemble a panel of expert personas, pitch them your idea, and watch them debate it in a live pixel art scene. Think *AI Town* meets *usability testing* — multi-persona AI conversations made visual, watchable, and accessible to everyone.

<!-- SCREENSHOT: title-screen.png — The title screen with CRT viewport, pixel characters, and "Get Started Now" button -->

## Why This Exists

In 2023, Stanford's *Generative Agents* paper (and the viral [AI Town](https://www.convex.dev/ai-town) demo that followed) proved something: **people will watch AI characters interact for hours.** Tiny pixel art NPCs wandering a town, chatting, forming opinions — it was mesmerizing. But it was a tech demo. The characters talked about nothing. There was no practical output.

Around the same time, multi-agent AI orchestration was getting powerful — tools like Claude Code's `/agents` command could spin up swarms of AI personas that research, debate, and build things together. The problem? It all happens in a terminal. Text flying by. Only developers get excited watching that.

**The Fishbowl sits in the gap between what AI can do and what people can see AI doing.**

It takes the core insight from AI Town — that visualization makes AI accessible — and applies it to something practical: getting expert feedback on your ideas. Instead of NPCs chatting about the weather, you have a skeptical CFO, a growth hacker, a UX designer, and a senior engineer debating whether your startup idea will work.

<!-- SCREENSHOT: roundtable.png — The PixiJS scene with 4 characters around the fishbowl table, speech bubble visible, broadcast status bar below -->

## What It Does

1. **Assemble your panel** — Pick from preset expert teams or build your own. Each panelist gets a unique persona, expertise, and pixel art character.

<!-- SCREENSHOT: setup-page.png — The setup page showing character cards, mission briefing, and template picker -->

2. **Brief them** — Describe your idea, product, campaign, or problem. Drop in documents for additional context.

3. **Watch them debate** — The panelists give initial reactions, then engage in cross-talk where they reference each other's points, agree, disagree, and build on ideas. All animated in a cozy pixel art office scene.

<!-- SCREENSHOT: briefing-card.png — A panelist dossier card with portrait, name, role, and their initial take -->

4. **Moderate** — Step in with follow-up questions. The panelists respond with full context of the discussion so far.

5. **Get the report** — Export an executive summary or full transcript as Markdown or PDF.

<!-- SCREENSHOT: results-page.png — The results page showing the classified debrief with summary and export options -->

## The Experience

The Fishbowl is designed to feel like watching a live broadcast of a focus group:

- **Title screen** → Retro game title with CRT viewport and pixel characters
- **Setup** → RPG party assembly — pick your team of experts
- **"Going Live" transition** → Cinematic broadcast countdown with panelist lineup
- **Roundtable** → Dark production control room UI with live PixiJS scene, speech bubbles, thinking indicators, and a teleprompter-style transcript
- **"That's a Wrap"** → Broadcast sign-off with session stats
- **Results** → Classified post-show debrief report

<!-- SCREENSHOT: transition.png — The "going live" transition overlay showing STANDBY, panelist names cascading in -->

## How It Works Under the Hood

The Fishbowl is **not** a multi-agent swarm. It's a sequential orchestrator that queries the same LLM multiple times with different expert personas. Each panelist is a carefully crafted system prompt, not an autonomous agent.

### Conversation Flow

```
INITIAL TAKES          Each panelist reacts independently (prefetched in parallel)
       ↓
CROSS-TALK (×2)        Panelists see the full transcript — they reference each
                       other by name, agree, disagree, build on points
       ↓
MODERATION             You ask follow-up questions, all panelists respond
       ↓
WRAP-UP                Each panelist gives their single most important takeaway
       ↓
SUMMARY                AI synthesizes key insights, agreements, and disagreements
```

The magic is in the **shared context**: after initial takes, every panelist sees the full transcript of everything said so far. This creates genuine back-and-forth where a UX designer pushes back on an engineer's architecture choice, or a CFO challenges a growth hacker's budget assumptions.

### Providers

| Provider | What it uses | Streaming | Cost |
|----------|-------------|-----------|------|
| **Claude** | Anthropic API | Real-time | Per token |
| **OpenAI** | OpenAI API | Real-time | Per token |
| **Claude Local** | Claude Code CLI on your machine | Simulated | Your Claude subscription |
| **Ollama** | Local models (Llama, Mistral, etc.) | Real-time | Free |

**Claude Local** is the zero-cost option for Claude Pro/Max subscribers — it runs through the Claude Code CLI installed on your machine, using your existing subscription. No API key needed.

## Quick Start

### Prerequisites

- Node.js 18+
- An API key for Claude or OpenAI, **or** Claude Code CLI installed (for Claude Local), **or** Ollama running locally

### Install and Run

```bash
git clone https://github.com/gavinpurcell/the-fishbowl.git
cd the-fishbowl
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Try the Demo

Visit [http://localhost:3000/test](http://localhost:3000/test) to run a full session with fake data — no API key needed. This shows the complete experience: briefing cards, broadcast countdown, roundtable with speech bubbles, and results.

### Using Claude Local (No API Key)

If you have [Claude Code](https://docs.anthropic.com/en/docs/claude-code) installed and logged in:

1. Select **Claude Local** as your provider on the setup page
2. Choose a model (Haiku, Sonnet, or Opus)
3. No API key required — uses your Claude Pro/Max subscription
4. Responses may be slightly slower due to CLI startup time

## Tech Stack

- **Next.js 16** — App Router, React 19
- **PixiJS 8** — 2D scene rendering (characters, speech bubbles, animations)
- **Zustand** — State management with sessionStorage persistence
- **Tailwind CSS v4** — Styling
- **Silkscreen** — Pixel font for headings
- **DM Mono** — Monospace font for data/transcripts
- **fal.ai** — Sprite generation (Nano Banana 2)

## The Bigger Idea

The Fishbowl is an experiment in **AI theater** — the idea that giving AI conversations a visual layer changes who can participate in them and what they understand about how AI works.

Most AI tools are still text-in, text-out. A chat box. Maybe a loading spinner. But AI is increasingly collaborative and multi-persona — agents debating, reasoning together, challenging each other. That process is fascinating, but it's invisible to most people.

What if the most powerful thing about multi-agent AI isn't the output — it's **making the process watchable**?

The focus group is the first format. The concept — pixel characters + real AI reasoning + watchable interaction — could extend to brainstorming sessions, war-gaming, educational panels, debate practice, and more.

## Credits

Built by [Gavin Purcell](https://gavinpurcell.com). Co-host of [AI For Humans](https://aiforhumans.show).

Inspired by [AI Town](https://www.convex.dev/ai-town) (Convex), the Stanford [Generative Agents](https://arxiv.org/abs/2304.03442) paper, and the experience of watching Claude Code's `/agents` command orchestrate AI swarms in a terminal and thinking: *what if everyone could see this?*

Pixel art sprites generated with [fal.ai](https://fal.ai) Nano Banana 2.

---

*The Fishbowl — because the best feedback comes from watching experts argue about your idea.*
