/**
 * usePool — manages exam task pool state per specialty.
 *
 * Handles fetching pool counts, generating new tasks, and the warning state
 * that results from AI generation fallbacks.
 */
import { ref } from 'vue';
import { fetchPoolStatus, generatePool, startExam } from './useApi.js';
import type { ExamPart, Specialty, TaskWarning } from '../types/index.js';

export const POOL_MIN = 5;

export function usePool() {
  const status = ref<Record<string, number>>({});
  const warnings = ref<Record<string, TaskWarning[]>>({});
  const errors = ref<Record<string, string>>({});
  const generating = ref<string | null>(null);
  const statusMessage = ref('');

  async function loadStatus(specialty: Specialty) {
    try {
      const parts = await fetchPoolStatus(specialty);
      const map: Record<string, number> = {};
      for (const p of parts) map[p.part] = p.total;
      status.value = map;
    } catch {
      /* ignore — pool counts are cosmetic */
    }
  }

  async function addToPool(part: ExamPart, specialty: Specialty) {
    const key = part + '_gen';
    generating.value = key;
    errors.value[part] = '';
    try {
      const result = await generatePool(part, 4, specialty);
      warnings.value[part] = result.warnings ?? [];
      await loadStatus(specialty);
    } catch (err) {
      errors.value[part] = err instanceof Error ? err.message : 'Fehler';
    } finally {
      generating.value = null;
    }
  }

  /** Returns session ID on success, throws on failure. */
  async function launchExam(part: ExamPart, specialty: Specialty): Promise<string> {
    generating.value = part;
    statusMessage.value = 'Prüfung wird zusammengestellt…';
    errors.value[part] = '';

    try {
      try {
        const result = await startExam(part, specialty);
        return result.sessionId;
      } catch (err: unknown) {
        const needsGen = (err as { needsGeneration?: boolean }).needsGeneration;
        if (!needsGen) throw err;

        statusMessage.value = 'Pool leer — generiere Aufgaben…';
        const generated = await generatePool(part, 6, specialty);
        warnings.value[part] = generated.warnings ?? [];
        await loadStatus(specialty);

        statusMessage.value = 'Prüfung wird zusammengestellt…';
        const result = await startExam(part, specialty);
        return result.sessionId;
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Fehler';
      errors.value[part] = msg;
      throw new Error(msg);
    } finally {
      generating.value = null;
      statusMessage.value = '';
    }
  }

  return { status, warnings, errors, generating, statusMessage, loadStatus, addToPool, launchExam };
}
