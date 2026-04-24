/// <reference types="vite/client" />
import { createRouter, createWebHistory } from '@ionic/vue-router';
import type { RouteRecordRaw } from 'vue-router';
import { isLoggedIn } from '../composables/useAuth.js';

// Lazy-load user check to avoid circular dependency at module init time
function getUser() {
  try {
    const raw = localStorage.getItem('ap2_auth_user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    redirect: '/home',
  },
  {
    path: '/login',
    name: 'Login',
    component: () => import('../views/LoginView.vue'),
    meta: { public: true },
  },
  {
    path: '/home',
    name: 'Home',
    component: () => import('../views/HomeView.vue'),
  },
  {
    path: '/session/:sessionId',
    name: 'Session',
    component: () => import('../views/SessionView.vue'),
  },
  {
    path: '/results/:sessionId',
    name: 'Results',
    component: () => import('../views/ResultsView.vue'),
  },
  {
    path: '/stats',
    name: 'Stats',
    component: () => import('../views/StatsView.vue'),
  },
  {
    path: '/history',
    name: 'History',
    component: () => import('../views/HistoryView.vue'),
  },
  {
    path: '/history/:sessionId',
    name: 'HistoryDetail',
    component: () => import('../views/HistoryDetailView.vue'),
  },
  {
    path: '/practice',
    name: 'Practice',
    component: () => import('../views/PracticeSetupView.vue'),
  },
  {
    path: '/review',
    name: 'Review',
    component: () => import('../views/ReviewStartView.vue'),
  },
  {
    path: '/account',
    name: 'Account',
    component: () => import('../views/AccountView.vue'),
  },
  {
    path: '/admin',
    name: 'Admin',
    component: () => import('../views/AdminView.vue'),
    meta: { requiresAdmin: true },
  },
];

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
});

// ─── Navigation guard ─────────────────────────────────────────────────────────
router.beforeEach((to) => {
  const isPublic = to.meta.public === true;
  if (!isPublic && !isLoggedIn()) {
    return { name: 'Login' };
  }
  if (isPublic && isLoggedIn()) {
    return { name: 'Home' };
  }
  if (to.meta.requiresAdmin) {
    const u = getUser();
    if (!u?.isAdmin) return { name: 'Home' };
  }
});

export default router;
