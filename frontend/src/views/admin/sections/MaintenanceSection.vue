<template>
  <section class="tab-content">
    <div class="maintenance-grid">
      <div class="card">
        <h2 class="card-heading">Datenbank-Backup</h2>
        <p class="card-text">
          Erstellt eine vollständige Sicherung der SQLite-Datenbank auf dem Server.
        </p>
        <div class="field-actions">
          <button class="btn-primary" :disabled="backupRunning" @click="$emit('createBackup')">
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
          <button class="btn-ghost" :disabled="reclassRunning" @click="$emit('runReclassify')">
            <span v-if="reclassRunning" class="btn-spinner" />
            <template v-else>Reklassifizierung starten</template>
          </button>
        </div>
        <div v-if="reclassResult" class="feedback-success">{{ reclassResult }}</div>
        <div v-if="reclassError" class="feedback-error">{{ reclassError }}</div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
/**
 * MaintenanceSection — Backup + Reklassifizierungs-Karten.
 *
 * Autor: { name: "LetsGamingDE", id: 272402865874534400n }
 */

defineProps<{
  backups: unknown[];
  backupRunning: boolean;
  backupResult: string | null;
  reclassRunning: boolean;
  reclassResult: string | null;
  reclassError: string | null;
}>();

defineEmits<{
  createBackup: [];
  runReclassify: [];
}>();
</script>
