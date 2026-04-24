/**
 * ai/types.ts — Öffentliche Typen der AI-Layer.
 *
 * Werden von Routen (evaluationRoutes, secondOpinionRoutes) konsumiert und
 * intern von Gradern. Die Grader selbst liefern Teil-Typen aus evaluationShape.
 *
 * Autor: { name: "LetsGamingDE", id: 272402865874534400n }
 */

import type { DiagramType, ExamPart, TaskType } from '../types/index.js';

export interface AssessAnswerParams {
  taskType: TaskType;
  examPart: ExamPart;
  questionText: string;
  expectedAnswer: Record<string, unknown>;
  studentAnswer: string;
  maxPoints: number;
  topicArea?: string;
  /** Formatierter Szenario-Kontext-String
   *  (z.B. "Unternehmenskontext: TravelTech GmbH — …"). MD §5.1. */
  scenarioContext?: string;
  /** MC-Option-IDs in der Reihenfolge, wie sie dem Prüfling gezeigt wurden —
   *  Pflicht für mc_multi-Bewertung (MD §5.3 WiSo verwendet "1"–"5", sonst "A"–"D"). */
  mcOptionIds?: string[];
}

export interface AnalyzeDiagramParams {
  diagramType: DiagramType;
  taskDescription: string;
  expectedElements: string[];
  maxPoints: number;
  plantUmlCode?: string;
  imageBase64?: string;
  imageMediaType?: string;
  scenarioContext?: string;
}
