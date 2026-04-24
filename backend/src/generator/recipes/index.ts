/**
 * recipes/index.ts — Einheitlicher Zugriff auf alle Rezepte + Auswahl-Logik.
 *
 * Kapselt die Rezept-Auswahl hinter einer stabilen API. Core-Module
 * (core/generator.ts) importieren NUR von hier — nie direkt aus teil1/2/3.
 *
 * Autor: { name: "LetsGamingDE", id: 272402865874534400n }
 */

import type { ExamPart } from '../../types/index.js';
import type { TaskRecipe } from '../types.js';
import { RECIPES_TEIL1 } from './teil1.js';
import { RECIPES_TEIL2 } from './teil2.js';
import { RECIPES_TEIL3 } from './teil3.js';

export { RECIPES_TEIL1, RECIPES_TEIL2, RECIPES_TEIL3 };

/** Rezept-Set für den gegebenen Prüfungsteil. */
export function recipesFor(part: ExamPart): TaskRecipe[] {
  if (part === 'teil_1') return RECIPES_TEIL1;
  if (part === 'teil_2') return RECIPES_TEIL2;
  return RECIPES_TEIL3;
}

// ─── Auswahl ────────────────────────────────────────────────────────────────

/** Gewichtete Zufallsauswahl aus Rezept-Liste. */
export function pickWeightedRecipe(recipes: TaskRecipe[]): TaskRecipe {
  if (recipes.length === 0) {
    throw new Error('pickWeightedRecipe: leere Rezeptliste');
  }
  const total = recipes.reduce((s, r) => s + r.weight, 0);
  let r = Math.random() * total;
  for (const recipe of recipes) {
    r -= recipe.weight;
    if (r <= 0) return recipe;
  }
  return recipes[recipes.length - 1];
}

/**
 * Wählt ein Rezept, das thematisch zum Topic passt und die Diagramm-Beschränkung
 * respektiert.
 *
 * Auswahl-Priorität:
 *   1. Rezepte mit topicKeywords-Match (Substring, case-insensitive).
 *   2. Generische Rezepte ohne topicKeywords-Filter.
 *   3. Notfall: irgendein Rezept, Diagramm-Filter beachten wenn möglich.
 */
export function selectRecipe(part: ExamPart, topic: string, avoidDiagram: boolean): TaskRecipe {
  const all = recipesFor(part);
  const topicLower = topic.toLowerCase();

  const allowedByDiagram = (r: TaskRecipe): boolean => !(avoidDiagram && r.containsDiagram);
  const matchesTopic = (r: TaskRecipe): boolean =>
    (r.topicKeywords ?? []).some((kw) => topicLower.includes(kw.toLowerCase()));

  // 1. Topic-Match
  const topicMatches = all.filter((r) => allowedByDiagram(r) && r.topicKeywords && matchesTopic(r));
  if (topicMatches.length > 0) return pickWeightedRecipe(topicMatches);

  // 2. Generisch (kein topicKeywords-Filter)
  const generic = all.filter((r) => allowedByDiagram(r) && !r.topicKeywords);
  if (generic.length > 0) return pickWeightedRecipe(generic);

  // 3. Notfall
  const fallback = all.filter(allowedByDiagram);
  return pickWeightedRecipe(fallback.length > 0 ? fallback : all);
}

// ─── Utility ────────────────────────────────────────────────────────────────

/** Erkennt WiSo-Rezepte anhand der ID-Konvention (`t3_*`).
 *  Wird vom Schema-Builder, vom Prompt-Builder und von MC-Validatoren genutzt,
 *  um das WiSo-Format (5 Ziffern-Options, MD §5.3) zu erzwingen. */
export function isWisoRecipe(recipe: TaskRecipe): boolean {
  return recipe.id.startsWith('t3_');
}
