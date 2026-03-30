# The Fishbowl

**AI focus groups, visualized.** Assemble a panel of AI experts, pitch them your idea, and watch them debate it in a live pixel art scene.

Try it now at **[fishbowl.show](https://fishbowl.show)** or **[watch the demo](https://fishbowl.show/demo)** (no account needed).

<!-- TODO: add a screenshot or GIF of the roundtable scene -->

## Why

Most AI conversations are invisible. You type into a box, you get text back. But multi-persona AI, where different experts debate, push back, and build on each other's points, is way more interesting to watch than to read. Stanford's [Generative Agents](https://arxiv.org/abs/2304.03442) paper and [AI Town](https://www.convex.dev/ai-town) proved people will watch pixel art characters interact for hours. The Fishbowl takes that a step further: what if you could actually *see* AI agents think, react, and argue, instead of just reading the output?

## How It Works

1. **Pick a panel.** Choose from preset expert teams (startup pitch reviewers, marketing strategists, product critics) or build your own with custom personas.
2. **Pitch your idea.** Describe what you're working on. The panel reads it as a brief.
3. **Watch the discussion.** Each panelist gives their take, then they cross-talk: referencing each other, pushing back, building on points. All rendered in a live PixiJS scene with pixel art characters, speech bubbles, and reaction animations.
4. **Moderate.** Jump in with follow-up questions. The panel responds with full context of the conversation so far.
5. **Get the report.** Export a summary or full transcript.

The magic is in the shared context. After initial takes, every panelist sees the full transcript. This creates real back-and-forth where a UX researcher pushes back on an engineer's architecture choice, or a CFO challenges a growth hacker's budget assumptions.

## Self-Hosting

The hosted version at [fishbowl.show](https://fishbowl.show) is free to use, but every session costs Gavin real money and he is not rich. If you're going to use it a lot, please run your own instance:

```bash
git clone https://github.com/gavinpurcell/the-fishbowl.git
cd the-fishbowl
npm install
cp .env.example .env.local
# Add your ANTHROPIC_API_KEY to .env.local
npm run dev
```


### Providers

| Provider | Setup | Cost |
|----------|-------|------|
| **Claude (API)** | Add your Anthropic API key | Per-token |
| **Claude Local** | Requires [Claude Code](https://docs.anthropic.com/en/docs/claude-code) CLI installed and logged in | Uses your Claude Pro/Max subscription |

## Tech Stack

- **Next.js 16** with App Router and React 19
- **PixiJS 8** for 2D scene rendering (characters, speech bubbles, animations)
- **Zustand** for state management with sessionStorage persistence
- **Tailwind CSS v4**
- **Silkscreen** / **DM Mono** / **Outfit** for pixel, mono, and body fonts

## Credits

Built by [Gavin Purcell](https://gavinpurcell.com) and [Claude](https://claude.ai). Gavin co-hosts [AI For Humans](https://aiforhumans.show). Pixel art sprites generated with [fal.ai](https://fal.ai).

## License

MIT
