/**
 * recipes/teil1.ts — Aufgaben-Rezepte für AP2 Teil 1 "Planen eines Softwareproduktes".
 *
 * Alle Rezepte sind an realen AP2-Prüfungen 2019–2025 nachempfunden (Referenz-MD §5.1).
 * Die kaskadierte Label-Struktur (aa/ab/ac, ba/bb) entspricht dem echten IHK-Muster
 * (MD §2, §5.1 W23/24 Aufg.2).
 *
 * Autor: { name: "LetsGamingDE", id: 272402865874534400n }
 */

import type { TaskRecipe } from '../types.js';

export const RECIPES_TEIL1: TaskRecipe[] = [
  // Klassisches 3-Subtask-Muster: a) Konzept erläutern, b) Konkretisierung, c) Vergleich
  {
    id: 't1_konzept_3',
    weight: 10,
    subtasks: [
      {
        taskType: 'freitext',
        prompt: 'Erläutern Sie das Konzept im Kontext von {{UNTERNEHMEN}} in 3–4 Sätzen.',
        points: [6, 8],
        operator: 'erlaeutern',
        gradingHint:
          'Erläuterung: Kernidee korrekt + mindestens ein Begründungsaspekt im Unternehmenskontext.',
      },
      {
        taskType: 'freitext',
        prompt:
          'Nennen Sie 3 konkrete Beispiele oder Ausprägungen und beschreiben Sie diese jeweils kurz (1–2 Sätze).',
        points: [9, 12],
        operator: 'beschreiben',
        gradingHint:
          'Je korrektem Beispiel mit Kurzbeschreibung 1/3 der Punkte. Sinngemäße Bezüge reichen.',
      },
      {
        taskType: 'freitext',
        prompt: 'Nennen Sie einen Vor- und einen Nachteil des beschriebenen Vorgehens.',
        points: [4, 6],
        operator: 'nennen',
        gradingHint: 'Je Vor- oder Nachteil die Hälfte der Punkte. Stichworte reichen.',
      },
    ],
  },

  // Stakeholder-Tabelle mit Vertiefung — sehr IHK-typisch (W22/23, S25)
  {
    id: 't1_stakeholder',
    weight: 8,
    topicKeywords: ['Stakeholder', 'Anforderung', 'Projekt'],
    subtasks: [
      {
        taskType: 'table',
        prompt:
          'Nennen Sie 3 Stakeholder des Projekts und beschreiben Sie je Stakeholder eine Erwartung und eine Befürchtung.',
        points: [9, 12],
        operator: 'beschreiben',
        tableColumns: ['Stakeholder', 'Erwartung', 'Befürchtung'],
        tableRowCount: 3,
        tableKind: 'guided',
        tableDescription:
          'Stakeholder-Tabelle: je Zeile 1 konkreter Stakeholder (Rolle oder Person) mit 1 Erwartung und 1 Befürchtung. Alle Einträge beziehen sich auf das konkrete Projekt bei {{UNTERNEHMEN}}.',
        gradingHint:
          'Je Zeile bis zu 4 Punkte: 1P Stakeholder, 2P Erwartung, 2P Befürchtung. Alternative Stakeholder mit plausibler Begründung auch korrekt.',
      },
      {
        taskType: 'freitext',
        prompt:
          'Beschreiben Sie, wie Sie mit einem Stakeholder mit geringem Einfluss aber hohem Interesse umgehen.',
        points: [4, 6],
        operator: 'beschreiben',
        gradingHint:
          'Ein plausibler Umgangsansatz (z.B. regelmäßige Information) reicht für volle Punkte.',
      },
      {
        taskType: 'freitext',
        prompt: 'Erläutern Sie, warum eine frühzeitige Stakeholder-Analyse wichtig ist.',
        points: [4, 6],
        operator: 'erlaeutern',
        gradingHint:
          'Zwei plausible Begründungen (Risikominimierung, frühes Feedback, ...) → volle Punkte.',
      },
    ],
  },

  // Umfeldanalyse (technisch + rechtlich) — S25 Aufgabe 1a
  {
    id: 't1_umfeldanalyse',
    weight: 5,
    topicKeywords: ['Umfeld', 'Anforderung'],
    subtasks: [
      {
        taskType: 'freitext',
        prompt:
          'Erläutern Sie je einen Aspekt Ihrer Umfeldanalyse aus den Bereichen „technisches Umfeld" und „rechtliches Umfeld" für das Projekt bei {{UNTERNEHMEN}}.',
        points: [6, 8],
        operator: 'erlaeutern',
        gradingHint:
          'Je Bereich 1 passender Aspekt + Erläuterung = halbe Punkte. Beispiele: technisch → bestehende Hardware/Netzwerk; rechtlich → DSGVO, Datenschutz.',
      },
      {
        taskType: 'freitext',
        prompt: 'Nennen Sie 3 funktionale und 3 nicht-funktionale Anforderungen an das Projekt.',
        points: [10, 14],
        operator: 'nennen',
        gradingHint:
          'Je Anforderung 1/6 der Punkte. Keine scharfe Trennung verlangen, sinngemäß korrekte Zuordnung reicht.',
      },
      {
        taskType: 'freitext',
        prompt:
          'Beschreiben Sie kurz, welche Aufgaben zur Vorbereitung des Projektabschluss-Protokolls durchzuführen sind.',
        points: [4, 6],
        operator: 'beschreiben',
        gradingHint:
          'Soll-Ist-Vergleich + Folgemaßnahmen identifizieren = volle Punkte. Auch "Lessons Learned" zulässig.',
      },
    ],
  },

  // User Stories + INVEST (kaskadiert aa, ab, ac, b) — W23/24 Aufgabe 2
  {
    id: 't1_user_stories',
    weight: 6,
    topicKeywords: ['User Story', 'INVEST', 'Anforderung'],
    subtasks: [
      {
        taskType: 'freitext',
        prompt: 'Nennen Sie die Rolle, die typischerweise User Stories schreibt.',
        points: 1,
        operator: 'nennen',
        cascade: true,
        gradingHint: 'Product Owner / Produktverantwortlicher / Teammitglied = korrekt.',
      },
      {
        taskType: 'freitext',
        prompt: 'Beschreiben Sie den typischen Aufbau einer User Story.',
        points: 3,
        operator: 'beschreiben',
        cascade: true,
        gradingHint:
          'Als <Rolle> möchte ich <Ziel>, damit <Nutzen>. Drei Bestandteile = volle Punkte.',
      },
      {
        taskType: 'freitext',
        prompt: 'Erläutern Sie die 6 Buchstaben der INVEST-Regel in je einem Satz.',
        points: 6,
        operator: 'erlaeutern',
        cascade: true,
        gradingHint:
          'Je Buchstabe 1 Punkt: Independent / Negotiable / Valuable / Estimable / Small / Testable.',
      },
      {
        taskType: 'freitext',
        prompt:
          'Formulieren Sie 2 User Stories für eine zentrale Funktion des Projekts bei {{UNTERNEHMEN}}.',
        points: [6, 8],
        operator: 'entwerfen',
        gradingHint: 'Je Story mit allen 3 Bestandteilen (Rolle, Ziel, Nutzen) = halbe Punkte.',
      },
    ],
  },

  // Vergleich (Wasserfall vs. Scrum, NoSQL vs. SQL, usw.) + Entscheidung (S22 T1 Muster)
  {
    id: 't1_vergleich',
    weight: 7,
    topicKeywords: [
      'Vergleich',
      'Vorgehensmodell',
      'Scrum',
      'Wasserfall',
      'NoSQL',
      'Datenbank',
      'agil',
      'klassisch',
    ],
    subtasks: [
      {
        taskType: 'freitext',
        prompt:
          'Im questionText ist ein konkreter Entscheidungskontext bei {{UNTERNEHMEN}} beschrieben. Erläutern Sie die wesentlichen Unterschiede zwischen den beiden verglichenen Konzepten (z.B. klassisch vs. agil, SQL vs. NoSQL). Beziehen Sie sich dabei auf die im questionText genannte Ausgangssituation.',
        points: [4, 6],
        operator: 'erlaeutern',
        gradingHint:
          'Mindestens 2 konkrete Unterschiede + Bezug zur beschriebenen Situation = volle Punkte.',
      },
      {
        taskType: 'table',
        prompt:
          'Füllen Sie die Vergleichstabelle aus. Die konkreten Vergleichsmerkmale in der ersten Spalte müssen im questionText angegeben sein — z.B. „Planbarkeit", „Flexibilität bei Änderungen", „Eignung für verteilte Teams", „Dokumentationsaufwand".',
        points: [10, 14],
        operator: 'vergleichen',
        tableColumns: ['Vergleichsmerkmal', '[Konzept A]', '[Konzept B]'],
        tableRowCount: 4,
        fixedFirstColumn: true,
        tableKind: 'flexible',
        tableDescription:
          'Vergleichstabelle: erste Spalte enthält 4 konkrete projektrelevante Vergleichsmerkmale, Spalten 2 und 3 tragen die echten Konzeptnamen (z.B. "Scrum" / "Wasserfallmodell" statt "Option A/B"). Jede Zeile bewertet ein Merkmal für beide Konzepte.',
        gradingHint:
          'Je Zeile je Konzept 1P wenn inhaltlich korrekt und projektbezogen. Synonyme und begründete Alternativen akzeptieren.',
      },
      {
        taskType: 'freitext',
        prompt:
          'Entscheiden Sie sich begründet für eines der beiden Konzepte für das konkrete Projekt bei {{UNTERNEHMEN}}. Nennen Sie mindestens 2 projektspezifische Gründe.',
        points: [4, 6],
        operator: 'entwerfen',
        gradingHint:
          '1P für klare Entscheidung + restliche Punkte für mindestens 2 projektspezifische Begründungen. Beide Optionen zulässig bei schlüssiger Argumentation.',
      },
    ],
  },

  // UML-Aktivitätsdiagramm (S25 T1 Aufg. 3-Muster: Bullet-Prozess + Optimierungstabelle)
  {
    id: 't1_uml_aktivitaet',
    weight: 7,
    containsDiagram: true,
    topicKeywords: ['Aktivität', 'Aktivitätsdiagramm', 'UML', 'Ablauf'],
    subtasks: [
      {
        taskType: 'plantuml',
        // questionText muss: Bullet-Point-Prozessbeschreibung mit Verzweigungen und Swimlanes enthalten
        prompt:
          'Im questionText ist ein Geschäftsprozess als Bullet-Point-Liste mit Verzweigungen beschrieben und die beteiligten Rollen für Swimlanes angegeben. Erstellen Sie das UML-Aktivitätsdiagramm mit: Startknoten, allen Aktivitäten, Entscheidungsknoten (Rauten) mit Bedingungen, Synchronisierungsbalken bei parallelen Abläufen, Swimlanes für die beteiligten Rollen, und Endknoten.',
        points: [13, 17],
        operator: 'entwerfen',
        diagramType: 'uml_activity',
        gradingHint:
          'Je Aktivität 1P (max. Gesamtzahl), je Entscheidung/Verzweigung mit Bedingung 2P, Synchronisierungsbalken 2P, Start+Ende vorhanden 2P, Swimlanes korrekt zugeordnet 2P. Alternative Darstellungen akzeptieren.',
      },
      {
        taskType: 'table',
        prompt:
          'Im questionText sind potenzielle Schwachstellen des Prozesses beschrieben. Tragen Sie für 3 Probleme eine Erläuterung und einen konkreten Lösungsansatz durch Digitalisierung ein.',
        points: [9, 12],
        operator: 'erlaeutern',
        tableColumns: ['Problem', 'Erläuterung', 'Lösungsansatz durch Digitalisierung'],
        tableRowCount: 3,
        tableKind: 'guided',
        tableDescription:
          'Prozessoptimierungs-Tabelle: je Zeile 1 konkretes Problem aus dem Prozess + Erläuterung warum es ein Problem ist + konkreter digitaler Lösungsansatz.',
        gradingHint:
          'Je Zeile: Problem korrekt identifiziert 1P + Erläuterung plausibel 2P + Lösungsansatz konkret und digital 3P. Insgesamt 3×2P+3×3P möglich.',
      },
    ],
  },

  // ER-Modell-Aufgabe (S25 T1 Aufg. 2-Muster: aufzählende Anforderungsliste + Vervollständigen)
  {
    id: 't1_er_modell',
    weight: 7,
    containsDiagram: true,
    topicKeywords: ['ER', 'Datenmodell', 'Relational', 'Datenbank'],
    subtasks: [
      {
        taskType: 'plantuml',
        // questionText muss: aufzählende Anforderungsliste + Hinweis auf bereits gegebene Entität enthalten
        prompt:
          'Im questionText sind die Anforderungen als Bullet-Point-Liste gegeben. Ein Entitätstyp ist bereits vorgegeben. Vervollständigen Sie das ER-Diagramm: Ergänzen Sie alle fehlenden Entitätstypen, Attribute (inkl. Primärschlüssel), Beziehungen und Kardinalitäten. Bei m:n-Beziehungen mit eigenen Attributen: diese Attribute an der Beziehung angeben.',
        points: [14, 18],
        operator: 'entwerfen',
        diagramType: 'er',
        gradingHint:
          'Je Entitätstyp 1P, je Primärschlüssel 0,5P, je Attribut 0,5P (max. 3P Attribute), je Beziehung mit korrekter Kardinalität 2P, Beziehungsattribute an m:n 1P je Attribut.',
      },
      {
        taskType: 'freitext',
        prompt:
          'Überführen Sie eine der m:n-Beziehungen in ein relationales Modell. Geben Sie die Tabellenstruktur mit Primärschlüsseln (PK) und Fremdschlüsseln (FK) an.',
        points: [5, 8],
        operator: 'entwerfen',
        gradingHint:
          'Zwischentabelle mit korrektem Namen 1P, PK der Zwischentabelle korrekt 2P, FK zu beiden Ausgangstabellen je 1P, Beziehungsattribute in Zwischentabelle 1P.',
      },
      {
        taskType: 'freitext',
        prompt:
          'Nennen Sie für 3 Attribute Ihrer Wahl den passenden SQL-Datentyp und begründen Sie die Wahl kurz.',
        points: [3, 4],
        operator: 'nennen',
        gradingHint:
          'Je Attribut mit korrektem Datentyp + Kurzbegründung 1/3 der Punkte. Synonyme (VARCHAR/String) akzeptieren.',
      },
    ],
  },

  // UI-Darstellungsform + Mockup (S25 T1 Aufg. 2b-Muster + W23/24 Aufg. 4b-Muster)
  {
    id: 't1_ui_darstellung',
    weight: 6,
    topicKeywords: ['UI', 'Darstellung', 'Mockup', 'Oberfläche', 'User Interface'],
    subtasks: [
      {
        taskType: 'freitext',
        prompt:
          'Im questionText ist ein konkreter Anwendungsfall (z.B. Dateneingabe oder Übersichtsansicht) für {{UNTERNEHMEN}} beschrieben. Benennen Sie zwei geeignete Darstellungsformen für diesen Anwendungsfall.',
        points: [2, 3],
        operator: 'nennen',
        cascade: true,
        gradingHint:
          'Je Darstellungsform 1P: Liste, Tabelle, Kachel/Grid, Karte, Formular — alle sinnvollen Varianten akzeptieren.',
      },
      {
        taskType: 'freitext',
        prompt:
          'Entscheiden Sie sich für eine der genannten Darstellungsformen und begründen Sie Ihre Wahl im Kontext des beschriebenen Anwendungsfalls.',
        points: [2, 3],
        operator: 'entwerfen',
        cascade: true,
        gradingHint:
          '1P Entscheidung klar benannt + 1–2P Begründung projektbezogen. Beide Optionen zulässig, solange Begründung trägt.',
      },
      {
        taskType: 'freitext',
        prompt:
          'Skizzieren Sie ein Mockup Ihrer gewählten Darstellungsform. Das Mockup muss mindestens enthalten: Überschrift, alle geforderten Eingabefelder oder Anzeigeelemente mit Beschriftung, ein Auswahlfeld (Dropdown/Combobox) wo sinnvoll, sowie Aktionsbuttons (z.B. Speichern/Abbrechen).',
        points: [8, 12],
        operator: 'entwerfen',
        gradingHint:
          '1P Überschrift / 2P Eingabefelder mit Beschriftung / 1P Auswahlfeld (Dropdown o.ä.) / 2P Aktionsbuttons / 1P sinnvolle Anordnung. Alternative Darstellungen vollständig werten.',
      },
    ],
  },

  // Testkonzept
  {
    id: 't1_testkonzept',
    weight: 5,
    topicKeywords: ['Test', 'Qualität', 'Abnahme'],
    subtasks: [
      {
        taskType: 'freitext',
        prompt:
          'Beschreiben Sie die Notwendigkeit eines Testkonzepts für das Projekt bei {{UNTERNEHMEN}}.',
        points: [4, 6],
        operator: 'beschreiben',
        gradingHint:
          'Zwei Begründungen (Fehler früh erkennen, Qualität sichern, ...) = volle Punkte.',
      },
      {
        taskType: 'table',
        prompt:
          'Füllen Sie die Tabelle aus: Nennen Sie 4 Teststufen mit Beschreibung und einem konkreten Beispiel aus dem Projekt.',
        points: [12, 16],
        operator: 'nennen',
        tableColumns: ['Teststufe', 'Beschreibung', 'Beispiel aus dem Projekt'],
        tableRowCount: 4,
        tableKind: 'guided',
        fixedFirstColumn: false,
        tableDescription:
          'Teststufen-Tabelle: Unit-Test, Integrationstest, Systemtest, Abnahmetest — je mit Kurzbeschreibung und projektkonkretem Beispiel.',
        gradingHint:
          'Je vollständige Zeile (Stufe + Beschreibung + Beispiel) 1/4 der Punkte. Bei fehlerhafter Zuordnung Teilpunkte.',
      },
      {
        taskType: 'freitext',
        prompt:
          'Beschreiben Sie 3 weitere Inhalte, die in einem Testkonzept enthalten sein sollten.',
        points: [4, 6],
        operator: 'beschreiben',
        gradingHint: 'Je Inhalt (Testumfang, Testdaten, Rollen, Zeitplan, ...) 1/3 der Punkte.',
      },
    ],
  },

  // Verschlüsselung (W22/23 Aufgabe 1d/e) — wichtig, weil IT-Sicherheit oft kommt
  {
    id: 't1_verschluesselung',
    weight: 4,
    topicKeywords: ['Verschlüsselung', 'TLS', 'Zertifikat', 'Sicherheit', 'CA'],
    subtasks: [
      {
        taskType: 'freitext',
        prompt:
          'Erläutern Sie den Unterschied zwischen symmetrischer und asymmetrischer Verschlüsselung.',
        points: [5, 7],
        operator: 'erlaeutern',
        gradingHint:
          'Symm.: ein Schlüssel für beide Seiten. Asymm.: Public+Private-Key. Beide Aspekte = volle Punkte.',
      },
      {
        taskType: 'freitext',
        prompt:
          'Erläutern Sie das Prinzip der hybriden Verschlüsselung am Beispiel des TLS-Handshakes und nennen Sie den Grund für den hybriden Ansatz.',
        points: [5, 7],
        operator: 'erlaeutern',
        gradingHint:
          'Asymm. zum Schlüsselaustausch + symm. für Nutzdaten + Performance-Grund. Kernidee = volle Punkte.',
      },
      {
        taskType: 'freitext',
        prompt:
          'Beschreiben Sie, wie mithilfe einer lokalen Certificate Authority die Authentizität von Diensten sichergestellt werden kann.',
        points: [3, 4],
        operator: 'beschreiben',
        gradingHint:
          'CA signiert Zertifikate + Clients prüfen Signatur + Widerrufsprüfung = volle Punkte.',
      },
      {
        taskType: 'freitext',
        prompt:
          'Nennen Sie je einen Vor- und einen Nachteil einer zentralen Rechteverwaltung (Identity Provider / SSO).',
        points: [4, 6],
        operator: 'nennen',
        gradingHint:
          'Je Vor-/Nachteil halbe Punkte. Bsp. Vorteil: zentrale Übersicht. Nachteil: Single Point of Failure.',
      },
    ],
  },

  // CI/CD-Pipeline (W22/23 Aufgabe 1c)
  {
    id: 't1_ci_cd',
    weight: 4,
    topicKeywords: ['Continuous Integration', 'CI', 'Pipeline', 'Deployment', 'DevOps'],
    subtasks: [
      {
        taskType: 'freitext',
        prompt:
          'Beschreiben Sie, was eine CI/CD-Pipeline ist und bei welchen Ereignissen sie typischerweise ausgelöst wird.',
        points: [3, 4],
        operator: 'beschreiben',
        gradingHint: 'Automatisierte Abfolge bei Commit/Tag/PR. Kernidee + Trigger = volle Punkte.',
      },
      {
        taskType: 'freitext',
        prompt:
          'Nennen Sie 4 Vorteile einer CI/CD-Pipeline für die Entwicklung bei {{UNTERNEHMEN}}.',
        points: [8, 10],
        operator: 'nennen',
        gradingHint:
          'Je Vorteil 1/4 der Punkte. Z.B. automatische Tests, einheitliche Deploys, Rollback, weniger manueller Zugriff.',
      },
      {
        taskType: 'freitext',
        prompt:
          'Erläutern Sie, wie ein Rollback bei einer defekten Deployment-Version aussehen kann.',
        points: [3, 4],
        operator: 'erlaeutern',
        gradingHint:
          'Alte Pipeline erneut ausführen / vorherigen Container deployen / Git-Tag zurücksetzen = volle Punkte.',
      },
    ],
  },

  // OOP / Entwurfsmuster (S25 T1 Aufg. 4-Muster: englischer Beschreibungstext + Klassendiagramm ergänzen)
  {
    id: 't1_oop_entwurf',
    weight: 5,
    topicKeywords: [
      'OOP',
      'Entwurfsmuster',
      'Factory',
      'Singleton',
      'Observer',
      'abstrakt',
      'Interface',
    ],
    subtasks: [
      {
        taskType: 'freitext',
        prompt:
          'Im questionText ist ein englischer Beschreibungstext eines Entwurfsmusters (aus einer Fachliteraturquelle) gegeben. Erläutern Sie anhand dieses Textes zwei Aspekte des Entwurfsmusters.',
        points: 6,
        operator: 'erlaeutern',
        cascade: true,
        gradingHint:
          'Je Aspekt 3P: muss aus dem Text herleitbar sein und korrekt erläutert werden. Reine Paraphrase ohne Erläuterung: halbe Punkte.',
      },
      {
        taskType: 'freitext',
        prompt:
          'Im questionText ist eine Einschränkung des Entwurfsmusters beschrieben. Erläutern Sie diese Einschränkung in eigenen Worten.',
        points: 3,
        operator: 'erlaeutern',
        cascade: true,
        gradingHint:
          'Für Factory: gemeinsame Basisklasse/Interface notwendig. Kernaussage korrekt = volle Punkte.',
      },
      {
        taskType: 'freitext',
        prompt:
          'Erläutern Sie drei Merkmale einer abstrakten Klasse im Vergleich zu gewöhnlichen Klassen und Interfaces.',
        points: 6,
        operator: 'erlaeutern',
        gradingHint:
          'Mind. 3 Merkmale: abstrakte Methoden zwingend / nicht instanziierbar / vollständig definierte Methoden erlaubt / Attribute erlaubt / mehrfache Vererbung nur bei Interfaces. Je Merkmal 2P.',
      },
      {
        taskType: 'plantuml',
        prompt:
          'Im questionText ist ein teilweise ausgefülltes Klassendiagramm mit dem Entwurfsmuster gegeben. Ergänzen Sie das Klassendiagramm um die fehlenden Klassen (Fabrik-Unterklasse und Produkt-Unterklasse) für den beschriebenen neuen Anwendungsfall.',
        points: 6,
        operator: 'entwerfen',
        diagramType: 'uml_class',
        gradingHint:
          '3P für korrekte Fabrik-Unterklasse (erbt von abstrakter Fabrik, überschreibt Fabrikmethode) + 3P für korrekte Produkt-Unterklasse (erbt von Produkt-Basisklasse).',
      },
    ],
  },

  // Berechnungsaufgabe Teil 1 (Kosten, Aufwand, Netzplan)
  {
    id: 't1_berechnung',
    weight: 4,
    topicKeywords: ['Netzplan', 'kritisch', 'Aufwand', 'Kosten'],
    subtasks: [
      {
        taskType: 'freitext',
        prompt:
          'Im questionText sind Projektvorgänge mit Dauern (in Tagen) und Vorgängerabhängigkeiten gegeben. Berechnen Sie den frühesten Anfangs- und Endzeitpunkt für alle Vorgänge sowie den Gesamtprojektendtermin. Zeigen Sie den Rechenweg und geben Sie das Ergebnis mit Einheit an.',
        points: [10, 15],
        operator: 'berechnen',
        gradingHint:
          'Rechenweg (Vorwärtsrechnung) 50% / korrektes Ergebnis je Vorgang 30% / Gesamtendtermin 20%. Bei Folgefehlern nur Ausgangsfehler abziehen.',
      },
      {
        taskType: 'freitext',
        prompt:
          'Benennen Sie den kritischen Pfad und erläutern Sie, welchen Einfluss eine Verlängerung eines kritischen Vorgangs um einen Tag auf den Projektendtermin hat.',
        points: [4, 6],
        operator: 'erlaeutern',
        gradingHint:
          'Kritischer Pfad korrekt benannt 2P + Erläuterung: direkte Verschiebung Endtermin um 1 Tag 2–4P.',
      },
      {
        taskType: 'freitext',
        prompt:
          'Nennen Sie 2 Kostenfaktoren bei Softwareprojekten, die in der Praxis oft unterschätzt werden, und erläutern Sie jeweils kurz warum.',
        points: [4, 5],
        operator: 'nennen',
        gradingHint:
          'Je Kostenfaktor (Einarbeitung, Meetings, Testaufwand, Fehlerbehebung, Dokumentation, ...) 1P + Erläuterung 1P = 2P. Insgesamt 2 × 2P = 4P.',
      },
    ],
  },

  // Use-Case-Diagramm + User Stories (W23/24 T2 Aufg. 2-Muster)
  {
    id: 't1_usecases_userstories',
    weight: 6,
    topicKeywords: ['Use-Case', 'User Story', 'UseCase', 'Anwendungsfall'],
    subtasks: [
      {
        taskType: 'freitext',
        prompt:
          'Im questionText ist ein Use-Case-Diagramm mit mehreren Anwendungsfällen für {{PRODUKT}} bei {{UNTERNEHMEN}} beschrieben. Erstellen Sie für zwei der genannten Anwendungsfälle je eine User Story nach dem Connextra-Template: „Als <Rolle> möchte ich <Ziel>, damit <Nutzen>."',
        points: [6, 8],
        operator: 'entwerfen',
        gradingHint:
          'Je User Story 3–4P: Rolle korrekt (1P) + Ziel konkret (1–2P) + Nutzen plausibel (1P). Template-Abweichungen mit Sinngehalt akzeptieren.',
      },
      {
        taskType: 'freitext',
        prompt: 'Erläutern Sie drei der sechs INVEST-Kriterien für gute User Stories.',
        points: [6, 9],
        operator: 'erlaeutern',
        gradingHint:
          'Je Kriterium 2–3P: korrekter Buchstabe + Bedeutung + Erläuterung. Independent/Negotiable/Valuable/Estimable/Small/Testable — alle Varianten akzeptieren.',
      },
      {
        taskType: 'freitext',
        prompt:
          'Beschreiben Sie, in welchem Scrum-Artefakt User Stories typischerweise gesammelt und priorisiert werden, und welche Rolle dafür verantwortlich ist.',
        points: [4, 5],
        operator: 'beschreiben',
        gradingHint:
          'Product Backlog 2P + Product Owner 2P. Sprint Backlog als Ergänzung akzeptieren.',
      },
    ],
  },

  // Risikomanagement + Befürchtungen-Tabelle (S22 T1 Aufg. 1-Muster)
  {
    id: 't1_risiko_befuerchtungen',
    weight: 5,
    topicKeywords: ['Risikomanagement', 'Risiko', 'Change Management', 'Konflikt', 'Befürchtung'],
    subtasks: [
      {
        taskType: 'freitext',
        prompt:
          'Im questionText ist eine Konfliktsituation bei der Einführung von {{PRODUKT}} bei {{UNTERNEHMEN}} beschrieben (z.B. Widerstand von Mitarbeitern). Beschreiben Sie zwei konkrete Schritte, um diesen Konflikt zu bewältigen.',
        points: [4, 6],
        operator: 'beschreiben',
        gradingHint:
          'Je konkreter Schritt (Informationsveranstaltung, Schulung, Pilotgruppe, Einbeziehung, ...) halbe bis volle Punkte. Allgemein "kommunizieren" ohne konkreten Schritt: halbe Punkte.',
      },
      {
        taskType: 'table',
        prompt:
          'Im questionText sind 3 Projektrisiken genannt. Ergänzen Sie für jedes Risiko eine plausible Ursache und eine mögliche Auswirkung auf das Projekt.',
        points: [8, 12],
        operator: 'beschreiben',
        tableColumns: ['Risiko', 'Ursache', 'Auswirkung'],
        tableRowCount: 3,
        fixedFirstColumn: true,
        tableKind: 'fixed',
        tableDescription:
          'Risikotabelle: erste Spalte mit vorgegebenen Risiken (z.B. "Unterschätzung Entwicklungsaufwand", "Inkompatible Schnittstellen", "Widerstand Personalrat") — Spalten 2 und 3 werden ausgefüllt.',
        gradingHint:
          'Je Zeile: Ursache plausibel 2P + Auswirkung konkret auf Projekt 2P = 4P je Zeile. Insgesamt 12P möglich.',
      },
      {
        taskType: 'freitext',
        prompt:
          'Beschreiben Sie je eine funktionale und eine nicht-funktionale Anforderung an {{PRODUKT}}.',
        points: [4, 5],
        operator: 'beschreiben',
        gradingHint:
          'Funktional: was das System tun soll (Funktion, Feature) 2P. Nicht-funktional: wie es das tun soll (Leistung, Sicherheit, Verfügbarkeit) 2P. Je korrekte Zuordnung volle Punkte.',
      },
    ],
  },

  // NoSQL + JSON-Transformation (W23/24 T2 Aufg. 3 + S22 T1-Muster)
  {
    id: 't1_nosql_json',
    weight: 5,
    topicKeywords: ['NoSQL', 'MongoDB', 'JSON', 'Dokumenten', 'dokumentenorientiert'],
    subtasks: [
      {
        taskType: 'freitext',
        prompt:
          'Im questionText ist ein Textauszug über NoSQL-Datenbanken (z.B. MongoDB) aus einer Fachliteraturquelle gegeben. Erläutern Sie anhand des Textes drei Vorteile von NoSQL-Datenbanken gegenüber relationalen Datenbanken.',
        points: [6, 9],
        operator: 'erlaeutern',
        gradingHint:
          'Je Vorteil (Flexible Schema, Performance/keine JOINs, Developer-Friendly, horizontale Skalierung, ...) 2–3P wenn aus dem Text herleitbar und korrekt erläutert.',
      },
      {
        taskType: 'freitext',
        prompt:
          'Im questionText sind relationale Tabellendaten (mit Fremdschlüsselbezug) gegeben. Wandeln Sie die Daten in JSON-Objekte um. Verwenden Sie bei der Einbettung zusammengehöriger Daten ein verschachteltes Array.',
        points: [7, 10],
        operator: 'entwerfen',
        gradingHint:
          'Gültiges JSON-Syntax 2P / alle Felder enthalten 3P / verschachteltes Array korrekt eingebettet 3P / konsistente Feldnamen 2P.',
      },
      {
        taskType: 'table',
        prompt:
          'Ordnen Sie die relationale Datenbankterminologie der dokumentenorientierten Entsprechung zu.',
        points: [3, 4],
        operator: 'identifizieren',
        tableColumns: ['Relationaler Begriff', 'Dokumenten-Datenbank-Begriff'],
        tableRowCount: 4,
        fixedFirstColumn: true,
        fixedFirstColumnValues: ['Database', 'Table', 'Record/Row', 'Column'],
        tableKind: 'fixed',
        tableDescription:
          'Begriffszuordnung relational↔dokumentenorientiert: Database→Database, Table→Collection, Record→Document, Column→Field.',
        gradingHint: 'Je korrekte Zuordnung 1P: Database, Collection, Document, Field.',
      },
    ],
  },
];
