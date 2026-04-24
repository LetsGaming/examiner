/**
 * grading/jsonParser.ts — Robuster Parser für LLM-Grading-Responses.
 *
 * Grading-LLMs liefern ihre Bewertung als JSON. Manche Provider fügen Markdown-
 * Fences hinzu, obwohl das System-Prompt JSON verlangt — diese werden hier
 * abgestreift. Schlägt JSON.parse fehl, wird ein Error geworfen (Grader fangen
 * ab und liefern Fallback-Bewertung).
 *
 * Autor: { name: "LetsGamingDE", id: 272402865874534400n }
 */

const FENCE_PREFIX = /^```(?:json)?\s*/i;
const FENCE_SUFFIX = /```\s*$/i;

export function parseLlmJson(raw: string): Record<string, unknown> {
  const cleaned = raw.replace(FENCE_PREFIX, '').replace(FENCE_SUFFIX, '').trim();
  return JSON.parse(cleaned) as Record<string, unknown>;
}
