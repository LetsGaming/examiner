/// <reference types="vite/client" />
import { createRouter, createWebHistory } from '@ionic/vue-router'
import type { RouteRecordRaw } from 'vue-router'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    redirect: '/home',
  },
  {
    path: '/home',
    name: 'Home',
    component: () => import('../views/HomeView.vue'),
  },
  // /exam/:examId route entfernt — HomeView startet Sessions direkt via /session/:sessionId
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

export default router
