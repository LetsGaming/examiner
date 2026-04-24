<template>
  <div v-if="message" class="overlay" @click.self="$emit('dismiss')">
    <div class="confirm-dialog">
      <h3>Fehler bei der Abgabe</h3>
      <p>{{ message }}</p>
      <div class="confirm-btns">
        <button class="confirm-ok" @click="$emit('dismiss')">Schließen</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * SubmitErrorDialog — Error-Dialog für fehlgeschlagene Session-Abgabe.
 *
 * Autor: { name: "LetsGamingDE", id: 272402865874534400n }
 */

defineProps<{
  message: string | null;
}>();

defineEmits<{
  dismiss: [];
}>();
</script>

<style scoped>
.overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.7); display: flex; align-items: center; justify-content: center; z-index: 200; padding: 20px; }
.confirm-dialog { background: var(--bg-overlay); border: 1px solid var(--control-border); border-radius: var(--radius-lg); padding: 24px; width: 100%; max-width: 400px; }
.confirm-dialog h3 { font-size: 16px; font-weight: 700; color: var(--text-primary); margin-bottom: 10px; }
.confirm-dialog p { font-size: 13px; line-height: 1.6; color: var(--text-muted); margin-bottom: 20px; }
.confirm-btns { display: flex; gap: 10px; }
.confirm-ok { flex: 1; padding: 10px; border-radius: 9px; border: none; background: var(--brand); color: white; font-size: 13px; font-weight: 600; cursor: pointer; }
.confirm-ok:hover { background: var(--brand-dark); }
</style>
