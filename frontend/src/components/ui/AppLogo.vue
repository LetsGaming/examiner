<template>
  <div class="app-logo">
    <span class="logo-badge">AP2</span>
    <div>
      <div class="logo-title">{{ title }}</div>
      <div class="logo-sub">Abschlussprüfung Teil 2</div>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{ title: string }>();
</script>

<style scoped>
.app-logo {
  display: flex;
  align-items: center;
  gap: 12px;
}
.logo-badge {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  background: linear-gradient(135deg, #4f46e5, #7c3aed);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 800;
  color: white;
  letter-spacing: 0.05em;
  flex-shrink: 0;
}
.logo-title {
  font-size: 16px;
  font-weight: 700;
  color: var(--text-primary);
}
.logo-sub {
  font-size: 11px;
  color: var(--text-subtle);
  margin-top: 1px;
}
</style>
