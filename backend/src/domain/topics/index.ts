/**
 * domain/topics/index.ts — Öffentliche API des Topic-Domain-Moduls.
 *
 * Autor: { name: "LetsGamingDE", id: 272402865874534400n }
 */

export { getTopics, TOPICS_FIAE, TOPICS_FISI } from './catalog.js';
export { inferKindForTopic, type TopicKind } from './kindInference.js';
export { pickTopicsByKinds } from './kindPicker.js';
