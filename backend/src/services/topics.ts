/**
 * topics.ts — IHK AP2 topic pools per specialty and exam part.
 *
 * Topics are drawn from real IHK exam question sets. The FISI pool covers
 * network administration and IT infrastructure, while FIAE covers software
 * development. Teil 3 (WiSo) is identical for both since it covers business
 * and employment law shared across all IT specialties.
 */
import type { ExamPart, Specialty } from '../types/index.js';

const TOPICS_FIAE: Record<ExamPart, string[]> = {
  teil_1: [
    'Stakeholder-Analyse',
    'Anforderungsanalyse',
    'User Stories & INVEST',
    'Use-Case-Diagramme',
    'Aktivitätsdiagramme',
    'Scrum & Agile',
    'Testkonzept & Teststrategie',
    'Green-IT & Nachhaltigkeit',
    'DSGVO & Datenschutz',
    'ER-Diagramme',
    'Change Management',
    'Lastenheft & Pflichtenheft',
    'Qualitätssicherung',
    'Cloud-Computing',
    'UX/UI & Benutzeroberflächen',
    'Klassendiagramme',
    'Risikomanagement',
    'Projektplanung & Meilensteine',
  ],
  teil_2: [
    'Sequenzdiagramme',
    'Relationales Datenbankmodell',
    'SQL SELECT & JOIN',
    'SQL GROUP BY & Aggregation',
    'SQL UPDATE & DELETE',
    'Pseudocode & Algorithmen',
    'Sortieralgorithmen',
    'Suchalgorithmen',
    'Rekursion',
    'Datenstrukturen',
    'Speicherbedarf & Datenkodierung',
    'JSON & NoSQL',
    'OOP-Vererbung',
    'OOP-Polymorphismus',
    'Klassendiagramme',
    'Komplexitätsanalyse',
    'REST-APIs',
    'Netzwerktechnik',
    'IT-Sicherheit & Verschlüsselung',
  ],
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
  // WiSo is shared across both specialties
  teil_3: TOPICS_FIAE.teil_3,
};

export function getTopics(part: ExamPart, specialty: Specialty = 'fiae'): string[] {
  return (specialty === 'fisi' ? TOPICS_FISI : TOPICS_FIAE)[part];
}
