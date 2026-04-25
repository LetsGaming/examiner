/**
 * useTaskReport.ts — State und Logik für den Aufgaben-Report-Workflow.
 *
 * Workflow: User klickt einen Report-Button → Modal öffnet sich mit
 * vorausgefülltem Formular (Kategorie + Beschreibungs-Template + Vorschlags-
 * Template) → User kreuzt Kategorie an, ändert ggf. Templates → Submit
 * baut einen Markdown-Block mit Deep-Link in die Admin-View und schreibt
 * ihn in die Zwischenablage.
 *
 * Templates werden NICHT mitgesendet, wenn der User sie unverändert lässt.
 * So bleibt der Report-Log frei von Template-Boilerplate-Noise.
 *
 * Autor: { name: "LetsGamingDE", id: 272402865874534400n }
 */

import { reactive, ref } from 'vue';
import type { ExamPart } from '../types/index.js';

// ─── Kategorien ──────────────────────────────────────────────────────────────

export type ReportCategory =
  | 'task_wrong'
  | 'solution_wrong'
  | 'grading_unfair'
  | 'typo'
  | 'other';

export interface CategoryMeta {
  id: ReportCategory;
  label: string;
  emoji: string;
  /** Vorgeschlagene Beschreibungs-Vorlage; User darf überschreiben. */
  descriptionTemplate: string;
  /** Vorgeschlagene Vorschlags-Vorlage. */
  suggestionTemplate: string;
}

export const REPORT_CATEGORIES: CategoryMeta[] = [
  {
    id: 'task_wrong',
    label: 'Aufgabe ist falsch',
    emoji: '🔴',
    descriptionTemplate:
      'Die Aufgabenstellung enthält einen fachlichen Fehler. Konkret: …',
    suggestionTemplate: 'Richtig wäre: …',
  },
  {
    id: 'solution_wrong',
    label: 'Lösung ist falsch',
    emoji: '🟠',
    descriptionTemplate:
      'Die Musterlösung passt nicht zur Aufgabenstellung. Konkret: …',
    suggestionTemplate: 'Die korrekte Lösung wäre: …',
  },
  {
    id: 'grading_unfair',
    label: 'Bewertung war unfair',
    emoji: '🟡',
    descriptionTemplate:
      'Meine Antwort wurde falsch bewertet. Konkret: …',
    suggestionTemplate: 'Die Antwort sollte als (richtig|teilweise richtig) gewertet werden, weil …',
  },
  {
    id: 'typo',
    label: 'Tippfehler / Formulierung',
    emoji: '🔵',
    descriptionTemplate: 'Folgender Tippfehler / unklare Formulierung: …',
    suggestionTemplate: 'Besser wäre: …',
  },
  {
    id: 'other',
    label: 'Sonstiges',
    emoji: '⚪',
    descriptionTemplate: '…',
    suggestionTemplate: '',
  },
];

// ─── Form-Kontext ────────────────────────────────────────────────────────────

/**
 * Daten, die der Aufrufer (ExamView, TaskResultBlock, HistoryDetailView) ans
 * Composable übergibt, sobald der Report-Button geklickt wurde. Alles
 * Strings — nichts wird automatisch ans Clipboard geschickt, was der User
 * nicht im finalen Markdown-Output sieht.
 */
export interface ReportContext {
  taskId: string;
  subtaskId?: string;
  /** Anzeige-Label des Subtasks (z.B. "ba"). */
  subtaskLabel?: string;
  /** Topic-Area der Aufgabe (z.B. "SQL JOIN"). */
  topicArea: string;
  /** Welcher Prüfungsteil (für Tab-Auswahl in der Admin-View). */
  examPart: ExamPart;
  /** Session-ID — primär für den Admin als Querverweis. */
  sessionId?: string;
}

interface FormState {
  category: ReportCategory;
  description: string;
  suggestion: string;
}

// ─── Composable ──────────────────────────────────────────────────────────────

const open = ref(false);
const ctx = ref<ReportContext | null>(null);
const submitting = ref(false);
const submitError = ref<string | null>(null);
/** Toast-State: Erfolg-Hinweis kurz nach Klemmbrett-Schreiben. */
const submittedSuccess = ref(false);

const form = reactive<FormState>({
  category: 'task_wrong',
  description: '',
  suggestion: '',
});

function categoryMeta(id: ReportCategory): CategoryMeta {
  return REPORT_CATEGORIES.find((c) => c.id === id) ?? REPORT_CATEGORIES[0];
}

/** Setzt Templates aus der Kategorie. Wird beim Öffnen + Kategorie-Wechsel aufgerufen. */
function applyTemplates(category: ReportCategory): void {
  const meta = categoryMeta(category);
  form.category = category;
  form.description = meta.descriptionTemplate;
  form.suggestion = meta.suggestionTemplate;
}

/** Öffnet das Modal mit voreingestellter Kategorie + Templates. */
export function openReport(context: ReportContext, defaultCategory: ReportCategory = 'task_wrong'): void {
  ctx.value = context;
  applyTemplates(defaultCategory);
  submitError.value = null;
  submittedSuccess.value = false;
  open.value = true;
}

function closeReport(): void {
  open.value = false;
  ctx.value = null;
}

/**
 * Wenn der User die Kategorie wechselt: Templates aktualisieren — aber NUR
 * wenn der User die alten Templates nicht angepasst hat. Sonst gehen seine
 * Eingaben beim versehentlichen Klick verloren.
 */
function changeCategory(next: ReportCategory): void {
  const oldMeta = categoryMeta(form.category);
  const userTouchedDescription = form.description !== oldMeta.descriptionTemplate;
  const userTouchedSuggestion = form.suggestion !== oldMeta.suggestionTemplate;

  form.category = next;
  const newMeta = categoryMeta(next);
  if (!userTouchedDescription) form.description = newMeta.descriptionTemplate;
  if (!userTouchedSuggestion) form.suggestion = newMeta.suggestionTemplate;
}

// ─── Markdown-Generator ──────────────────────────────────────────────────────

function buildAdminUrl(context: ReportContext): string {
  const url = new URL('/admin', window.location.origin);
  url.searchParams.set('tab', `pool-${context.examPart}`);
  url.searchParams.set('taskId', context.taskId);
  if (context.subtaskId) url.searchParams.set('subtaskId', context.subtaskId);
  return url.toString();
}

function isFieldFilled(value: string, template: string): boolean {
  // Leer oder unverändert vom Template → nicht mitsenden.
  const v = value.trim();
  if (v.length === 0) return false;
  if (v === template.trim()) return false;
  // Auch der bloße Templatesatz mit "…" am Ende zählt als "nicht ausgefüllt"
  if (v.replace(/\s+/g, ' ') === template.replace(/\s+/g, ' ').trim()) return false;
  return true;
}

/** Reine Funktion — pro Test isoliert nutzbar. */
export function buildReportMarkdown(
  context: ReportContext,
  formData: { category: ReportCategory; description: string; suggestion: string },
): string {
  const meta = categoryMeta(formData.category);
  const lines: string[] = [];

  lines.push(`🐛 **Aufgaben-Report — ${meta.label}**`);
  lines.push(`Topic: ${context.topicArea}`);
  if (context.subtaskLabel) {
    lines.push(`Aufgabe: ${context.taskId} (Subtask ${context.subtaskLabel})`);
  } else {
    lines.push(`Aufgabe: ${context.taskId}`);
  }
  lines.push('');

  if (isFieldFilled(formData.description, meta.descriptionTemplate)) {
    lines.push('**Beschreibung:**');
    lines.push(formData.description.trim());
    lines.push('');
  }

  if (isFieldFilled(formData.suggestion, meta.suggestionTemplate)) {
    lines.push('**Vorschlag:**');
    lines.push(formData.suggestion.trim());
    lines.push('');
  }

  lines.push('**Direktlink für Admin:**');
  lines.push(buildAdminUrl(context));
  lines.push('');

  const metaParts = [`part=${context.examPart}`];
  if (context.sessionId) metaParts.push(`session=${context.sessionId}`);
  metaParts.push(new Date().toISOString());
  lines.push(`_Meta: ${metaParts.join(' · ')}_`);

  return lines.join('\n');
}

// ─── Submit ──────────────────────────────────────────────────────────────────

async function copyToClipboard(text: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }
  // Fallback für ältere Browser / Kontexte ohne Clipboard-API
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.position = 'fixed';
  ta.style.opacity = '0';
  document.body.appendChild(ta);
  ta.select();
  try {
    document.execCommand('copy');
  } finally {
    document.body.removeChild(ta);
  }
}

async function submitReport(): Promise<void> {
  if (!ctx.value) return;
  submitting.value = true;
  submitError.value = null;
  try {
    const md = buildReportMarkdown(ctx.value, {
      category: form.category,
      description: form.description,
      suggestion: form.suggestion,
    });
    await copyToClipboard(md);
    submittedSuccess.value = true;
    // Modal nach kurzer Erfolgs-Anzeige schließen — der Toast bleibt 2s sichtbar.
    setTimeout(() => {
      closeReport();
      submittedSuccess.value = false;
    }, 1500);
  } catch (err) {
    submitError.value =
      err instanceof Error ? err.message : 'Konnte nicht in die Zwischenablage kopieren.';
  } finally {
    submitting.value = false;
  }
}

export function useTaskReport() {
  return {
    open,
    ctx,
    form,
    submitting,
    submitError,
    submittedSuccess,
    categories: REPORT_CATEGORIES,
    openReport,
    closeReport,
    changeCategory,
    submitReport,
  };
}
