/**
 * scenarios.ts — Company scenarios used as exam context.
 *
 * Each scenario is randomly assigned to an exam session at start time.
 * Question text uses {{UNTERNEHMEN}}, {{BRANCHE}}, {{PRODUKT}}, {{MITARBEITER}}
 * placeholders that are replaced with scenario values before display.
 * Descriptions are intentionally detailed so the AI can grade contextually.
 */

export interface Scenario {
  name: string;
  branche: string;
  produkt: string;
  mitarbeiter: string;
  description: string;
}

export const SCENARIOS: Scenario[] = [
  {
    name: "SmartLogistik GmbH",
    branche: "Logistik",
    produkt: "Sendungsverfolgungsapp",
    mitarbeiter: "280",
    description:
      "Die SmartLogistik GmbH ist ein mittelständisches Logistikunternehmen mit 280 Mitarbeitern und Hauptsitz in Hannover. Das Unternehmen transportiert täglich über 5.000 Pakete deutschlandweit und setzt dabei auf eigene Fuhrparks sowie externe Paketdienstleister. Zur Digitalisierung der Betriebsabläufe entwickelt SmartLogistik eine mobile App für Fahrer (Routenplanung, Unterschriftenerfassung, Fotodokumentation) sowie ein Kundenportal zur Echtzeit-Sendungsverfolgung. Das IT-Team besteht aus 12 Personen; die Entwicklung erfolgt agil nach Scrum mit zweiwöchigen Sprints. Datenschutz (DSGVO) und Systemverfügbarkeit sind geschäftskritisch.",
  },
  {
    name: "MediCare Systems AG",
    branche: "Gesundheitswesen",
    produkt: "Patientenverwaltungssoftware",
    mitarbeiter: "150",
    description:
      "Die MediCare Systems AG entwickelt mit 150 Mitarbeitern eine Cloud-basierte Softwarelösung für eine Krankenhausgruppe mit 8 Standorten und insgesamt 2.400 Betten. Die Software umfasst Patientenstammdaten, Terminverwaltung, Behandlungshistorien, Medikamentenpläne und Abrechnungsfunktionen. Besondere Anforderungen: DSGVO-Konformität, Anbindung an bestehende KIS-Systeme (HL7/FHIR-Standard), 99,9 % Verfügbarkeit und Rollenkonzept nach Berufsgruppen. Die Entwicklung erfolgt nach dem V-Modell mit umfangreichen Abnahmetests; Sicherheitsaudits sind vertraglich vorgeschrieben.",
  },
  {
    name: "EduTech Solutions GmbH",
    branche: "E-Learning",
    produkt: "Online-Lernplattform",
    mitarbeiter: "60",
    description:
      "Die EduTech Solutions GmbH betreibt mit 60 Mitarbeitern eine Lernplattform für derzeit 15.000 aktive Nutzer (Schüler, Studierende und Berufstätige). Die Plattform bietet Videokurse, interaktive Übungen, Gamification-Elemente (Punkte, Badges, Ranglisten) und KI-gestützte Lernpfadempfehlungen. Die Entwicklung erfolgt agil (Scrum); das Team ist crossfunktional aufgestellt. Aktuelle Projekte: Einführung eines adaptiven Prüfungsmodus, Barrierefreiheit nach WCAG 2.1 und Integration eines Live-Chat-Systems für Tutoring.",
  },
  {
    name: "GreenEnergy Corp GmbH",
    branche: "Erneuerbare Energien",
    produkt: "Smart-Home-App",
    mitarbeiter: "45",
    description:
      "Die GreenEnergy Corp GmbH vertreibt mit 45 Mitarbeitern Photovoltaikanlagen, Heimspeichersysteme und Wärmepumpen für Privathaushalte. Zur Kundenbindung entwickelt das Unternehmen eine Smart-Home-App, über die Kunden Energieerzeugung und -verbrauch in Echtzeit einsehen, Haushaltsgeräte steuern und Überschussenergie ins Netz einspeisen können. Die App kommuniziert per MQTT mit den Heimgeräten und über eine REST-API mit dem Backend. Datensicherheit, Energiedatenhoheit und eine intuitive Nutzeroberfläche sind zentrale Anforderungen der Endkunden.",
  },
  {
    name: "RetailPro GmbH",
    branche: "E-Commerce",
    produkt: "Warenwirtschaftssystem",
    mitarbeiter: "320",
    description:
      "Die RetailPro GmbH betreibt mit 320 Mitarbeitern 35 Filialen in Deutschland sowie einen Online-Shop mit 80.000 Artikeln. Das bestehende Warenwirtschaftssystem (WMS) ist veraltet und soll durch eine moderne Eigenentwicklung ersetzt werden. Die neue Lösung muss: Lagerbestände in Echtzeit über alle Kanäle synchronisieren, automatische Nachbestellungen bei Unterschreitung von Meldebeständen auslösen, Kassensysteme (POS) anbinden, Filial- und Onlinebestellungen zusammenführen und umfangreiche Reporting-Funktionen bieten. Die Migration läuft schrittweise (Strangler-Fig-Pattern), um den Geschäftsbetrieb nicht zu unterbrechen.",
  },
  {
    name: "FinTech Solutions AG",
    branche: "Finanzdienstleistungen",
    produkt: "Mobile-Banking-App",
    mitarbeiter: "90",
    description:
      "Die FinTech Solutions AG entwickelt mit 90 Mitarbeitern eine Mobile-Banking-App für Privatkunden, die Kontoführung, Überweisungen, Daueraufträge, einen KI-gestützten Budgetplaner und Investmentfunktionen (ETF-Sparpläne) umfasst. Die App ist BaFin-reguliert und muss PSD2-konform sein; starke Kundenauthentifizierung (2FA per biometrischen Merkmalen oder TOTAN) ist Pflicht. Das Sicherheitsniveau orientiert sich am BSI-Grundschutz. Neben der App betreibt das Unternehmen auch eine REST-API für Drittanbieter (Open-Banking). Compliance, IT-Sicherheit und Zero-Downtime-Deployments stehen im Vordergrund.",
  },
  {
    name: "CityConnect GmbH",
    branche: "Smart City",
    produkt: "Bürger-App",
    mitarbeiter: "75",
    description:
      "Die CityConnect GmbH entwickelt mit 75 Mitarbeitern für einen Verbund aus 12 Kommunen eine digitale Bürgerserviceplattform. Die Bürger-App vereint: Meldewesen (Ummeldung, Personalausweis beantragen), ÖPNV-Echtzeitdaten und Ticketkauf, Meldung von Infrastrukturmängeln (Schlaglöcher, Straßenbeleuchtung) mit Fotoanhang, und Veranstaltungskalender. Alle Daten liegen in einer DSGVO-konformen Kommunalcloud; Datensouveränität ist politisch vorgeschrieben. Die Anwendung muss barrierefrei sein und in 8 Sprachen verfügbar sein.",
  },
  {
    name: "AutoTech Dynamics AG",
    branche: "Automotive",
    produkt: "Flottenmanagement-Software",
    mitarbeiter: "200",
    description:
      "Die AutoTech Dynamics AG entwickelt mit 200 Mitarbeitern eine Cloud-Plattform für gewerbliches Flottenmanagement. Kunden sind Speditionen, Lieferdienste und Behördenfahrzeugpools mit Fuhrparks von 10 bis 5.000 Fahrzeugen. Die Plattform bietet GPS-Echtzeit-Ortung, digitales Fahrtenbuch (finanzamtkonform), Wartungs- und TÜV-Planung, Fahrerverwaltung mit Fahrerbewertung sowie CO₂-Reporting für Nachhaltigkeitsberichte. Die Integration erfolgt via OBD-II-Dongles und Hersteller-APIs (CAN-Bus-Daten). Datenschutz der Fahrzeugteilnehmer (§ 26 BDSG) ist zu beachten.",
  },
  {
    name: "FreshFood AG",
    branche: "Lebensmittel-Logistik",
    produkt: "Digitales Bestellportal",
    mitarbeiter: "180",
    description:
      "Die FreshFood AG beliefert mit 180 Mitarbeitern täglich 800 Restaurants, Kantinen und Lebensmittelhändler mit frischen Zutaten. Die bisherige Bestellerfassung per Telefon und E-Mail ist fehleranfällig und ineffizient. Das neue digitale Bestellportal soll: webbasierte Bestellung mit Produktkatalog (10.000+ Artikel, tagesaktuelle Preise), automatische Tourenplanung für Kühlfahrzeuge, Lagersteuerung mit FIFO-Prinzip und MHD-Überwachung sowie EDI-Anbindung an Großkunden-ERP-Systeme ermöglichen. Besondere Herausforderung: Bestellschluss um 22 Uhr für Lieferung am nächsten Morgen ab 5 Uhr.",
  },
  {
    name: "TravelTech GmbH",
    branche: "Tourismus",
    produkt: "Reisebuchungsplattform",
    mitarbeiter: "55",
    description:
      "Die TravelTech GmbH entwickelt mit 55 Mitarbeitern eine Reisebuchungsplattform, über die Nutzer Flüge, Hotels, Mietwagen und Pauschalreisen buchen können. Die Plattform aggregiert Angebote von über 200 Anbietern per GDS-Anbindung (Amadeus, Sabre), setzt KI-gestützte Preisvorhersagen ein und bietet ein personalisertes Empfehlungssystem. Besondere Merkmale: dynamische Paketpreisgestaltung, mehrsprachige Oberfläche (14 Sprachen), Zahlungsabwicklung mit 3D-Secure, ATOL-/IATA-Akkreditierung sowie ein Bewertungssystem mit verifizierter Buchungshistorie. Das Unternehmen operiert in einem stark regulierten Markt mit enger Compliance-Anforderung (Pauschalreiserichtlinie EU 2015/2302).",
  },
];

export function pickRandomScenario(): Scenario {
  return SCENARIOS[Math.floor(Math.random() * SCENARIOS.length)];
}

export function applyScenario(text: string, s: Scenario): string {
  return text
    .replace(/\{\{UNTERNEHMEN\}\}/g, s.name)
    .replace(/\{\{BRANCHE\}\}/g, s.branche)
    .replace(/\{\{PRODUKT\}\}/g, s.produkt)
    .replace(/\{\{MITARBEITER\}\}/g, s.mitarbeiter);
}
