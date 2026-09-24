import { fetchWithRetry } from '../../utils/fetchWithRetry';
import { MemoryCache } from '../../utils/cache';
import { WPAdapterConfig, CacheStore } from '../../types';
import { WPInvalidResponseError } from '../../utils/errors';

/**
 * A 2xx status is not proof the body is actually the JSON WordPress meant
 * to send — a WAF challenge page, a PHP warning printed before headers, or
 * a maintenance-mode page can all ride along on a 200. Reading the body as
 * text first (rather than letting `res.json()` throw its own generic
 * SyntaxError) lets us wrap the failure in a typed, actionable error
 * instead of leaking a native parse error up to the caller.
 */
async function parseJsonResponse<T>(res: Response, url: string): Promise<T> {
  const text = await res.text();
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new WPInvalidResponseError(
      `WordPress returned a response that isn't valid JSON from ${url}. This usually means a firewall/security plugin's block or challenge page, a PHP warning or notice printed before the JSON, or a maintenance-mode page is being served instead of the REST API's real output.`,
      res.status
    );
  }
}

type ExtendedFetchInit = RequestInit & {
  next?: { revalidate?: number | false; tags?: string[] };
};

const DEFAULT_CACHE_TTL_MS = 60_000;
// How long a stale entry is kept around for stale-while-revalidate to have
// something to serve. Freshness itself is judged from the wrapped
// timestamp below, not this — this just controls how long the underlying
// store retains the entry at all.
const STALE_RETENTION_MULTIPLIER = 5;

interface WrappedEntry<T> {
  value: T;
  cachedAt: number;
}

export class RestClient {
  private store: CacheStore;
  private inFlight = new Map<string, Promise<unknown>>();
  private revalidating = new Set<string>();

  constructor(private config: WPAdapterConfig) {
    this.store = config.cache?.store ?? new MemoryCache();
  }

  getConfig(): WPAdapterConfig {
    return this.config;
  }

  async clearCache(): Promise<void> {
    await this.store.clear();
  }

  private get cacheDisabled(): boolean {
    return this.config.cache?.ttlMs === false || this.config.cache?.ttlMs === 0;
  }

  private get ttlMs(): number {
    const t = this.config.cache?.ttlMs;
    return t === false || t === undefined ? DEFAULT_CACHE_TTL_MS : t;
  }

  private get staleRetentionMs(): number {
    return this.ttlMs * STALE_RETENTION_MULTIPLIER;
  }

  private buildUrl(path: string, searchParams?: Record<string, string>): string {
    const url = new URL(`${this.config.baseUrl.replace(/\/$/, '')}/wp-json/wp/v2${path}`);
    if (searchParams) {
      Object.entries(searchParams).forEach(([k, v]) => url.searchParams.set(k, v));
    }

    const fields = this.config.output?.fields;
    if (fields?.length && !url.searchParams.has('_fields')) {
      url.searchParams.set('_fields', fields.join(','));
    }

    return url.toString();
  }

  private buildFetchOptions(): ExtendedFetchInit {
    const { revalidate, tags } = this.config.cache ?? {};
    const base: ExtendedFetchInit = { ...this.config.fetchOptions };
    if (revalidate === undefined && !tags) return base;
    return { ...base, next: { revalidate, tags } };
  }

  /**
   * Every read goes through here. Deliberately does its in-flight check as
   * the very first, fully synchronous step — before any `await`, even one
   * that resolves "immediately" (a plain value awaited still yields a
   * microtask tick in JS). That's what makes deduplication reliable
   * regardless of whether the cache store is sync (the built-in
   * MemoryCache) or async (Redis, etc.): two calls issued back-to-back in
   * the same synchronous turn (e.g. Promise.all([a(), a()])) are
   * guaranteed to see the same in-flight entry, rather than racing each
   * other into the cache-read path independently.
   */
  private getCachedOrFetch<T>(key: string, doFetch: () => Promise<T>): Promise<T> {
    const existing = this.inFlight.get(key) as Promise<T> | undefined;
    if (existing) return existing;

    const promise = this.resolveCachedOrFetch(key, doFetch).finally(() => this.inFlight.delete(key));
    this.inFlight.set(key, promise);
    return promise;
  }

  private async resolveCachedOrFetch<T>(key: string, doFetch: () => Promise<T>): Promise<T> {
    if (this.cacheDisabled) {
      return doFetch();
    }

    const wrapped = await this.store.get<WrappedEntry<T>>(key);
    if (wrapped) {
      const isFresh = Date.now() - wrapped.cachedAt < this.ttlMs;
      if (isFresh) return wrapped.value;

      if (this.config.cache?.staleWhileRevalidate) {
        // Serve the stale value now; refresh it in the background. Only
        // one background refetch runs per key even if many stale reads
        // arrive while it's in flight — guarded by `revalidating`, not
        // `inFlight` (that map is already cleared for this key by the
        // time we get here, since the foreground call is about to return).
        if (!this.revalidating.has(key)) {
          this.revalidating.add(key);
          doFetch()
            .then((fresh) => this.store.set(key, { value: fresh, cachedAt: Date.now() }, this.staleRetentionMs))
            .catch(() => {
              /* background refresh failed — keep serving the stale value until the next attempt */
            })
            .finally(() => this.revalidating.delete(key));
        }
        return wrapped.value;
      }
      // Stale and SWR is off: fall through to a normal blocking refetch.
    }

    const fresh = await doFetch();
    await this.store.set(key, { value: fresh, cachedAt: Date.now() }, this.staleRetentionMs);
    return fresh;
  }

  get<T>(path: string, searchParams?: Record<string, string>): Promise<T> {
    const url = this.buildUrl(path, searchParams);
    return this.getCachedOrFetch(url, async () => {
      const res = await fetchWithRetry(url, {
        retries: this.config.retries,
        timeoutMs: this.config.timeoutMs,
        fetchOptions: this.buildFetchOptions(),
      });
      return parseJsonResponse<T>(res, url);
    });
  }

  getPaginated<T>(
    path: string,
    searchParams?: Record<string, string>
  ): Promise<{ data: T; total: number; totalPages: number }> {
    const url = this.buildUrl(path, searchParams);
    const cacheKey = `paginated:${url}`;

    return this.getCachedOrFetch(cacheKey, async () => {
      const res = await fetchWithRetry(url, {
        retries: this.config.retries,
        timeoutMs: this.config.timeoutMs,
        fetchOptions: this.buildFetchOptions(),
      });
      const data = await parseJsonResponse<T>(res, url);
      return {
        data,
        total: Number(res.headers.get('X-WP-Total') ?? 0),
        totalPages: Number(res.headers.get('X-WP-TotalPages') ?? 0),
      };
    });
  }
}
