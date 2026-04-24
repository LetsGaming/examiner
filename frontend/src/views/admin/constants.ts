/**
 * views/admin/constants.ts — Statische Konfiguration für das Admin-Panel.
 *
 * Autor: { name: "LetsGamingDE", id: 272402865874534400n }
 */

export const PART_LABELS: Record<string, string> = {
  teil_1: 'Teil 1 — Planen',
  teil_2: 'Teil 2 — Entwicklung',
  teil_3: 'Teil 3 — WiSo',
};

export const KINDS = ['diagram', 'sql', 'code', 'calc', 'table', 'text'] as const;

export interface AdminTab {
  id: string;
  label: string;
  icon: string;
}

/**
 * Tab-Liste des Admin-Panels. Die `icon`-Werte sind rohe SVG-Strings, die im
 * Template per `v-html` eingesetzt werden. Das ist akzeptabel, weil alle SVGs
 * hier statisch/trusted sind — kein User-Input wird je reinrauschen.
 */
export const TABS: AdminTab[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>',
  },
  {
    id: 'health',
    label: 'Pool Health',
    icon: '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>',
  },
  {
    id: 'pool-teil_1',
    label: 'Teil 1',
    icon: '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>',
  },
  {
    id: 'pool-teil_2',
    label: 'Teil 2',
    icon: '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>',
  },
  {
    id: 'pool-teil_3',
    label: 'WiSo',
    icon: '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>',
  },
  {
    id: 'generate',
    label: 'Generieren',
    icon: '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14"/></svg>',
  },
  {
    id: 'users',
    label: 'Nutzer',
    icon: '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
  },
  {
    id: 'maintenance',
    label: 'Wartung',
    icon: '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>',
  },
];
