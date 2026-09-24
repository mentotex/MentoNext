import { WPApiError, WPNetworkError, WPNotFoundError } from './errors';

interface FetchWithRetryOptions {
  retries?: number;
  timeoutMs?: number;
  fetchOptions?: RequestInit;
}

const MAX_RETRY_AFTER_MS = 30_000; // never sleep longer than this on a single attempt, however large Retry-After is

/**
 * Parses a Retry-After header, which per spec is either a number of
 * seconds or an HTTP date. Returns milliseconds to wait, or null if the
 * header is absent/unparseable (caller falls back to exponential backoff).
 */
function parseRetryAfterMs(header: string | null): number | null {
  if (!header) return null;

  const seconds = Number(header);
  if (!Number.isNaN(seconds)) {
    return Math.max(0, seconds * 1000);
  }

  const dateMs = Date.parse(header);
  if (!Number.isNaN(dateMs)) {
    return Math.max(0, dateMs - Date.now());
  }

  return null;
}

export async function fetchWithRetry(
  url: string,
  { retries = 2, timeoutMs = 8000, fetchOptions = {} }: FetchWithRetryOptions = {}
): Promise<Response> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await fetch(url, { ...fetchOptions, signal: controller.signal });
      clearTimeout(timeout);

      if (res.status === 404) {
        throw new WPNotFoundError(`Not found: ${url}`);
      }

      if (res.status === 429) {
        const isLastAttempt = attempt === retries;
        if (isLastAttempt) {
          throw new WPApiError('WordPress API rate limited this request (429)', 429);
        }
        // Honor Retry-After when the server sends one; otherwise fall back
        // to the same exponential backoff used for other failures.
        const retryAfterMs = parseRetryAfterMs(res.headers.get('Retry-After'));
        const waitMs = retryAfterMs !== null ? Math.min(retryAfterMs, MAX_RETRY_AFTER_MS) : 300 * 2 ** attempt;
        await new Promise((r) => setTimeout(r, waitMs));
        continue;
      }

      if (!res.ok) {
        throw new WPApiError(`WordPress API returned ${res.status}`, res.status);
      }
      return res;
    } catch (err) {
      clearTimeout(timeout);
      lastError = err;

      if (err instanceof WPNotFoundError) throw err;

      // Other 4xx statuses (401, 403, 400, 405, ...) are the server telling
      // us this exact request is not allowed — a permission or request
      // problem, not a transient failure. Retrying it verbatim will get the
      // same rejection every time (429 is handled above, separately, since
      // it *is* meant to be retried after a wait). Failing fast here avoids
      // pointlessly hammering the endpoint and delaying the real error by
      // several backoff rounds — this matters most for cases like a
      // menu/REST endpoint that's blocked by WordPress permissions, where
      // the caller (e.g. fetchMenu's WPMenuAccessError) needs to see the
      // failure immediately.
      if (err instanceof WPApiError && err.status !== undefined && err.status >= 400 && err.status < 500) {
        throw err;
      }

      const isLastAttempt = attempt === retries;
      if (isLastAttempt) {
        throw err instanceof WPApiError ? err : new WPNetworkError(`Failed to reach ${url}`, err);
      }

      await new Promise((r) => setTimeout(r, 300 * 2 ** attempt));
    }
  }

  throw lastError;
}
