import { describe, it, expect } from 'vitest'

// ─── Grade mapping logic (extracted from examRoutes.ts submitSession) ─────────
// Diese Funktion spiegelt genau die IHK-Notengrenzen aus examRoutes.ts wider.
// Wenn die Grenzen dort geändert werden, müssen auch diese Tests aktualisiert werden.

function calcGrade(total: number, maxPoints: number): { percent: number; grade: string } {
  const percent = Math.round((total / maxPoints) * 100)
  const grade =
    percent >= 92 ? 'sehr_gut'
    : percent >= 81 ? 'gut'
    : percent >= 67 ? 'befriedigend'
    : percent >= 50 ? 'ausreichend'
    : percent >= 30 ? 'mangelhaft'
    : 'ungenuegend'
  return { percent, grade }
}

describe('IHK Notenberechnung', () => {
  describe('Notengrenzen', () => {
    it('Note 1 (sehr_gut): 92–100 %', () => {
      expect(calcGrade(92, 100).grade).toBe('sehr_gut')
      expect(calcGrade(100, 100).grade).toBe('sehr_gut')
      expect(calcGrade(96, 100).grade).toBe('sehr_gut')
    })

    it('Note 2 (gut): 81–91 %', () => {
      expect(calcGrade(81, 100).grade).toBe('gut')
      expect(calcGrade(91, 100).grade).toBe('gut')
      expect(calcGrade(85, 100).grade).toBe('gut')
    })

    it('Note 3 (befriedigend): 67–80 %', () => {
      expect(calcGrade(67, 100).grade).toBe('befriedigend')
      expect(calcGrade(80, 100).grade).toBe('befriedigend')
      expect(calcGrade(73, 100).grade).toBe('befriedigend')
    })

    it('Note 4 (ausreichend): 50–66 %', () => {
      expect(calcGrade(50, 100).grade).toBe('ausreichend')
      expect(calcGrade(66, 100).grade).toBe('ausreichend')
      expect(calcGrade(58, 100).grade).toBe('ausreichend')
    })

    it('Note 5 (mangelhaft): 30–49 %', () => {
      expect(calcGrade(30, 100).grade).toBe('mangelhaft')
      expect(calcGrade(49, 100).grade).toBe('mangelhaft')
      expect(calcGrade(40, 100).grade).toBe('mangelhaft')
    })

    it('Note 6 (ungenuegend): 0–29 %', () => {
      expect(calcGrade(0, 100).grade).toBe('ungenuegend')
      expect(calcGrade(29, 100).grade).toBe('ungenuegend')
      expect(calcGrade(10, 100).grade).toBe('ungenuegend')
    })
  })

  describe('Grenzwerte (Boundary)', () => {
    it('91 % → gut (nicht sehr_gut)', () => {
      expect(calcGrade(91, 100).grade).toBe('gut')
    })
    it('92 % → sehr_gut (nicht gut)', () => {
      expect(calcGrade(92, 100).grade).toBe('sehr_gut')
    })
    it('49 % → mangelhaft (nicht ausreichend)', () => {
      expect(calcGrade(49, 100).grade).toBe('mangelhaft')
    })
    it('50 % → ausreichend (nicht mangelhaft)', () => {
      expect(calcGrade(50, 100).grade).toBe('ausreichend')
    })
    it('29 % → ungenuegend (nicht mangelhaft)', () => {
      expect(calcGrade(29, 100).grade).toBe('ungenuegend')
    })
    it('30 % → mangelhaft (nicht ungenuegend)', () => {
      expect(calcGrade(30, 100).grade).toBe('mangelhaft')
    })
  })

  describe('Prozentberechnung mit Rundung', () => {
    it('Rundet korrekt auf ganze Zahlen', () => {
      // 75 / 100 = 75 %
      expect(calcGrade(75, 100).percent).toBe(75)
    })

    it('Rundet 0.5 auf (Math.round Verhalten)', () => {
      // 67.5 / 100 = 67.5 → 68 → befriedigend
      expect(calcGrade(675, 1000).percent).toBe(68)
      expect(calcGrade(675, 1000).grade).toBe('befriedigend')
    })

    it('Funktioniert mit maxPoints != 100 (z.B. 28/40)', () => {
      // 28 / 40 = 70 % → befriedigend
      const r = calcGrade(28, 40)
      expect(r.percent).toBe(70)
      expect(r.grade).toBe('befriedigend')
    })

    it('0 von 100 → 0 % → ungenuegend', () => {
      const r = calcGrade(0, 100)
      expect(r.percent).toBe(0)
      expect(r.grade).toBe('ungenuegend')
    })

    it('Perfekte Punktzahl → 100 % → sehr_gut', () => {
      const r = calcGrade(100, 100)
      expect(r.percent).toBe(100)
      expect(r.grade).toBe('sehr_gut')
    })
  })

  describe('Realistische AP2-Szenarien', () => {
    it('Teil 1: 73/100 Punkte → befriedigend', () => {
      expect(calcGrade(73, 100).grade).toBe('befriedigend')
    })

    it('Teil 2: 92/100 Punkte → sehr_gut', () => {
      expect(calcGrade(92, 100).grade).toBe('sehr_gut')
    })

    it('Teil 3: 48/100 Punkte → mangelhaft', () => {
      expect(calcGrade(48, 100).grade).toBe('mangelhaft')
    })

    it('Knapp bestanden: 50/100 → ausreichend', () => {
      expect(calcGrade(50, 100).grade).toBe('ausreichend')
    })

    it('Knapp nicht bestanden: 49/100 → mangelhaft', () => {
      expect(calcGrade(49, 100).grade).toBe('mangelhaft')
    })
  })
})
