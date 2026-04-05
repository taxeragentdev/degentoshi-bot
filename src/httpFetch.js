/**
 * Node.js fetch: timeout seçeneği yok; AbortSignal kullan.
 * Railway / undici "fetch failed" teşhisi için cause loglanmalı.
 */

const DEFAULT_UA = 'degentoshi-signalbot/1.0 (Node.js)';

export function fetchWithTimeout(url, options = {}) {
  const timeoutMs = options.timeoutMs ?? 45_000;
  const { timeoutMs: _t, ...rest } = options;
  const signal =
    rest.signal ??
    (typeof AbortSignal !== 'undefined' && AbortSignal.timeout
      ? AbortSignal.timeout(timeoutMs)
      : undefined);

  return fetch(url, {
    ...rest,
    signal,
    headers: {
      'User-Agent': DEFAULT_UA,
      ...rest.headers
    }
  });
}

export function logFetchError(prefix, error) {
  const cause = error?.cause;
  const extra = cause
    ? ` | cause: ${cause.message || cause}${cause.code ? ` (${cause.code})` : ''}`
    : '';
  console.error(`${prefix}: ${error?.message || error}${extra}`);
}
