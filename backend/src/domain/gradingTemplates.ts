/**
 * gradingTemplates.ts — Wiederverwendbare Bewertungshinweis-Muster.
 *
 * MD §6.1 etabliert wortgleiche Korrekturhinweise in allen 20 ZPA-Lösungen
 * (z.B. "Die Lösungs- und Bewertungshinweise ... erheben nicht in jedem Fall
 * Anspruch auf Vollständigkeit und Ausschließlichkeit."). Parallel sind die
 * konkreten Bewertungsmuster ("je Entitätstyp 1P", "je korrektem Beispiel
 * 1/3 der Punkte") wiederkehrend — MD §5.1 durchgehend.
 *
 * Statt diese Muster in jedem Rezept neu zu tippen, liefern die Funktionen
 * hier konsistente Formulierungen. Rezepte rufen `enumerationHint(3)` statt
 * manuell "Je korrekter Punkt 1/3 der Punkte" zu schreiben.
 *
 * Autor: { name: "LetsGamingDE", id: 272402865874534400n }
 */

/**
 * Standard-Hinweis für Aufzählungsaufgaben ("Nennen Sie 3 ...").
 * MD-Muster: §5.1 W23/24 Aufg.1 "3 Testkonzept-Inhalte", §5.1 S25 Aufg.3
 * "3 Probleme + Digitalisierungslösung".
 */
export function enumerationHint(count: number, qualifier?: string): string {
  const fraction = count === 2 ? 'halbe Punkte' : count === 3 ? '1/3 der Punkte' : `1/${count} der Punkte`;
  const q = qualifier ? ` ${qualifier}` : '';
  return `Je korrekter Punkt ${fraction}. Sinngemäß korrekte Antworten akzeptieren.${q}`;
}

/**
 * Standard-Hinweis für "Nennen Sie je einen Vor-/Nachteil".
 * MD-Muster: §5.1 W22/23 T1d "Vor-/Nachteil zentrale Rechteverwaltung"; S25 T1
 * Aufg.4 "weiteres Entwurfsmuster".
 */
export function prosConsHint(): string {
  return 'Je Vor- oder Nachteil halbe Punkte. Stichworte reichen.';
}

/**
 * Hinweis für Berechnungsaufgaben.
 * MD-Muster: §5.2 W23/24 Aufg.3b "582 GiB Speicher"; §5.3 Lohn-/SV-Berechnungen
 * mit konkretem Rechenweg + Ergebnis.
 */
export function calculationHint(weights?: {
  path?: number;
  result?: number;
  unit?: number;
}): string {
  const w = { path: 50, result: 40, unit: 10, ...weights };
  return `Rechenweg ${w.path}% / korrektes Ergebnis ${w.result}% / Einheit ${w.unit}%. Folgefehler nur einmal abziehen.`;
}

/**
 * Hinweis für Tabellen mit gleichgewichteten Spalten.
 * MD-Muster: §5.1 Stakeholder-Tabelle (Stakeholder/Erwartung/Befürchtung),
 * §5.1 Risikotabelle (Risiko/Ursache/Auswirkung).
 */
export function tableRowHint(
  rowCount: number,
  pointsPerRow: number,
  columns: string[],
): string {
  const colList = columns.join(' + ');
  return `Je Zeile bis zu ${pointsPerRow}P (${colList}). Alternative plausible Einträge akzeptieren.`;
}

/**
 * Hinweis für SQL-Aufgaben (Gewichtung Syntax/Schema/Logik/Ergebnis).
 * MD-Muster: §5.2 durchgehend — SQL-Aufgaben werden granular bewertet.
 */
export function sqlHint(focus: 'select' | 'ddl' | 'dml' | 'aggregate'): string {
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
}

/**
 * Hinweis für Diagramm-Aufgaben (UML/ER).
 * MD-Muster: §5.1 ER-Modell S25 Aufg.2 "je Entitätstyp 1P, je Beziehung 2P".
 */
export function diagramHint(kind: 'er' | 'activity' | 'sequence' | 'class' | 'state'): string {
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
}

/**
 * Standard-Boilerplate, wortgleich mit ZPA-Korrekturhinweisen.
 * MD §6.1: wortgleich in allen 20 ZPA-Lösungsdokumenten.
 */
export const ZPA_CORRECTION_DISCLAIMER =
  'Die Lösungs- und Bewertungshinweise sind als Korrekturhilfen zu verstehen und erheben nicht in jedem Fall Anspruch auf Vollständigkeit und Ausschließlichkeit. Zu beachten ist die unterschiedliche Dimension der Aufgabenstellung (nennen – erklären – beschreiben – erläutern usw.).';
