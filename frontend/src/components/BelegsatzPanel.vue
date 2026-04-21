<template>
  <Teleport to="body">
    <div v-if="modelValue" class="overlay" @click.self="$emit('update:modelValue', false)">
      <div class="overlay-panel overlay-panel-wide">
        <div class="overlay-header">
          <span>Belegsatz</span>
          <button @click="$emit('update:modelValue', false)">✕</button>
        </div>
        <div class="overlay-body overlay-scroll">

          <!-- ─── Teil 1: Planen ─── -->
          <template v-if="examPart === 'teil_1'">
            <div class="bs-section">
              <h3 class="bs-h1">UML-Diagrammtypen</h3>
              <h4 class="bs-h2">Strukturdiagramme</h4>
              <table class="bs-table"><tbody>
                <tr><td>Klassendiagramm</td><td>Klassen, Attribute, Methoden, Beziehungen</td></tr>
                <tr><td>Objektdiagramm</td><td>Instanzen zu einem Zeitpunkt</td></tr>
                <tr><td>Komponentendiagramm</td><td>Systemkomponenten und Schnittstellen</td></tr>
                <tr><td>Paketdiagramm</td><td>Gruppierung von Elementen</td></tr>
              </tbody></table>
              <h4 class="bs-h2">Verhaltensdiagramme</h4>
              <table class="bs-table"><tbody>
                <tr><td>Anwendungsfalldiagramm</td><td>Akteure und Use Cases</td></tr>
                <tr><td>Aktivitätsdiagramm</td><td>Ablauf, Verzweigungen, Parallelität</td></tr>
                <tr><td>Sequenzdiagramm</td><td>Zeitlicher Nachrichtenfluss zwischen Objekten</td></tr>
                <tr><td>Zustandsdiagramm</td><td>Zustandsübergänge eines Objekts</td></tr>
              </tbody></table>
              <a href="https://www.uml.org/what-is-uml.htm" target="_blank" class="bs-link">→ uml.org — Was ist UML?</a>
            </div>
            <div class="bs-section">
              <h3 class="bs-h1">Agile Methoden</h3>
              <h4 class="bs-h2">Scrum-Rollen</h4>
              <table class="bs-table"><tbody>
                <tr><td>Product Owner</td><td>Verantwortet Product Backlog, priorisiert Anforderungen</td></tr>
                <tr><td>Scrum Master</td><td>Beseitigt Hindernisse, moderiert, schützt das Team</td></tr>
                <tr><td>Development Team</td><td>Selbstorganisiert, cross-funktional, liefert Increment</td></tr>
              </tbody></table>
              <h4 class="bs-h2">Scrum-Events</h4>
              <table class="bs-table"><tbody>
                <tr><td>Sprint</td><td>Zeitbox (1–4 Wochen) zur Lieferung eines Increments</td></tr>
                <tr><td>Sprint Planning</td><td>Team wählt Items aus Backlog, plant Sprint</td></tr>
                <tr><td>Daily Scrum</td><td>15 Min täglich: Was getan? Was geplant? Hindernisse?</td></tr>
                <tr><td>Sprint Review</td><td>Demo des Increments, Feedback von Stakeholdern</td></tr>
                <tr><td>Retrospektive</td><td>Prozessverbesserung im Team</td></tr>
              </tbody></table>
              <a href="https://scrumguides.org/scrum-guide.html" target="_blank" class="bs-link">→ scrumguides.org — Offizieller Scrum Guide</a>
            </div>
            <div class="bs-section">
              <h3 class="bs-h1">User Story Format</h3>
              <div class="bs-code">Als &lt;Rolle&gt; möchte ich &lt;Funktion&gt;, damit &lt;Nutzen&gt;.</div>
              <h4 class="bs-h2">INVEST-Kriterien</h4>
              <table class="bs-table"><tbody>
                <tr><td>I – Independent</td><td>Unabhängig von anderen Stories</td></tr>
                <tr><td>N – Negotiable</td><td>Verhandelbar, kein starrer Vertrag</td></tr>
                <tr><td>V – Valuable</td><td>Konkreter Mehrwert für Stakeholder</td></tr>
                <tr><td>E – Estimable</td><td>Aufwand ist schätzbar</td></tr>
                <tr><td>S – Small</td><td>Klein genug für einen Sprint</td></tr>
                <tr><td>T – Testable</td><td>Ergebnis ist testbar / verifizierbar</td></tr>
              </tbody></table>
              <a href="https://www.agilealliance.org/glossary/invest/" target="_blank" class="bs-link">→ agilealliance.org — INVEST-Kriterien</a>
            </div>
            <div class="bs-section">
              <h3 class="bs-h1">Datenschutz (DSGVO)</h3>
              <table class="bs-table"><tbody>
                <tr><td>Datensparsamkeit</td><td>Nur notwendige Daten erheben</td></tr>
                <tr><td>Zweckbindung</td><td>Daten nur für angegebenen Zweck nutzen</td></tr>
                <tr><td>Auskunftsrecht</td><td>Betroffene haben Recht auf Auskunft/Löschung</td></tr>
                <tr><td>Privacy by Design</td><td>Datenschutz bereits in Systemdesign einbauen</td></tr>
                <tr><td>Auftragsverarbeitung</td><td>Vertrag bei Datenweitergabe an Dritte nötig</td></tr>
              </tbody></table>
              <a href="https://dsgvo-gesetz.de" target="_blank" class="bs-link">→ dsgvo-gesetz.de — DSGVO im Volltext</a>
            </div>
            <div class="bs-section">
              <h3 class="bs-h1">IHK-Notenschlüssel</h3>
              <table class="bs-table"><tbody>
                <tr><td>Note 1 (sehr gut)</td><td class="mono">92–100 %</td></tr>
                <tr><td>Note 2 (gut)</td><td class="mono">81–91 %</td></tr>
                <tr><td>Note 3 (befriedigend)</td><td class="mono">67–80 %</td></tr>
                <tr><td>Note 4 (ausreichend)</td><td class="mono">50–66 %</td></tr>
                <tr><td>Note 5 (mangelhaft)</td><td class="mono">30–49 %</td></tr>
                <tr><td>Note 6 (ungenügend)</td><td class="mono">0–29 %</td></tr>
              </tbody></table>
            </div>
          </template>

          <!-- ─── Teil 2: Entwicklung ─── -->
          <template v-else-if="examPart === 'teil_2'">
            <div class="bs-section">
              <h3 class="bs-h1">UML — Aktivitätsdiagramm</h3>
              <table class="bs-table"><tbody>
                <tr><td class="mono sym">●</td><td>Startknoten</td><td>Beginn des Aktivitätsflusses</td></tr>
                <tr><td class="mono sym">◎</td><td>Endknoten</td><td>Beendet alle Aktivitäten</td></tr>
                <tr><td class="mono sym">⊗</td><td>Ablaufende</td><td>Beendet nur aktuellen Fluss</td></tr>
                <tr><td class="mono sym">◇</td><td>Entscheidung</td><td>[Bedingung] an ausgehenden Kanten</td></tr>
                <tr><td class="mono sym">═</td><td>Teilung / Synchronisation</td><td>Fork / Join — Parallelabläufe</td></tr>
                <tr><td class="mono">|---|</td><td>Schwimmbahn</td><td>Verantwortliche Partei / Rolle</td></tr>
              </tbody></table>
              <a href="https://www.plantuml.com/plantuml/uml/" target="_blank" class="bs-link">→ plantuml.com — PlantUML Online-Editor</a>
            </div>
            <div class="bs-section">
              <h3 class="bs-h1">UML — Klassendiagramm</h3>
              <div class="bs-code">Sichtbarkeit Attributname : Typ {Eigenschaften}
Sichtbarkeit Methode(param : Typ, ...) : Rückgabetyp

+  public   #  protected   -  private   ~  package
Eigenschaften: {static}  {final}  {abstract}</div>
              <h4 class="bs-h2">Beziehungen</h4>
              <table class="bs-table"><tbody>
                <tr><td class="mono">——▷</td><td>Vererbung / Generalisierung</td></tr>
                <tr><td class="mono">————</td><td>Assoziation  (1 ——— *)  Kardinalität</td></tr>
                <tr><td class="mono">——▶</td><td>Gerichtete Assoziation</td></tr>
                <tr><td class="mono">◆——</td><td>Komposition  (existenzabhängig)</td></tr>
                <tr><td class="mono">◇——</td><td>Aggregation</td></tr>
                <tr><td class="mono">- -▷</td><td>Implementierung  &lt;&lt;interface&gt;&gt;</td></tr>
              </tbody></table>
            </div>
            <div class="bs-section">
              <h3 class="bs-h1">UML — Sequenzdiagramm</h3>
              <table class="bs-table"><tbody>
                <tr><td class="mono">————▶</td><td>Synchrone Nachricht (Sender wartet auf Antwort)</td></tr>
                <tr><td class="mono">- - -▶</td><td>Rückgabewert / asynchrone Nachricht</td></tr>
                <tr><td class="mono">|||</td><td>Ausführungsbalken (Aktivierung)</td></tr>
                <tr><td class="mono">create →</td><td>Objekt-Konstruktion</td></tr>
                <tr><td class="mono">✕</td><td>Objekt-Destruktion</td></tr>
              </tbody></table>
              <h4 class="bs-h2">Fragmente</h4>
              <table class="bs-table"><tbody>
                <tr><td class="mono">alt</td><td>Alternative Abläufe (if / else) — [Bedingung]</td></tr>
                <tr><td class="mono">opt</td><td>Optionaler Ablauf — [Bedingung]</td></tr>
                <tr><td class="mono">loop</td><td>Wiederholung — [Bedingung] oder loop(n)</td></tr>
                <tr><td class="mono">par</td><td>Parallele Abläufe</td></tr>
              </tbody></table>
            </div>
            <div class="bs-section">
              <h3 class="bs-h1">SQL-Syntax (Auszug)</h3>
              <h4 class="bs-h2">DDL — Tabellen definieren</h4>
              <div class="bs-code">CREATE TABLE Name (
  Spalte DATENTYP [NOT NULL] [DEFAULT Wert],
  ...
  PRIMARY KEY (Spalte),
  FOREIGN KEY (Spalte) REFERENCES Tabelle(Spalte)
)
ALTER TABLE Name ADD|DROP|MODIFY COLUMN ...
DROP TABLE Name</div>
              <h4 class="bs-h2">Datentypen</h4>
              <table class="bs-table"><tbody>
                <tr><td class="mono">CHAR(n) / VARCHAR(n)</td><td>Zeichenkette fester/variabler Länge</td></tr>
                <tr><td class="mono">INTEGER</td><td>Ganzzahl</td></tr>
                <tr><td class="mono">DECIMAL(p,s)</td><td>Festkommazahl (p Stellen, s Nachkomma)</td></tr>
                <tr><td class="mono">DOUBLE</td><td>Gleitkommazahl</td></tr>
                <tr><td class="mono">DATE</td><td>Datum (YYYY-MM-DD)</td></tr>
                <tr><td class="mono">BOOLEAN</td><td>TRUE / FALSE</td></tr>
              </tbody></table>
              <h4 class="bs-h2">DML — Daten abfragen &amp; ändern</h4>
              <div class="bs-code">SELECT [DISTINCT] * | Spalte1 [AS Alias], ...
FROM Tabelle [AS Alias]
  [INNER JOIN | LEFT JOIN | RIGHT JOIN T2 ON Bed.]
  [WHERE Bedingung]
  [GROUP BY Spalte]
  [HAVING Bedingung]
  [ORDER BY Spalte [ASC | DESC]]
  [LIMIT n]

INSERT INTO Tabelle (Spalten) VALUES (Werte)
UPDATE Tabelle SET Spalte = Wert [WHERE Bedingung]
DELETE FROM Tabelle [WHERE Bedingung]</div>
              <h4 class="bs-h2">Aggregatfunktionen</h4>
              <div class="bs-chips">
                <span>COUNT(*)</span><span>SUM(x)</span><span>AVG(x)</span>
                <span>MIN(x)</span><span>MAX(x)</span><span>STDDEV(x)</span>
              </div>
              <table class="bs-table" style="margin-top:8px"><tbody>
                <tr><td class="mono">AND / OR / NOT</td><td>Logische Operatoren</td></tr>
                <tr><td class="mono">IS NULL / LIKE</td><td>NULL-Prüfung / Muster (% beliebig, _ ein Zeichen)</td></tr>
                <tr><td class="mono">IN (Werte)</td><td>Wertemenge-Vergleich</td></tr>
                <tr><td class="mono">WHERE EXISTS (sub)</td><td>Unterabfrage auf Existenz prüfen</td></tr>
                <tr><td class="mono">UNION [ALL]</td><td>Ergebnismengen vereinigen</td></tr>
              </tbody></table>
              <h4 class="bs-h2">Datumsfunktionen</h4>
              <table class="bs-table"><tbody>
                <tr><td class="mono">NOW()</td><td>Aktuelles Datum und Uhrzeit</td></tr>
                <tr><td class="mono">YEAR(d) / MONTH(d) / DAY(d)</td><td>Jahr / Monat / Tag extrahieren</td></tr>
                <tr><td class="mono">DATEDIFF(d1,d2)</td><td>Differenz in Tagen</td></tr>
              </tbody></table>
              <a href="https://www.w3schools.com/sql/sql_ref_keywords.asp" target="_blank" class="bs-link">→ w3schools.com — SQL-Referenz</a>
            </div>
            <div class="bs-section">
              <h3 class="bs-h1">Pseudocode-Referenz</h3>
              <div class="bs-code">BEGIN / END

IF &lt;Bedingung&gt; THEN
  ...
[ELSE IF &lt;Bedingung&gt; THEN ...]
[ELSE ...]
END IF

WHILE &lt;Bedingung&gt; DO
  ...
END WHILE

FOR i = &lt;start&gt; TO &lt;end&gt; [STEP &lt;n&gt;] DO
  ...
END FOR

FUNCTION &lt;Name&gt;(&lt;Param&gt;: &lt;Typ&gt;, ...): &lt;Rückgabetyp&gt;
  ...
  RETURN &lt;Wert&gt;
END FUNCTION

OUTPUT &lt;Ausdruck&gt;   INPUT &lt;Variable&gt;</div>
            </div>
            <div class="bs-section">
              <h3 class="bs-h1">Komplexitätsnotation (O-Notation)</h3>
              <table class="bs-table"><tbody>
                <tr><td class="mono">O(1)</td><td>Konstant — unabhängig von n</td></tr>
                <tr><td class="mono">O(log n)</td><td>Logarithmisch — z.B. binäre Suche</td></tr>
                <tr><td class="mono">O(n)</td><td>Linear — z.B. lineare Suche</td></tr>
                <tr><td class="mono">O(n log n)</td><td>Linearithmisch — z.B. Merge Sort</td></tr>
                <tr><td class="mono">O(n²)</td><td>Quadratisch — z.B. Bubble Sort</td></tr>
                <tr><td class="mono">O(2ⁿ)</td><td>Exponentiell — z.B. naive Fibonacci</td></tr>
              </tbody></table>
              <a href="https://www.bigocheatsheet.com" target="_blank" class="bs-link">→ bigocheatsheet.com — Algorithmen &amp; Komplexität</a>
            </div>
          </template>

        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import type { ExamPart } from '../types/index.js'

defineProps<{ modelValue: boolean; examPart: ExamPart }>()
defineEmits<{ 'update:modelValue': [value: boolean] }>()
</script>

<style scoped>
.overlay {
  position: fixed; inset: 0; background: rgba(0,0,0,.7);
  display: flex; align-items: center; justify-content: center;
  z-index: 200; padding: 20px;
}
.overlay-panel {
  background: #1a1d2e; border: 1px solid rgba(255,255,255,.1);
  border-radius: 16px; width: 100%; max-width: 520px;
  max-height: 85dvh; display: flex; flex-direction: column; overflow: hidden;
}
.overlay-panel-wide { max-width: 660px; }
.overlay-header {
  display: flex; justify-content: space-between; align-items: center;
  padding: 14px 18px; border-bottom: 1px solid rgba(255,255,255,.08);
  font-size: 14px; font-weight: 700; color: #f0f1f8; flex-shrink: 0;
}
.overlay-header button {
  background: none; border: none; color: #6b7280; cursor: pointer;
  font-size: 18px; line-height: 1;
}
.overlay-header button:hover { color: #f0f1f8; }
.overlay-body { padding: 18px; }
.overlay-scroll { max-height: calc(85dvh - 52px); overflow-y: auto; }

.bs-section {
  margin-bottom: 24px; padding-bottom: 20px;
  border-bottom: 1px solid rgba(255,255,255,.07);
}
.bs-section:last-child { border-bottom: none; margin-bottom: 0; }
.bs-h1 { font-size: 14px; font-weight: 700; color: #f0f1f8; margin-bottom: 10px; }
.bs-h2 {
  font-size: 10px; font-weight: 700; text-transform: uppercase;
  letter-spacing: .08em; color: #4b5563; margin: 10px 0 6px;
}
.bs-table { width: 100%; border-collapse: collapse; }
.bs-table td {
  padding: 5px 6px; font-size: 12px; line-height: 1.5;
  border-bottom: 1px solid rgba(255,255,255,.04);
  vertical-align: top; color: #d1d5db;
}
.bs-table tr:last-child td { border-bottom: none; }
.bs-table td:first-child {
  font-weight: 600; white-space: nowrap; padding-right: 14px;
  color: #9ca3af; width: 1%;
}
.mono { font-family: 'SF Mono', 'Fira Code', monospace !important; font-size: 11.5px !important; }
.sym  { text-align: center; font-size: 14px; color: #818cf8; }
.bs-code {
  background: #0a0c12; border: 1px solid rgba(255,255,255,.08);
  border-radius: 8px; padding: 11px 13px;
  font-family: 'SF Mono', 'Fira Code', monospace; font-size: 12px;
  line-height: 1.65; white-space: pre; overflow-x: auto; color: #d1d5db;
}
.bs-chips { display: flex; flex-wrap: wrap; gap: 5px; margin-top: 4px; }
.bs-chips span {
  background: rgba(255,255,255,.05); border: 1px solid rgba(255,255,255,.08);
  border-radius: 5px; padding: 2px 9px; font-family: monospace;
  font-size: 12px; color: #9ca3af;
}
.bs-link {
  display: inline-block; margin-top: 8px; font-size: 12px;
  color: #818cf8; text-decoration: none;
}
.bs-link:hover { text-decoration: underline; }
</style>
