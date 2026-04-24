/**
 * domain/topics/catalog.ts — Themenkatalog für AP2-Generierung.
 *
 * Jedes Thema ist in mindestens einer echten AP2-Prüfung der letzten Jahrgänge
 * belegt (Referenz-MD §5.1, §5.2, §5.3). Die Verteilung orientiert sich grob
 * an der Häufigkeit in den realen Prüfungen.
 *
 * WiSo-Themen (G3 aus Gap-Analyse): AGG, Prokura/Vollmacht, EK-Rentabilität
 * und IT-Sicherheit wurden gegenüber der ursprünglichen Liste ergänzt —
 * MD §5.3 Aufgaben-Matrix belegt sie in jeder Prüfung (AGG) bzw. regelmäßig
 * (Prokura: W19/20, S20, S21, S23; EK-Rentabilität: S21, W22/23, W23/24).
 *
 * Autor: { name: "LetsGamingDE", id: 272402865874534400n }
 */

import type { ExamPart, Specialty } from '../../types/index.js';

export const TOPICS_FIAE: Record<ExamPart, string[]> = {
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

    // NoSQL (MD §7: ab W2022/23 regelmäßig)
    'NoSQL & dokumentenorientierte Datenbanken',
    'JSON-Transformation aus relationalem Modell',
    'ACID-Eigenschaften',

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
    'SQL Rechteverwaltung (GRANT/REVOKE)',
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
  // MD §5.3 Aufgaben-Matrix: Abdeckung der wiederkehrenden Themen jedes Jahrgangs.
  teil_3: [
    // Arbeits- und Ausbildungsrecht
    'Kündigungsrecht',
    'Probezeit & Ausbildungsrecht',
    'Berufsausbildung & BBiG',
    'Jugendarbeitsschutz',
    'Arbeitsvertrag',
    'Arbeitszeitgesetz & Pausenregelung',
    'Urlaub (BUrlG)',
    'Mutterschutz & Elternzeit',
    'AGG (Allgemeines Gleichbehandlungsgesetz)', // G3: MD §5.3 in JEDER Prüfung

    // Soziales
    'Sozialversicherung',
    'Lohn & Gehaltsabrechnung',
    'Krankenversicherung-Beitragsberechnung',

    // Mitbestimmung
    'Betriebsrat & Mitbestimmung',
    'Tarifvertrag',

    // Gesellschaftsrecht
    'Gesellschaftsformen',
    'Handelsregister',
    'Prokura & Handlungsvollmacht', // G3: MD §5.3 W19/20, S20, S21, S23

    // Wirtschaft
    'Wirtschaftlichkeitsrechnung',
    'Eigenkapitalrentabilität', // G3: MD §5.3 S21, W22/23, W23/24
    'Markt & Wettbewerb',
    'Nachhaltigkeit',

    // Recht & IT am Arbeitsplatz
    'IT-Sicherheit am Arbeitsplatz', // G3: MD §5.3 W21/22 (Phishing/VPN)
    'Datenschutz (DSGVO) im Arbeitsalltag',
    'Kaufvertragsrecht',
  ],
};

export const TOPICS_FISI: Record<ExamPart, string[]> = {
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
