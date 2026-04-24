/**
 * db/poolConfig.ts — Konfiguration der Pool-Größen und Prüfungs-Slot-Profile.
 *
 * Abgeleitet aus der Analyse der echten AP2-Prüfungen 2019–2025 (Referenz-MD
 * §2, §5.1, §5.2, §5.3). Jede Prüfung hat 4 Task-Slots (Teil 1/2) oder 8 (Teil 3).
 * Für jeden Slot gibt es eine priorisierte Liste bevorzugter Kinds plus einen
 * Punktebereich.
 *
 * REALE VERTEILUNG (MD §5):
 *   Teil 1 (Planen): 1–2× Diagramm, 1–2× Tabelle, 0–1× Berechnung, Rest Text
 *   Teil 2 (Entw.):  1–2× SQL, 1× Pseudocode, 1× Diagramm/Berechnung, 0–1× Text
 *   Teil 3 (WiSo):   8 MC/Freitext-Slots, keine Typbalance nötig
 *
 * Autor: { name: "LetsGamingDE", id: 272402865874534400n }
 */

import type { TaskKind } from '../services/taskKind.js';

/** Mindest-Aufgabenzahl im Pool, damit `canAssembleExam` erfolgreich ist. */
export const REQUIRED_TASKS: Record<string, number> = {
  teil_1: 4,
  teil_2: 4,
  teil_3: 8,
};

/** Wie viele neue Tasks generiert werden sollen, wenn der Pool knapp ist. */
export const GENERATE_COUNT: Record<string, number> = {
  teil_1: 6,
  teil_2: 6,
  teil_3: 12, // Teil 3 braucht 8 Slots → großzügiger generieren
};

export interface SlotSpec {
  /** Punktebereich des Slots. */
  minPoints: number;
  maxPoints: number;
  /**
   * Priorisierte Kind-Liste: der erste Kind, für den eine Task gefunden wird,
   * wird verwendet. Der letzte Eintrag ist der Fallback-Kind. Wenn gar nichts
   * passt, wird ohne Kind-Filter gesucht (Gesamt-Fallback).
   */
  preferredKinds: TaskKind[];
}

export const SLOT_PROFILES: Record<string, SlotSpec[]> = {
  teil_1: [
    // Slot 1 (20–30P): bevorzugt Diagramm-Aufgabe (UML/ER/Mockup)
    { minPoints: 20, maxPoints: 30, preferredKinds: ['diagram', 'table', 'text'] },
    // Slot 2 (20–30P): bevorzugt Tabellen-Aufgabe
    { minPoints: 20, maxPoints: 30, preferredKinds: ['table', 'diagram', 'calc', 'text'] },
    // Slot 3 (18–28P): Berechnung oder zweite Tabelle
    { minPoints: 18, maxPoints: 28, preferredKinds: ['calc', 'table', 'diagram', 'text'] },
    // Slot 4 (15–25P): Text-Aufgabe als Basis
    { minPoints: 15, maxPoints: 25, preferredKinds: ['text', 'table', 'calc', 'diagram'] },
  ],
  teil_2: [
    // Slot 1 (20–30P): SQL-Aufgabe (Teil 2 hat fast immer SQL)
    { minPoints: 20, maxPoints: 30, preferredKinds: ['sql', 'code', 'diagram', 'text'] },
    // Slot 2 (18–28P): Pseudocode/Algorithmus
    { minPoints: 18, maxPoints: 28, preferredKinds: ['code', 'sql', 'diagram', 'text'] },
    // Slot 3 (18–28P): Diagramm (ER/Sequenz) oder Berechnung
    { minPoints: 18, maxPoints: 28, preferredKinds: ['diagram', 'calc', 'table', 'text'] },
    // Slot 4 (15–25P): zweites SQL oder Text
    { minPoints: 15, maxPoints: 25, preferredKinds: ['sql', 'text', 'calc', 'table'] },
  ],
  teil_3: [
    // WiSo: 8 Slots, keine Typbalance — nur Punkte-Range
    { minPoints: 8, maxPoints: 15, preferredKinds: [] },
    { minPoints: 8, maxPoints: 15, preferredKinds: [] },
    { minPoints: 8, maxPoints: 15, preferredKinds: [] },
    { minPoints: 8, maxPoints: 15, preferredKinds: [] },
    { minPoints: 8, maxPoints: 15, preferredKinds: [] },
    { minPoints: 10, maxPoints: 20, preferredKinds: [] },
    { minPoints: 10, maxPoints: 20, preferredKinds: [] },
    { minPoints: 8, maxPoints: 15, preferredKinds: [] },
  ],
};

/**
 * Reine Text-Aufgaben-Kappe pro Prüfung — verhindert, dass der Fallback-Pfad
 * bei diagrammarmem Pool eine reine Text-Prüfung zusammenbaut.
 * Teil 3 ohne Kappe (WiSo-Aufgaben sind konzeptionell alle "text"-artig).
 */
export const MAX_TEXT_PER_EXAM: Record<string, number> = {
  teil_1: 2,
  teil_2: 2,
  teil_3: 99,
};
