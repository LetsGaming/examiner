# Theming & Styles

## Ionic CSS-Variablen

Das Farbsystem basiert auf Ionic's Standard-CSS-Variablen, die in `src/theme/variables.css` überschrieben werden. Alle Komponenten nutzen diese Variablen — kein hardcodiertes Farbhex im Komponenten-Code.

### Primärfarben

| Variable | Light | Dark | Verwendung |
|---|---|---|---|
| `--ion-color-primary` | `#2563eb` | `#2563eb` | Aktive Elemente, Buttons, Links |
| `--ion-color-secondary` | `#7c3aed` | `#7c3aed` | KI-Bewertungs-Button, Teil-2-Chip |
| `--ion-color-success` | `#16a34a` | `#16a34a` | Sehr gut, bewertet |
| `--ion-color-warning` | `#d97706` | `#d97706` | Ausreichend, Timer-Warnung |
| `--ion-color-danger` | `#dc2626` | `#dc2626` | Mangelhaft, Timer-Kritisch |

### Dark Mode

Der Dark Mode wird über `@media (prefers-color-scheme: dark)` aktiviert und überschreibt Hintergrund, Text- und Border-Farben:

```css
@media (prefers-color-scheme: dark) {
  :root {
    --ion-background-color: #0f172a;
    --ion-text-color: #e2e8f0;
    --ion-color-light: #1e293b;
    --ion-color-light-shade: #334155;
  }
}
```

Alle Komponenten-Styles nutzen ausschließlich CSS-Variablen und passen sich automatisch an.

## Scoped Styles

Jede Komponente hat `<style scoped>` — CSS-Klassen sind auf die Komponente beschränkt und erzeugen keine globalen Seiteneffekte.

## Responsive Breakpoints

Das Layout bricht bei `768px` von Desktop- in Mobile-Ansicht um:

```css
@media (max-width: 768px) {
  /* Sidebar wird zur Overlay-Navigation */
  .task-nav {
    position: fixed;
    transform: translateX(-100%);
  }
  .task-nav--open { transform: translateX(0); }

  /* Mobile Aufgaben-Chip-Leiste erscheint */
  .mobile-nav-row { display: flex; }

  /* PlantUML-Editor: nebeneinander → untereinander */
  .plantuml-grid { grid-template-columns: 1fr; }
}
```

## Pseudocode / Code-Editor Styling

Der Pseudocode-Textarea und der PlantUML-Editor haben ein dunkles Theme unabhängig vom System-Dark-Mode, da Code immer auf dunklem Hintergrund lesbarer ist:

```css
.plantuml-editor {
  background: #1e1e2e;   /* Catppuccin Mocha Base */
  color: #cdd6f4;         /* Catppuccin Mocha Text */
  font-family: 'SF Mono', 'Fira Code', 'Courier New', monospace;
}
```

## Ionicons

Alle Icons stammen aus dem `ionicons`-Paket und werden als benannte Imports eingebunden:

```typescript
import { timeOutline, trophyOutline, sparklesOutline } from 'ionicons/icons'
```

Das reduziert den Bundle um alle nicht genutzten Icons (Tree-Shaking).
