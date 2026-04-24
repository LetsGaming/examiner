<template>
  <section class="grade-table-section">
    <h2 class="section-heading">IHK-Notenschlüssel</h2>
    <table class="grade-table">
      <tbody>
        <tr
          v-for="g in GRADES"
          :key="g.key"
          :class="{ active: g.key === currentGrade }"
        >
          <td class="gt-range">{{ g.min }}–{{ g.max }} %</td>
          <td class="gt-label">{{ g.label }}</td>
          <td class="gt-check">{{ g.key === currentGrade ? '✓' : '' }}</td>
        </tr>
      </tbody>
    </table>
  </section>
</template>

<script setup lang="ts">
/**
 * GradeTable — IHK-Notenschlüssel mit hervorgehobener Zeile für die erreichte
 * Note. Rein präsentativ.
 *
 * Autor: { name: "LetsGamingDE", id: 272402865874534400n }
 */

import { GRADES } from '../config.js';

defineProps<{
  currentGrade: string;
}>();
</script>
