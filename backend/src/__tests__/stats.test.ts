/**
 * stats.test.ts — Unit-Tests für die reinen Statistik-Hilfsfunktionen.
 */

import { describe, it, expect } from "vitest";
import {
  calculateStreak,
  classifyTopicPerformance,
  isTopicWeak,
} from "../services/statsLogic.js";

// ─── calculateStreak ──────────────────────────────────────────────────────────

describe("calculateStreak", () => {
  const today = new Date().toISOString().substring(0, 10);
  const yesterday = new Date(Date.now() - 86_400_000)
    .toISOString()
    .substring(0, 10);
  const twoDaysAgo = new Date(Date.now() - 2 * 86_400_000)
    .toISOString()
    .substring(0, 10);
  const threeDaysAgo = new Date(Date.now() - 3 * 86_400_000)
    .toISOString()
    .substring(0, 10);
  const oldDate = "2020-01-01";

  it("gibt 0 zurück bei leerer Liste", () => {
    expect(calculateStreak([])).toBe(0);
  });

  it("gibt 1 zurück wenn nur heute eine Session", () => {
    expect(calculateStreak([today])).toBe(1);
  });

  it("gibt 1 zurück wenn nur gestern eine Session", () => {
    expect(calculateStreak([yesterday])).toBe(1);
  });

  it("gibt 0 zurück wenn letzte Session vorgestern war (Lücke)", () => {
    expect(calculateStreak([twoDaysAgo])).toBe(0);
  });

  it("gibt 2 zurück bei heute + gestern", () => {
    expect(calculateStreak([today, yesterday])).toBe(2);
  });

  it("gibt 3 zurück bei drei aufeinanderfolgenden Tagen", () => {
    expect(calculateStreak([today, yesterday, twoDaysAgo])).toBe(3);
  });

  it("bricht bei Lücke ab", () => {
    // today + yesterday + (lücke) + threeDaysAgo → Streak = 2
    expect(calculateStreak([today, yesterday, threeDaysAgo])).toBe(2);
  });

  it("deduped Einträge — mehrere Sessions am gleichen Tag zählen als einer", () => {
    expect(calculateStreak([today, today, yesterday])).toBe(2);
  });

  it("gibt 0 zurück wenn letzte Session sehr alt ist", () => {
    expect(calculateStreak([oldDate])).toBe(0);
  });
});

// ─── classifyTopicPerformance ─────────────────────────────────────────────────

describe("classifyTopicPerformance", () => {
  it("gibt leere Liste bei keinen Scores zurück", () => {
    expect(classifyTopicPerformance([])).toEqual([]);
  });

  it("aggregiert mehrere Einträge pro Topic korrekt", () => {
    const scores = [
      { topicArea: "OOP", part: "teil_1" as const, percentage: 80, submittedAt: "2024-01-01" },
      { topicArea: "OOP", part: "teil_1" as const, percentage: 60, submittedAt: "2024-01-02" },
    ];
    const result = classifyTopicPerformance(scores);
    expect(result).toHaveLength(1);
    expect(result[0].avgPercentage).toBe(70);
    expect(result[0].attempts).toBe(2);
  });

  it("sortiert schwächste Topics zuerst", () => {
    const scores = [
      { topicArea: "OOP", part: "teil_1" as const, percentage: 80, submittedAt: "2024-01-01" },
      { topicArea: "SQL", part: "teil_2" as const, percentage: 30, submittedAt: "2024-01-01" },
      { topicArea: "Netz", part: "teil_3" as const, percentage: 50, submittedAt: "2024-01-01" },
    ];
    const result = classifyTopicPerformance(scores);
    expect(result[0].topicArea).toBe("SQL");
    expect(result[result.length - 1].topicArea).toBe("OOP");
  });

  it("unterscheidet gleiche Topics in verschiedenen Teilen", () => {
    const scores = [
      { topicArea: "Datenbanken", part: "teil_1" as const, percentage: 70, submittedAt: "2024-01-01" },
      { topicArea: "Datenbanken", part: "teil_2" as const, percentage: 40, submittedAt: "2024-01-01" },
    ];
    const result = classifyTopicPerformance(scores);
    expect(result).toHaveLength(2);
  });

  it("setzt lastAttemptAt auf den neuesten Eintrag", () => {
    const scores = [
      { topicArea: "OOP", part: "teil_1" as const, percentage: 80, submittedAt: "2024-01-01" },
      { topicArea: "OOP", part: "teil_1" as const, percentage: 60, submittedAt: "2024-03-15" },
    ];
    const result = classifyTopicPerformance(scores);
    expect(result[0].lastAttemptAt).toBe("2024-03-15");
  });
});

// ─── isTopicWeak ──────────────────────────────────────────────────────────────

describe("isTopicWeak", () => {
  it("schwach bei avg < 50% und >= 2 Versuchen", () => {
    expect(
      isTopicWeak({
        topicArea: "SQL",
        part: "teil_2",
        attempts: 2,
        avgPercentage: 40,
        lastAttemptAt: "2024-01-01",
      }),
    ).toBe(true);
  });

  it("nicht schwach bei avg >= 50%", () => {
    expect(
      isTopicWeak({
        topicArea: "SQL",
        part: "teil_2",
        attempts: 3,
        avgPercentage: 50,
        lastAttemptAt: "2024-01-01",
      }),
    ).toBe(false);
  });

  it("nicht schwach bei nur 1 Versuch (zu wenig Daten)", () => {
    expect(
      isTopicWeak({
        topicArea: "SQL",
        part: "teil_2",
        attempts: 1,
        avgPercentage: 20,
        lastAttemptAt: "2024-01-01",
      }),
    ).toBe(false);
  });
});
