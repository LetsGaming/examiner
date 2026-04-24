<template>
  <section class="summary-cards">
    <div class="summary-card">
      <div class="card-value">{{ totalExams }}</div>
      <div class="card-label">Prüfungen</div>
    </div>
    <div class="summary-card summary-card--accent">
      <div class="card-value">{{ overallAvg }}%</div>
      <div class="card-label">Ø Gesamt</div>
    </div>
    <div class="summary-card" :class="{ 'summary-card--streak': currentStreak > 0 }">
      <div class="card-value">{{ currentStreak }}</div>
      <div class="card-label">Tage Streak 🔥</div>
    </div>
  </section>
</template>

<script setup lang="ts">
/**
 * SummaryCards — Drei Übersichts-Kacheln oben auf der Stats-Seite.
 *
 * Autor: { name: "LetsGamingDE", id: 272402865874534400n }
 */

defineProps<{
  totalExams: number;
  overallAvg: number | '—';
  currentStreak: number;
}>();
</script>
