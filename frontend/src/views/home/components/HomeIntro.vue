<template>
  <div class="home-intro">
    <h1 class="intro-headline">Prüfungs&shy;vorbereitung</h1>
    <p class="intro-text">
      <template v-if="specialty === 'fisi'">
        Realitätsnahe IHK AP2-Prüfungen für
        <strong>Fachinformatiker Systemintegration</strong>
        mit KI-generierten Aufgaben zu Netzwerktechnik, Serverinfrastruktur und IT-Sicherheit.
      </template>
      <template v-else>
        Realitätsnahe IHK AP2-Prüfungen für
        <strong>Fachinformatiker Anwendungsentwicklung</strong>
        mit KI-generierten Aufgaben, automatischer Bewertung und detailliertem Feedback.
      </template>
    </p>
    <div class="intro-badges">
      <span class="badge badge-specialty">{{ specialty.toUpperCase() }}</span>
      <span class="badge">KI-generiert</span>
      <span class="badge">IHK-konform</span>
      <span class="badge">Sofort-Feedback</span>
    </div>

    <div v-if="hasKey" class="ai-indicator">
      <span class="ai-dot" />
      <span class="ai-label">{{ providerLabel }}</span>
      <span class="ai-model">{{ providerModel }}</span>
    </div>
    <div v-else class="ai-indicator ai-indicator-warn">
      <svg
        width="13"
        height="13"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2.5"
      >
        <path
          d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"
        />
        <line x1="12" y1="9" x2="12" y2="13" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
      Kein API-Key —
      <button class="ai-indicator-link" @click="$emit('openAiSettings')">Jetzt einrichten</button>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * HomeIntro — Überschrift, Specialty-Text, Badges und AI-Key-Indikator.
 *
 * Autor: { name: "LetsGamingDE", id: 272402865874534400n }
 */

defineProps<{
  specialty: string;
  hasKey: boolean;
  providerLabel: string;
  providerModel: string;
}>();

defineEmits<{
  openAiSettings: [];
}>();
</script>
