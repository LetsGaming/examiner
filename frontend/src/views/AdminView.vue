<template>
  <ion-page>
    <div class="admin-page">
      <!-- ─── Header ─── -->
      <header class="admin-header">
        <button class="back-btn" @click="router.push('/home')">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.5"
            stroke-linecap="round"
          >
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Zurück
        </button>
        <div class="admin-title-row">
          <h1 class="admin-title">Admin-Panel</h1>
          <span class="admin-badge">{{ user?.email }}</span>
        </div>
        <div class="admin-health-pill" :class="healthPillClass">
          <span class="health-dot" />
          Pool Health: {{ healthScore ?? '…' }}
        </div>
      </header>

      <!-- ─── Nav ─── -->
      <nav class="admin-nav">
        <button
          v-for="tab in TABS"
          :key="tab.id"
          class="admin-tab"
          :class="{ active: activeTab === tab.id }"
          @click="navigate(tab.id)"
        >
          <span v-html="tab.icon" class="tab-icon" />
          {{ tab.label }}
          <span v-if="tab.id === 'health' && healthErrors > 0" class="tab-badge tab-badge--error">{{
            healthErrors
          }}</span>
          <span
            v-else-if="tab.id === 'health' && healthWarnings > 0"
            class="tab-badge tab-badge--warn"
            >{{ healthWarnings }}</span
          >
        </button>
      </nav>

      <!-- ─── Content ─── -->
      <main class="admin-main">
        <!-- Dashboard -->
        <section v-if="activeTab === 'dashboard'" class="tab-content">
          <div v-if="statsLoading" class="loading-row">
            <div class="spinner" />
            Lädt…
          </div>
          <template v-else-if="stats">
            <div class="stat-cards">
              <div class="stat-card">
                <div class="stat-label">Aufgaben gesamt</div>
                <div class="stat-value">{{ stats.totals.tasks }}</div>
              </div>
              <div class="stat-card">
                <div class="stat-label">Prüfungs-Sessions</div>
                <div class="stat-value">{{ stats.totals.sessions }}</div>
              </div>
              <div class="stat-card">
                <div class="stat-label">Registrierte Nutzer</div>
                <div class="stat-value">{{ stats.totals.users }}</div>
              </div>
              <div class="stat-card">
                <div class="stat-label">Pool Health</div>
                <div class="stat-value" :class="healthPillClass">{{ healthScore ?? '—' }}</div>
              </div>
            </div>

            <div class="part-cards">
              <div v-for="p in stats.parts" :key="p.part" class="part-card">
                <div class="part-card-header">
                  <span class="part-label">{{ PART_LABELS[p.part] }}</span>
                  <span class="part-total">{{ p.total }} Aufgaben</span>
                </div>
                <div class="kind-chips">
                  <span v-for="k in p.kindDistribution" :key="k.task_kind" class="kind-chip"
                    >{{ k.task_kind }}: {{ k.n }}</span
                  >
                </div>
                <div class="part-card-meta">
                  <span class="meta-tag meta-tag--warn">{{ p.neverUsedCount }} ungenutzt</span>
                  <button class="link-btn" @click="navigate('pool-' + p.part)">
                    Pool anzeigen →
                  </button>
                </div>
                <div v-if="p.newestTasks.length" class="newest-list">
                  <div class="newest-label">Zuletzt hinzugefügt</div>
                  <div
                    v-for="t in p.newestTasks"
                    :key="t.id"
                    class="newest-row"
                    @click="openDetail(t.id)"
                  >
                    <span class="newest-topic">{{ t.topic_area }}</span>
                    <span class="kind-chip">{{ t.task_kind }}</span>
                  </div>
                </div>
              </div>
            </div>
          </template>
        </section>

        <!-- Health -->
        <section v-else-if="activeTab === 'health'" class="tab-content">
          <div v-if="healthLoading" class="loading-row">
            <div class="spinner" />
            Lädt…
          </div>
          <template v-else-if="health">
            <div class="health-score-row">
              <div class="health-score-big" :class="healthPillClass">{{ health.score }}</div>
              <div class="health-score-desc">
                <div>{{ health.issues.filter((i) => i.severity === 'error').length }} Fehler</div>
                <div>
                  {{ health.issues.filter((i) => i.severity === 'warning').length }} Warnungen
                </div>
                <div>{{ health.issues.filter((i) => i.severity === 'info').length }} Hinweise</div>
              </div>
              <button class="btn-ghost btn-sm" @click="loadHealth">↻ Aktualisieren</button>
            </div>
            <div v-if="!health.issues.length" class="empty-state">
              <span class="empty-icon">✓</span>
              Keine Probleme gefunden
            </div>
            <div v-else class="issues-list">
              <div
                v-for="(issue, i) in health.issues"
                :key="i"
                class="issue-row"
                :class="`issue-row--${issue.severity}`"
              >
                <div class="issue-dot" :class="`issue-dot--${issue.severity}`" />
                <div class="issue-text">
                  <div>{{ issue.message }}</div>
                  <div class="issue-sev">{{ issue.severity }}</div>
                </div>
              </div>
            </div>
          </template>
        </section>

        <!-- Pool browser (Teil 1/2/3) -->
        <section v-else-if="activeTab.startsWith('pool-')" class="tab-content">
          <div class="pool-toolbar">
            <input
              v-model="poolSearch"
              class="field-input field-input--sm"
              placeholder="Thema suchen…"
              @input="debouncedLoadPool"
            />
            <select
              v-if="currentPart !== 'teil_3'"
              v-model="poolKind"
              class="field-select"
              @change="loadPool"
            >
              <option value="">Alle Arten</option>
              <option v-for="k in KINDS" :key="k" :value="k">{{ k }}</option>
            </select>
            <select v-model="poolSort" class="field-select" @change="loadPool">
              <option value="newest">Neueste zuerst</option>
              <option value="oldest">Älteste zuerst</option>
              <option value="most_used">Meist verwendet</option>
              <option value="least_used">Selten verwendet</option>
              <option value="topic">Nach Thema A–Z</option>
            </select>
            <span class="pool-count">{{ poolTasks.length }} Aufgaben</span>
            <button class="btn-primary btn-sm" @click="openGenerateModal">+ Generieren</button>
          </div>

          <div v-if="poolLoading" class="loading-row">
            <div class="spinner" />
            Lädt…
          </div>
          <div v-else-if="!poolTasks.length" class="empty-state">
            <span class="empty-icon">📭</span>
            Keine Aufgaben gefunden
          </div>
          <div v-else class="pool-table-wrap">
            <table class="pool-table">
              <thead>
                <tr>
                  <th>Thema</th>
                  <th>Art</th>
                  <th>Punkte</th>
                  <th>Verwendet</th>
                  <th>Erstellt</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="task in poolTasks"
                  :key="task.id"
                  class="pool-row"
                  @click="openDetail(task.id)"
                >
                  <td>
                    <div class="topic-name">{{ task.topic_area }}</div>
                    <div v-if="task.admin_note" class="topic-note">{{ task.admin_note }}</div>
                  </td>
                  <td>
                    <span class="kind-chip">{{ task.task_kind }}</span>
                  </td>
                  <td>
                    <span class="mono">{{ task.points_value }}P</span>
                  </td>
                  <td>
                    <span
                      class="usage-badge"
                      :class="task.times_used > 0 ? 'usage-badge--used' : 'usage-badge--new'"
                      >{{ task.times_used }}×</span
                    >
                  </td>
                  <td class="date-cell">{{ fmtDate(task.created_at) }}</td>
                  <td>
                    <button class="link-btn" @click.stop="openDetail(task.id)">Details</button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <!-- Generate -->
        <section v-else-if="activeTab === 'generate'" class="tab-content">
          <div class="generate-form card">
            <h2 class="card-heading">Neue Aufgaben generieren</h2>
            <div class="form-row">
              <div class="field-group">
                <label class="field-label">PRÜFUNGSTEIL</label>
                <select v-model="genForm.part" class="field-select field-select--full">
                  <option value="teil_1">Teil 1 — Planen</option>
                  <option value="teil_2">Teil 2 — Entwicklung</option>
                  <option value="teil_3">Teil 3 — WiSo</option>
                </select>
              </div>
              <div class="field-group">
                <label class="field-label">FACHRICHTUNG</label>
                <select v-model="genForm.specialty" class="field-select field-select--full">
                  <option value="fiae">FIAE</option>
                  <option value="fisi">FISI</option>
                </select>
              </div>
              <div class="field-group">
                <label class="field-label">ANZAHL (1–8)</label>
                <input
                  v-model.number="genForm.count"
                  class="field-input"
                  type="number"
                  min="1"
                  max="8"
                />
              </div>
            </div>
            <div class="field-group">
              <label class="field-label"
                >SPEZIFISCHES THEMA <span class="field-optional">(optional)</span></label
              >
              <input v-model="genForm.topic" class="field-input" placeholder="z.B. SQL GROUP BY" />
            </div>
            <div class="field-actions">
              <button class="btn-primary" :disabled="genRunning" @click="runGenerate">
                <span v-if="genRunning" class="btn-spinner" />
                <template v-else>Generieren starten</template>
              </button>
            </div>
            <div
              v-if="genResult"
              class="gen-result"
              :class="genResult.failed > 0 ? 'gen-result--warn' : 'gen-result--ok'"
            >
              <span class="gen-result-icon">{{ genResult.failed > 0 ? '⚠' : '✓' }}</span>
              <span>{{ genResult.generated }} generiert</span>
              <span v-if="genResult.failed > 0" class="gen-failed"
                >{{ genResult.failed }} fehlgeschlagen</span
              >
            </div>
            <div v-if="genError" class="feedback-error">{{ genError }}</div>
          </div>
        </section>

        <!-- Users -->
        <section v-else-if="activeTab === 'users'" class="tab-content">
          <div v-if="usersLoading" class="loading-row">
            <div class="spinner" />
            Lädt…
          </div>
          <div v-else-if="!users.length" class="empty-state">Keine Nutzer gefunden.</div>
          <div v-else class="pool-table-wrap">
            <table class="pool-table">
              <thead>
                <tr>
                  <th>E-Mail</th>
                  <th>Sessions</th>
                  <th>Rolle</th>
                  <th>Registriert</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="u in users" :key="u.id" class="pool-row">
                  <td class="mono">{{ u.email }}</td>
                  <td>{{ u.session_count }}</td>
                  <td>
                    <span
                      class="role-badge"
                      :class="u.is_admin ? 'role-badge--admin' : 'role-badge--user'"
                    >
                      {{ u.is_admin ? 'Admin' : 'Nutzer' }}
                    </span>
                  </td>
                  <td class="date-cell">{{ fmtDate(u.created_at) }}</td>
                  <td>
                    <button
                      class="btn-ghost btn-sm"
                      :disabled="u.id === currentUserId"
                      @click="toggleAdmin(u)"
                    >
                      {{ u.is_admin ? 'Admin entfernen' : 'Admin machen' }}
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <!-- Backup & Wartung -->
        <section v-else-if="activeTab === 'maintenance'" class="tab-content">
          <div class="maintenance-grid">
            <div class="card">
              <h2 class="card-heading">Datenbank-Backup</h2>
              <p class="card-text">
                Erstellt eine vollständige Sicherung der SQLite-Datenbank auf dem Server.
              </p>
              <div class="field-actions">
                <button class="btn-primary" :disabled="backupRunning" @click="createBackup">
                  <span v-if="backupRunning" class="btn-spinner" />
                  <template v-else>Backup erstellen</template>
                </button>
              </div>
              <div v-if="backupResult" class="feedback-success">{{ backupResult }}</div>

              <div class="divider" />
              <h3 class="subheading">Vorhandene Backups</h3>
              <div v-if="!backups.length" class="card-text">Keine Backups gefunden.</div>
              <div v-else class="backup-list">
                <div v-for="(b, i) in backups" :key="i" class="backup-row">
                  <svg
                    width="13"
                    height="13"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                  >
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                  </svg>
                  <span class="mono">{{ typeof b === 'string' ? b : JSON.stringify(b) }}</span>
                </div>
              </div>
            </div>

            <div class="card">
              <h2 class="card-heading">Pool-Wartung</h2>
              <p class="card-text">
                Reklassifiziert alle bestehenden Aufgaben nach dem aktuellen task_kind-Algorithmus.
                Idempotent — kann beliebig oft ausgeführt werden.
              </p>
              <div class="field-actions">
                <button class="btn-ghost" :disabled="reclassRunning" @click="runReclassify">
                  <span v-if="reclassRunning" class="btn-spinner" />
                  <template v-else>Reklassifizierung starten</template>
                </button>
              </div>
              <div v-if="reclassResult" class="feedback-success">{{ reclassResult }}</div>
              <div v-if="reclassError" class="feedback-error">{{ reclassError }}</div>
            </div>
          </div>
        </section>
      </main>
    </div>

    <!-- ─── Task-Detail Drawer ─── -->
    <Transition name="drawer">
      <div v-if="detailOpen" class="drawer-overlay" @click.self="closeDetail">
        <aside class="drawer">
          <div class="drawer-header">
            <div>
              <div class="drawer-title">{{ detailTask?.topic_area }}</div>
              <div class="drawer-id mono">{{ detailTask?.id }}</div>
            </div>
            <div class="drawer-actions">
              <button class="btn-primary btn-sm" :disabled="detailSaving" @click="saveTaskMeta">
                <span v-if="detailSaving" class="btn-spinner" />
                <template v-else>Speichern</template>
              </button>
              <button class="btn-danger-sm" @click="confirmDelete">Löschen</button>
              <button class="icon-btn" @click="closeDetail">
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2.5"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
          </div>

          <div v-if="detailLoading" class="loading-row">
            <div class="spinner" />
            Lädt…
          </div>
          <template v-else-if="detailTask">
            <!-- Meta chips -->
            <div class="detail-chips">
              <span class="kind-chip">{{ detailTask.task_kind }}</span>
              <span class="diff-chip" :class="`diff-chip--${detailTask.difficulty}`">{{
                detailTask.difficulty
              }}</span>
              <span class="kind-chip">{{ detailTask.points_value }}P</span>
              <span
                class="usage-badge"
                :class="detailTask.times_used > 0 ? 'usage-badge--used' : 'usage-badge--new'"
                >{{ detailTask.times_used }}× verwendet</span
              >
            </div>

            <!-- Edit fields -->
            <div class="drawer-section">
              <div class="field-group">
                <label class="field-label">THEMA</label>
                <input v-model="editMeta.topic_area" class="field-input" />
              </div>
              <div class="field-row">
                <div class="field-group">
                  <label class="field-label">SCHWIERIGKEIT</label>
                  <select v-model="editMeta.difficulty" class="field-select">
                    <option>easy</option>
                    <option>medium</option>
                    <option>hard</option>
                  </select>
                </div>
              </div>
              <div class="field-group">
                <label class="field-label"
                  >ADMIN-NOTIZ <span class="field-optional">(intern)</span></label
                >
                <input
                  v-model="editMeta.admin_note"
                  class="field-input"
                  placeholder="Interne Anmerkung…"
                />
              </div>
              <div v-if="detailSaveSuccess" class="feedback-success feedback-success--sm">
                Gespeichert ✓
              </div>
              <div v-if="detailSaveError" class="feedback-error">{{ detailSaveError }}</div>
            </div>

            <!-- Subtasks -->
            <div class="drawer-section">
              <div class="section-title">Unteraufgaben ({{ detailTask.subtasks.length }})</div>
              <div v-for="(sub, i) in detailTask.subtasks" :key="sub.id" class="subtask-block">
                <div class="subtask-header" @click="toggleSub(i)">
                  <div class="subtask-header-left">
                    <span class="sub-label mono">{{ sub.label }}</span>
                    <span class="kind-chip kind-chip--xs">{{ sub.task_type }}</span>
                    <span class="mono sub-points">{{ sub.points }}P</span>
                  </div>
                  <svg
                    class="chevron"
                    :class="{ open: openSubs.has(i) }"
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2.5"
                  >
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </div>
                <div v-if="openSubs.has(i)" class="subtask-body">
                  <div class="field-group">
                    <label class="field-label">PUNKTE</label>
                    <input
                      :value="subEdits[i]?.points ?? sub.points"
                      @input="
                        setSubEdit(i, 'points', Number(($event.target as HTMLInputElement).value))
                      "
                      class="field-input"
                      type="number"
                      min="1"
                      max="50"
                      style="width: 80px"
                    />
                  </div>
                  <div class="field-group">
                    <label class="field-label">FRAGETEXT</label>
                    <textarea
                      :value="subEdits[i]?.question_text ?? sub.question_text"
                      @input="
                        setSubEdit(i, 'question_text', ($event.target as HTMLTextAreaElement).value)
                      "
                      class="field-textarea"
                    />
                  </div>
                  <div class="field-group">
                    <label class="field-label">ERWARTETE ANTWORT (JSON)</label>
                    <textarea
                      :value="
                        subEdits[i]?.expected_answer_raw ??
                        JSON.stringify(sub.expected_answer, null, 2)
                      "
                      @input="
                        setSubEdit(
                          i,
                          'expected_answer_raw',
                          ($event.target as HTMLTextAreaElement).value,
                        )
                      "
                      class="field-textarea field-textarea--code"
                    />
                  </div>
                  <button
                    class="btn-ghost btn-sm"
                    :disabled="subSaving.has(i)"
                    @click="saveSubtask(i, sub.id)"
                  >
                    <span v-if="subSaving.has(i)" class="btn-spinner" />
                    <template v-else>Subtask speichern</template>
                  </button>
                  <span v-if="subSaveSuccess.has(i)" class="save-ok">✓</span>
                </div>
              </div>
            </div>

            <!-- Usage history -->
            <div v-if="detailTask.usageHistory.length" class="drawer-section">
              <div class="section-title">
                Verwendungshistorie ({{ detailTask.usageHistory.length }})
              </div>
              <div v-for="(h, i) in detailTask.usageHistory" :key="i" class="history-row">
                <span class="history-title">{{ h.title }}</span>
                <div class="history-meta">
                  <span class="role-badge role-badge--neutral">{{ h.ihk_grade || h.status }}</span>
                  <span class="date-cell">{{ fmtDate(h.started_at) }}</span>
                </div>
              </div>
            </div>
          </template>
        </aside>
      </div>
    </Transition>

    <!-- ─── Generate Modal ─── -->
    <Transition name="fade">
      <div v-if="genModalOpen" class="modal-overlay" @click.self="genModalOpen = false">
        <div class="modal">
          <div class="modal-title">Aufgaben generieren</div>
          <div class="field-group">
            <label class="field-label">PRÜFUNGSTEIL</label>
            <input :value="PART_LABELS[modalGenPart]" class="field-input" readonly />
          </div>
          <div class="field-group">
            <label class="field-label">ANZAHL (1–8)</label>
            <input
              v-model.number="modalGenCount"
              class="field-input"
              type="number"
              min="1"
              max="8"
            />
          </div>
          <div class="field-group">
            <label class="field-label"
              >SPEZIFISCHES THEMA <span class="field-optional">(optional)</span></label
            >
            <input v-model="modalGenTopic" class="field-input" placeholder="leer = automatisch" />
          </div>
          <div class="modal-actions">
            <button class="btn-primary" :disabled="genRunning" @click="runModalGenerate">
              <span v-if="genRunning" class="btn-spinner" />
              <template v-else>Generieren</template>
            </button>
            <button class="btn-ghost" @click="genModalOpen = false">Abbrechen</button>
          </div>
          <div
            v-if="genResult"
            class="gen-result"
            :class="genResult.failed > 0 ? 'gen-result--warn' : 'gen-result--ok'"
          >
            ✓ {{ genResult.generated }} generiert<span v-if="genResult.failed">
              · {{ genResult.failed }} fehlgeschlagen</span
            >
          </div>
          <div v-if="genError" class="feedback-error">{{ genError }}</div>
        </div>
      </div>
    </Transition>

    <!-- ─── Confirm-Dialog ─── -->
    <ConfirmDialog
      v-model="confirmDialogOpen"
      :title="confirmTitle"
      confirmLabel="Löschen"
      :danger="true"
      @confirm="onConfirmDelete"
      >{{ confirmMessage }}</ConfirmDialog
    >
  </ion-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, reactive } from 'vue';
import { useRouter } from 'vue-router';
import { IonPage } from '@ionic/vue';
import { useAuth } from '../composables/useAuth.js';
import {
  adminFetchStats,
  adminFetchHealth,
  adminFetchPool,
  adminFetchTask,
  adminPatchTask,
  adminPatchSubtask,
  adminDeleteTask,
  adminGenerate,
  adminFetchUsers,
  adminToggleAdmin,
  adminCreateBackup,
  adminFetchBackups,
  adminReclassify,
} from '../composables/useApi.js';
import ConfirmDialog from '../components/ui/ConfirmDialog.vue';
import type {
  ExamPart,
  AdminPoolStats,
  AdminHealth,
  AdminPoolTask,
  AdminTaskDetail,
  AdminUser,
  AdminGenerateResult,
} from '../types/index.js';

const PART_LABELS: Record<string, string> = {
  teil_1: 'Teil 1 — Planen',
  teil_2: 'Teil 2 — Entwicklung',
  teil_3: 'Teil 3 — WiSo',
};
const KINDS = ['diagram', 'sql', 'code', 'calc', 'table', 'text'];
const TABS = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>',
  },
  {
    id: 'health',
    label: 'Pool Health',
    icon: '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>',
  },
  {
    id: 'pool-teil_1',
    label: 'Teil 1',
    icon: '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>',
  },
  {
    id: 'pool-teil_2',
    label: 'Teil 2',
    icon: '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>',
  },
  {
    id: 'pool-teil_3',
    label: 'WiSo',
    icon: '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>',
  },
  {
    id: 'generate',
    label: 'Generieren',
    icon: '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14"/></svg>',
  },
  {
    id: 'users',
    label: 'Nutzer',
    icon: '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
  },
  {
    id: 'maintenance',
    label: 'Wartung',
    icon: '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>',
  },
];

const router = useRouter();
const { user } = useAuth();
const currentUserId = computed(() => user.value?.id ?? '');

// ── Tab state ─────────────────────────────────────────────────────────────────
const activeTab = ref('dashboard');
const currentPart = computed(() => activeTab.value.replace('pool-', '') as ExamPart);

function navigate(tab: string) {
  activeTab.value = tab;
  if (tab === 'dashboard') loadDashboard();
  else if (tab === 'health') loadHealth();
  else if (tab.startsWith('pool-')) loadPool();
  else if (tab === 'users') loadUsers();
  else if (tab === 'maintenance') loadBackups();
}

// ── Dashboard ─────────────────────────────────────────────────────────────────
const stats = ref<AdminPoolStats | null>(null);
const statsLoading = ref(false);

async function loadDashboard() {
  statsLoading.value = true;
  try {
    const [s, h] = await Promise.all([adminFetchStats(), adminFetchHealth()]);
    stats.value = s;
    health.value = h;
  } finally {
    statsLoading.value = false;
  }
}

// ── Health ────────────────────────────────────────────────────────────────────
const health = ref<AdminHealth | null>(null);
const healthLoading = ref(false);
const healthScore = computed(() => health.value?.score ?? null);
const healthErrors = computed(
  () => health.value?.issues.filter((i) => i.severity === 'error').length ?? 0,
);
const healthWarnings = computed(
  () => health.value?.issues.filter((i) => i.severity === 'warning').length ?? 0,
);
const healthPillClass = computed(() => {
  const s = healthScore.value;
  if (s === null) return '';
  if (s >= 75) return 'health-good';
  if (s >= 50) return 'health-ok';
  return 'health-bad';
});

async function loadHealth() {
  healthLoading.value = true;
  try {
    health.value = await adminFetchHealth();
  } finally {
    healthLoading.value = false;
  }
}

// ── Pool ──────────────────────────────────────────────────────────────────────
const poolTasks = ref<AdminPoolTask[]>([]);
const poolLoading = ref(false);
const poolSearch = ref('');
const poolKind = ref('');
const poolSort = ref('newest');

let searchTimeout: ReturnType<typeof setTimeout>;
function debouncedLoadPool() {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(loadPool, 300);
}

async function loadPool() {
  const part = activeTab.value.replace('pool-', '');
  if (!part.startsWith('teil_')) return;
  poolLoading.value = true;
  try {
    poolTasks.value = await adminFetchPool(part, 'fiae', {
      search: poolSearch.value || undefined,
      kind: poolKind.value || undefined,
      sort: poolSort.value,
    });
  } finally {
    poolLoading.value = false;
  }
}

// ── Task detail ───────────────────────────────────────────────────────────────
const detailOpen = ref(false);
const detailLoading = ref(false);
const detailTask = ref<AdminTaskDetail | null>(null);
const editMeta = reactive({ topic_area: '', difficulty: 'medium', admin_note: '' });
const subEdits = reactive<
  Record<number, { question_text?: string; expected_answer_raw?: string; points?: number }>
>({});
const openSubs = ref(new Set<number>());
const subSaving = ref(new Set<number>());
const subSaveSuccess = ref(new Set<number>());
const detailSaving = ref(false);
const detailSaveSuccess = ref(false);
const detailSaveError = ref<string | null>(null);

async function openDetail(id: string) {
  detailOpen.value = true;
  detailLoading.value = true;
  detailTask.value = null;
  openSubs.value = new Set();
  Object.keys(subEdits).forEach((k) => delete subEdits[Number(k)]);
  try {
    detailTask.value = await adminFetchTask(id);
    editMeta.topic_area = detailTask.value.topic_area;
    editMeta.difficulty = detailTask.value.difficulty;
    editMeta.admin_note = detailTask.value.admin_note ?? '';
  } finally {
    detailLoading.value = false;
  }
}

function closeDetail() {
  detailOpen.value = false;
  detailTask.value = null;
}

function toggleSub(i: number) {
  const s = new Set(openSubs.value);
  s.has(i) ? s.delete(i) : s.add(i);
  openSubs.value = s;
}

function setSubEdit(i: number, field: string, val: unknown) {
  if (!subEdits[i]) subEdits[i] = {};
  (subEdits[i] as Record<string, unknown>)[field] = val;
}

async function saveTaskMeta() {
  if (!detailTask.value) return;
  detailSaving.value = true;
  detailSaveSuccess.value = false;
  detailSaveError.value = null;
  try {
    await adminPatchTask(detailTask.value.id, {
      topic_area: editMeta.topic_area,
      difficulty: editMeta.difficulty,
      admin_note: editMeta.admin_note,
    });
    detailSaveSuccess.value = true;
    // Update local task ref
    detailTask.value.topic_area = editMeta.topic_area;
    detailTask.value.difficulty = editMeta.difficulty;
    detailTask.value.admin_note = editMeta.admin_note || null;
    await loadPool();
    setTimeout(() => {
      detailSaveSuccess.value = false;
    }, 2500);
  } catch (e: unknown) {
    detailSaveError.value = e instanceof Error ? e.message : 'Fehler';
  } finally {
    detailSaving.value = false;
  }
}

async function saveSubtask(i: number, subId: string) {
  if (!detailTask.value) return;
  const edits = subEdits[i] ?? {};
  subSaving.value = new Set([...subSaving.value, i]);
  try {
    let ea: unknown = undefined;
    if (edits.expected_answer_raw !== undefined) {
      try {
        ea = JSON.parse(edits.expected_answer_raw);
      } catch {
        ea = edits.expected_answer_raw;
      }
    }
    await adminPatchSubtask(detailTask.value.id, subId, {
      question_text: edits.question_text,
      expected_answer: ea,
      points: edits.points,
    });
    const ok = new Set(subSaveSuccess.value);
    ok.add(i);
    subSaveSuccess.value = ok;
    setTimeout(() => {
      const o = new Set(subSaveSuccess.value);
      o.delete(i);
      subSaveSuccess.value = o;
    }, 2500);
  } finally {
    const s = new Set(subSaving.value);
    s.delete(i);
    subSaving.value = s;
  }
}

// ── Delete ────────────────────────────────────────────────────────────────────
const confirmDialogOpen = ref(false);
const confirmTitle = ref('');
const confirmMessage = ref('');
let pendingDeleteForce = false;

function confirmDelete() {
  if (!detailTask.value) return;
  const inUse = detailTask.value.usageHistory.length;
  pendingDeleteForce = inUse > 0;
  confirmTitle.value = 'Aufgabe löschen';
  confirmMessage.value =
    inUse > 0
      ? `Diese Aufgabe ist in ${inUse} Session(s) referenziert. Soll sie trotzdem gelöscht werden?`
      : `"${detailTask.value.topic_area}" endgültig löschen?`;
  confirmDialogOpen.value = true;
}

async function onConfirmDelete() {
  if (!detailTask.value) return;
  confirmDialogOpen.value = false;
  try {
    await adminDeleteTask(detailTask.value.id, pendingDeleteForce);
    closeDetail();
    await loadPool();
    await loadDashboard();
  } catch (e: unknown) {
    detailSaveError.value = e instanceof Error ? e.message : 'Löschen fehlgeschlagen';
  }
}

// ── Generate ──────────────────────────────────────────────────────────────────
const genForm = reactive({ part: 'teil_1', specialty: 'fiae', count: 3, topic: '' });
const genRunning = ref(false);
const genResult = ref<AdminGenerateResult | null>(null);
const genError = ref<string | null>(null);

const genModalOpen = ref(false);
const modalGenPart = ref<ExamPart>('teil_1');
const modalGenCount = ref(2);
const modalGenTopic = ref('');

function openGenerateModal() {
  const part = activeTab.value.replace('pool-', '') as ExamPart;
  modalGenPart.value = part;
  modalGenCount.value = 2;
  modalGenTopic.value = '';
  genResult.value = null;
  genError.value = null;
  genModalOpen.value = true;
}

async function runGenerate() {
  genRunning.value = true;
  genResult.value = null;
  genError.value = null;
  try {
    genResult.value = await adminGenerate({
      part: genForm.part,
      specialty: genForm.specialty,
      count: genForm.count,
      topic: genForm.topic.trim() || undefined,
    });
    await loadDashboard();
  } catch (e: unknown) {
    genError.value = e instanceof Error ? e.message : 'Fehler';
  } finally {
    genRunning.value = false;
  }
}

async function runModalGenerate() {
  genRunning.value = true;
  genResult.value = null;
  genError.value = null;
  try {
    genResult.value = await adminGenerate({
      part: modalGenPart.value,
      specialty: 'fiae',
      count: modalGenCount.value,
      topic: modalGenTopic.value.trim() || undefined,
    });
    await loadPool();
    setTimeout(() => {
      genModalOpen.value = false;
    }, 1500);
  } catch (e: unknown) {
    genError.value = e instanceof Error ? e.message : 'Fehler';
  } finally {
    genRunning.value = false;
  }
}

// ── Users ─────────────────────────────────────────────────────────────────────
const users = ref<AdminUser[]>([]);
const usersLoading = ref(false);

async function loadUsers() {
  usersLoading.value = true;
  try {
    users.value = await adminFetchUsers();
  } finally {
    usersLoading.value = false;
  }
}

async function toggleAdmin(u: AdminUser) {
  await adminToggleAdmin(u.id, !u.is_admin);
  await loadUsers();
}

// ── Maintenance ───────────────────────────────────────────────────────────────
const backups = ref<unknown[]>([]);
const backupRunning = ref(false);
const backupResult = ref<string | null>(null);
const reclassRunning = ref(false);
const reclassResult = ref<string | null>(null);
const reclassError = ref<string | null>(null);

async function loadBackups() {
  backups.value = await adminFetchBackups().catch(() => []);
}

async function createBackup() {
  backupRunning.value = true;
  backupResult.value = null;
  try {
    const r = await adminCreateBackup();
    backupResult.value = `Backup erstellt: ${r.path}`;
    await loadBackups();
  } finally {
    backupRunning.value = false;
  }
}

async function runReclassify() {
  reclassRunning.value = true;
  reclassResult.value = null;
  reclassError.value = null;
  try {
    await adminReclassify();
    reclassResult.value = 'Reklassifizierung abgeschlossen ✓';
  } catch (e: unknown) {
    reclassError.value = e instanceof Error ? e.message : 'Fehler';
  } finally {
    reclassRunning.value = false;
  }
}

// ── Init ──────────────────────────────────────────────────────────────────────
function fmtDate(s?: string) {
  if (!s) return '';
  return new Date(s).toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

onMounted(loadDashboard);
</script>

<style scoped>
/* ─── Page shell ─── */
.admin-page {
  height: 100%;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  background: var(--bg-base);
  color: var(--text-secondary);
  font-family: var(--font-sans);
  display: flex;
  flex-direction: column;
}

/* ─── Header ─── */
.admin-header {
  padding: 16px 28px;
  border-bottom: 1px solid var(--border-light);
  display: flex;
  align-items: center;
  gap: 16px;
}
.back-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 7px 12px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--control-border);
  background: var(--control-bg);
  color: var(--text-muted);
  font-size: 13px;
  cursor: pointer;
  transition: all var(--transition);
  white-space: nowrap;
  flex-shrink: 0;
}
.back-btn:hover {
  color: var(--text-primary);
  border-color: var(--border-hover);
}
.admin-title-row {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}
.admin-title {
  font-size: 17px;
  font-weight: 700;
  color: var(--text-primary);
  white-space: nowrap;
}
.admin-badge {
  font-size: 11px;
  padding: 3px 10px;
  border-radius: 20px;
  background: var(--brand-bg);
  color: var(--brand-text);
  border: 1px solid var(--brand-border);
  font-weight: 600;
  white-space: nowrap;
}
.admin-health-pill {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 600;
  padding: 5px 12px;
  border-radius: 20px;
  border: 1px solid var(--border);
  background: var(--control-bg);
  flex-shrink: 0;
}
.health-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: currentColor;
}
.health-good {
  color: var(--success-text);
  border-color: var(--success-border);
  background: var(--success-bg);
}
.health-ok {
  color: var(--warning-text);
  border-color: var(--warning-border);
  background: var(--warning-bg);
}
.health-bad {
  color: var(--danger-text);
  border-color: var(--danger-border);
  background: var(--danger-bg);
}

/* ─── Nav tabs ─── */
.admin-nav {
  display: flex;
  gap: 2px;
  padding: 8px 20px;
  border-bottom: 1px solid var(--border-light);
  overflow-x: auto;
  flex-shrink: 0;
  scrollbar-width: none;
}
.admin-nav::-webkit-scrollbar {
  display: none;
}
.admin-tab {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 7px 12px;
  border-radius: var(--radius-sm);
  border: none;
  background: transparent;
  color: var(--text-muted);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  white-space: nowrap;
  transition: all var(--transition);
  position: relative;
}
.admin-tab:hover {
  background: var(--control-bg);
  color: var(--text-primary);
}
.admin-tab.active {
  background: var(--brand-bg);
  color: var(--brand-text);
  border: 1px solid var(--brand-border);
}
.tab-icon {
  display: flex;
  align-items: center;
}
.tab-badge {
  padding: 1px 6px;
  border-radius: 10px;
  font-size: 10px;
  font-weight: 700;
}
.tab-badge--error {
  background: var(--danger-bg);
  color: var(--danger-text);
}
.tab-badge--warn {
  background: var(--warning-bg);
  color: var(--warning-text);
}

/* ─── Main content ─── */
.admin-main {
  flex: 1;
  padding: 24px 28px;
  overflow-y: auto;
}
.tab-content {
  max-width: 1100px;
}

/* ─── Loading / empty ─── */
.loading-row {
  display: flex;
  align-items: center;
  gap: 10px;
  color: var(--text-muted);
  font-size: 14px;
  padding: 32px 0;
}
.spinner {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  border: 2px solid var(--border);
  border-top-color: var(--brand);
  animation: spin 0.7s linear infinite;
  flex-shrink: 0;
}
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 60px 0;
  color: var(--text-subtle);
  font-size: 14px;
}
.empty-icon {
  font-size: 32px;
}

/* ─── Stat cards ─── */
.stat-cards {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 14px;
  margin-bottom: 24px;
}
.stat-card {
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: 16px 18px;
}
.stat-label {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  color: var(--text-muted);
  margin-bottom: 6px;
}
.stat-value {
  font-size: 26px;
  font-weight: 700;
  color: var(--text-primary);
  font-family: var(--font-mono);
}

/* ─── Part cards ─── */
.part-cards {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 14px;
}
.part-card {
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: 16px 18px;
}
.part-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}
.part-label {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
}
.part-total {
  font-size: 12px;
  color: var(--text-muted);
  font-family: var(--font-mono);
}
.kind-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  margin-bottom: 10px;
}
.kind-chip {
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
  background: var(--brand-bg);
  color: var(--brand-text);
  border: 1px solid var(--brand-border);
  font-family: var(--font-mono);
}
.kind-chip--xs {
  padding: 1px 6px;
  font-size: 10px;
}
.part-card-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}
.meta-tag {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 4px;
  font-weight: 600;
}
.meta-tag--warn {
  background: var(--warning-bg);
  color: var(--warning-text);
  border: 1px solid var(--warning-border);
}
.newest-list {
  border-top: 1px solid var(--border-light);
  padding-top: 10px;
}
.newest-label {
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  color: var(--text-subtle);
  margin-bottom: 6px;
}
.newest-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 5px 0;
  cursor: pointer;
  border-radius: var(--radius-sm);
}
.newest-row:hover {
  background: var(--control-bg);
  padding: 5px 6px;
  margin: 0 -6px;
}
.newest-topic {
  font-size: 12px;
  color: var(--text-secondary);
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* ─── Health ─── */
.health-score-row {
  display: flex;
  align-items: center;
  gap: 24px;
  margin-bottom: 20px;
}
.health-score-big {
  font-size: 52px;
  font-weight: 800;
  font-family: var(--font-mono);
}
.health-score-desc {
  font-size: 13px;
  color: var(--text-muted);
  line-height: 1.8;
}
.issues-list {
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  overflow: hidden;
}
.issue-row {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  padding: 12px 16px;
  border-bottom: 1px solid var(--border-light);
}
.issue-row:last-child {
  border-bottom: none;
}
.issue-row--error {
  background: var(--danger-bg);
}
.issue-row--warning {
  background: var(--warning-bg);
}
.issue-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  margin-top: 4px;
  flex-shrink: 0;
}
.issue-dot--error {
  background: var(--danger);
}
.issue-dot--warning {
  background: var(--warning);
}
.issue-dot--info {
  background: var(--brand);
}
.issue-text {
  font-size: 13.5px;
  line-height: 1.5;
}
.issue-sev {
  font-size: 10px;
  color: var(--text-subtle);
  text-transform: uppercase;
  letter-spacing: 0.07em;
  margin-top: 2px;
}

/* ─── Pool toolbar ─── */
.pool-toolbar {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}
.pool-count {
  font-size: 12px;
  color: var(--text-subtle);
  font-family: var(--font-mono);
  flex-shrink: 0;
  margin-left: auto;
}

/* ─── Pool table ─── */
.pool-table-wrap {
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  overflow: hidden;
}
.pool-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13.5px;
}
.pool-table th {
  text-align: left;
  padding: 9px 14px;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--text-muted);
  border-bottom: 1px solid var(--border);
  background: var(--bg-raised);
}
.pool-table td {
  padding: 10px 14px;
  border-bottom: 1px solid var(--border-light);
  vertical-align: middle;
}
.pool-row:last-child td {
  border-bottom: none;
}
.pool-row {
  cursor: pointer;
  transition: background var(--transition);
}
.pool-row:hover td {
  background: var(--control-bg);
}
.topic-name {
  font-weight: 500;
  color: var(--text-primary);
}
.topic-note {
  font-size: 11px;
  color: var(--brand-text);
  margin-top: 2px;
}
.usage-badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
  font-family: var(--font-mono);
}
.usage-badge--used {
  background: var(--success-bg);
  color: var(--success-text);
  border: 1px solid var(--success-border);
}
.usage-badge--new {
  background: var(--control-bg);
  color: var(--text-subtle);
}
.date-cell {
  color: var(--text-subtle);
  font-size: 12px;
  font-family: var(--font-mono);
  white-space: nowrap;
}
.diff-chip {
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
}
.diff-chip--easy {
  background: var(--success-bg);
  color: var(--success-text);
}
.diff-chip--medium {
  background: var(--warning-bg);
  color: var(--warning-text);
}
.diff-chip--hard {
  background: var(--danger-bg);
  color: var(--danger-text);
}
.mono {
  font-family: var(--font-mono);
  font-size: 12px;
}

/* ─── Form elements ─── */
.field-input {
  background: var(--control-bg);
  border: 1px solid var(--control-border);
  color: var(--text-primary);
  padding: 8px 12px;
  border-radius: var(--radius-sm);
  font-size: 13px;
  font-family: var(--font-sans);
  outline: none;
  width: 100%;
  transition: border-color var(--transition);
}
.field-input:focus {
  border-color: var(--brand);
}
.field-input--sm {
  width: 200px;
}
.field-select {
  background: var(--control-bg);
  border: 1px solid var(--control-border);
  color: var(--text-primary);
  padding: 8px 12px;
  border-radius: var(--radius-sm);
  font-size: 13px;
  outline: none;
  cursor: pointer;
}
.field-select:focus {
  border-color: var(--brand);
}
.field-select--full {
  width: 100%;
}
.field-textarea {
  width: 100%;
  background: var(--control-bg);
  border: 1px solid var(--control-border);
  color: var(--text-primary);
  padding: 8px 12px;
  border-radius: var(--radius-sm);
  font-size: 13px;
  font-family: var(--font-sans);
  outline: none;
  resize: vertical;
  min-height: 80px;
  transition: border-color var(--transition);
}
.field-textarea:focus {
  border-color: var(--brand);
}
.field-textarea--code {
  font-family: var(--font-mono);
  font-size: 12px;
  min-height: 100px;
}
.field-group {
  margin-bottom: 14px;
}
.field-label {
  display: block;
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--text-muted);
  margin-bottom: 5px;
}
.field-optional {
  font-weight: 400;
  color: var(--text-subtle);
  text-transform: none;
}
.field-row {
  display: flex;
  gap: 12px;
}
.field-actions {
  display: flex;
  gap: 10px;
  margin-top: 4px;
}

/* ─── Buttons ─── */
.btn-primary {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 8px 16px;
  border-radius: var(--radius-sm);
  border: none;
  background: var(--brand);
  color: white;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: background var(--transition);
}
.btn-primary:hover:not(:disabled) {
  background: var(--brand-dark);
}
.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.btn-ghost {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 8px 14px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--control-border);
  background: var(--control-bg);
  color: var(--text-muted);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all var(--transition);
}
.btn-ghost:hover:not(:disabled) {
  border-color: var(--border-hover);
  color: var(--text-primary);
}
.btn-ghost:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
.btn-sm {
  padding: 5px 10px;
  font-size: 12px;
}
.btn-danger-sm {
  padding: 5px 10px;
  border-radius: var(--radius-sm);
  font-size: 12px;
  font-weight: 600;
  border: 1px solid var(--danger-border);
  background: var(--danger-bg);
  color: var(--danger-text);
  cursor: pointer;
  transition: all var(--transition);
}
.btn-danger-sm:hover {
  background: rgba(239, 68, 68, 0.2);
}
.btn-spinner {
  width: 13px;
  height: 13px;
  border-radius: 50%;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  animation: spin 0.7s linear infinite;
  flex-shrink: 0;
}
.link-btn {
  background: none;
  border: none;
  color: var(--brand-text);
  font-size: 12px;
  cursor: pointer;
  padding: 0;
  white-space: nowrap;
}
.link-btn:hover {
  text-decoration: underline;
}

/* ─── Card ─── */
.card {
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: 20px 22px;
  margin-bottom: 16px;
}
.card-heading {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 14px;
}
.card-text {
  font-size: 13.5px;
  color: var(--text-muted);
  line-height: 1.6;
  margin-bottom: 14px;
}
.subheading {
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  color: var(--text-subtle);
  margin-bottom: 10px;
}
.divider {
  height: 1px;
  background: var(--border-light);
  margin: 18px 0;
}

/* ─── Generate form ─── */
.generate-form {
  max-width: 560px;
}
.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr 100px;
  gap: 12px;
}
.gen-result {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  border-radius: var(--radius-sm);
  font-size: 13px;
  margin-top: 12px;
}
.gen-result--ok {
  background: var(--success-bg);
  color: var(--success-text);
  border: 1px solid var(--success-border);
}
.gen-result--warn {
  background: var(--warning-bg);
  color: var(--warning-text);
  border: 1px solid var(--warning-border);
}
.gen-result-icon {
  font-size: 15px;
}
.gen-failed {
  color: var(--danger-text);
}

/* ─── Users ─── */
.role-badge {
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 700;
}
.role-badge--admin {
  background: var(--brand-bg);
  color: var(--brand-text);
  border: 1px solid var(--brand-border);
}
.role-badge--user {
  background: var(--control-bg);
  color: var(--text-subtle);
}
.role-badge--neutral {
  background: var(--control-bg);
  color: var(--text-subtle);
}

/* ─── Maintenance ─── */
.maintenance-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}
.backup-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.backup-row {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: var(--text-muted);
}

/* ─── Feedback ─── */
.feedback-success {
  padding: 8px 12px;
  border-radius: var(--radius-sm);
  font-size: 13px;
  background: var(--success-bg);
  color: var(--success-text);
  border: 1px solid var(--success-border);
  margin-top: 10px;
}
.feedback-success--sm {
  padding: 5px 10px;
  font-size: 12px;
  display: inline-block;
}
.feedback-error {
  padding: 8px 12px;
  border-radius: var(--radius-sm);
  font-size: 13px;
  background: var(--danger-bg);
  color: var(--danger-text);
  border: 1px solid var(--danger-border);
  margin-top: 10px;
}
.save-ok {
  color: var(--success-text);
  font-size: 13px;
  margin-left: 8px;
}

/* ─── Drawer ─── */
.drawer-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.55);
  display: flex;
  align-items: stretch;
  justify-content: flex-end;
  z-index: 200;
  backdrop-filter: blur(2px);
}
.drawer {
  width: 580px;
  max-width: 95vw;
  background: var(--bg-surface);
  border-left: 1px solid var(--border);
  overflow-y: auto;
  display: flex;
  flex-direction: column;
}
.drawer-enter-active,
.drawer-leave-active {
  transition:
    transform 0.22s ease,
    opacity 0.22s ease;
}
.drawer-enter-from,
.drawer-leave-to {
  transform: translateX(40px);
  opacity: 0;
}
.drawer-header {
  position: sticky;
  top: 0;
  z-index: 1;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 18px 20px;
  border-bottom: 1px solid var(--border);
  background: var(--bg-surface);
}
.drawer-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
}
.drawer-id {
  font-size: 11px;
  color: var(--text-subtle);
  margin-top: 3px;
}
.drawer-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}
.detail-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
  padding: 14px 20px;
  border-bottom: 1px solid var(--border-light);
}
.drawer-section {
  padding: 16px 20px;
  border-bottom: 1px solid var(--border-light);
}
.section-title {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--text-muted);
  margin-bottom: 12px;
}

/* ─── Subtasks ─── */
.subtask-block {
  border: 1px solid var(--border-light);
  border-radius: var(--radius-sm);
  margin-bottom: 8px;
  overflow: hidden;
}
.subtask-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 9px 12px;
  background: var(--bg-raised);
  cursor: pointer;
  transition: background var(--transition);
}
.subtask-header:hover {
  background: var(--control-bg);
}
.subtask-header-left {
  display: flex;
  align-items: center;
  gap: 8px;
}
.sub-label {
  color: var(--text-muted);
}
.sub-points {
  color: var(--text-subtle);
}
.chevron {
  transition: transform 0.15s;
  color: var(--text-subtle);
}
.chevron.open {
  transform: rotate(180deg);
}
.subtask-body {
  padding: 14px 14px 12px;
}

/* ─── Usage history ─── */
.history-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 7px 0;
  border-bottom: 1px solid var(--border-light);
  font-size: 13px;
}
.history-row:last-child {
  border-bottom: none;
}
.history-title {
  color: var(--text-secondary);
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.history-meta {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}

/* ─── Modal ─── */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.65);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 300;
  backdrop-filter: blur(3px);
}
.modal {
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 24px;
  width: 420px;
  max-width: 95vw;
}
.modal-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 18px;
}
.modal-actions {
  display: flex;
  gap: 10px;
  margin-top: 16px;
}
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.18s;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* ─── Icon btn ─── */
.icon-btn {
  width: 28px;
  height: 28px;
  border-radius: var(--radius-sm);
  border: none;
  background: var(--control-bg);
  color: var(--text-subtle);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all var(--transition);
}
.icon-btn:hover {
  background: var(--danger-bg);
  color: var(--danger-text);
}

/* ─── Responsive ─── */
@media (max-width: 900px) {
  .stat-cards {
    grid-template-columns: repeat(2, 1fr);
  }
  .part-cards {
    grid-template-columns: 1fr;
  }
  .maintenance-grid {
    grid-template-columns: 1fr;
  }
  .form-row {
    grid-template-columns: 1fr;
  }
  .admin-header {
    flex-wrap: wrap;
  }
}
@media (max-width: 600px) {
  .admin-main {
    padding: 16px;
  }
  .admin-header {
    padding: 12px 16px;
  }
  .admin-nav {
    padding: 6px 12px;
  }
  .stat-cards {
    grid-template-columns: 1fr 1fr;
  }
  .drawer {
    width: 100vw;
  }
}
</style>
