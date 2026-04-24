/**
 * providers/openaiCompat.ts — OpenAI-kompatibler HTTP-Client.
 *
 * Wird für Provider verwendet, die das OpenAI-Messages-Schema sprechen:
 * OpenAI selbst und Mistral. Unterstützt optionale Vision-Anhänge via
 * image_url-Content-Part.
 *
 * JSON-Mode (response_format: json_object) wird nur bei reinen Text-Requests
 * gesetzt — Mistral-Vision-Endpoint lehnt JSON-Mode mit Bild kombiniert ab.
 *
 * Autor: { name: "LetsGamingDE", id: 272402865874534400n }
 */

export interface OpenAiCompatRequest {
  prompt: string;
  apiKey: string;
  apiBase: string;
  model: string;
  imageBase64?: string;
  imageMediaType?: string;
  temperature?: number;
  maxTokens?: number;
}

type TextPart = { type: 'text'; text: string };
type ImagePart = { type: 'image_url'; image_url: { url: string; detail: 'low' } };
type ContentPart = TextPart | ImagePart;

const DEFAULT_TEMPERATURE = 0.1;
const DEFAULT_MAX_TOKENS = 2048;

export async function callOpenAiCompat(req: OpenAiCompatRequest): Promise<string> {
  const body = buildRequestBody(req);
  const response = await fetch(req.apiBase, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${req.apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`${req.apiBase} Fehler ${response.status}: ${await response.text()}`);
  }

  return extractTextFromResponse(await response.json());
}

function buildRequestBody(req: OpenAiCompatRequest): Record<string, unknown> {
  const content = buildContentParts(req);
  const body: Record<string, unknown> = {
    model: req.model,
    messages: [{ role: 'user', content }],
    temperature: req.temperature ?? DEFAULT_TEMPERATURE,
    max_tokens: req.maxTokens ?? DEFAULT_MAX_TOKENS,
  };

  // JSON-Mode ist bei Vision-Requests bei Mistral nicht unterstützt.
  if (!req.imageBase64) {
    body.response_format = { type: 'json_object' };
  }
  return body;
}

function buildContentParts(req: OpenAiCompatRequest): ContentPart[] {
  const parts: ContentPart[] = [];
  if (req.imageBase64 && req.imageMediaType) {
    parts.push({
      type: 'image_url',
      image_url: {
        url: `data:${req.imageMediaType};base64,${req.imageBase64}`,
        detail: 'low',
      },
    });
  }
  parts.push({ type: 'text', text: req.prompt });
  return parts;
}

interface OpenAiResponseShape {
  choices?: { message?: { content?: string } }[];
  error?: { message?: string };
}

function extractTextFromResponse(data: unknown): string {
  const resp = data as OpenAiResponseShape;
  if (resp.error) {
    throw new Error(`API Fehler: ${resp.error.message ?? 'unbekannt'}`);
  }
  const text = resp.choices?.[0]?.message?.content;
  if (!text) {
    throw new Error('Leere Antwort vom Modell erhalten.');
  }
  return text;
}
