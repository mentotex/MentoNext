import { PaginatedResult } from '../types';

/** The minimal shape this helper needs — matches WPCollectionSource and WPTermSource alike. */
export interface SlugPageSource {
  getAll(params?: { page?: number; perPage?: number }): Promise<PaginatedResult<{ slug: string }>>;
}

export interface ToStaticParamsOptions {
  /** The dynamic route's param name, e.g. "slug" for `app/blog/[slug]/page.tsx`. Default: 'slug'. */
  paramName?: string;
  /** Items fetched per page while paginating through the full collection. Default: 100 (WordPress's own REST API max). */
  perPage?: number;
}

/**
 * Builds the array Next.js's `generateStaticParams()` expects, by
 * paginating through an entire WordPress collection (posts, pages, a custom
 * post type, or a taxonomy) and mapping each item's slug into a params
 * object. Pass anything with a paginated `getAll()` — `wp.getPosts` and
 * `wp.getPages` need a one-line wrapper since they're plain methods on the
 * client rather than collection objects; `customPostType(...)` and
 * `taxonomy(...)` already return one directly:
 *
 * ```ts
 * // app/blog/[slug]/page.tsx
 * export async function generateStaticParams() {
 *   return toStaticParams({ getAll: (p) => wp.getPosts(p) });
 * }
 *
 * // Custom post type:
 * export async function generateStaticParams() {
 *   return toStaticParams(wp.customPostType('events'));
 * }
 *
 * // Taxonomy term pages, with a different param name:
 * export async function generateStaticParams() {
 *   return toStaticParams(wp.taxonomy('genres', 'genre'), { paramName: 'genre' });
 * }
 * ```
 *
 * Fetches every page of the collection (WordPress's REST API caps
 * `per_page` at 100, so a 350-item collection means 4 requests) — this
 * runs at build time, not per-request, so the extra requests are a one-time
 * build cost rather than something visitors wait on.
 */
export async function toStaticParams(
  source: SlugPageSource,
  options: ToStaticParamsOptions = {}
): Promise<Record<string, string>[]> {
  const paramName = options.paramName ?? 'slug';
  const perPage = options.perPage ?? 100;

  const params: Record<string, string>[] = [];
  let page = 1;

  while (true) {
    const { items, totalPages } = await source.getAll({ page, perPage });
    for (const item of items) {
      params.push({ [paramName]: item.slug });
    }
    if (page >= totalPages || items.length === 0) break;
    page++;
  }

  return params;
}
