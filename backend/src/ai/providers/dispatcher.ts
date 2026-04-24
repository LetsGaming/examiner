/**
 * providers/dispatcher.ts — Einziger Einstiegspunkt für externe KI-Requests.
 *
 * Sicherheits-Invariante: Der apiKey wird server-seitig von resolveAiConfig
 * entschlüsselt, kommt NIE aus dem Request-Body und wird an keine andere
 * externe Destination weitergereicht.
 *
 * Auswahl des Modells (Text vs. Vision): wenn ein Bild übergeben wird, nimmt
 * der Dispatcher das visionModel der ProviderMeta, sonst das textModel.
 *
 * Autor: { name: "LetsGamingDE", id: 272402865874534400n }
 */

import type { ProviderMeta } from '../../routes/settingsRoutes.js';
import { callAnthropic } from './anthropic.js';
import { callGoogle } from './google.js';
import { callOpenAiCompat } from './openaiCompat.js';

export async function callAiProvider(
  prompt: string,
  apiKey: string,
  meta: ProviderMeta,
  imageBase64?: string,
  imageMediaType?: string,
): Promise<string> {
  const model = imageBase64 ? meta.visionModel : meta.textModel;

  switch (meta.id) {
    case 'anthropic':
      return callAnthropic({ prompt, apiKey, model, imageBase64, imageMediaType });
    case 'google':
      return callGoogle({ prompt, apiKey, model, imageBase64, imageMediaType });
    case 'openai':
    case 'mistral':
      return callOpenAiCompat({
        prompt,
        apiKey,
        apiBase: meta.apiBase,
        model,
        imageBase64,
        imageMediaType,
      });
    default: {
      // Exhaustiveness-Check — TypeScript catcht unbekannte Provider-IDs
      const _exhaustive: never = meta.id;
      throw new Error(`Unbekannter Provider: ${String(_exhaustive)}`);
    }
  }
}
