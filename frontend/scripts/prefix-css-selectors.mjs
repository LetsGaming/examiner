/**
 * scripts/prefix-css-selectors.mjs
 *
 * Prefixt alle Top-Level-Selektoren einer CSS-Datei mit einem Page-Wrapper
 * (z.B. ".home-page"), damit sie implizit auf diese View gescoped sind.
 *
 * Hintergrund:
 *  Vue-SFC-Style mit `scoped` hängt einen `data-v-xxxx`-Hash an die Selektoren
 *  UND die Elemente im *gleichen Template*. Über `@import './foo.css'` hinweg
 *  wird der Hash zwar angehängt, aber Child-Komponenten mit eigenem `<script
 *  setup>` bekommen ihren eigenen Hash — die Regeln treffen sie nicht.
 *
 *  Lösung: CSS unscoped lassen und per Page-Wrapper-Präfix isolieren.
 *
 * Verwendung:
 *   node prefix-css-selectors.mjs <input.css> <wrapper-class>
 *   → schreibt die geprefixte Datei an der gleichen Stelle zurück.
 */

import { readFileSync, writeFileSync } from 'node:fs';

const [, , inputPath, wrapperClass] = process.argv;
if (!inputPath || !wrapperClass) {
  console.error('Usage: node prefix-css-selectors.mjs <input.css> <.wrapper-class>');
  process.exit(1);
}

const src = readFileSync(inputPath, 'utf8');

// Einfacher CSS-Parser: wir splitten auf "{" und "}", aber respektieren @-Rules
// (z.B. @keyframes, @media) die nested sind.
//
// Ansatz: Tokenize in Blocks, für jeden Block prüfen ob es ein Selector-Block
// ist (dann prefixen) oder @-Rule (dann rekursiv durch den Body gehen).

function prefixSelector(selector, wrapper) {
  // Bereits geprefixte Selektoren unverändert lassen
  const trimmed = selector.trim();
  if (!trimmed) return trimmed;
  if (trimmed.startsWith(wrapper)) return trimmed;
  // `:root`, `html`, `body` sind global — nicht prefixen (selten in View-CSS,
  // aber defensiv).
  if (/^(:root|html|body|\*)\b/.test(trimmed)) return trimmed;
  // Keyframe-Prozente ("0%", "from", "to") sind keine echten Selektoren
  if (/^\d+%$|^(from|to)$/.test(trimmed)) return trimmed;
  return `${wrapper} ${trimmed}`;
}

function prefixRuleHeader(header, wrapper) {
  // Split auf Komma, jeden Selektor einzeln prefixen, wieder zusammen joinen.
  return header
    .split(',')
    .map((s) => prefixSelector(s, wrapper))
    .join(', ');
}

// Tokenisieren: wir iterieren character-wise und bauen Top-Level-Blocks.
// Innerhalb von @-Rules (nested) lassen wir den Inhalt unverändert — die
// inneren Selektoren dort sind schon durch den @-Wrapper geschützt, aber wir
// prefixen sie trotzdem, damit auch @media { .foo {} } nicht global leaked.

function transform(css, wrapper) {
  let out = '';
  let i = 0;
  const len = css.length;

  while (i < len) {
    // Whitespace / comments passthrough
    if (/\s/.test(css[i])) {
      out += css[i];
      i++;
      continue;
    }
    if (css[i] === '/' && css[i + 1] === '*') {
      const end = css.indexOf('*/', i + 2);
      if (end === -1) {
        out += css.slice(i);
        break;
      }
      out += css.slice(i, end + 2);
      i = end + 2;
      continue;
    }

    // @-Rule parsen
    if (css[i] === '@') {
      // Header bis '{' oder ';' einlesen
      let j = i;
      while (j < len && css[j] !== '{' && css[j] !== ';') j++;
      const header = css.slice(i, j);
      if (css[j] === ';') {
        // @-Rule ohne Block (z.B. @import, @charset)
        out += header + ';';
        i = j + 1;
        continue;
      }
      // @-Rule mit Block: Body einlesen (Klammer-balanced)
      const bodyStart = j + 1;
      let depth = 1;
      let k = bodyStart;
      while (k < len && depth > 0) {
        if (css[k] === '{') depth++;
        else if (css[k] === '}') depth--;
        if (depth > 0) k++;
      }
      const body = css.slice(bodyStart, k);
      // Für @keyframes: Body nicht prefixen (Selektoren sind "from"/"to"/"N%")
      // Für alle anderen @-Rules (z.B. @media, @supports): Body rekursiv prefixen
      const headerTrim = header.trim();
      const isKeyframes = /^@(-\w+-)?keyframes\b/.test(headerTrim);
      out += header + '{' + (isKeyframes ? body : transform(body, wrapper)) + '}';
      i = k + 1;
      continue;
    }

    // Normaler Selektor-Block: Header bis '{' lesen
    let j = i;
    while (j < len && css[j] !== '{') j++;
    if (j === len) {
      out += css.slice(i);
      break;
    }
    const header = css.slice(i, j);
    const bodyStart = j + 1;
    let depth = 1;
    let k = bodyStart;
    while (k < len && depth > 0) {
      if (css[k] === '{') depth++;
      else if (css[k] === '}') depth--;
      if (depth > 0) k++;
    }
    const body = css.slice(bodyStart, k);
    out += prefixRuleHeader(header, wrapper) + ' {' + body + '}';
    i = k + 1;
  }

  return out;
}

const result = transform(src, wrapperClass);
writeFileSync(inputPath, result, 'utf8');
console.log(`✓ prefixed ${inputPath} with ${wrapperClass}`);
