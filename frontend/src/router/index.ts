/// <reference types="vite/client" />
import { createRouter, createWebHistory } from '@ionic/vue-router'
import type { RouteRecordRaw } from 'vue-router'
import { isLoggedIn } from '../composables/useAuth.js'

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
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})

// ─── Navigation guard ─────────────────────────────────────────────────────────
router.beforeEach((to) => {
  const isPublic = to.meta.public === true
  if (!isPublic && !isLoggedIn()) {
    return { name: 'Login' }
  }
  // Already logged in and trying to reach login → go home
  if (isPublic && isLoggedIn()) {
    return { name: 'Home' }
  }
})

export default router
