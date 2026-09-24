import { SeoData } from '../types';
import { fetchWithRetry } from '../utils/fetchWithRetry';
import { extractTag, extractMeta, extractLinkHref, extractJsonLd } from './htmlHeadParser';

interface RankMathGetHeadResponse {
  success: boolean;
  head?: string;
}

/**
 * Calls RankMath's "Headless CMS Support" endpoint for one page URL.
 *
 * IMPORTANT: unlike Yoast, RankMath does NOT embed SEO data into the
 * standard /wp/v2/posts REST response. It exposes a separate endpoint
 * (wp-json/rankmath/v1/getHead) that must be enabled on the WordPress site
 * first (RankMath → General Settings → Others tab → "Headless CMS
 * Support"), and it must be called once per page URL — it cannot be
 * batched with a post list. That's why this isn't wired into getAll(): for
 * a paginated list of posts, that would mean one extra HTTP request per
 * post on every page load, which breaks the zero-touch/no-surprises
 * promise this package makes.
 *
 * Returns null on any failure (endpoint disabled, network error, bad
 * response) so callers can safely fall back to `{ source: 'none' }`
 * instead of throwing.
 */
export async function fetchRankMathSeo(
  baseSiteUrl: string,
  pageUrl: string,
  options: { timeoutMs?: number; retries?: number } = {}
): Promise<SeoData | null> {
  const endpoint = `${baseSiteUrl.replace(/\/$/, '')}/wp-json/rankmath/v1/getHead?url=${encodeURIComponent(
    pageUrl
  )}`;

  try {
    const res = await fetchWithRetry(endpoint, {
      timeoutMs: options.timeoutMs ?? 5000,
      retries: options.retries ?? 0,
    });
    const json = (await res.json()) as RankMathGetHeadResponse;
    if (!json.success || !json.head) return null;

    return {
      title: extractTag(json.head, 'title'),
      description: extractMeta(json.head, 'description'),
      canonical: extractLinkHref(json.head, 'canonical'),
      ogImage: extractMeta(json.head, 'og:image'),
      jsonLd: extractJsonLd(json.head),
      source: 'rankmath',
    };
  } catch {
    return null;
  }
}
