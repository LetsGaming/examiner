/**
 * providers/google.ts — Google Gemini generateContent API Client.
 *
 * Unterstützt inline Image-Data via inline_data-Part. Der API-Key wandert in
 * die URL (das ist Google-API-Standard, nicht Unser-Design-Entscheidung).
 *
 * Autor: { name: "LetsGamingDE", id: 272402865874534400n }
 */

const API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';
const DEFAULT_TEMPERATURE = 0.1;
const DEFAULT_MAX_OUTPUT_TOKENS = 2048;

export interface GoogleRequest {
  prompt: string;
  apiKey: string;
  model: string;
  imageBase64?: string;
  imageMediaType?: string;
  temperature?: number;
  maxOutputTokens?: number;
}

type TextPart = { text: string };
type InlineDataPart = { inline_data: { mime_type: string; data: string } };
type Part = TextPart | InlineDataPart;

export async function callGoogle(req: GoogleRequest): Promise<string> {
  const url = `${API_BASE}/${req.model}:generateContent?key=${req.apiKey}`;
  const body = {
    contents: [{ parts: buildParts(req) }],
    generationConfig: {
      temperature: req.temperature ?? DEFAULT_TEMPERATURE,
      maxOutputTokens: req.maxOutputTokens ?? DEFAULT_MAX_OUTPUT_TOKENS,
    },
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`Google Gemini Fehler ${response.status}: ${await response.text()}`);
  }

  return extractTextFromResponse(await response.json());
}

function buildParts(req: GoogleRequest): Part[] {
  const parts: Part[] = [];
  if (req.imageBase64 && req.imageMediaType) {
    parts.push({
      inline_data: { mime_type: req.imageMediaType, data: req.imageBase64 },
    });
  }
  parts.push({ text: req.prompt });
  return parts;
}

interface GoogleResponseShape {
  candidates?: { content?: { parts?: { text?: string }[] } }[];
  error?: { message?: string };
}

function extractTextFromResponse(data: unknown): string {
  const resp = data as GoogleResponseShape;
  if (resp.error) {
    throw new Error(`Gemini Fehler: ${resp.error.message ?? 'unbekannt'}`);
  }
  const text =
    resp.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('') ?? '';
  if (!text) {
    throw new Error('Leere Antwort von Gemini erhalten.');
  }
  return text;
}
