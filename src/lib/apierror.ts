/**
 * Turns whatever the Gemini SDK threw into one sentence a person can act on.
 *
 * The SDK often throws with the raw JSON error envelope as the message, and
 * that envelope used to be rendered straight into the UI — a user reporting a
 * bug got `{"error":{"code":400,...}}` in an error banner. Everything here is
 * string work, so it is testable without touching the network.
 */

export type AiErrorKind = 'invalid-key' | 'rate-limit' | 'network' | 'unknown';

/** Pulls `error.message` out of a JSON envelope, else returns the input. */
export function unwrapApiMessage(raw: string): string {
  const start = raw.indexOf('{');
  if (start === -1) return raw.trim();

  try {
    const parsed = JSON.parse(raw.slice(start));
    const message = parsed?.error?.message ?? parsed?.message;
    return typeof message === 'string' && message ? message.trim() : raw.trim();
  } catch {
    return raw.trim();
  }
}

export function classify(raw: string): AiErrorKind {
  const lower = raw.toLowerCase();

  if (
    lower.includes('api key') ||
    lower.includes('permission') ||
    lower.includes('401') ||
    lower.includes('403')
  ) {
    return 'invalid-key';
  }
  if (lower.includes('429') || lower.includes('quota') || lower.includes('rate limit')) {
    return 'rate-limit';
  }
  if (
    lower.includes('failed to fetch') ||
    lower.includes('network') ||
    lower.includes('offline')
  ) {
    return 'network';
  }
  return 'unknown';
}

/** First sentence only, capped, so a banner never becomes a wall of text. */
function firstSentence(text: string, cap = 160): string {
  const trimmed = text.replace(/\s+/g, ' ').trim();
  const stop = trimmed.search(/\.\s|\.$/);
  const sentence = stop === -1 ? trimmed : trimmed.slice(0, stop + 1);
  return sentence.length > cap ? `${sentence.slice(0, cap - 1).trimEnd()}…` : sentence;
}

export function describeAiError(raw: string): { kind: AiErrorKind; message: string } {
  const kind = classify(raw);

  if (kind === 'invalid-key') {
    return { kind, message: 'That Gemini API key was rejected. Check it in Settings.' };
  }
  if (kind === 'rate-limit') {
    return {
      kind,
      message:
        'This key is over its Gemini quota. Free-tier limits reset daily — check your usage or try again later.',
    };
  }
  if (kind === 'network') {
    return { kind, message: 'Could not reach Gemini. Check your connection.' };
  }
  return { kind, message: firstSentence(unwrapApiMessage(raw)) };
}
