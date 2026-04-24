/**
 * views/practice/composables/usePracticeSetup.ts — State für die Practice-
 * Setup-View: Formular, Topic-Loading (inkl. Pool-Count pro Thema), inferred
 * kind und Start-Action.
 *
 * Die initialen Werte kommen aus dem Route-Query, damit man aus dem Pool-
 * Fehler einer regulären Prüfung heraus mit vorselektiertem Teil/Thema
 * hierher verlinken kann (MD §5.3).
 *
 * Autor: { name: "LetsGamingDE", id: 272402865874534400n }
 */

import { computed, ref, watch } from 'vue';
import type { Ref } from 'vue';
import type { ExamPart, Specialty, TaskKind } from '../../../types/index.js';
import {
  fetchPracticeTopics,
  startPractice,
} from '../../../composables/api/index.js';

export interface TopicInfo {
  topic: string;
  inferredKind: TaskKind;
  poolCount: number;
}

export interface PracticeSetupForm {
  part: ExamPart;
  topic: string;
  count: number;
}

export interface UsePracticeSetupOptions {
  /** Aktive Fachrichtung — darf sich zur Laufzeit ändern, Topic-Liste reagiert. */
  specialty: Ref<Specialty>;
  /** Initialwerte aus der Route (?part=...&topic=...) */
  initial?: { part?: ExamPart; topic?: string };
  /** Callback für erfolgreichen Start — Shell entscheidet ob Router-Push. */
  onStarted: (sessionId: string) => void;
}

export function usePracticeSetup(opts: UsePracticeSetupOptions) {
  const form = ref<PracticeSetupForm>({
    part: opts.initial?.part ?? 'teil_1',
    topic: opts.initial?.topic ?? '',
    count: 3,
  });

  const topicInfos = ref<TopicInfo[]>([]);
  const topicsLoading = ref(false);
  const loading = ref(false);
  const error = ref<string | null>(null);

  /** Kind wird aus dem gewählten Thema abgeleitet — Backend-Pool-Query wird
   *  damit präziser. Null = kein Thema gewählt = alle Kinds erlaubt. */
  const inferredKind = computed<TaskKind | null>(() => {
    if (!form.value.topic) return null;
    return (
      topicInfos.value.find((t) => t.topic === form.value.topic)?.inferredKind ?? null
    );
  });

  async function loadTopics(): Promise<void> {
    topicsLoading.value = true;
    // Bei Prüfungsteil-Wechsel wird das Thema zurückgesetzt, weil die
    // Themen-Liste teilabhängig ist und ein vorheriges Thema ungültig wäre.
    form.value.topic = '';
    try {
      topicInfos.value = (await fetchPracticeTopics(
        form.value.part,
        opts.specialty.value,
      )) as TopicInfo[];
    } catch {
      topicInfos.value = [];
    } finally {
      topicsLoading.value = false;
    }
  }

  // Reagiert auf Teil- UND Fachrichtungs-Wechsel — beides ändert den Topic-Pool.
  watch(() => [form.value.part, opts.specialty.value], loadTopics);

  async function start(): Promise<void> {
    error.value = null;
    loading.value = true;
    try {
      const { sessionId } = await startPractice({
        part: form.value.part,
        topic: form.value.topic || undefined,
        taskKind: inferredKind.value ?? undefined,
        count: form.value.count,
        specialty: opts.specialty.value,
      });
      opts.onStarted(sessionId);
    } catch (e: unknown) {
      error.value = e instanceof Error ? e.message : 'Fehler beim Starten';
    } finally {
      loading.value = false;
    }
  }

  return {
    form,
    topicInfos,
    topicsLoading,
    loading,
    error,
    inferredKind,
    loadTopics,
    start,
  };
}
