<template>
  <header class="home-header">
    <AppLogo :title="specialty === 'fisi' ? 'FISI Trainer' : 'FIAE Trainer'" />

    <div class="header-center">
      <SpecialtyToggle
        :model-value="specialty"
        @update:model-value="$emit('update:specialty', $event)"
      />
    </div>

    <div class="header-right">
      <div v-if="user" class="user-badge">
        <span class="user-avatar">{{ user.displayName.charAt(0).toUpperCase() }}</span>
        <span class="user-name">{{ user.displayName }}</span>
        <button class="icon-btn" @click="$emit('navAccount')" title="Account-Einstellungen">
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <circle cx="12" cy="8" r="4" />
            <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
          </svg>
        </button>
        <button
          v-if="isAdmin"
          class="icon-btn icon-btn--admin"
          @click="$emit('navAdmin')"
          title="Admin-Panel"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <rect x="3" y="3" width="7" height="7" />
            <rect x="14" y="3" width="7" height="7" />
            <rect x="14" y="14" width="7" height="7" />
            <rect x="3" y="14" width="7" height="7" />
          </svg>
        </button>
        <button class="icon-btn" @click="$emit('logout')" title="Abmelden">
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.5"
            stroke-linecap="round"
          >
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
        </button>
      </div>
      <button class="settings-btn settings-btn--nav" @click="$emit('navStats')">
        <svg
          width="15"
          height="15"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
        </svg>
        Mein Fortschritt
      </button>
      <button class="settings-btn settings-btn--nav" @click="$emit('navHistory')">
        <svg
          width="15"
          height="15"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
        Historie
      </button>
      <button class="settings-btn settings-btn--nav" @click="$emit('navPractice')">
        <svg
          width="15"
          height="15"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2.5"
        >
          <polygon points="5 3 19 12 5 21 5 3" />
        </svg>
        Übungsmodus
      </button>
      <button v-if="reviewCount > 0" class="review-badge-btn" @click="$emit('navReview')">
        <svg
          width="13"
          height="13"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2.5"
        >
          <polyline points="1 4 1 10 7 10" />
          <path d="M3.51 15a9 9 0 1 0 .49-3.95" />
        </svg>
        {{ reviewCount }} fällig
      </button>
      <button
        class="theme-btn"
        @click="$emit('toggleTheme')"
        :title="theme === 'dark' ? 'Zum Hellmodus wechseln' : 'Zum Dunkelmodus wechseln'"
      >
        <svg
          v-if="theme === 'dark'"
          width="15"
          height="15"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <circle cx="12" cy="12" r="5" />
          <line x1="12" y1="1" x2="12" y2="3" />
          <line x1="12" y1="21" x2="12" y2="23" />
          <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
          <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
          <line x1="1" y1="12" x2="3" y2="12" />
          <line x1="21" y1="12" x2="23" y2="12" />
          <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
          <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
        </svg>
        <svg
          v-else
          width="15"
          height="15"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
      </button>
      <button class="settings-btn" @click="$emit('openAiSettings')">
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <circle cx="12" cy="12" r="3" />
          <path
            d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"
          />
        </svg>
        KI-Einstellungen
        <span class="key-badge" :class="keyBadgeClass">{{ keyBadgeLabel }}</span>
      </button>
    </div>
  </header>
</template>

<script setup lang="ts">
/**
 * HomeHeader — Top-Bar der HomeView mit Logo, Specialty-Toggle, User-Menü,
 * Navigations-Buttons (Stats/Historie/Practice/Review) und AI-Settings-Trigger.
 *
 * Reine Präsentation: alle Klicks gehen als typed events an die Shell, die
 * Routing und Composable-Calls orchestriert.
 *
 * Autor: { name: "LetsGamingDE", id: 272402865874534400n }
 */

import type { AuthUser } from '../../../composables/useAuth.js';
import type { Specialty } from '../../../types/index.js';
import AppLogo from '../../../components/ui/AppLogo.vue';
import SpecialtyToggle from '../../../components/ui/SpecialtyToggle.vue';

defineProps<{
  specialty: Specialty;
  user: AuthUser | null;
  isAdmin: boolean;
  theme: string;
  reviewCount: number;
  keyBadgeLabel: string;
  keyBadgeClass: string;
}>();

defineEmits<{
  'update:specialty': [value: Specialty];
  logout: [];
  navAccount: [];
  navAdmin: [];
  navStats: [];
  navHistory: [];
  navPractice: [];
  navReview: [];
  toggleTheme: [];
  openAiSettings: [];
}>();
</script>
