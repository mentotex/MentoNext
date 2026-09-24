import { CacheStore } from '../types';

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

/**
 * Default in-memory cache, used when no custom CacheStore is supplied.
 * Scoped to one process/client instance — does NOT persist across
 * serverless invocations or share state between server instances. For
 * that, pass a custom `cache.store` (Redis, Vercel KV/Upstash, etc.) on
 * WPAdapterConfig; this class doubles as the reference implementation of
 * the CacheStore interface such a store should match.
 *
 * Deliberately dumb: just get/set/clear of opaque values with a TTL. All
 * staleness/freshness bookkeeping for stale-while-revalidate happens one
 * layer up in RestClient, which wraps values with their own timestamp —
 * that keeps this interface simple enough for any backend (including ones
 * with native TTL support, like Redis's EXPIRE) to implement directly.
 */
export class MemoryCache implements CacheStore {
  private store = new Map<string, CacheEntry<unknown>>();

  get<T>(key: string): T | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return undefined;
    }
    return entry.value as T;
  }

  set<T>(key: string, value: T, ttlMs: number): void {
    this.store.set(key, { value, expiresAt: Date.now() + ttlMs });
  }

  clear(): void {
    this.store.clear();
  }
}
