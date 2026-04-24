/**
 * core/parser.ts — Robustes Parsen von LLM-Responses, die eine GeneratedTask
 * liefern sollen.
 *
 * Markdown-Fences werden abgestreift, Strukturprüfung validiert die Pflicht-
 * felder. Rückgabe `null` bei ungültigem Input — der Caller (generator.ts)
 * fällt dann auf `buildFallbackTask` zurück.
 *
 * Autor: { name: "LetsGamingDE", id: 272402865874534400n }
 */

import type { GeneratedTask } from '../types.js';

const MARKDOWN_FENCE_PREFIX = /^```(?:json)?\s*/i;
const MARKDOWN_FENCE_SUFFIX = /\s*```\s*$/i;

/** Entfernt Markdown-Code-Fences, die manche LLMs trotz JSON-Mode beilegen. */
function stripMarkdownFences(raw: string): string {
  return raw.replace(MARKDOWN_FENCE_PREFIX, '').replace(MARKDOWN_FENCE_SUFFIX, '').trim();
}

function hasValidShape(obj: unknown): obj is GeneratedTask {
  if (typeof obj !== 'object' || obj === null) return false;
  const t = obj as Record<string, unknown>;
  return (
    typeof t.topicArea === 'string' &&
    typeof t.pointsValue === 'number' &&
    Array.isArray(t.subtasks) &&
    t.subtasks.length > 0
  );
}

/** Parst einen LLM-Response zu GeneratedTask. Returns null bei ungültigem Input. */
export function safeParseTask(raw: string): GeneratedTask | null {
  try {
    const clean = stripMarkdownFences(raw);
    const obj: unknown = JSON.parse(clean);
    return hasValidShape(obj) ? obj : null;
  } catch {
    return null;
  }
}
