<template>
  <section class="section export-section">
    <h2 class="section-title">Daten exportieren</h2>
    <div class="export-btns">
      <a
        :href="`${apiBase}/export/me.json`"
        :download="`examiner-export-${today}.json`"
        class="export-btn"
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2.5"
          stroke-linecap="round"
        >
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
        JSON herunterladen
      </a>
      <a
        :href="`${apiBase}/export/me.csv`"
        :download="`examiner-export-${today}.csv`"
        class="export-btn export-btn--csv"
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2.5"
          stroke-linecap="round"
        >
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
        CSV herunterladen
      </a>
    </div>
  </section>
</template>

<script setup lang="ts">
/**
 * ExportSection — Direkte Download-Links für JSON/CSV-Export der User-Daten.
 *
 * Wir rendern native `<a>`-Tags, damit der Browser die Auth-Cookies mitschickt
 * und den Download direkt ausführt. Kein JS-Fetch nötig.
 *
 * Autor: { name: "LetsGamingDE", id: 272402865874534400n }
 */

defineProps<{
  apiBase: string;
  today: string;
}>();
</script>
