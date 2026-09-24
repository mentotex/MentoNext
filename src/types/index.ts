export interface WPMediaSize {
  source_url: string;
  width: number;
  height: number;
}

export interface WPFeaturedMedia {
  id: number;
  source_url: string;
  alt_text: string;
  sizes: Record<string, WPMediaSize>;
}

export interface SeoData {
  title?: string;
  description?: string;
  canonical?: string;
  ogImage?: string;
  jsonLd?: unknown[];
  source: 'yoast' | 'rankmath' | 'aioseo' | 'none';
}

export interface WPTerm {
  id: number;
  name: string;
  slug: string;
  description: string;
  count: number;
  taxonomy: string;
}

export interface WPAuthor {
  id: number;
  name: string;
  slug: string;
  description: string;
  avatarUrl: string | null;
  link: string;
}

export interface WPMenuItem {
  id: number;
  title: string;
  url: string;
  parentId: number;
  order: number;
  target: string;
  classes: string[];
  children: WPMenuItem[];
}

export interface WPSearchResult {
  id: number;
  title: string;
  url: string;
  type: string;
  subtype: string;
}

export interface WPPost {
  id: number;
  slug: string;
  date: string;
  modified: string;
  title: string;
  excerpt: string;
  content: string;
  featuredMedia: WPFeaturedMedia | null;
  categories: number[];
  tags: number[];
  categoryTerms: WPTerm[];
  tagTerms: WPTerm[];
  author: WPAuthor | null;
  seo: SeoData;
  raw: Record<string, unknown> | undefined;
}

export interface SanitizeOptions {
  allowedTags?: string[];
  allowedAttributes?: Record<string, string[]>;
}

/**
 * A pluggable cache backend. The package ships a built-in in-memory
 * implementation (utils/cache.ts) used by default. Supply your own (Redis,
 * Vercel KV/Upstash, etc.) via config.cache.store for state that should
 * survive across serverless invocations or be shared between instances.
 * Methods may be sync or async — both are awaited safely by the client.
 */
export interface CacheStore {
  get<T>(key: string): Promise<T | undefined> | T | undefined;
  set<T>(key: string, value: T, ttlMs: number): Promise<void> | void;
  clear(): Promise<void> | void;
}

export interface CacheOptions {
  /** In-memory cache TTL in ms. Default 60000 (1 min). Set to 0 or false to disable. */
  ttlMs?: number | false;
  /** Seconds for Next.js's fetch cache. Only has an effect inside Next.js. */
  revalidate?: number | false;
  /** Cache tags for on-demand revalidation via Next.js's revalidateTag(). */
  tags?: string[];
  /** Custom cache backend. Defaults to the package's built-in in-memory store. */
  store?: CacheStore;
  /**
   * When true, an expired-but-recently-cached response is returned
   * immediately while a fresh fetch happens in the background (updating
   * the cache for the *next* request). Trades a slightly stale response
   * for consistently fast reads. Default: false (hard TTL expiry).
   */
  staleWhileRevalidate?: boolean;
}

/**
 * RankMath-specific SEO fetching. RankMath does not embed SEO data into
 * the standard posts/pages response (unlike Yoast) — it requires a
 * separate request per page URL to its own "Headless CMS Support"
 * endpoint, which must also be enabled on the WordPress site first. See
 * seo/rankmath.ts for details.
 */
export interface SeoFetchOptions {
  /**
   * When true, getPostBySlug/getPageBySlug/customPostType(...).getBySlug
   * will make one extra request to RankMath's getHead endpoint if no SEO
   * data was found on the post object itself. Never applied to list
   * methods (getPosts/getAll) — that would add one request per item on
   * every page load. Default: false (opt-in, to keep zero-config fetches
   * fast for sites not using this RankMath feature).
   */
  rankMathHeadless?: boolean;
}

export interface OutputOptions {
  /**
   * Passed through as WordPress's own `_fields` REST parameter, limiting
   * which fields the server includes in its response at all (smaller
   * payload, and a way to avoid ever receiving fields you don't want
   * exposed further up your stack). Applies to list and single-item
   * fetches. Note: WP still requires certain fields internally for some
   * response shapes (e.g. `_links`) — this is a request to WP, not a
   * strict client-side filter.
   */
  fields?: string[];
  /**
   * When false, the `raw` property (the entire unfiltered WordPress
   * response for that item) is stripped from returned objects before they
   * reach your code. Default: true. Note this doesn't reduce what WP
   * *sends* (use `fields` for that) — it only controls what this package
   * hands you afterward.
   */
  includeRaw?: boolean;
}

export interface WPAdapterConfig {
  baseUrl: string;
  postType?: string;
  timeoutMs?: number;
  retries?: number;
  fetchOptions?: RequestInit;
  sanitize?: SanitizeOptions | false;
  cache?: CacheOptions;
  seo?: SeoFetchOptions;
  output?: OutputOptions;
}

export interface GetPostsParams {
  page?: number;
  perPage?: number;
  search?: string;
  categories?: number[];
  slug?: string;
}

export interface GetTermsParams {
  page?: number;
  perPage?: number;
  search?: string;
  slug?: string;
}

export interface GetAuthorsParams {
  page?: number;
  perPage?: number;
  search?: string;
  slug?: string;
}

export interface SearchParams {
  perPage?: number;
  /** Restrict to one or more WP object subtypes (e.g. 'post', 'page'). */
  subtype?: string[];
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  totalPages: number;
  page: number;
}
