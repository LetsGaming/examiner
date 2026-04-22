/**
 * useAiSettings — manages AI provider settings state and API interactions.
 * Extracted from HomeView to keep that component focused on exam flow only.
 */
import { ref, computed } from 'vue';
import { fetchAiSettings, saveAiSettings, deleteAiKey } from './useApi.js';
import type { AiSettings, ProviderInfo } from '../types/index.js';

const DEFAULT_SETTINGS: AiSettings = {
  provider: 'openai',
  providers: [],
  hasKey: false,
  keySource: 'none',
  keyMasked: null,
  updatedAt: null,
};

const PROVIDER_CACHE_KEY = 'ap2_last_provider';

export function useAiSettings() {
  const settings = ref<AiSettings>({ ...DEFAULT_SETTINGS });
  const showModal = ref(false);
  const showKey = ref(false);
  const saving = ref(false);
  const error = ref('');
  const success = ref('');

  // Seed form.provider from cache so UI is consistent even if the settings
  // API is momentarily unavailable (e.g. backend restarting on deploy).
  const cachedProvider = localStorage.getItem(PROVIDER_CACHE_KEY) ?? 'openai';
  const form = ref({ provider: cachedProvider, apiKey: '' });

  const selectedProvider = computed<ProviderInfo | null>(
    () => settings.value.providers.find((p) => p.id === form.value.provider) ?? null,
  );

  const currentProviderLabel = computed(
    () => settings.value.providers.find((p) => p.id === settings.value.provider)?.label ?? settings.value.provider,
  );

  const currentProviderModel = computed(
    () => settings.value.providers.find((p) => p.id === settings.value.provider)?.textModel ?? '',
  );

  async function load() {
    try {
      settings.value = await fetchAiSettings();
      form.value.provider = settings.value.provider;
      // Persist so the UI is correct if the API is unavailable on next load
      localStorage.setItem(PROVIDER_CACHE_KEY, settings.value.provider);
    } catch {
      /* non-fatal — UI degrades gracefully using cached provider */
    }
  }

  function open() {
    form.value = { provider: settings.value.provider, apiKey: '' };
    showKey.value = false;
    error.value = '';
    success.value = '';
    showModal.value = true;
  }

  function close() {
    showModal.value = false;
  }

  function selectProvider(p: ProviderInfo) {
    form.value.provider = p.id;
    form.value.apiKey = '';
    error.value = '';
    success.value = '';
    localStorage.setItem(PROVIDER_CACHE_KEY, p.id);
  }

  async function save() {
    error.value = '';
    success.value = '';
    saving.value = true;
    try {
      const result = await saveAiSettings(form.value.provider, form.value.apiKey || undefined);
      await load();
      form.value.apiKey = '';
      success.value = result.keyStored
        ? 'Einstellungen gespeichert. API-Key ist verschlüsselt hinterlegt.'
        : 'Anbieter aktualisiert.';
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Speichern fehlgeschlagen.';
    } finally {
      saving.value = false;
    }
  }

  async function removeKey() {
    if (!confirm('Gespeicherten API-Key wirklich löschen?')) return;
    error.value = '';
    success.value = '';
    saving.value = true;
    try {
      await deleteAiKey();
      await load();
      success.value = 'API-Key wurde gelöscht.';
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Löschen fehlgeschlagen.';
    } finally {
      saving.value = false;
    }
  }

  function formatDate(iso: string): string {
    try {
      return new Date(iso + 'Z').toLocaleDateString('de-DE', {
        day: '2-digit', month: '2-digit', year: 'numeric',
      });
    } catch {
      return iso;
    }
  }

  return {
    settings,
    showModal,
    showKey,
    saving,
    error,
    success,
    form,
    selectedProvider,
    currentProviderLabel,
    currentProviderModel,
    load,
    open,
    close,
    selectProvider,
    save,
    removeKey,
    formatDate,
  };
}
