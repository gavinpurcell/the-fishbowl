import { NextRequest } from 'next/server';
import type { LLMRequestBody } from '@/providers/types';

export const runtime = 'edge';

export async function POST(req: NextRequest) {
  const body: LLMRequestBody = await req.json();
  const { messages, provider, apiKey, modelId, stream = true } = body;

  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'API key is required' }), { status: 400 });
  }

  try {
    if (provider === 'claude') {
      return await handleClaude(messages, apiKey, modelId, stream);
    } else if (provider === 'openai') {
      return await handleOpenAI(messages, apiKey, modelId, stream);
    } else {
      return new Response(JSON.stringify({ error: `Unknown provider: ${provider}` }), { status: 400 });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[LLM API Route Error]', message);
    return new Response(JSON.stringify({ error: message }), { status: 500 });
  }
}

async function handleClaude(messages: { role: string; content: string }[], apiKey: string, modelId?: string, stream?: boolean) {
  const systemMessage = messages.find((m) => m.role === 'system');
  const nonSystemMessages = messages.filter((m) => m.role !== 'system');

  const requestBody: Record<string, unknown> = {
    model: modelId || 'claude-sonnet-4-20250514',
    max_tokens: 1024,
    messages: nonSystemMessages.map((m) => ({ role: m.role, content: m.content })),
    stream,
  };
  if (systemMessage) {
    requestBody.system = systemMessage.content;
  }

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Claude API error (${response.status}): ${errorText}`);
  }

  if (stream) {
    return new Response(response.body, {
      headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' },
    });
  }

  return new Response(response.body, {
    headers: { 'Content-Type': 'application/json' },
  });
}

async function handleOpenAI(messages: { role: string; content: string }[], apiKey: string, modelId?: string, stream?: boolean) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: modelId || 'gpt-4o',
      messages,
      stream,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI API error (${response.status}): ${errorText}`);
  }

  if (stream) {
    return new Response(response.body, {
      headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' },
    });
  }

  return new Response(response.body, {
    headers: { 'Content-Type': 'application/json' },
  });
}
