/**
 * generator/types.ts — Typen für die Aufgaben-Rezepte und die generierten
 * Task-Strukturen.
 *
 * Die Typen hier sind die Schnittstelle zwischen Rezepten (Eingabe) und
 * generierten Aufgaben (Ausgabe). Keine Logik, keine Abhängigkeiten zum
 * Provider/LLM.
 *
 * Autor: { name: "LetsGamingDE", id: 272402865874534400n }
 */

import type { TaskType, DiagramType, TableConfig } from '../types/index.js';
import type { Operator } from '../domain/taxonomy.js';

// ─── Rezept-Ebene: was der Autor hinschreibt ─────────────────────────────────

/** Beschreibt eine Subtask — einen einzelnen Arbeitsschritt a), b), c) innerhalb einer AP2-Aufgabe. */
export interface SubtaskSpec {
  taskType: TaskType;
  prompt: string;
  /** Punkte — Einzelwert oder Bereich [min, max]. Bei Bereich würfelt der Generator
   *  einen konkreten Wert, um die reale IHK-Varianz abzubilden (MD §2). */
  points: number | [number, number];
  /** Operator-Dimension — bestimmt Erwartungsniveau der Bewertung (MD §6.2). */
  operator?: Operator;
  /** Bewertungshinweis für den Prüfer-Prompt — wandert in expectedAnswer.gradingHint. */
  gradingHint?: string;

  // ─── Nur für taskType === 'table' ──────────────────────────────────────────
  tableColumns?: string[];
  tableRowCount?: number;
  fixedFirstColumn?: boolean;
  fixedFirstColumnValues?: string[];
  tableKind?: TableKind;
  tableDescription?: string;

  // ─── Nur für taskType === 'plantuml' | 'diagram_upload' ────────────────────
  diagramType?: DiagramType;

  /** Kaskadierte Labels (z.B. "aa", "ab", "ac" statt "a", "b", "c").
   *  Fortlaufende Specs mit `cascade: true` werden unter ein Hauptlabel gruppiert
   *  — siehe MD §5.1 W23/24 Aufg.2 (User-Story-Kaskade). */
  cascade?: boolean;
}

export type TableKind = 'flexible' | 'guided' | 'fixed';

/** Ein Rezept beschreibt eine vollständige AP2-Aufgabe (20–30P, 2–6 Subtasks). */
export interface TaskRecipe {
  /** Eindeutige Kennung. Konvention: `t1_*` = Teil 1, `t2_*` = Teil 2, `t3_*` = WiSo.
   *  Die t3_-Erkennung erzwingt das WiSo-MC-Format (5 Ziffern statt 4 Buchstaben, MD §5.3). */
  id: string;
  /** Relative Häufigkeit in der Auswahl (siehe `pickWeightedRecipe`). */
  weight: number;
  subtasks: SubtaskSpec[];
  /** Optional: Rezept passt nur zu Themen, die eines dieser Keywords enthalten (Substring-Match, case-insensitive). */
  topicKeywords?: string[];
  /** Wenn true: Rezept wird im aktuellen Batch übersprungen, wenn bereits
   *  `MAX_DIAGRAM_PER_BATCH` Diagramm-Aufgaben generiert wurden. */
  containsDiagram?: boolean;
}

// ─── Generierungs-Ergebnis: was rauskommt ────────────────────────────────────

export interface GeneratedSubTask {
  /** Label wie "a", "b", "ba", "bb", "c". Wird vom Generator automatisch vergeben. */
  label: string;
  taskType: TaskType;
  questionText: string;
  points: number;
  diagramType?: DiagramType;
  expectedElements?: string[];
  mcOptions?: { id: string; text: string }[];
  tableConfig?: TableConfig;
  expectedAnswer: Record<string, unknown>;
}

export interface GeneratedTask {
  topicArea: string;
  pointsValue: number;
  difficulty: 'easy' | 'medium' | 'hard';
  subtasks: GeneratedSubTask[];
}
