<template>
  <section class="tab-content">
    <div v-if="loading" class="loading-row">
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
                @click="$emit('toggleAdmin', u)"
              >
                {{ u.is_admin ? 'Admin entfernen' : 'Admin machen' }}
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>

<script setup lang="ts">
/**
 * UsersSection — User-Übersicht mit Admin-Toggle.
 *
 * Autor: { name: "LetsGamingDE", id: 272402865874534400n }
 */

import type { AdminUser } from '../../../types/index.js';
import { fmtDate } from '../utils.js';

defineProps<{
  users: AdminUser[];
  loading: boolean;
  currentUserId: string;
}>();

defineEmits<{
  toggleAdmin: [user: AdminUser];
}>();
</script>
