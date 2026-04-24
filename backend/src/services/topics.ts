/**
 * services/topics.ts — Backward-Compatibility-Shim.
 *
 * Die eigentliche Topic-Verwaltung wohnt seit Runde 3 in `src/domain/topics/`,
 * aufgeteilt in catalog.ts (Topic-Listen), kindInference.ts (Topic→Kind-Regex)
 * und kindPicker.ts (gewichtete Auswahl).
 *
 * Neuer Code sollte direkt von `src/domain/topics/index.js` importieren.
 *
 * Autor: { name: "LetsGamingDE", id: 272402865874534400n }
 */

export {
  getTopics,
  inferKindForTopic,
  pickTopicsByKinds,
  TOPICS_FIAE,
  TOPICS_FISI,
  type TopicKind,
} from '../domain/topics/index.js';
