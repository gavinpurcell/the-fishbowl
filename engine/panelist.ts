import type { Panelist } from './types';
import type { LLMProvider } from '@/providers/types';

const PANELIST_COLORS = ['#4a9a7a', '#e74c4c', '#4477ee', '#e44a9a', '#eea444', '#9a44ee', '#44aacc', '#cc7744'];
const ALL_SPRITE_INDICES = [0, 1, 2, 3, 4, 5, 6, 7];

/** Pick a random sprite index not already used by existing panelists */
export function pickUnusedSpriteIndex(existingPanelists: Panelist[]): number {
  const usedIndices = existingPanelists.map(p => p.spriteIndex);
  const available = ALL_SPRITE_INDICES.filter(i => !usedIndices.includes(i));
  // Fallback: if somehow all 8 are used (shouldn't happen with max 4), pick randomly from all
  const pool = available.length > 0 ? available : ALL_SPRITE_INDICES;
  return pool[Math.floor(Math.random() * pool.length)];
}

export function generateId(): string {
  return Math.random().toString(36).substring(2, 10);
}

export function createPanelistFromTemplate(
  data: Omit<Panelist, 'id' | 'systemPrompt' | 'spriteIndex'>,
  existingPanelists: Panelist[]
): Panelist {
  const spriteIndex = pickUnusedSpriteIndex(existingPanelists);
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
- NEVER repeat a point another panelist already made. If someone already said it, don't say it again. Instead, build on it, challenge it, or move to something new. If you agree with a point, say so briefly ("I'm with Jordan on that") and then add YOUR unique angle.
- NEVER narrate what you're about to do. Don't say things like "I'll say what no one is saying" or "I want to go deeper on this" or "let me push back here" or "I'll be the one to say it." Just SAY the thing. No meta-commentary about your own contribution.

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
