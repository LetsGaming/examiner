import { describe, it, expect } from "vitest";
import { computeNextReview, defaultReviewEntry, addDays } from "../services/spacedRepetition.js";

describe("computeNextReview", () => {
  const base = defaultReviewEntry(); // { intervalDays:1, ease:2.5, repetitions:0 }
  const today = "2024-06-01";

  it("score < 50%: interval zurück auf 1, ease sinkt, repetitions zurück auf 0", () => {
    const r = computeNextReview({ intervalDays: 7, ease: 2.5, repetitions: 3 }, 30, today);
    expect(r.intervalDays).toBe(1);
    expect(r.ease).toBeCloseTo(2.3, 5);
    expect(r.repetitions).toBe(0);
    expect(r.dueAt).toBe("2024-06-02");
  });

  it("ease sinkt nicht unter 1.3 (Minimum)", () => {
    const r = computeNextReview({ intervalDays: 1, ease: 1.3, repetitions: 0 }, 20, today);
    expect(r.ease).toBeCloseTo(1.3, 5);
  });

  it("score 50-80%: interval wächst mit ease, repetitions +1", () => {
    const r = computeNextReview({ intervalDays: 4, ease: 2.5, repetitions: 1 }, 65, today);
    expect(r.intervalDays).toBe(10); // round(4 * 2.5)
    expect(r.repetitions).toBe(2);
    expect(r.ease).toBe(2.5);
  });

  it("score > 80%: interval wächst stärker, ease steigt leicht", () => {
    const r = computeNextReview({ intervalDays: 4, ease: 2.5, repetitions: 1 }, 90, today);
    expect(r.intervalDays).toBe(13); // round(4 * 2.5 * 1.3)
    expect(r.ease).toBeCloseTo(2.6, 5);
    expect(r.repetitions).toBe(2);
  });

  it("dueAt ist today + intervalDays", () => {
    const r = computeNextReview(base, 90, "2024-06-01");
    expect(r.dueAt).toBe(addDays("2024-06-01", r.intervalDays));
  });

  it("Score-Schwellen: genau 50% zählt als gut (nicht schlecht)", () => {
    const r = computeNextReview(base, 50, today);
    expect(r.intervalDays).toBeGreaterThanOrEqual(1);
    expect(r.repetitions).toBe(1);
  });
});

describe("addDays", () => {
  it("addiert korrekt über Monatsgrenze", () => {
    expect(addDays("2024-01-30", 3)).toBe("2024-02-02");
  });
  it("0 Tage → gleicher Tag", () => {
    expect(addDays("2024-06-15", 0)).toBe("2024-06-15");
  });
});
