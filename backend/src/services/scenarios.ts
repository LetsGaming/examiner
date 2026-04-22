/**
 * scenarios.ts — Ausgangssituationen für IHK-AP2-Prüfungen.
 *
 * ## Neuer Flow (AP2-konform)
 *
 * Der alte Ansatz hat ein zufälliges Szenario aus einer statischen Liste gewählt
 * und dann die Aufgaben-Platzhalter damit befüllt. Das Problem: die gewählten
 * Aufgaben passten oft thematisch gar nicht zum Szenario (z.B. SQL-Aufgabe mit
 * Warenwirtschaft im Szenario einer Smart-Home-App).
 *
 * Echte IHK-Prüfungen funktionieren andersrum: es gibt EINE Ausgangssituation,
 * und ALLE Aufgaben sind bewusst auf sie zugeschnitten. Der Flow hier spiegelt
 * das wider:
 *
 *   1. KI-generierte Aufgaben landen im Pool (szenario-frei — mit Platzhaltern
 *      und abstrakter Formulierung).
 *   2. Beim Prüfungs-Start werden 4 Aufgaben aus dem Pool gezogen.
 *   3. Die KI generiert DANACH eine Ausgangssituation, die zu den gezogenen
 *      Aufgaben passt (anhand deren Themen).
 *   4. Platzhalter in den Aufgaben werden mit den Szenario-Werten ersetzt.
 *
 * ## Fallback-Szenarien
 *
 * Falls die KI-Generierung fehlschlägt (kein API-Key, Provider down), greift
 * ein Pool statischer Szenarien als Ersatz. Diese sind Generalisten und
 * passen zumindest grob zu allen Themen.
 */

import { callAiProvider } from "./aiService.js";
import type { ProviderMeta } from "../routes/settingsRoutes.js";
import type { ExamPart } from "../types/index.js";

export interface Scenario {
  name: string;
  branche: string;
  produkt: string;
  mitarbeiter: string;
  description: string;
}

// ─── Statischer Fallback-Pool ────────────────────────────────────────────────
// Wird nur verwendet, wenn die KI-Generierung fehlschlägt. Generisch gehalten,
// damit die meisten Themen plausibel reinpassen.

export const FALLBACK_SCENARIOS: Scenario[] = [
  {
    name: "SmartLogistik GmbH",
    branche: "Logistik",
    produkt: "Sendungsverfolgungsapp",
    mitarbeiter: "280",
    description:
      "Die SmartLogistik GmbH ist ein Logistikunternehmen mit 280 Mitarbeitern und Sitz in Hannover. Täglich werden etwa 5.000 Pakete deutschlandweit transportiert. Aktuell entwickelt das Unternehmen eine mobile App für die Fahrer und ein Webportal für Kunden, über das der Stand einer Sendung eingesehen werden kann. Das IT-Team besteht aus 12 Personen und arbeitet agil nach Scrum. Datenschutz und hohe Verfügbarkeit sind wichtig, weil der Fahrbetrieb auf die Systeme angewiesen ist.",
  },
  {
    name: "MediCare Systems AG",
    branche: "Gesundheitswesen",
    produkt: "Patientenverwaltungssoftware",
    mitarbeiter: "150",
    description:
      "Die MediCare Systems AG entwickelt mit 150 Mitarbeitern eine Software für eine Krankenhausgruppe mit 8 Standorten. Die Software verwaltet Patientendaten, Termine, Behandlungshistorien und Abrechnungen. Die Anwendung läuft in einer Cloud-Umgebung und wird über einen Webbrowser genutzt. Wichtige Anforderungen sind Datenschutz nach DSGVO, eine zuverlässige Verfügbarkeit rund um die Uhr, und ein Rechtekonzept, damit z.B. Pflegepersonal andere Daten sieht als Verwaltungsmitarbeiter.",
  },
  {
    name: "RetailPro GmbH",
    branche: "Einzelhandel",
    produkt: "Warenwirtschaftssystem",
    mitarbeiter: "320",
    description:
      "Die RetailPro GmbH betreibt mit 320 Mitarbeitern 35 Filialen in Deutschland und zusätzlich einen Onlineshop mit etwa 80.000 Artikeln. Das bisherige Warenwirtschaftssystem ist veraltet und soll durch eine Neuentwicklung ersetzt werden. Die neue Lösung soll Lagerbestände über alle Filialen und den Onlineshop synchronisieren, bei niedrigen Beständen automatisch Nachbestellungen auslösen, und Kassensysteme in den Filialen anbinden.",
  },
  {
    name: "FinTech Solutions AG",
    branche: "Finanzdienstleistungen",
    produkt: "Mobile-Banking-App",
    mitarbeiter: "90",
    description:
      "Die FinTech Solutions AG entwickelt mit 90 Mitarbeitern eine mobile App für Privatkunden. Die App bietet Kontostand, Überweisungen, Daueraufträge und einfache Auswertungen der eigenen Ausgaben. Weil es um Finanzdaten geht, sind IT-Sicherheit und Datenschutz besonders wichtig: beim Login ist eine Zwei-Faktor-Authentifizierung vorgeschrieben. Neben der App betreibt das Unternehmen eine REST-API für Partnerfirmen.",
  },
];

export function pickRandomFallbackScenario(): Scenario {
  return FALLBACK_SCENARIOS[Math.floor(Math.random() * FALLBACK_SCENARIOS.length)];
}

/**
 * Ersetzt die vier Szenario-Platzhalter in einem Text.
 * Wird nach der Szenario-Wahl (KI-generiert oder Fallback) auf alle
 * Aufgabentexte und expected_answer-Felder angewendet.
 */
export function applyScenario(text: string, s: Scenario): string {
  return text
    .replace(/\{\{UNTERNEHMEN\}\}/g, s.name)
    .replace(/\{\{BRANCHE\}\}/g, s.branche)
    .replace(/\{\{PRODUKT\}\}/g, s.produkt)
    .replace(/\{\{MITARBEITER\}\}/g, s.mitarbeiter);
}

// ─── KI-gestützte Szenario-Generierung ──────────────────────────────────────

const PART_CONTEXT: Record<ExamPart, string> = {
  teil_1:
    "Teil 1 der AP2 (Planen eines Softwareproduktes) — typisch sind Themen wie Anforderungsanalyse, Stakeholder, Projektplanung, Vorgehensmodelle, UML, UI-Entwurf, Qualitätssicherung, Datenmodellierung.",
  teil_2:
    "Teil 2 der AP2 (Entwicklung und Umsetzung von Algorithmen) — typisch sind Themen wie SQL, Pseudocode, Datenstrukturen, OOP, Rekursion, Speicherberechnung, Schnittstellen.",
  teil_3:
    "Teil 3 der AP2 (Wirtschafts- und Sozialkunde) — typisch sind Themen wie Arbeitsrecht, Ausbildungsrecht, Sozialversicherung, Gesellschaftsformen, Wirtschaftlichkeit.",
};

/**
 * Generiert eine Ausgangssituation, die zu den gezogenen Aufgaben-Themen passt.
 * Die KI kennt die Themen und wählt ein plausibles Unternehmen, dessen
 * Projektkontext natürlich zu allen 4 Aufgaben führt.
 *
 * Fällt bei jedem Fehler auf einen statischen Fallback zurück — der Start
 * einer Prüfung darf nie an einer Szenario-Generierung scheitern.
 */
export async function generateScenarioForTasks(
  part: ExamPart,
  topics: string[],
  apiKey: string,
  meta: ProviderMeta,
): Promise<Scenario> {
  const topicList = topics.map((t) => `- ${t}`).join("\n");
  const prompt = `Du bist IHK-Prüfungsersteller für Fachinformatiker Anwendungsentwicklung.

Erstelle eine Ausgangssituation für folgende Prüfung:
${PART_CONTEXT[part]}

Die Prüfung enthält Aufgaben zu diesen Themen:
${topicList}

ANFORDERUNGEN AN DIE AUSGANGSSITUATION:
- Ein mittelständisches Unternehmen (40–400 Mitarbeiter) aus einer realistischen Branche.
- Das Unternehmen arbeitet an einem konkreten Softwareprojekt, aus dem sich ALLE genannten Aufgaben-Themen sinnvoll ableiten lassen.
- Die Beschreibung ist 3–5 Sätze lang, sachlich formuliert, ohne Buzzword-Overload.
- Nur Vokabular, das ein FIAE im 3. Lehrjahr kennt (DSGVO, REST-API, Cloud, agil/Scrum, Datenbank, Backup, 2FA erlaubt — vermeide Spezialbegriffe wie HL7/FHIR, PSD2, BaFin, CAN-Bus, Strangler-Fig, ATOL, WCAG).
- Firmenname wirkt realistisch (keine ulkigen Namen wie "MegaTech9000"). Erlaubt: "Name + Rechtsform" wie "Kranich Logistik GmbH" oder "Mertens & Söhne AG".

Gib AUSSCHLIESSLICH valides JSON zurück (kein Markdown, keine Backticks):
{
  "name": "Name GmbH",
  "branche": "Branchenbezeichnung",
  "produkt": "Projektname oder Produktbezeichnung",
  "mitarbeiter": "120",
  "description": "3-5 Sätze Ausgangssituation."
}`;

  try {
    const raw = await callAiProvider(prompt, apiKey, meta);
    const parsed = parseScenarioJson(raw);
    if (parsed) return parsed;
  } catch (err) {
    console.warn(
      `[scenario] KI-Generierung fehlgeschlagen (${meta.label}): ${err instanceof Error ? err.message : err}`,
    );
  }
  // Fallback: statisches Szenario
  return pickRandomFallbackScenario();
}

function parseScenarioJson(raw: string): Scenario | null {
  // KI-Output von Markdown-Fences befreien
  const clean = raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/i, "")
    .trim();
  try {
    const obj = JSON.parse(clean);
    if (
      typeof obj === "object" &&
      obj &&
      typeof obj.name === "string" &&
      typeof obj.branche === "string" &&
      typeof obj.produkt === "string" &&
      typeof obj.description === "string"
    ) {
      return {
        name: obj.name,
        branche: obj.branche,
        produkt: obj.produkt,
        mitarbeiter: String(obj.mitarbeiter ?? "100"),
        description: obj.description,
      };
    }
  } catch {
    // Parse-Fehler → null → Fallback im aufrufenden Code
  }
  return null;
}

// ─── Legacy-Kompatibilität ──────────────────────────────────────────────────
// Alte Importe (`SCENARIOS`, `pickRandomScenario`) auf Fallback-Namen mappen,
// damit `database.ts` und andere Module weiterhin funktionieren.

export const SCENARIOS = FALLBACK_SCENARIOS;
export const pickRandomScenario = pickRandomFallbackScenario;
