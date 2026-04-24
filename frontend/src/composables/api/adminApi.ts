/**
 * composables/api/adminApi.ts — Admin-Endpoints.
 *
 * Aufgeteilt in vier Bereiche:
 *   - Pool-Übersicht (stats, health, list, detail, patch, delete)
 *   - Task-Generierung (generate, reclassify)
 *   - User-Management (list, toggle-admin)
 *   - Backup (create, list)
 *
 * Zugriff auf diese Endpoints setzt `is_admin = 1` im User-Record voraus —
 * der Server prüft das, wir reichen hier keine eigene Authorization-Logik nach.
 *
 * Autor: { name: "LetsGamingDE", id: 272402865874534400n }
 */

import type {
  AdminGenerateResult,
  AdminHealth,
  AdminPoolStats,
  AdminPoolTask,
  AdminTaskDetail,
  AdminUser,
  ApiResponse,
  DiagramType,
  McOption,
  TableConfig,
  TaskType,
} from '../../types/index.js';
import { api } from './client.js';
import { unwrap } from './httpHelpers.js';

// ─── Pool-Übersicht ─────────────────────────────────────────────────────────

export async function adminFetchStats(): Promise<AdminPoolStats> {
  const { data } = await api.get<ApiResponse<AdminPoolStats>>('/admin/pool-stats');
  return unwrap(data, 'Pool-Stats-Fehler');
}

export async function adminFetchHealth(): Promise<AdminHealth> {
  const { data } = await api.get<ApiResponse<AdminHealth>>('/admin/pool-health');
  return unwrap(data, 'Pool-Health-Fehler');
}

export interface AdminPoolFilter {
  search?: string;
  kind?: string;
  sort?: string;
}

export async function adminFetchPool(
  part: string,
  specialty: string,
  params?: AdminPoolFilter,
): Promise<AdminPoolTask[]> {
  const qs = buildQueryString(params);
  const { data } = await api.get<ApiResponse<AdminPoolTask[]>>(
    `/admin/pool/${part}/${specialty}${qs}`,
  );
  return unwrap(data, 'Pool-Liste-Fehler');
}

function buildQueryString(params?: AdminPoolFilter): string {
  if (!params) return '';
  const q = new URLSearchParams();
  if (params.search) q.set('search', params.search);
  if (params.kind) q.set('kind', params.kind);
  if (params.sort) q.set('sort', params.sort);
  const str = q.toString();
  return str ? `?${str}` : '';
}

export async function adminFetchTask(id: string): Promise<AdminTaskDetail> {
  const { data } = await api.get<ApiResponse<AdminTaskDetail>>(`/admin/tasks/${id}`);
  return unwrap(data, 'Task-Detail-Fehler');
}

export interface AdminTaskPatch {
  topic_area?: string;
  difficulty?: string;
  admin_note?: string;
}

export async function adminPatchTask(id: string, body: AdminTaskPatch): Promise<void> {
  await api.patch(`/admin/tasks/${id}`, body);
}

export interface AdminSubtaskPatch {
  question_text?: string;
  expected_answer?: unknown;
  points?: number;
  task_type?: TaskType;
  mc_options?: McOption[] | null;
  diagram_type?: DiagramType | null;
  expected_elements?: string[] | null;
  table_config?: TableConfig | null;
}

export async function adminPatchSubtask(
  taskId: string,
  subId: string,
  body: AdminSubtaskPatch,
): Promise<void> {
  await api.patch(`/admin/tasks/${taskId}/subtasks/${subId}`, body);
}

export async function adminDeleteTask(id: string, force = false): Promise<void> {
  await api.delete(`/admin/tasks/${id}${force ? '?force=1' : ''}`);
}

// ─── Task-Generierung + Reklassifikation ────────────────────────────────────

export interface AdminGenerateBody {
  part: string;
  specialty: string;
  count: number;
  topic?: string;
}

export async function adminGenerate(body: AdminGenerateBody): Promise<AdminGenerateResult> {
  const { data } = await api.post<ApiResponse<AdminGenerateResult>>('/admin/generate', body);
  return unwrap(data, 'Generierung fehlgeschlagen');
}

export async function adminReclassify(): Promise<void> {
  await api.post('/admin/reclassify');
}

// ─── User-Management ────────────────────────────────────────────────────────

export async function adminFetchUsers(): Promise<AdminUser[]> {
  const { data } = await api.get<ApiResponse<AdminUser[]>>('/admin/users');
  return unwrap(data, 'User-Liste-Fehler');
}

export async function adminToggleAdmin(userId: string, isAdmin: boolean): Promise<void> {
  await api.patch(`/admin/users/${userId}/admin`, { is_admin: isAdmin });
}

// ─── Backup ─────────────────────────────────────────────────────────────────

export async function adminCreateBackup(): Promise<{ path: string }> {
  const { data } = await api.post<ApiResponse<{ path: string }>>('/admin/backup');
  return unwrap(data, 'Backup-Fehler');
}

export async function adminFetchBackups(): Promise<unknown[]> {
  const { data } = await api.get<ApiResponse<unknown[]>>('/admin/backup');
  return unwrap(data, 'Backup-Liste-Fehler');
}
