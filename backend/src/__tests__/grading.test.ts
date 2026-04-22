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

// ─── Multi-Select MC Scoring ──────────────────────────────────────────────────
// Replica of gradeMcMultiAnswer's core scoring logic. If the formula in
// aiService.ts changes, update here too.

function scoreMcMulti(
  studentSelectionRaw: string,
  optionIds: string[],
  correctOptions: string[],
  maxPoints: number,
): { awarded: number; percent: number; correctMarks: number; wrong: string[]; missed: string[] } {
  let studentSelected: string[] = []
  const trimmed = (studentSelectionRaw ?? '').trim()
  if (trimmed.startsWith('[')) {
    try {
      const parsed = JSON.parse(trimmed)
      if (Array.isArray(parsed)) studentSelected = parsed.map((v) => String(v).toUpperCase().trim())
    } catch { /* noop */ }
  } else if (trimmed) {
    studentSelected = trimmed.split(',').map((v) => v.toUpperCase().trim()).filter(Boolean)
  }

  const allIds = optionIds.map((id) => id.toUpperCase())
  const correctSet = new Set(correctOptions.map((v) => v.toUpperCase()))
  const studentSet = new Set(studentSelected.filter((id) => allIds.includes(id)))

  let correctMarks = 0
  const wrong: string[] = []
  const missed: string[] = []
  for (const id of allIds) {
    const shouldBe = correctSet.has(id)
    const isSelected = studentSet.has(id)
    if (shouldBe === isSelected) correctMarks++
    else if (isSelected) wrong.push(id)
    else missed.push(id)
  }
  const ratio = allIds.length > 0 ? correctMarks / allIds.length : 0
  return {
    awarded: Math.round(ratio * maxPoints),
    percent: Math.round(ratio * 100),
    correctMarks,
    wrong,
    missed,
  }
}

describe('Multi-Select MC Scoring', () => {
  const OPTS = ['A', 'B', 'C', 'D']

  it('perfekte Auswahl: alle richtig ausgewählt, keine falsch', () => {
    const r = scoreMcMulti('["A","C"]', OPTS, ['A', 'C'], 6)
    expect(r.awarded).toBe(6)
    expect(r.percent).toBe(100)
    expect(r.correctMarks).toBe(4)
    expect(r.wrong).toEqual([])
    expect(r.missed).toEqual([])
  })

  it('komplett leer bei 2 korrekten Antworten → 50% (B und D richtig als nicht-markiert)', () => {
    const r = scoreMcMulti('', OPTS, ['A', 'C'], 6)
    expect(r.correctMarks).toBe(2) // B und D korrekt als nicht-selektiert
    expect(r.percent).toBe(50)
    expect(r.missed).toEqual(['A', 'C'])
  })

  it('eine korrekt markiert, eine übersehen → 75% (3 von 4 Optionen richtig eingeordnet)', () => {
    const r = scoreMcMulti('["A"]', OPTS, ['A', 'C'], 8)
    expect(r.correctMarks).toBe(3)
    expect(r.percent).toBe(75)
    expect(r.awarded).toBe(6)
    expect(r.missed).toEqual(['C'])
    expect(r.wrong).toEqual([])
  })

  it('zusätzlich falsche Option markiert bestraft', () => {
    const r = scoreMcMulti('["A","B","C"]', OPTS, ['A', 'C'], 8)
    expect(r.correctMarks).toBe(3) // A und C richtig, D richtig nicht-markiert, B falsch markiert
    expect(r.wrong).toEqual(['B'])
    expect(r.percent).toBe(75)
  })

  it('alles falsch: nur falsche ausgewählt, alle richtigen übersehen → 0%', () => {
    const r = scoreMcMulti('["B","D"]', OPTS, ['A', 'C'], 6)
    expect(r.correctMarks).toBe(0)
    expect(r.awarded).toBe(0)
    expect(r.percent).toBe(0)
  })

  it('alle 4 Optionen markiert bei 2 korrekten → 50% (2 falsch markiert)', () => {
    const r = scoreMcMulti('["A","B","C","D"]', OPTS, ['A', 'C'], 6)
    expect(r.correctMarks).toBe(2)
    expect(r.wrong).toEqual(['B', 'D'])
    expect(r.percent).toBe(50)
  })

  it('comma-separated fallback parsen', () => {
    const r = scoreMcMulti('A,C', OPTS, ['A', 'C'], 6)
    expect(r.awarded).toBe(6)
  })

  it('drei-korrekte Aufgabe perfekt lösen', () => {
    const r = scoreMcMulti('["A","B","D"]', OPTS, ['A', 'B', 'D'], 9)
    expect(r.awarded).toBe(9)
    expect(r.percent).toBe(100)
  })

  it('case-insensitive: kleinbuchstaben werden akzeptiert', () => {
    const r = scoreMcMulti('["a","c"]', OPTS, ['A', 'C'], 6)
    expect(r.awarded).toBe(6)
  })

  it('ungültige Option-IDs werden ignoriert', () => {
    const r = scoreMcMulti('["A","X","C"]', OPTS, ['A', 'C'], 6)
    expect(r.correctMarks).toBe(4) // X wird rausgefiltert, A+C richtig, B+D richtig nicht-markiert
    expect(r.awarded).toBe(6)
  })
})

