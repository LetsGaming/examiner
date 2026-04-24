/**
 * composables/api/poolApi.ts — Pool-Status, Generierung, Prüfungsstart.
 *
 * Endpoints:
 *  - GET  /exams/pool-status
 *  - POST /exams/generate
 *  - POST /exams/start
 *  - GET  /practice/topics
 *
 * Autor: { name: "LetsGamingDE", id: 272402865874534400n }
 */

import type {
  ApiResponse,
  ExamPart,
  PoolPartStatus,
  Specialty,
  TaskWarning,
} from '../../types/index.js';
import { api } from './client.js';
import { unwrap } from './httpHelpers.js';

export interface PracticeTopic {
  topic: string;
  inferredKind: string;
  poolCount: number;
}

export interface GeneratePoolResponse {
  added: number;
  poolSize: number;
  warnings?: TaskWarning[];
}

export interface StartExamResponse {
  sessionId: string;
  needsGeneration?: boolean;
}

export async function fetchPracticeTopics(
  part: string,
  specialty: string,
): Promise<PracticeTopic[]> {
  const { data } = await api.get<ApiResponse<PracticeTopic[]>>(
    `/practice/topics?part=${part}&specialty=${specialty}`,
  );
  return data.data ?? [];
}

export async function fetchPoolStatus(specialty: Specialty): Promise<PoolPartStatus[]> {
  const { data } = await api.get<ApiResponse<{ parts: PoolPartStatus[] }>>(
    `/exams/pool-status?specialty=${specialty}`,
  );
  return unwrap(data, 'Pool-Status Fehler').parts;
}

export async function generatePool(
  part: ExamPart,
  count: number,
  specialty: Specialty,
): Promise<GeneratePoolResponse> {
  const { data } = await api.post<ApiResponse<GeneratePoolResponse>>('/exams/generate', {
    part,
    count,
    specialty,
  });
  return unwrap(data, 'Generierung fehlgeschlagen');
}

/**
 * Startet eine Prüfung. Bei Pool-Knappheit liefert der Server
 * `{ success: false, needsGeneration: true }` — wir werfen dann einen Error,
 * der das `needsGeneration`-Flag trägt, damit der Caller die Generierung
 * anstoßen kann.
 */
export async function startExam(part: ExamPart, specialty: Specialty): Promise<StartExamResponse> {
  type StartResponseShape = ApiResponse<StartExamResponse> & { needsGeneration?: boolean };
  const { data } = await api.post<StartResponseShape>('/exams/start', { part, specialty });

  if (!data.success) {
    throw Object.assign(new Error(data.error ?? 'Start fehlgeschlagen'), {
      needsGeneration: data.needsGeneration,
    });
  }
  return data.data!;
}
