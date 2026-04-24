<template>
  <section v-if="weakTopics.length > 0" class="section">
    <h2 class="section-title">⚠ Schwächste Themen</h2>
    <div class="weak-list">
      <div
        v-for="tp in weakTopics"
        :key="`${tp.part}-${tp.topicArea}`"
        class="weak-row"
      >
        <div class="weak-info">
          <span class="weak-topic">{{ tp.topicArea }}</span>
          <span class="weak-part">{{ partLabel(tp.part) }}</span>
        </div>
        <div class="weak-stats">
          <span class="weak-pct" :style="{ color: barColor(tp.avgPercentage) }">
            {{ tp.avgPercentage }}%
          </span>
          <span class="weak-attempts">{{ tp.attempts }}× versucht</span>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
/**
 * WeakTopicsSection — Top-5-Liste der schwächsten Themen (MD §5.1/§6.1
 * Lernempfehlung: bei unter 50% Durchschnitt gezielt wiederholen).
 *
 * Autor: { name: "LetsGamingDE", id: 272402865874534400n }
 */

import type { TopicPerformance } from '../../../types/index.js';
import { barColor, partLabel } from '../config.js';

defineProps<{
  weakTopics: TopicPerformance[];
}>();
</script>
