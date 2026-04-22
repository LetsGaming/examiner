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
