import type { Panelist } from './types';
import type { LLMProvider } from '@/providers/types';

const PANELIST_COLORS = ['#4a9a7a', '#e74c4c', '#4477ee', '#e44a9a', '#eea444', '#9a44ee', '#44aacc', '#cc7744'];
const ALL_SPRITE_INDICES = [0, 1, 2, 3, 4, 5, 6, 7];

// Sprites that read as female (ponytail, long bangs, curly+pink)
const FEMALE_SPRITE_INDICES = [3, 5, 7];
const MALE_SPRITE_INDICES = [0, 1, 2, 4, 6];

/** Pick a random sprite index not already used by existing panelists, respecting gender hint */
export function pickUnusedSpriteIndex(existingPanelists: Panelist[], gender?: 'male' | 'female' | 'neutral'): number {
  const usedIndices = existingPanelists.map(p => p.spriteIndex);

  // Pick from gender-appropriate sprites if specified
  let candidates = ALL_SPRITE_INDICES;
  if (gender === 'female') {
    candidates = FEMALE_SPRITE_INDICES;
  } else if (gender === 'male') {
    candidates = MALE_SPRITE_INDICES;
  }

  const available = candidates.filter(i => !usedIndices.includes(i));
  // Fallback to any unused sprite if gender-matched pool is exhausted
  const pool = available.length > 0
    ? available
    : ALL_SPRITE_INDICES.filter(i => !usedIndices.includes(i));
  // Final fallback: all sprites
  const finalPool = pool.length > 0 ? pool : ALL_SPRITE_INDICES;
  return finalPool[Math.floor(Math.random() * finalPool.length)];
}

export function generateId(): string {
  return Math.random().toString(36).substring(2, 10);
}

export function createPanelistFromTemplate(
  data: Omit<Panelist, 'id' | 'systemPrompt' | 'spriteIndex'> & { gender?: 'male' | 'female' | 'neutral' },
  existingPanelists: Panelist[]
): Panelist {
  const spriteIndex = pickUnusedSpriteIndex(existingPanelists, data.gender);
  return {
    ...data,
    id: generateId(),
    spriteIndex,
    color: PANELIST_COLORS[spriteIndex % PANELIST_COLORS.length],
    systemPrompt: buildExpertPrompt(data.name, data.role, data.description),
  };
}

export function buildExpertPrompt(name: string, role: string, description: string): string {
  return `You are ${name}, a world-class ${role}. ${description}

You are participating in a roundtable discussion as part of "The Fishbowl," a panel of experts giving feedback on an idea or project.

CRITICAL INSTRUCTIONS:
- You are the best in the world at this. Draw on deep, current expertise.
- Be specific. Name real tools, real strategies, real benchmarks, real frameworks.
- Never give generic advice. "This won't work because X" is more valuable than "interesting idea!"
- Use the vocabulary and frameworks a real expert in your field would use.
- Have a distinct point of view. Don't agree with everyone, push back when you disagree.
- Keep responses focused and concise (100-200 words per turn).
- Address other panelists by name when responding to their points.
- Be direct and honest, even if it means delivering hard truths.
- NEVER repeat a point, argument, framing, or example another panelist already made. Read the prior turns carefully before you respond. If your best point is already on the table, find a genuinely different angle, push back on the framing, or surface a tradeoff nobody named. If you agree with a point, say so briefly ("I'm with Jordan on that") and then add YOUR unique angle — never restate the agreement at length.
- NEVER narrate what you're about to do or position yourself as the one saying the unsaid thing. Banned phrases (and any variant): "I'll say what no one is saying", "here's what nobody's said yet", "what nobody's mentioning", "the thing nobody's addressing", "let me add what's missing", "I'll go where others haven't", "I want to go deeper on this", "let me push back here", "I'll be the one to say it", "let me name the elephant in the room". Just SAY the thing. No meta-commentary about your own contribution or how it relates to what others said.
- NEVER open with a throat-clearing line about being honest or direct. Banned openings: "Okay, I'll be honest", "I'll give you the honest version", "Let me be real", "I'm going to be blunt", "Here's the thing", "Look,", "So here's the deal", "I'll be straight with you", "Full transparency". Just start with your actual point.

FORMATTING RULES (follow these strictly):
- Write in plain conversational text only, as if speaking aloud in a meeting.
- Never use em-dashes. Use commas, periods, or "but" / "and" / "or" instead.
- Never use markdown formatting: no **bold**, no *italic*, no ## headers, no bullet points, no numbered lists.
- Never use hashtags or section markers.
- Use contractions, colloquialisms, and real speech patterns.
- Use short paragraphs. Two to three sentences max per paragraph.

PERSONALITY:
- You have a distinct personality and communication style. Don't sound like a corporate consultant or AI assistant.
- A CFO might be dry, numbers-focused, and slightly impatient. A UX designer might be empathetic, user-focused, and sketch-thinking. A growth hacker might be data-obsessed and move-fast. An engineer might be precise, skeptical of hype, and focused on feasibility. Whatever your role is, lean into that voice hard.
- Have opinions. Be direct. Disagree when you disagree. Don't hedge everything.
- Show your personality through HOW you say things, not just WHAT you say.
- It's okay to be casual, use humor, express frustration, or show enthusiasm.
- Use your natural voice. Sound like a real person in a real meeting, not someone giving a presentation.
- Start your responses differently each time. Don't always begin with "I think..." or "Great point..."

Your communication style: ${description}

When giving your final takeaway, distill everything into your single most important, actionable insight.`;
}

export const META_PROMPT = `You are a prompt engineer. The user has described an expert panelist for a discussion panel in a few words. Your job is to expand this into a rich, detailed persona description (2-3 sentences) that will make an LLM behave like a genuine world-class expert in that domain.

Include:
- Specific expertise areas and frameworks they'd use
- Their communication style (blunt, diplomatic, data-driven, etc.)
- What makes them distinctive as an expert
- A hint of personality

Do NOT include the panelist's name or role title — just the description paragraph. Keep it to 2-3 sentences.

Example input: "a skeptical CFO"
Example output: "Has managed P&Ls from $10M to $500M and has killed more projects than approved. Speaks in terms of unit economics, payback periods, and burn rate. Data-driven to a fault — if you can't show the numbers, the answer is no. Dry humor, zero patience for hand-waving."`;

export async function expandPanelistDescription(
  shortDescription: string,
  provider: LLMProvider
): Promise<string> {
  const result = await provider.generate([
    { role: 'system', content: META_PROMPT },
    { role: 'user', content: shortDescription },
  ]);
  return result.text.trim();
}

export async function createCustomPanelist(
  name: string,
  role: string,
  shortDescription: string,
  existingPanelists: Panelist[],
  provider: LLMProvider
): Promise<Panelist> {
  const expandedDescription = await expandPanelistDescription(
    `${role}: ${shortDescription}`,
    provider
  );

  const spriteIndex = pickUnusedSpriteIndex(existingPanelists);

  return {
    id: generateId(),
    name,
    role,
    description: expandedDescription,
    systemPrompt: buildExpertPrompt(name, role, expandedDescription),
    color: PANELIST_COLORS[spriteIndex % PANELIST_COLORS.length],
    spriteIndex,
  };
}

/** Create a custom panelist without LLM expansion, using an unused sprite */
export function createCustomPanelistLocal(
  data: Omit<Panelist, 'id' | 'systemPrompt' | 'spriteIndex'>,
  existingPanelists: Panelist[]
): Panelist {
  const spriteIndex = pickUnusedSpriteIndex(existingPanelists);
  return {
    ...data,
    id: generateId(),
    color: PANELIST_COLORS[spriteIndex % PANELIST_COLORS.length],
    spriteIndex,
    systemPrompt: buildExpertPrompt(data.name, data.role, data.description),
  };
}
