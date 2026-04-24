/**
 * views/admin/composables/useTaskDetail.ts — Detail-Drawer-State für eine Aufgabe.
 *
 * Kapselt: Drawer-Open/Close, Lade-State, editierbare Meta-Felder,
 * Subtask-Edits (lokal gepuffert bis expliziter Save), Lösch-Flow mit
 * Force-Flag falls die Aufgabe schon in Sessions referenziert wird.
 *
 * Die Reload-Callbacks (`onAfterSave`, `onAfterDelete`) kommen von außen —
 * Shell entscheidet, ob Pool + Dashboard nach einer Mutation neu geladen werden.
 *
 * Autor: { name: "LetsGamingDE", id: 272402865874534400n }
 */

import { reactive, ref } from 'vue';
import type { AdminTaskDetail } from '../../../types/index.js';
import {
  adminDeleteTask,
  adminFetchTask,
  adminPatchSubtask,
  adminPatchTask,
} from '../../../composables/api/index.js';

export interface SubtaskEdit {
  question_text?: string;
  expected_answer_raw?: string;
  points?: number;
}

export interface UseTaskDetailCallbacks {
  /** Wird nach erfolgreichem Meta-Save ODER Delete gerufen. */
  onAfterMutation?: () => Promise<void> | void;
  /** Wird speziell nach Delete gerufen (z.B. Dashboard refresh). */
  onAfterDelete?: () => Promise<void> | void;
}

export function useTaskDetail(callbacks: UseTaskDetailCallbacks = {}) {
  // ── Drawer-State ───────────────────────────────────────────────────────────
  const open = ref(false);
  const loading = ref(false);
  const task = ref<AdminTaskDetail | null>(null);

  // ── Meta-Edit-State ────────────────────────────────────────────────────────
  const editMeta = reactive({
    topic_area: '',
    difficulty: 'medium',
    admin_note: '',
  });
  const saving = ref(false);
  const saveSuccess = ref(false);
  const saveError = ref<string | null>(null);

  // ── Subtask-Edit-State ─────────────────────────────────────────────────────
  const subEdits = reactive<Record<number, SubtaskEdit>>({});
  const openSubs = ref(new Set<number>());
  const subSaving = ref(new Set<number>());
  const subSaveSuccess = ref(new Set<number>());

  // ── Delete-Confirm-State ───────────────────────────────────────────────────
  const confirmDialogOpen = ref(false);
  const confirmTitle = ref('');
  const confirmMessage = ref('');
  let pendingDeleteForce = false;

  // ── Actions ────────────────────────────────────────────────────────────────

  async function openDetail(id: string): Promise<void> {
    open.value = true;
    loading.value = true;
    task.value = null;
    openSubs.value = new Set();
    // Alle Sub-Edit-Buffer leeren — neuer Task, neue Edits.
    for (const k of Object.keys(subEdits)) delete subEdits[Number(k)];
    try {
      task.value = await adminFetchTask(id);
      editMeta.topic_area = task.value.topic_area;
      editMeta.difficulty = task.value.difficulty;
      editMeta.admin_note = task.value.admin_note ?? '';
    } finally {
      loading.value = false;
    }
  }

  function closeDetail(): void {
    open.value = false;
    task.value = null;
  }

  function toggleSub(i: number): void {
    const next = new Set(openSubs.value);
    if (next.has(i)) next.delete(i);
    else next.add(i);
    openSubs.value = next;
  }

  function setSubEdit(i: number, field: keyof SubtaskEdit, val: unknown): void {
    if (!subEdits[i]) subEdits[i] = {};
    (subEdits[i] as Record<string, unknown>)[field] = val;
  }

  async function saveTaskMeta(): Promise<void> {
    if (!task.value) return;
    saving.value = true;
    saveSuccess.value = false;
    saveError.value = null;
    try {
      await adminPatchTask(task.value.id, {
        topic_area: editMeta.topic_area,
        difficulty: editMeta.difficulty,
        admin_note: editMeta.admin_note,
      });
      saveSuccess.value = true;
      // Lokale Ansicht mit gespeicherten Werten synchronisieren, damit das
      // Drawer sofort den persistierten Zustand zeigt (ohne erneuten Fetch).
      task.value.topic_area = editMeta.topic_area;
      task.value.difficulty = editMeta.difficulty;
      task.value.admin_note = editMeta.admin_note || null;
      await callbacks.onAfterMutation?.();
      setTimeout(() => {
        saveSuccess.value = false;
      }, 2500);
    } catch (e: unknown) {
      saveError.value = e instanceof Error ? e.message : 'Fehler';
    } finally {
      saving.value = false;
    }
  }

  async function saveSubtask(i: number, subId: string): Promise<void> {
    if (!task.value) return;
    const edits = subEdits[i] ?? {};
    subSaving.value = new Set([...subSaving.value, i]);
    try {
      // expected_answer kommt als JSON-String aus dem Textarea. Bei Parse-
      // Fehler fallen wir auf den Raw-String zurück — das Backend validiert
      // das Shape sowieso nochmal.
      let ea: unknown = undefined;
      if (edits.expected_answer_raw !== undefined) {
        try {
          ea = JSON.parse(edits.expected_answer_raw);
        } catch {
          ea = edits.expected_answer_raw;
        }
      }
      await adminPatchSubtask(task.value.id, subId, {
        question_text: edits.question_text,
        expected_answer: ea,
        points: edits.points,
      });
      const ok = new Set(subSaveSuccess.value);
      ok.add(i);
      subSaveSuccess.value = ok;
      setTimeout(() => {
        const next = new Set(subSaveSuccess.value);
        next.delete(i);
        subSaveSuccess.value = next;
      }, 2500);
    } finally {
      const s = new Set(subSaving.value);
      s.delete(i);
      subSaving.value = s;
    }
  }

  function confirmDelete(): void {
    if (!task.value) return;
    const inUse = task.value.usageHistory.length;
    pendingDeleteForce = inUse > 0;
    confirmTitle.value = 'Aufgabe löschen';
    confirmMessage.value =
      inUse > 0
        ? `Diese Aufgabe ist in ${inUse} Session(s) referenziert. Soll sie trotzdem gelöscht werden?`
        : `"${task.value.topic_area}" endgültig löschen?`;
    confirmDialogOpen.value = true;
  }

  async function onConfirmDelete(): Promise<void> {
    if (!task.value) return;
    confirmDialogOpen.value = false;
    try {
      await adminDeleteTask(task.value.id, pendingDeleteForce);
      closeDetail();
      await callbacks.onAfterMutation?.();
      await callbacks.onAfterDelete?.();
    } catch (e: unknown) {
      saveError.value = e instanceof Error ? e.message : 'Löschen fehlgeschlagen';
    }
  }

  return {
    open,
    loading,
    task,
    editMeta,
    saving,
    saveSuccess,
    saveError,
    subEdits,
    openSubs,
    subSaving,
    subSaveSuccess,
    confirmDialogOpen,
    confirmTitle,
    confirmMessage,
    openDetail,
    closeDetail,
    toggleSub,
    setSubEdit,
    saveTaskMeta,
    saveSubtask,
    confirmDelete,
    onConfirmDelete,
  };
}

export type UseTaskDetail = ReturnType<typeof useTaskDetail>;
