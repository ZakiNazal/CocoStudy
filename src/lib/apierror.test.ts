import { describe, expect, it } from 'vitest';
import { classify, describeAiError, unwrapApiMessage } from './apierror';

// The exact payload a user was shown in an error banner.
const ASPECT_RATIO_400 =
  '{"error":{"code":400,"message":"Aspect ratio is not enabled for this model","status":"INVALID_ARGUMENT"}}';

describe('unwrapApiMessage', () => {
  it('pulls the message out of the Gemini error envelope', () => {
    expect(unwrapApiMessage(ASPECT_RATIO_400)).toBe(
      'Aspect ratio is not enabled for this model',
    );
  });

  it('handles the SDK prefixing text before the JSON', () => {
    expect(unwrapApiMessage(`got status: 400 ${ASPECT_RATIO_400}`)).toBe(
      'Aspect ratio is not enabled for this model',
    );
  });

  it('leaves a plain message alone', () => {
    expect(unwrapApiMessage('Something broke')).toBe('Something broke');
  });

  it('falls back to the raw text when the JSON is malformed', () => {
    expect(unwrapApiMessage('{"error": broken')).toBe('{"error": broken');
  });

  it('falls back when the envelope has no message', () => {
    expect(unwrapApiMessage('{"error":{"code":400}}')).toBe('{"error":{"code":400}}');
  });
});

describe('classify', () => {
  it('spots a rejected key', () => {
    expect(classify('API key not valid')).toBe('invalid-key');
    expect(classify('got status: 403 permission denied')).toBe('invalid-key');
  });

  it('spots quota and rate limits', () => {
    expect(classify('{"error":{"code":429,"message":"You exceeded your current quota"}}')).toBe(
      'rate-limit',
    );
  });

  it('spots a dead connection', () => {
    expect(classify('Failed to fetch')).toBe('network');
  });

  it('does not mistake an ordinary 400 for anything else', () => {
    expect(classify(ASPECT_RATIO_400)).toBe('unknown');
  });
});

describe('describeAiError', () => {
  it('never leaks a raw JSON envelope into the message', () => {
    const { message } = describeAiError(ASPECT_RATIO_400);
    expect(message).toBe('Aspect ratio is not enabled for this model');
    expect(message).not.toContain('{');
  });

  it('explains a quota failure without promising it clears in a minute', () => {
    const { kind, message } = describeAiError('429 quota exceeded');
    expect(kind).toBe('rate-limit');
    expect(message).toMatch(/quota/i);
    expect(message).not.toMatch(/wait a minute/i);
  });

  it('trims a rambling message to one capped sentence', () => {
    const long = `${'x'.repeat(400)}. And then more.`;
    expect(describeAiError(long).message.length).toBeLessThanOrEqual(160);
  });
});
