/**
 * gradingTemplates.ts — Wiederverwendbare Bewertungshinweis-Muster.
 *
 * MD §6.1 etabliert wortgleiche Korrekturhinweise in allen 20 ZPA-Lösungen
 * (z.B. "Die Lösungs- und Bewertungshinweise ... erheben nicht in jedem Fall
 * Anspruch auf Vollständigkeit und Ausschließlichkeit."). Parallel sind die
 * konkreten Bewertungsmuster ("je Entitätstyp 1P", "je korrektem Beispiel
 * 1/3 der Punkte") wiederkehrend — MD §5.1 durchgehend.
 *
 * Alle Funktionen nehmen optional einen `detail`-String, der fachspezifische
 * Ergänzungen transportiert (z.B. Lösungsbeispiele, Akzeptanzkriterien) —
 * damit bleibt die Rezept-Präzision erhalten, während das strukturelle
 * Bewertungsmuster aus EINER Quelle kommt.
 *
 * Autor: { name: "LetsGamingDE", id: 272402865874534400n }
 */

/** Hängt einen optionalen Detail-Satz an einen Basis-Hint an. */
function withDetail(base: string, detail?: string): string {
  return detail ? `${base} ${detail}` : base;
}

/**
 * Standard-Hinweis für Aufzählungsaufgaben ("Nennen Sie N ...").
 * MD-Muster: §5.1 W23/24 Aufg.1 "3 Testkonzept-Inhalte", §5.1 S25 Aufg.3
 * "3 Probleme + Digitalisierungslösung".
 */
export function enumerationHint(count: number, detail?: string): string {
  const fraction =
    count === 2 ? 'halbe Punkte' : count === 3 ? '1/3 der Punkte' : `1/${count} der Punkte`;
  return withDetail(
    `Je korrekter Punkt ${fraction}. Sinngemäß korrekte Antworten akzeptieren.`,
    detail,
  );
}

/**
 * Standard-Hinweis für "Nennen Sie je einen Vor-/Nachteil".
 * MD-Muster: §5.1 W22/23 T1d "Vor-/Nachteil zentrale Rechteverwaltung"; S25 T1
 * Aufg.4 "weiteres Entwurfsmuster".
 */
export function prosConsHint(detail?: string): string {
  return withDetail('Je Vor- oder Nachteil halbe Punkte. Stichworte reichen.', detail);
}

// HINWEIS: Ein generischer `calculationHint`-Helfer wurde versucht und wieder
// entfernt. Die vorhandenen Rechen-Bewertungs-Hints im Code haben jeweils
// individuelle Gewichtungs-Kategorien ("Vorwärtsrechnung", "Zwischenergebnisse",
// "Gesamtendtermin", "Ergebnis je Vorgang"), die sich nicht auf eine einheitliche
// path/result/unit-Struktur reduzieren lassen, ohne Information zu verlieren.
// Neue Rechen-Rezepte können einen Roh-String schreiben — eine Vereinheitlichung
// wäre erst sinnvoll, wenn mehrere Rezepte dieselbe Kategorien-Struktur teilen.

/**
 * Hinweis für Tabellen mit gleichgewichteten Spalten.
 * MD-Muster: §5.1 Stakeholder-Tabelle (Stakeholder/Erwartung/Befürchtung),
 * §5.1 Risikotabelle (Risiko/Ursache/Auswirkung).
 */
export function tableRowHint(
  rowCount: number,
  pointsPerRow: number,
  columns: string[],
  detail?: string,
): string {
  const colList = columns.join(' + ');
  return withDetail(
    `Je Zeile bis zu ${pointsPerRow}P (${colList}). Alternative plausible Einträge akzeptieren.`,
    detail,
  );
}

/**
 * Hinweis für SQL-Aufgaben (Gewichtung Syntax/Schema/Logik/Ergebnis).
 * MD-Muster: §5.2 durchgehend — SQL-Aufgaben werden granular bewertet.
 */
export function sqlHint(focus: 'select' | 'ddl' | 'dml' | 'aggregate', detail?: string): string {
  const base = (() => {
    switch (focus) {
      case 'select':
        return 'SELECT-Spalten 20% / JOIN-Bedingung 30% / WHERE/ORDER BY 30% / Alias-Verwendung 20%. Alternative korrekte Lösungen vollständig werten.';
      case 'ddl':
        return 'Tabellenname+Spaltennamen 20% / Datentypen 20% / PK-Constraint 20% / FK-Constraint mit REFERENCES 25% / NOT NULL/DEFAULT 15%.';
      case 'dml':
        return 'DML-Syntax korrekt 40% / Spaltennamen/Tabelle korrekt 30% / WHERE/Filter korrekt 30%. Fehlende WHERE-Klausel bei UPDATE/DELETE: kritischer Abzug.';
      case 'aggregate':
        return 'GROUP BY korrekt 25% / Aggregatfunktion 25% / HAVING korrekt 25% / ORDER BY 25%. Subquery-Varianten als Alternative akzeptieren.';
    }
  })();
  return withDetail(base, detail);
}

/**
 * Hinweis für Diagramm-Aufgaben (UML/ER).
 * MD-Muster: §5.1 ER-Modell S25 Aufg.2 "je Entitätstyp 1P, je Beziehung 2P".
 */
export function diagramHint(
  kind: 'er' | 'activity' | 'sequence' | 'class' | 'state',
  detail?: string,
): string {
  const base = (() => {
    switch (kind) {
      case 'er':
        return 'Je Entitätstyp 1P, je Primärschlüssel 0,5P, je Attribut 0,5P (max. 3P), je Beziehung mit Kardinalität 2P, Beziehungsattribute an m:n 1P je Attribut.';
      case 'activity':
        return 'Je Aktivität 1P, je Entscheidung/Verzweigung mit Bedingung 2P, Synchronisierungsbalken 2P, Start+Ende 2P, Swimlanes 2P. Alternative Darstellungen akzeptieren.';
      case 'sequence':
        return 'Je Lifeline 1P, je Nachricht 1P, Rückgaben 2P, opt/alt-Block 2P, loop-Block 2P, korrekte Reihenfolge 3P.';
      case 'class':
        return 'Je Klasse mit Attributen 2P, je Methode 1P, Vererbungs-/Kompositionsbeziehung 2P, Sichtbarkeitsmodifikatoren 1P.';
      case 'state':
        return 'Je Zustand 2P, je Transition mit Bedingung 2P, Start-/Endzustand 2P.';
    }
  })();
  return withDetail(base, detail);
}

/**
 * Standard-Boilerplate, wortgleich mit ZPA-Korrekturhinweisen.
 * MD §6.1: wortgleich in allen 20 ZPA-Lösungsdokumenten.
 * Wird vom Grader-System-Prompt (ai/prompts/gradingSystem.ts) als erste
 * Bewertungsregel eingefügt — damit der Prüfer-LLM die originale IHK-Haltung
 * übernimmt, statt nur paraphrasierter Fairness-Regeln.
 */
export const ZPA_CORRECTION_DISCLAIMER =
  'Die Lösungs- und Bewertungshinweise sind als Korrekturhilfen zu verstehen und erheben nicht in jedem Fall Anspruch auf Vollständigkeit und Ausschließlichkeit. Zu beachten ist die unterschiedliche Dimension der Aufgabenstellung (nennen – erklären – beschreiben – erläutern usw.).';
