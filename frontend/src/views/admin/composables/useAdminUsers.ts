/**
 * views/admin/composables/useAdminUsers.ts — User-Liste + Admin-Toggle.
 *
 * Autor: { name: "LetsGamingDE", id: 272402865874534400n }
 */

import { ref } from 'vue';
import type { AdminUser } from '../../../types/index.js';
import { adminFetchUsers, adminToggleAdmin } from '../../../composables/api/index.js';

export function useAdminUsers() {
  const users = ref<AdminUser[]>([]);
  const loading = ref(false);

  async function load(): Promise<void> {
    loading.value = true;
    try {
      users.value = await adminFetchUsers();
    } finally {
      loading.value = false;
    }
  }

  async function toggleAdmin(u: AdminUser): Promise<void> {
    await adminToggleAdmin(u.id, !u.is_admin);
    await load();
  }

  return { users, loading, load, toggleAdmin };
}

export type UseAdminUsers = ReturnType<typeof useAdminUsers>;
