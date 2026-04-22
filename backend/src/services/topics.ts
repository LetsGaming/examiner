/**
 * topics.ts — AP2 Themenkatalog (abgeleitet aus realen IHK-Prüfungen 2019–2025).
 *
 * Jedes Thema erscheint in mindestens einer echten AP2-Prüfung der letzten
 * Jahrgänge. Die Liste ist bewusst breit, damit der Pool abwechslungsreich
 * wird. Verteilung orientiert sich grob an der Häufigkeit in den realen
 * Prüfungen (siehe pruefungen/).
 */
import type { ExamPart, Specialty } from '../types/index.js';

const TOPICS_FIAE: Record<ExamPart, string[]> = {
  // ── TEIL 1: PLANEN ────────────────────────────────────────────────────────
  teil_1: [
    // Stakeholder / Anforderungen
    'Stakeholder-Analyse',
    'Anforderungsanalyse (funktional/nicht-funktional)',
    'User Stories & INVEST',
    'Use-Case-Diagramme',
    'Lastenheft & Pflichtenheft',
    'Umfeldanalyse (technisch/rechtlich)',

    // Projektmanagement
    'Scrum & agile Vorgehensmodelle',
    'Wasserfall vs. Agil (Vergleich)',
    'Projektplanung & Meilensteine',
    'Netzplan & kritischer Pfad',
    'Risikomanagement',
    'Change Management',
    'Abschlussprotokoll & Projektabschluss',

    // UML / Modellierung
    'UML-Aktivitätsdiagramme',
    'UML-Zustandsdiagramme',
    'UML-Klassendiagramme',
    'UML-Use-Case-Diagramme',
    'ER-Modellierung',
    'ER-Diagramm vervollständigen',
    'Relationales Datenmodell aus ER ableiten',

    // Qualität / Test
    'Testkonzept & Teststrategie',
    'Teststufen (Unit, Integration, System, Abnahme)',
    'Qualitätssicherung',

    // UI / UX
    'UI-Design & Mockups',
    'Darstellungsformen (Liste/Kachel/Karte) mit Begründung',
    'UX-Kriterien (Schriftart, Farbgebung, Barrierefreiheit)',
    'Formular-Entwurf',

    // Datenschutz / Sicherheit / Recht
    'DSGVO & Datenschutz',
    'Green-IT & Nachhaltigkeit',
    'IT-Sicherheitskonzepte',
    'Verschlüsselung (symmetrisch/asymmetrisch/hybrid)',
    'TLS & Zertifikate',
    'Identity Provider & SSO',
    'Rechteverwaltung / Rollenkonzept',
    'Passwort-Hashing & Salting',

    // DevOps / Architektur
    'Continuous Integration / CI-CD-Pipelines',
    'Cloud-Computing (IaaS/PaaS/SaaS)',
    'Open Source Software (Chancen/Risiken)',
    'Webanwendungen (Architektur Frontend/Backend/DB)',

    // OOP / Entwurf
    'OOP-Grundlagen (Klassen, Objekte, Kapselung)',
    'OOP-Vererbung & Polymorphismus',
    'Abstrakte Klassen & Interfaces',
    'Entwurfsmuster (Factory, Singleton, Observer)',
  ],

  // ── TEIL 2: ENTWICKLUNG ───────────────────────────────────────────────────
  teil_2: [
    // SQL
    'SQL SELECT & JOIN',
    'SQL GROUP BY & Aggregation',
    'SQL UPDATE & DELETE',
    'SQL CREATE TABLE (DDL)',
    'SQL Subqueries',
    'Relationales Datenbankmodell',
    'Normalisierung (1NF/2NF/3NF)',

    // Algorithmen / Pseudocode
    'Pseudocode & Algorithmen entwerfen',
    'Pseudocode-Fehler finden und korrigieren',
    'Sortieralgorithmen',
    'Suchalgorithmen',
    'Rekursion',
    'Datenstrukturen (Liste, Stack, Queue, Baum)',

    // OOP in Code
    'OOP-Vererbung (Codebeispiel)',
    'OOP-Polymorphismus (Codebeispiel)',
    'Generische Klassen',
    'Testfälle & Testüberdeckung',

    // UML / Modellierung
    'Sequenzdiagramme',
    'Klassendiagramme (Code→UML)',
    'Zustandsdiagramme',

    // Berechnungen
    'Speicherbedarf & Datenkodierung',
    'Komplexitätsanalyse (O-Notation)',
    'Kostenrechnung & Performance-Abschätzung',

    // Schnittstellen / Datenformate
    'REST-APIs',
    'JSON-Datenformat',
    'XML (Wohlgeformtheit/Gültigkeit/DTD)',
    'XML-Fehler finden und korrigieren',

    // Netzwerk / Sicherheit
    'IT-Sicherheit & Verschlüsselung',
    'Netzwerktechnik (Grundlagen)',
  ],

  // ── TEIL 3: WISO ──────────────────────────────────────────────────────────
  teil_3: [
    'Kündigungsrecht',
    'Probezeit & Ausbildungsrecht',
    'Sozialversicherung',
    'Lohn & Gehaltsabrechnung',
    'Betriebsrat & Mitbestimmung',
    'Gesellschaftsformen',
    'Handelsregister',
    'Tarifvertrag',
    'Jugendarbeitsschutz',
    'Wirtschaftlichkeitsrechnung',
    'Markt & Wettbewerb',
    'Nachhaltigkeit',
    'Mutterschutz & Elternzeit',
    'Berufsausbildung & BBiG',
    'Arbeitsvertrag',
  ],
};

const TOPICS_FISI: Record<ExamPart, string[]> = {
  teil_1: [
    'Netzwerkplanung & Topologien',
    'IP-Adressierung & Subnetting',
    'VLANs & Netzwerksegmentierung',
    'WLAN-Planung & Sicherheit',
    'Serverkonzepte & Rollen',
    'Virtualisierung & Hypervisor',
    'Backup-Konzepte & -Strategien',
    'IT-Sicherheitskonzepte',
    'Firewall & DMZ',
    'ITIL & Servicemanagement',
    'Ticketsysteme & SLAs',
    'Incident- & Problemmanagement',
    'Netzwerkdokumentation',
    'Datenschutz & DSGVO',
    'Cloud-Dienste & -Modelle',
    'Monitoring & Alerting',
    'Benutzer- & Rechteverwaltung',
    'Lizenzmanagement',
  ],
  teil_2: [
    'Subnetting & CIDR-Rechnung',
    'OSI-Schichtenmodell',
    'TCP/IP-Protokolle',
    'DNS & DHCP',
    'Routing & Switching',
    'VPN-Technologien',
    'RAID-Systeme & Berechnung',
    'Active Directory & LDAP',
    'Skripte & Automatisierung (Bash/PowerShell)',
    'Netzwerkanalyse & Fehlerdiagnose',
    'Protokollanalyse (Wireshark)',
    'Speichersysteme (SAN, NAS)',
    'Datenbankgrundlagen (SQL)',
    'Kryptographie & PKI',
    'Angriffsvektoren & Gegenmaßnahmen',
    'IPv6-Grundlagen',
    'SNMP & Netzwerkmanagement',
    'Container & Docker-Grundlagen',
  ],
  teil_3: TOPICS_FIAE.teil_3,
};

export function getTopics(part: ExamPart, specialty: Specialty = 'fiae'): string[] {
  return (specialty === 'fisi' ? TOPICS_FISI : TOPICS_FIAE)[part];
}

// ─── Topic→Kind-Mapping ──────────────────────────────────────────────────────
//
// Ermittelt den erwarteten `task_kind` anhand der Topic-Bezeichnung. Wird von
// der Pool-Auffüllung genutzt, um gezielt Aufgaben eines bestimmten Kinds zu
// generieren (z.B. wenn im Pool zu wenige Diagramm-Aufgaben sind).
//
// Die Regeln folgen den topicKeywords der TaskRecipes in examGenerator.ts.
// Wenn sich mehrere Kinds aus einem Topic ableiten lassen (selten), gewinnt
// die erste zutreffende Regel in der Reihenfolge diagram > calc > sql > code
// > table > text.

export type TopicKind = 'diagram' | 'calc' | 'sql' | 'code' | 'table' | 'text';

const KIND_PATTERNS: Array<{ kind: TopicKind; pattern: RegExp }> = [
  // Diagramme (UML, ER, Mockups, Skizzen)
  { kind: 'diagram', pattern: /aktivität|zustandsdiagramm|klassendiagramm|sequenzdiagramm|use-?case|uml|er[\s\-]?modell|er[\s\-]?diagramm|datenmodell|mockup|skizze|ui[\s\-]?design|darstellungsformen|formular[\s\-]?entwurf/i },
  // Berechnungen
  { kind: 'calc', pattern: /netzplan|kritischer pfad|speicherbedarf|komplexität|o[\s\-]?notation|kosten|aufwand|kostenrechnung/i },
  // SQL
  { kind: 'sql', pattern: /\bsql\b|join|select|group by|create table|ddl|subquery|aggregation|normalisierung/i },
  // Code
  { kind: 'code', pattern: /pseudocode|algorithmus|sortier|suchalgor|rekursion|datenstruktur|testfäll|testüberdeckung|generisch/i },
  // Tabellen (Vergleich, Stakeholder, ACID, Testkonzept)
  { kind: 'table', pattern: /stakeholder|acid|teststufen|testkonzept|vergleich|vorgehensmodelle|scrum.*wasserfall|wasserfall.*agil|datentyp/i },
];

/**
 * Inferiert den erwarteten Kind für ein Topic. Das Ergebnis ist eine Prognose,
 * nicht garantiert — die tatsächliche Klassifikation der generierten Aufgabe
 * erfolgt nach Einfügen in die DB über classifyTaskFromSubtasks.
 */
export function inferKindForTopic(topic: string): TopicKind {
  for (const { kind, pattern } of KIND_PATTERNS) {
    if (pattern.test(topic)) return kind;
  }
  return 'text';
}

/**
 * Gibt aus der Themenliste des Teils bis zu `count` Topics zurück, die
 * (voraussichtlich) die angegebenen Kinds erzeugen. Hilft dem Pool-Refill,
 * gezielt Lücken zu füllen: z.B. "gib mir 3 Topics, die Diagramm-Aufgaben
 * generieren" wenn der Pool zu wenige Diagramme hat.
 *
 * Wenn nicht genug Topics für die gewünschten Kinds verfügbar sind, füllt die
 * Funktion den Rest mit Topics anderer Kinds auf — sie gibt immer bis zu
 * `count` Topics zurück (solange die Themenliste selbst groß genug ist).
 */
export function pickTopicsByKinds(
  part: ExamPart,
  kinds: TopicKind[],
  count: number,
  specialty: Specialty = 'fiae',
): string[] {
  const all = getTopics(part, specialty).slice();
  // Shuffle damit wir nicht immer dieselben Topics ziehen
  for (let i = all.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [all[i], all[j]] = [all[j], all[i]];
  }

  const result: string[] = [];
  const kindSet = new Set(kinds);
  // Erst Topics aufsammeln, die zu den gewünschten Kinds passen
  for (const topic of all) {
    if (result.length >= count) break;
    if (kindSet.has(inferKindForTopic(topic))) {
      result.push(topic);
    }
  }
  // Auffüllen mit beliebigen restlichen Topics (nicht schon ausgewählt)
  for (const topic of all) {
    if (result.length >= count) break;
    if (!result.includes(topic)) {
      result.push(topic);
    }
  }
  return result;
}
