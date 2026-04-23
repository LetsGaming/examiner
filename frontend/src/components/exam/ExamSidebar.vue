<template>
  <aside class="sidebar" :class="{ open: open }">
    <div class="sidebar-top">
      <span class="sidebar-heading">Aufgaben</span>
      <button class="sidebar-close" @click="$emit('close')">✕</button>
    </div>

    <div v-for="(task, ti) in tasks" :key="task.id" class="task-group">
      <div class="task-title">
        <span class="tt-num">{{ ti + 1 }}</span>
        <span class="tt-name">{{ task.topicArea }}</span>
        <span class="tt-pts">{{ task.maxPoints }}P</span>
      </div>
      <button
        v-for="(st, si) in task.subtasks"
        :key="st.id"
        class="sub-btn"
        :class="{ 'sub-active': activeTask === ti && activeSubtask === si, 'sub-answered': isAnswered(ti, si), 'sub-flagged': isFlagged(ti, si) }"
        @click="$emit('navigate', ti, si)"
      >
        <span class="sub-label">{{ st.label }})</span>
        <span class="sub-type">{{ TASK_TYPE_SHORT[st.taskType] }}</span>
        <span class="sub-flag" v-if="isFlagged(ti, si)" title="Markiert">⚑</span>
        <span class="sub-pts">{{ st.points }}P</span>
      </button>
    </div>
  </aside>
  <div v-if="open" class="sidebar-backdrop" @click="$emit('close')" />
</template>

<script setup lang="ts">
import type { Task } from '../../types/index.js';
import { TASK_TYPE_SHORT } from '../../types/index.js';

defineProps<{
  tasks: Task[];
  open: boolean;
  activeTask: number;
  activeSubtask: number;
  isAnswered: (ti: number, si: number) => boolean;
  isFlagged: (ti: number, si: number) => boolean;
}>();

defineEmits<{ close: []; navigate: [ti: number, si: number] }>();
</script>

<style scoped>
.sidebar {
  width: 220px; flex-shrink: 0; overflow-y: auto;
  background: var(--bg-surface); border-right: 1px solid var(--border-light);
  padding: 12px 8px; display: flex; flex-direction: column; gap: 1px;
}
.sidebar-top { display: flex; justify-content: space-between; align-items: center; padding: 4px 8px 10px; }
.sidebar-heading { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.09em; color: var(--text-faint); }
.sidebar-close { background: none; border: none; color: var(--text-faint); cursor: pointer; font-size: 14px; display: none; }
.task-group { margin-bottom: 4px; }
.task-title { display: flex; align-items: center; gap: 7px; padding: 6px 8px; border-radius: 7px; }
.tt-num {
  width: 20px; height: 20px; border-radius: 5px; background: var(--control-bg);
  font-size: 11px; font-weight: 700; color: var(--text-subtle);
  display: flex; align-items: center; justify-content: center; flex-shrink: 0;
}
.tt-name { flex: 1; font-size: 11px; font-weight: 600; color: var(--text-muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.tt-pts { font-size: 10px; color: var(--text-faint); }
.sub-btn {
  display: flex; align-items: center; gap: 7px; width: 100%; padding: 5px 8px 5px 14px;
  border-radius: 6px; background: none; border: none; cursor: pointer; text-align: left; transition: background var(--transition);
}
.sub-btn:hover { background: var(--control-bg); }
.sub-btn.sub-active { background: var(--brand-bg); }
.sub-btn.sub-answered .sub-label { color: var(--success); }
.sub-label { font-size: 12px; font-weight: 700; color: var(--text-subtle); min-width: 22px; flex-shrink: 0; }
.sub-btn.sub-active .sub-label { color: var(--brand-text); }
.sub-type { flex: 1; font-size: 11px; color: var(--text-faint); }
.sub-pts { font-size: 10px; color: var(--text-ghost); }
.sub-btn.sub-flagged { border-left: 2px solid var(--warning); }
.sub-flag { font-size: 10px; color: var(--warning); margin-left: auto; }
.sidebar-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 49; display: none; }

@media (max-width: 768px) {
  .sidebar {
    position: fixed; left: 0; top: 0; bottom: 0; z-index: 50;
    transform: translateX(-100%); width: 260px; transition: transform 0.25s ease;
    box-shadow: 4px 0 24px rgba(0, 0, 0, 0.4);
  }
  .sidebar.open { transform: translateX(0); }
  .sidebar-close { display: flex !important; }
  .sidebar-backdrop { display: block; }
}
</style>
