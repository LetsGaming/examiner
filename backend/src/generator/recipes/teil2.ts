/**
 * recipes/teil2.ts — Aufgaben-Rezepte für AP2 Teil 2 "Entwicklung und Umsetzung von Algorithmen".
 *
 * Fokus: SQL, Pseudocode, OOP-Codebeispiele, UML-Sequenzdiagramme, Speicherberechnung.
 * Referenz-MD §5.2 (Prüfungen W2021/22 bis S2025).
 *
 * Autor: { name: "LetsGamingDE", id: 272402865874534400n }
 */

import type { TaskRecipe } from '../types.js';

export const RECIPES_TEIL2: TaskRecipe[] = [
  // SQL SELECT mit JOIN (mit vollständigen Tabellendaten — IHK-Pflicht)
  {
    id: 't2_sql_join',
    weight: 10,
    topicKeywords: ['SQL', 'JOIN', 'SELECT'],
    subtasks: [
      {
        taskType: 'freitext',
        prompt:
          'Erläutern Sie den Zweck eines JOIN und nennen Sie mindestens 2 JOIN-Arten mit je einem Satz Beschreibung.',
        points: [4, 6],
        operator: 'erlaeutern',
        gradingHint:
          'Verknüpfung von Tabellen auf Basis von PK/FK + INNER/LEFT/RIGHT/FULL je mit Beschreibung = volle Punkte.',
      },
      {
        taskType: 'sql',
        // Die Tabellendaten MÜSSEN im questionText landen — das erzwingt das buildUserPrompt + buildSystemPrompt.
        prompt:
          'Im questionText sind die Tabellenstrukturen mit Beispieldaten gegeben. Erstellen Sie eine SQL-SELECT-Abfrage mit einem JOIN über die angegebenen Tabellen. Geben Sie Nachname, Vorname und eine weitere relevante Information aus, gefiltert und sortiert nach einem sinnvollen Kriterium.',
        points: [12, 16],
        operator: 'entwerfen',
        gradingHint:
          'SELECT-Spalten 20% / JOIN-Bedingung mit richtigen Spalten 30% / WHERE/ORDER BY 30% / Alias-Verwendung 20%. Alternative korrekte Lösungen vollständig werten.',
      },
      {
        taskType: 'freitext',
        prompt:
          'Beschreiben Sie zwei konkrete Maßnahmen, mit denen die Performance der erstellten SQL-Abfrage verbessert werden könnte.',
        points: [4, 6],
        operator: 'beschreiben',
        gradingHint:
          'Je Maßnahme halbe Punkte. Z.B.: Index auf JOIN-Spalten, nur benötigte Spalten selektieren, WHERE vor JOIN anwenden, EXPLAIN nutzen.',
      },
    ],
  },

  // SQL GROUP BY / Aggregation (S25-Stil: komplexe Auswertung mit Ergebnisbeispiel)
  {
    id: 't2_sql_groupby',
    weight: 7,
    topicKeywords: ['SQL', 'GROUP BY', 'Aggregation', 'Aggregat'],
    subtasks: [
      {
        taskType: 'freitext',
        prompt: 'Nennen Sie 3 SQL-Aggregatfunktionen und erläutern Sie jeweils kurz deren Zweck.',
        points: 6,
        operator: 'nennen',
        cascade: true,
        gradingHint:
          'COUNT/SUM/AVG/MIN/MAX — je 2P für korrekten Namen + treffende Kurzbeschreibung.',
      },
      {
        taskType: 'freitext',
        prompt:
          'Erläutern Sie den Unterschied zwischen WHERE und HAVING anhand eines konkreten Beispiels.',
        points: 4,
        operator: 'erlaeutern',
        cascade: true,
        gradingHint:
          'WHERE filtert Zeilen vor Aggregation. HAVING filtert nach Aggregation. Beispiel muss beide zeigen.',
      },
      {
        taskType: 'sql',
        prompt:
          'Im questionText sind Tabellendaten gegeben. Erstellen Sie eine SQL-Abfrage, die für jeden Datensatz-Typ die Anzahl und einen Durchschnittswert ermittelt. Sortieren Sie absteigend nach der Anzahl. Zeigen Sie nur Gruppen mit mindestens 3 Einträgen.',
        points: [12, 16],
        operator: 'entwerfen',
        gradingHint:
          'GROUP BY korrekt 25% / COUNT/AVG korrekt 25% / HAVING COUNT>=3 korrekt 25% / ORDER BY DESC 25%. Subquery-Variante als Alternative akzeptieren.',
      },
    ],
  },

  // SQL DML-Mix: INSERT + GRANT + REVOKE + UPDATE/ALTER (S25 T2 Aufg. 4-Muster)
  {
    id: 't2_sql_dml_mix',
    weight: 8,
    topicKeywords: ['SQL', 'UPDATE', 'DELETE', 'INSERT', 'GRANT', 'REVOKE', 'ALTER'],
    subtasks: [
      {
        taskType: 'sql',
        prompt:
          'Im questionText sind Tabellendaten gegeben. Fügen Sie einen neuen Datensatz mit den angegebenen Werten in die Tabelle ein.',
        points: 3,
        operator: 'entwerfen',
        cascade: true,
        gradingHint:
          'INSERT INTO ... (Spalten) VALUES (Werte) — Spaltennamen korrekt, Werte in richtiger Reihenfolge = volle Punkte.',
      },
      {
        taskType: 'sql',
        prompt:
          'Gewähren Sie dem angegebenen Datenbankbenutzer Schreibrechte (INSERT, UPDATE) auf die genannte Tabelle.',
        points: 3,
        operator: 'entwerfen',
        cascade: true,
        gradingHint:
          'GRANT INSERT, UPDATE ON datenbank.tabelle TO "benutzer" = volle Punkte. Datenbankname vergessen = halbe Punkte.',
      },
      {
        taskType: 'sql',
        prompt: 'Entziehen Sie einem anderen Benutzer die Schreibrechte auf die genannte Tabelle.',
        points: 3,
        operator: 'entwerfen',
        cascade: true,
        gradingHint: 'REVOKE INSERT, UPDATE ON datenbank.tabelle FROM "benutzer" = volle Punkte.',
      },
      {
        taskType: 'sql',
        prompt:
          'Eine Spalte der Tabelle soll zu einem Pflichtfeld werden. Vorher sollen fehlende Werte mit einem Standardwert befüllt werden. Schreiben Sie beide notwendigen SQL-Anweisungen.',
        points: 5,
        operator: 'entwerfen',
        gradingHint:
          'UPDATE tabelle SET spalte = "standard" WHERE spalte IS NULL (2P) + ALTER TABLE tabelle MODIFY spalte TYP NOT NULL (3P). Reihenfolge muss korrekt sein.',
      },
    ],
  },

  // CREATE TABLE (DDL) + Abfrage
  {
    id: 't2_sql_create',
    weight: 5,
    topicKeywords: ['SQL', 'CREATE TABLE', 'DDL'],
    subtasks: [
      {
        taskType: 'freitext',
        prompt:
          'Erläutern Sie den Unterschied zwischen DDL und DML und nennen Sie jeweils zwei konkrete SQL-Befehle als Beispiele.',
        points: [4, 6],
        operator: 'erlaeutern',
        gradingHint:
          'DDL=Struktur (CREATE/ALTER/DROP), DML=Daten (SELECT/INSERT/UPDATE/DELETE). Je Kategorie mind. 2 Befehle = volle Punkte.',
      },
      {
        taskType: 'sql',
        prompt:
          'Im questionText sind die Anforderungen an eine neue Tabelle beschrieben. Schreiben Sie das vollständige CREATE TABLE-Statement mit Primärschlüssel, Fremdschlüssel und passenden Datentypen.',
        points: [13, 17],
        operator: 'entwerfen',
        gradingHint:
          'Tabellenname+Spaltennamen 20% / Datentypen korrekt 20% / PK-Constraint 20% / FK-Constraint mit REFERENCES 25% / NOT NULL/DEFAULT wo sinnvoll 15%.',
      },
      {
        taskType: 'table',
        prompt:
          'Tragen Sie für 3 der definierten Attribute den passenden Datentyp und eine kurze Begründung ein.',
        points: [3, 4],
        operator: 'nennen',
        tableColumns: ['Attribut', 'Datentyp', 'Begründung'],
        tableRowCount: 3,
        tableKind: 'guided',
        tableDescription:
          'Datentyp-Tabelle: je Zeile 1 konkretes Attribut aus dem Szenario, der SQL-Datentyp und eine 1-Satz-Begründung.',
        gradingHint:
          'Je vollständige Zeile (Attribut + korrekter Typ + Begründung) 1/3 der Punkte. VarChar/String/Text als Synonyme akzeptieren.',
      },
    ],
  },

  // Pseudocode-Fehler finden + korrigieren (W22/23, W23/24-Muster)
  {
    id: 't2_pseudocode_debug',
    weight: 7,
    topicKeywords: ['Pseudocode', 'Rekursion', 'Algorithmus', 'Fehler'],
    subtasks: [
      {
        taskType: 'freitext',
        prompt:
          'Im questionText ist ein Pseudocode-Fragment mit Zeilennummern und eine Klassen-/Methodenbeschreibung gegeben. Führen Sie den Algorithmus für zwei konkrete Eingaben gedanklich aus. Geben Sie für jede Eingabe den erwarteten und den tatsächlich berechneten Rückgabewert an.',
        points: [4, 6],
        operator: 'identifizieren',
        gradingHint:
          'Je Testfall 2–3P: Eingabe korrekt benannt + erwartetes Ergebnis + tatsächliches (fehlerhaftes) Ergebnis. Wenn nur ein Testfall korrekt: halbe Punkte.',
      },
      {
        taskType: 'freitext',
        prompt:
          'Benennen Sie die fehlerhafte Zeile (Zeilennummer) und beschreiben Sie die Art des Fehlers. Geben Sie die korrigierte Version dieser Zeile an.',
        points: [4, 6],
        operator: 'identifizieren',
        gradingHint:
          '50% für Fehlerbeschreibung mit korrekter Zeilennummer, 50% für die korrekte Korrektur.',
      },
      {
        taskType: 'freitext',
        prompt:
          'Erläutern Sie den Begriff „Anweisungsüberdeckung" (Statement Coverage) und nennen Sie, wie viele Testfälle für den gegebenen Code minimal nötig sind, um sie zu erreichen.',
        points: [3, 4],
        operator: 'erlaeutern',
        cascade: true,
        gradingHint:
          'Definition: jede Anweisung wird mind. 1× ausgeführt (2P) + korrekte Anzahl Testfälle (1–2P).',
      },
      {
        taskType: 'freitext',
        prompt:
          'Nennen Sie je einen Vor- und einen Nachteil rekursiver Algorithmen im Vergleich zu iterativen Lösungen.',
        points: [3, 4],
        operator: 'nennen',
        cascade: true,
        gradingHint:
          'Vorteil: Eleganz/Lesbarkeit/Natürlichkeit der Darstellung. Nachteil: Speicherverbrauch (Stack)/Stack Overflow/ggf. langsamer.',
      },
    ],
  },

  // Pseudocode entwerfen mit Klassenkontext (S25 T2 Aufg. 1-Muster)
  {
    id: 't2_pseudocode_entwurf',
    weight: 6,
    topicKeywords: ['Pseudocode', 'Algorithmus', 'Sortier', 'Such'],
    subtasks: [
      {
        taskType: 'freitext',
        prompt:
          'Im questionText sind die Klassen mit ihren Attributen und get-Methoden sowie der Funktionskopf gegeben. Beschreiben Sie den Algorithmus in eigenen Worten: Welche Schritte führt die Funktion durch? Welche Schleifenstruktur und welche Abbruchbedingung nutzt sie?',
        points: [5, 7],
        operator: 'beschreiben',
        gradingHint:
          'Kernschritte vollständig (2P) + Schleifentyp korrekt (2P) + Abbruchbedingung korrekt (1–3P).',
      },
      {
        taskType: 'pseudocode',
        prompt:
          'Implementieren Sie die im questionText beschriebene Funktion als Pseudocode. Verwenden Sie den vorgegebenen Funktionskopf, die Klassenattribute mit get-Methoden und IHK-typische Pseudocode-Konstrukte (solange/ende solange, für/ende für, wenn/sonst/ende wenn, return).',
        points: [12, 16],
        operator: 'entwerfen',
        gradingHint:
          'Funktionskopf/Rückgabe 10% / Schleifenstruktur 30% / Zugriff auf Objekte per get-Methode 30% / Korrektheit bei Testfällen 30%. Syntaktische Varianten (while/for) akzeptieren.',
      },
      {
        taskType: 'freitext',
        prompt:
          'Geben Sie die Zeitkomplexität Ihrer Lösung in O-Notation an und begründen Sie kurz, wie Sie diese ableiten.',
        points: [3, 5],
        operator: 'berechnen',
        gradingHint:
          'Korrekte O-Notation (z.B. O(n), O(n²)) + kurze Herleitung (Anzahl Schleifendurchläufe) = volle Punkte.',
      },
    ],
  },

  // Speicherberechnung (W23/24 Aufgabe 3b — sehr IHK-typisch)
  {
    id: 't2_speicherberechnung',
    weight: 4,
    topicKeywords: ['Speicher', 'Speicherbedarf', 'Kodierung', 'Datenmenge'],
    subtasks: [
      {
        taskType: 'freitext',
        prompt:
          'Berechnen Sie den Speicherbedarf für das beschriebene Datenvolumen. Zeigen Sie den Rechenweg vollständig. Geben Sie das Ergebnis in einer passenden Einheit (KiB/MiB/GiB) an.',
        points: [10, 14],
        operator: 'berechnen',
        gradingHint: 'Rechenweg 60% / korrektes Ergebnis 40%. Rundungsdifferenzen akzeptieren.',
      },
      {
        taskType: 'freitext',
        prompt:
          'Erläutern Sie den Unterschied zwischen KB/MB/GB (dezimal) und KiB/MiB/GiB (binär).',
        points: [3, 4],
        operator: 'erlaeutern',
        gradingHint:
          'Dezimal: 1000er-Schritte. Binär: 1024er-Schritte. Beide Konzepte = volle Punkte.',
      },
      {
        taskType: 'freitext',
        prompt:
          'Nennen Sie 2 Möglichkeiten, den Speicherbedarf des beschriebenen Datentyps zu reduzieren.',
        points: [3, 4],
        operator: 'nennen',
        gradingHint:
          'Kompression, geringere Auflösung, effizientere Kodierung, Delta-Encoding — je 1 Ansatz halbe Punkte.',
      },
    ],
  },

  // OOP Codebeispiel (S22 T1 Aufg. 3-Muster: Observer-Pattern mit Sequenzdiagramm + Code)
  {
    id: 't2_oop_code',
    weight: 6,
    topicKeywords: [
      'OOP',
      'Vererbung',
      'Polymorphismus',
      'Klasse',
      'Interface',
      'generisch',
      'Observer',
      'Entwurfsmuster',
    ],
    subtasks: [
      {
        taskType: 'plantuml',
        // questionText muss schrittweise Ablaufbeschreibung + Klassenausschnitt enthalten
        prompt:
          'Im questionText ist ein Ablauf mit Objekt-Interaktionen und ein teilweise gegebenes Klassendiagramm beschrieben. Ergänzen Sie das Sequenzdiagramm um alle noch fehlenden Methodenaufrufe gemäß der Ablaufbeschreibung.',
        points: [9, 12],
        operator: 'entwerfen',
        diagramType: 'uml_sequence',
        gradingHint:
          'Je fehlende Nachricht mit korrektem Namen 1P, Rückgaben 1P, Reihenfolge korrekt 2P, opt/loop-Blöcke korrekt 2P.',
      },
      {
        taskType: 'pseudocode',
        prompt:
          'Im questionText ist eine Methode aus dem Klassendiagramm hervorgehoben. Implementieren Sie diese Methode in Pseudocode. Nutzen Sie die beschriebenen Objekte und deren Methoden aus dem Klassendiagramm.',
        points: [4, 6],
        operator: 'entwerfen',
        gradingHint:
          'Schleife über Listenelemente 2P / korrekter Methoden-Aufruf je Element 2P / Struktur vollständig 2P.',
      },
      {
        taskType: 'freitext',
        prompt:
          'Erläutern Sie den Begriff Polymorphismus und geben Sie an, wo er im beschriebenen Klassendiagramm zum Einsatz kommt.',
        points: [3, 5],
        operator: 'erlaeutern',
        gradingHint:
          'Definition: verschiedene Klassen überschreiben dieselbe Methode der Basisklasse 2P + konkreter Bezug zum Diagramm 1–3P.',
      },
    ],
  },

  // Relationales Datenmodell + SQL
  {
    id: 't2_relmodell_sql',
    weight: 5,
    topicKeywords: ['relational', 'Datenmodell', 'Normalisierung', 'SQL'],
    subtasks: [
      {
        taskType: 'table',
        prompt:
          'Erstellen Sie das relationale Datenmodell in Tabellenform für das beschriebene Szenario (mindestens 3 Tabellen).',
        points: [12, 16],
        operator: 'entwerfen',
        tableColumns: ['Tabellenname', 'Attribute (PK, FK, Datentyp)', 'Beziehung'],
        tableRowCount: 4,
        tableKind: 'guided',
        tableDescription:
          'Datenmodell-Tabelle: je Zeile 1 Tabelle mit Name, Attributen (PK/FK markiert, Datentyp) und Beziehungsangaben (z.B. 1:n zu kunde).',
        gradingHint:
          'Je Tabelle mit allen Attributen 1P, je PK 1P, je FK 1P, je Beziehung mit Kardinalität 1P. Alternative Strukturen akzeptieren.',
      },
      {
        taskType: 'sql',
        prompt: 'Schreiben Sie eine SQL-Abfrage, die zwei Ihrer Tabellen mit einem JOIN verknüpft.',
        points: [6, 9],
        operator: 'entwerfen',
        gradingHint: 'JOIN-Bedingung 40% / Spaltenauswahl 30% / WHERE falls sinnvoll 30%.',
      },
      {
        taskType: 'freitext',
        prompt:
          'Erläutern Sie, welche Normalform Ihr Modell erfüllt (1NF/2NF/3NF) und begründen Sie kurz.',
        points: [3, 4],
        operator: 'erlaeutern',
        gradingHint: 'Nennung der Normalform + passende Begründung = volle Punkte.',
      },
    ],
  },

  // ACID-Tabelle (S25 Aufgabe 3a, W23/24 Aufgabe 3a)
  {
    id: 't2_acid',
    weight: 4,
    topicKeywords: ['ACID', 'Transaktion', 'Datenbank'],
    subtasks: [
      {
        taskType: 'table',
        prompt: 'Erläutern Sie die vier ACID-Eigenschaften. Die Eigenschaftsnamen sind vorgegeben.',
        points: [8, 12],
        operator: 'erlaeutern',
        tableColumns: ['Eigenschaft', 'Bedeutung', 'Beispiel'],
        tableRowCount: 4,
        fixedFirstColumn: true,
        fixedFirstColumnValues: ['Atomicity', 'Consistency', 'Isolation', 'Durability'],
        tableKind: 'fixed',
        tableDescription:
          'ACID-Tabelle: erste Spalte fix (Atomicity/Consistency/Isolation/Durability), Spalten 2 und 3 werden vom Prüfling ausgefüllt.',
        gradingHint:
          'Je Eigenschaft Bedeutung 1P, Beispiel 1P. Sinngemäße Erläuterungen akzeptieren.',
      },
      {
        taskType: 'freitext',
        prompt:
          'Erläutern Sie, welche Probleme entstehen können, wenn die Isolation-Eigenschaft verletzt wird.',
        points: [4, 6],
        operator: 'erlaeutern',
        gradingHint:
          'Lost Update / Dirty Read / Non-Repeatable Read / Phantom Read — je Phänomen Teilpunkte.',
      },
      {
        taskType: 'freitext',
        prompt:
          'Nennen Sie einen konkreten Mechanismus, mit dem Datenbanksysteme Isolation sicherstellen.',
        points: [3, 4],
        operator: 'nennen',
        gradingHint:
          'Sperrverfahren (Locks) / MVCC / Transactional Isolation Levels — jeweils = volle Punkte.',
      },
    ],
  },

  // XML / JSON Fehler finden (W22/23 Teil 1 Aufgabe 3c war XML-Validierung)
  {
    id: 't2_xml_fehler',
    weight: 3,
    topicKeywords: ['XML', 'JSON', 'DTD', 'Wohlgeformtheit', 'Datenformat'],
    subtasks: [
      {
        taskType: 'freitext',
        prompt:
          'Erläutern Sie den Unterschied zwischen „wohlgeformt" und „gültig" bei XML-Dokumenten.',
        points: [4, 6],
        operator: 'erlaeutern',
        gradingHint:
          'Wohlgeformt = XML-Regeln eingehalten. Gültig = zusätzlich DTD/Schema erfüllt. Beide Konzepte = volle Punkte.',
      },
      {
        taskType: 'table',
        prompt:
          'Im questionText ist ein fehlerhaftes XML-Dokument mit Zeilennummern gegeben. Tragen Sie die Fehler mit Zeile, Beschreibung und Fehlerart (Wohlgeformtheit/Gültigkeit) in die Tabelle ein.',
        points: [10, 14],
        operator: 'identifizieren',
        tableColumns: ['Zeile', 'Beschreibung', 'Fehlerart (Wohlgeformt/Gültig)'],
        tableRowCount: 5,
        tableKind: 'guided',
        tableDescription:
          'XML-Fehlertabelle: je Zeile 1 Fehler mit Zeilennummer + kurzer Beschreibung + Fehlerart.',
        gradingHint:
          'Je vollständige Zeile (alle 3 Spalten korrekt) 2P. Teilpunkte bei 2 von 3 Spalten.',
      },
      {
        taskType: 'freitext',
        prompt: 'Erläutern Sie, wofür eine DTD in XML verwendet wird.',
        points: [3, 4],
        operator: 'erlaeutern',
        gradingHint:
          'Vokabular + Grammatik festlegen + Dokumentinstanz-Validierung = volle Punkte.',
      },
    ],
  },

  // UML-Sequenzdiagramm ergänzen (S25 T2 Aufg. 2-Muster, S22 T1 Aufg. 3c-Muster)
  {
    id: 't2_uml_sequenz',
    weight: 4,
    containsDiagram: true,
    topicKeywords: ['Sequenzdiagramm', 'UML', 'Klassendiagramm'],
    subtasks: [
      {
        taskType: 'plantuml',
        // questionText muss: Klassenausschnitt + schrittweise Vorgangsbeschreibung liefern
        prompt:
          'Im questionText sind die beteiligten Klassen mit ihren Methoden und eine schrittweise Vorgangsbeschreibung (Bullet-Points) gegeben. Ergänzen Sie das UML-Sequenzdiagramm um alle noch nicht dargestellten Methodenaufrufe. Zeichnen Sie Lebenslinien, synchrone Nachrichten, Rückgaben, und — falls laut Beschreibung vorhanden — optionale Blöcke (opt/alt) oder Schleifen (loop).',
        points: [13, 19],
        operator: 'entwerfen',
        diagramType: 'uml_sequence',
        gradingHint:
          'Je Lifeline 1P, je Nachricht mit korrektem Namen 1P, Rückgaben 2P, opt/alt-Block korrekt 2P, loop-Block korrekt 2P, korrekte Reihenfolge 3P.',
      },
      {
        taskType: 'freitext',
        prompt:
          'Beschreiben Sie, welche Art der Testüberdeckung (Coverage) für die Methode im Mittelpunkt des Sequenzdiagramms geeignet ist, und begründen Sie Ihre Wahl.',
        points: [2, 4],
        operator: 'beschreiben',
        gradingHint:
          'Zweigüberdeckung bevorzugt bei opt/alt-Strukturen. Anweisungsüberdeckung als Minimum. Pfadüberdeckung bei Schleifen oft nicht realistisch.',
      },
      {
        taskType: 'freitext',
        prompt:
          'Beschreiben Sie, was einen Whitebox-Test auszeichnet und wie er sich vom Blackbox-Test unterscheidet.',
        points: [2, 3],
        operator: 'beschreiben',
        gradingHint:
          'Whitebox: Testdaten basieren auf Codestruktur/Quelltext. Blackbox: nur Ein-/Ausgabeverhalten, ohne Kenntnis des Codes. Beide Aspekte = volle Punkte.',
      },
    ],
  },
];
