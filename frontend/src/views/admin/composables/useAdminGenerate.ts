/**
 * views/admin/composables/useAdminGenerate.ts — Task-Generierungs-State.
 *
 * Es gibt zwei Einstiegspunkte: die ausführliche Form im Generieren-Tab
 * (genForm, runGenerate), und eine schlanke Modal-Variante, die aus dem
 * Pool-Tab heraus eine Schnell-Generierung triggert (openModal, runModal).
 *
 * Beide teilen sich denselben Request-Pfad + Error-State, unterscheiden sich
 * nur in den Inputs und den Post-Hooks (Tab-Form refresht Dashboard, Modal
 * refresht den aktiven Pool und schließt sich selbst).
 *
 * Autor: { name: "LetsGamingDE", id: 272402865874534400n }
 */

import { reactive, ref } from 'vue';
import type { AdminGenerateResult, ExamPart, Specialty } from '../../../types/index.js';
import { adminGenerate } from '../../../composables/api/index.js';

export interface UseAdminGenerateCallbacks {
  /** Wird nach erfolgreichem Form-Generate gerufen (z.B. Dashboard reload). */
  onAfterFormGenerate?: () => Promise<void> | void;
  /** Wird nach erfolgreichem Modal-Generate gerufen (z.B. Pool reload). */
  onAfterModalGenerate?: () => Promise<void> | void;
}

export function useAdminGenerate(callbacks: UseAdminGenerateCallbacks = {}) {
  // Shared
  const running = ref(false);
  const result = ref<AdminGenerateResult | null>(null);
  const error = ref<string | null>(null);

  // Form (Tab)
  const form = reactive<{
    part: ExamPart;
    specialty: Specialty;
    count: number;
    topic: string;
  }>({
    part: 'teil_1',
    specialty: 'fiae',
    count: 3,
    topic: '',
  });

  // Modal
  const modalOpen = ref(false);
  const modalPart = ref<ExamPart>('teil_1');
  const modalCount = ref(2);
  const modalTopic = ref('');

  function openModal(part: ExamPart): void {
    modalPart.value = part;
    modalCount.value = 2;
    modalTopic.value = '';
    result.value = null;
    error.value = null;
    modalOpen.value = true;
  }

  function closeModal(): void {
    modalOpen.value = false;
  }

  async function runFormGenerate(): Promise<void> {
    running.value = true;
    result.value = null;
    error.value = null;
    try {
      result.value = await adminGenerate({
        part: form.part,
        specialty: form.specialty,
        count: form.count,
        topic: form.topic.trim() || undefined,
      });
      await callbacks.onAfterFormGenerate?.();
    } catch (e: unknown) {
      error.value = e instanceof Error ? e.message : 'Fehler';
    } finally {
      running.value = false;
    }
  }

  async function runModalGenerate(): Promise<void> {
    running.value = true;
    result.value = null;
    error.value = null;
    try {
      result.value = await adminGenerate({
        part: modalPart.value,
        specialty: 'fiae',
        count: modalCount.value,
        topic: modalTopic.value.trim() || undefined,
      });
      await callbacks.onAfterModalGenerate?.();
      // Modal bleibt kurz offen mit Success-Feedback, dann auto-close.
      setTimeout(() => {
        modalOpen.value = false;
      }, 1500);
    } catch (e: unknown) {
      error.value = e instanceof Error ? e.message : 'Fehler';
    } finally {
      running.value = false;
    }
  }

  return {
    running,
    result,
    error,
    form,
    modalOpen,
    modalPart,
    modalCount,
    modalTopic,
    openModal,
    closeModal,
    runFormGenerate,
    runModalGenerate,
  };
}

export type UseAdminGenerate = ReturnType<typeof useAdminGenerate>;
