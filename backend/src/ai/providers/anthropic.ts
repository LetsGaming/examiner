/**
 * providers/anthropic.ts — Anthropic Messages API Client.
 *
 * Unterstützt Vision via Base64-Image-Block. API-Version ist gepinnt auf
 * 2023-06-01 (Messages-API stable).
 *
 * Autor: { name: "LetsGamingDE", id: 272402865874534400n }
 */

const ANTHROPIC_ENDPOINT = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_API_VERSION = '2023-06-01';
const DEFAULT_MAX_TOKENS = 2048;

export interface AnthropicRequest {
  prompt: string;
  apiKey: string;
  model: string;
  imageBase64?: string;
  imageMediaType?: string;
  maxTokens?: number;
}

type TextBlock = { type: 'text'; text: string };
type ImageBlock = { type: 'image'; source: { type: 'base64'; media_type: string; data: string } };
type ContentBlock = TextBlock | ImageBlock;

export async function callAnthropic(req: AnthropicRequest): Promise<string> {
  const content = buildContent(req);

  const response = await fetch(ANTHROPIC_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': req.apiKey,
      'anthropic-version': ANTHROPIC_API_VERSION,
    },
    body: JSON.stringify({
      model: req.model,
      max_tokens: req.maxTokens ?? DEFAULT_MAX_TOKENS,
      messages: [{ role: 'user', content }],
    }),
  });

  if (!response.ok) {
    throw new Error(`Anthropic Fehler ${response.status}: ${await response.text()}`);
  }

  return extractTextFromResponse(await response.json());
}

function buildContent(req: AnthropicRequest): ContentBlock[] {
  const blocks: ContentBlock[] = [];
  if (req.imageBase64 && req.imageMediaType) {
    blocks.push({
      type: 'image',
      source: { type: 'base64', media_type: req.imageMediaType, data: req.imageBase64 },
    });
  }
  blocks.push({ type: 'text', text: req.prompt });
  return blocks;
}

interface AnthropicResponseShape {
  content?: { type: string; text?: string }[];
  error?: { message?: string };
}

function extractTextFromResponse(data: unknown): string {
  const resp = data as AnthropicResponseShape;
  if (resp.error) {
    throw new Error(`Anthropic Fehler: ${resp.error.message ?? 'unbekannt'}`);
  }
  const text = resp.content?.find((b) => b.type === 'text')?.text;
  if (!text) {
    throw new Error('Leere Antwort von Anthropic erhalten.');
  }
  return text;
}
