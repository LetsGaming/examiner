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
          <span
            v-if="tab.id === 'health' && health.errorCount.value > 0"
            class="tab-badge tab-badge--error"
            >{{ health.errorCount.value }}</span
          >
          <span
            v-else-if="tab.id === 'health' && health.warningCount.value > 0"
            class="tab-badge tab-badge--warn"
            >{{ health.warningCount.value }}</span
          >
        </button>
      </nav>

      <!-- ─── Content ─── -->
      <main class="admin-main">
        <DashboardSection
          v-if="activeTab === 'dashboard'"
          :stats="dashboard.stats.value"
          :loading="dashboard.loading.value"
          :health-score="healthScore"
          :health-pill-class="healthPillClass"
          @navigate="navigate"
          @open-detail="taskDetail.openDetail"
        />

        <HealthSection
          v-else-if="activeTab === 'health'"
          :health="health.health.value"
          :loading="health.loading.value"
          :pill-class="health.pillClass.value"
          :error-count="health.errorCount.value"
          :warning-count="health.warningCount.value"
          :info-count="health.infoCount.value"
          @reload="health.load"
        />

        <PoolSection
          v-else-if="activeTab.startsWith('pool-')"
          :tasks="pool.tasks.value"
          :loading="pool.loading.value"
          :current-part="currentPart"
          :search-value="pool.search.value"
          :kind-value="pool.kind.value"
          :sort-value="pool.sort.value"
          @update:search-value="pool.search.value = $event"
          @update:kind-value="pool.kind.value = $event"
          @update:sort-value="pool.sort.value = $event"
          @load="pool.load"
          @debounced-load="pool.debouncedLoad"
          @open-detail="taskDetail.openDetail"
          @open-generate-modal="openModalForCurrentPart"
        />

        <GenerateSection
          v-else-if="activeTab === 'generate'"
          :form="generate.form"
          :running="generate.running.value"
          :result="generate.result.value"
          :error="generate.error.value"
          @run="generate.runFormGenerate"
        />

        <UsersSection
          v-else-if="activeTab === 'users'"
          :users="users.users.value"
          :loading="users.loading.value"
          :current-user-id="currentUserId"
          @toggle-admin="users.toggleAdmin"
        />

        <MaintenanceSection
          v-else-if="activeTab === 'maintenance'"
          :backups="maintenance.backups.value"
          :backup-running="maintenance.backupRunning.value"
          :backup-result="maintenance.backupResult.value"
          :reclass-running="maintenance.reclassRunning.value"
          :reclass-result="maintenance.reclassResult.value"
          :reclass-error="maintenance.reclassError.value"
          @create-backup="maintenance.createBackup"
          @run-reclassify="maintenance.runReclassify"
        />
      </main>
    </div>

    <!-- ─── Task-Detail Drawer ─── -->
    <TaskDetailDrawer
      :open="taskDetail.open.value"
      :loading="taskDetail.loading.value"
      :task="taskDetail.task.value"
      :edit-meta="taskDetail.editMeta"
      :saving="taskDetail.saving.value"
      :save-success="taskDetail.saveSuccess.value"
      :save-error="taskDetail.saveError.value"
      :sub-edits="taskDetail.subEdits"
      :open-subs="taskDetail.openSubs.value"
      :sub-saving="taskDetail.subSaving.value"
      :sub-save-success="taskDetail.subSaveSuccess.value"
      @close="taskDetail.closeDetail"
      @save-meta="taskDetail.saveTaskMeta"
      @confirm-delete="taskDetail.confirmDelete"
      @toggle-sub="taskDetail.toggleSub"
      @set-sub-edit="taskDetail.setSubEdit"
      @save-subtask="taskDetail.saveSubtask"
    />

    <!-- ─── Generate Modal ─── -->
    <GenerateModal
      :open="generate.modalOpen.value"
      :part="generate.modalPart.value"
      :count="generate.modalCount.value"
      :topic="generate.modalTopic.value"
      :running="generate.running.value"
      :result="generate.result.value"
      :error="generate.error.value"
      @close="generate.closeModal"
      @run="generate.runModalGenerate"
      @update:count="generate.modalCount.value = $event"
      @update:topic="generate.modalTopic.value = $event"
    />

    <!-- ─── Confirm-Dialog ─── -->
    <ConfirmDialog
      v-model="taskDetail.confirmDialogOpen.value"
      :title="taskDetail.confirmTitle.value"
      confirmLabel="Löschen"
      :danger="true"
      @confirm="taskDetail.onConfirmDelete"
      >{{ taskDetail.confirmMessage.value }}</ConfirmDialog
    >
  </ion-page>
</template>

<script setup lang="ts">
/**
 * AdminView — Shell für das Admin-Panel.
 *
 * Verantwortlichkeiten, bewusst eng gehalten:
 *  - Header + Nav rendern
 *  - Aktuellen Tab-State halten und auf Tab-Wechsel die Daten-Loader anstoßen
 *  - State-Composables instanziieren und an die Sections verteilen
 *
 * Alle Business-Logik (API-Calls, State-Mutation, Debouncing, Error-Handling)
 * lebt in den Composables unter `./composables/*`. Alle Rendering-Details in
 * `./sections/*` und `./components/*`. Diese Shell macht NICHTS außer
 * Orchestrierung.
 *
 * Autor: { name: "LetsGamingDE", id: 272402865874534400n }
 */

import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { IonPage } from '@ionic/vue';
import type { ExamPart } from '../types/index.js';
import { useAuth } from '../composables/useAuth.js';
import ConfirmDialog from '../components/ui/ConfirmDialog.vue';

import { TABS } from './admin/constants.js';
import { useAdminDashboard } from './admin/composables/useAdminDashboard.js';
import { useAdminHealth } from './admin/composables/useAdminHealth.js';
import { useAdminPool } from './admin/composables/useAdminPool.js';
import { useTaskDetail } from './admin/composables/useTaskDetail.js';
import { useAdminGenerate } from './admin/composables/useAdminGenerate.js';
import { useAdminUsers } from './admin/composables/useAdminUsers.js';
import { useAdminMaintenance } from './admin/composables/useAdminMaintenance.js';

import DashboardSection from './admin/sections/DashboardSection.vue';
import HealthSection from './admin/sections/HealthSection.vue';
import PoolSection from './admin/sections/PoolSection.vue';
import GenerateSection from './admin/sections/GenerateSection.vue';
import UsersSection from './admin/sections/UsersSection.vue';
import MaintenanceSection from './admin/sections/MaintenanceSection.vue';
import TaskDetailDrawer from './admin/components/TaskDetailDrawer.vue';
import GenerateModal from './admin/components/GenerateModal.vue';

// ── Auth + Routing ──────────────────────────────────────────────────────────
const router = useRouter();
const { user } = useAuth();
const currentUserId = computed(() => user.value?.id ?? '');

// ── Tab-State ───────────────────────────────────────────────────────────────
const activeTab = ref('dashboard');
const currentPart = computed(() => activeTab.value.replace('pool-', '') as ExamPart);

// ── State-Composables ───────────────────────────────────────────────────────
// Reihenfolge wichtig: health MUSS vor dashboard sein (dashboard nimmt health als DI).
const health = useAdminHealth();
const dashboard = useAdminDashboard(health);
const pool = useAdminPool({ currentPart });
const generate = useAdminGenerate({
  onAfterFormGenerate: () => dashboard.load(),
  onAfterModalGenerate: () => pool.load(),
});
const users = useAdminUsers();
const maintenance = useAdminMaintenance();

// Task-Detail braucht Callbacks, um nach Mutationen Pool + Dashboard zu refreshen.
const taskDetail = useTaskDetail({
  onAfterMutation: () => pool.load(),
  onAfterDelete: () => dashboard.load(),
});

// Shell-Derived-State für Header + Nav-Badges
const healthScore = computed(() => health.score.value);
const healthPillClass = computed(() => health.pillClass.value);

// ── Tab-Navigation ──────────────────────────────────────────────────────────
function navigate(tab: string): void {
  activeTab.value = tab;
  // Lazy load pro Tab — kein Preload, damit der initiale Mount schlank bleibt.
  if (tab === 'dashboard') dashboard.load();
  else if (tab === 'health') health.load();
  else if (tab.startsWith('pool-')) pool.load();
  else if (tab === 'users') users.load();
  else if (tab === 'maintenance') maintenance.loadBackups();
}

function openModalForCurrentPart(): void {
  generate.openModal(currentPart.value);
}

onMounted(() => dashboard.load());
</script>

<style>
@import './admin/admin.css';
</style>
