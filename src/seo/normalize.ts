import { SeoData } from '../types';
import { extractTag, extractMeta, extractLinkHref, extractJsonLd } from './htmlHeadParser';

export function normalizeSeo(raw: Record<string, unknown>): SeoData {
  const yoastSeo = normalizeYoast(raw);
  if (yoastSeo) return yoastSeo;

  const aioseoSeo = normalizeAioseo(raw);
  if (aioseoSeo) return aioseoSeo;

  // Not RankMath's default behavior (see seo/rankmath.ts) — RankMath does
  // not embed this on the post object out of the box. This check only
  // helps sites where a custom bridge plugin or mu-plugin has added an
  // equivalent embedded field; harmless no-op everywhere else.
  const rankMath = raw.rank_math_head as string | undefined;
  if (rankMath) {
    return {
      title: extractTag(rankMath, 'title'),
      description: extractMeta(rankMath, 'description'),
      canonical: extractLinkHref(rankMath, 'canonical'),
      source: 'rankmath',
    };
  }

  return { source: 'none' };
}

function normalizeYoast(raw: Record<string, unknown>): SeoData | null {
  // Preferred path: yoast_head_json (structured), Yoast SEO 16.7+.
  const yoastJson = raw.yoast_head_json as Record<string, unknown> | undefined;
  if (yoastJson) {
    return {
      title: yoastJson.title as string | undefined,
      description: yoastJson.description as string | undefined,
      canonical: yoastJson.canonical as string | undefined,
      ogImage: extractOgImageFromYoastJson(yoastJson),
      jsonLd: (yoastJson.schema as { '@graph'?: unknown[] } | undefined)?.['@graph'],
      source: 'yoast',
    };
  }

  // Fallback path: yoast_head (raw HTML), present on ALL Yoast versions —
  // needed for sites running Yoast SEO older than 16.7, which don't have
  // the JSON field at all. Parsed with the same regex helpers used for
  // RankMath's HTML response, since it's the same kind of raw <head> blob.
  const yoastHtml = raw.yoast_head as string | undefined;
  if (yoastHtml) {
    return {
      title: extractTag(yoastHtml, 'title'),
      description: extractMeta(yoastHtml, 'description'),
      canonical: extractLinkHref(yoastHtml, 'canonical'),
      ogImage: extractMeta(yoastHtml, 'og:image'),
      jsonLd: extractJsonLd(yoastHtml),
      source: 'yoast',
    };
  }

  return null;
}

function extractOgImageFromYoastJson(yoast: Record<string, unknown>): string | undefined {
  const ogImage = yoast.og_image as Array<{ url?: string }> | undefined;
  return ogImage?.[0]?.url;
}

/**
 * AIOSEO (All in One SEO) embeds aioseo_head / aioseo_head_json the same
 * way Yoast does — but only when the site has AIOSEO's paid "REST API"
 * addon (Plus plan or above) enabled. On the free plan, or without the
 * addon, neither field exists and this returns null (falls through to
 * 'none'), same graceful-degrade pattern as everything else here.
 */
function normalizeAioseo(raw: Record<string, unknown>): SeoData | null {
  const aioseoJson = raw.aioseo_head_json as Record<string, unknown> | undefined;
  if (aioseoJson) {
    return {
      title: aioseoJson.title as string | undefined,
      description: aioseoJson.description as string | undefined,
      canonical: aioseoJson.canonical as string | undefined,
      ogImage: extractOgImageFromAioseoJson(aioseoJson),
      jsonLd: extractAioseoJsonLd(aioseoJson),
      source: 'aioseo',
    };
  }

  const aioseoHtml = raw.aioseo_head as string | undefined;
  if (aioseoHtml) {
    return {
      title: extractTag(aioseoHtml, 'title'),
      description: extractMeta(aioseoHtml, 'description'),
      canonical: extractLinkHref(aioseoHtml, 'canonical'),
      ogImage: extractMeta(aioseoHtml, 'og:image'),
      jsonLd: extractJsonLd(aioseoHtml),
      source: 'aioseo',
    };
  }

  return null;
}

function extractOgImageFromAioseoJson(aioseo: Record<string, unknown>): string | undefined {
  // AIOSEO's JSON field shape is less consistently documented publicly than
  // Yoast's; og_image may appear as a string URL or an array like Yoast's.
  const ogImage = aioseo.og_image;
  if (typeof ogImage === 'string') return ogImage;
  if (Array.isArray(ogImage)) return (ogImage[0] as { url?: string } | undefined)?.url;
  return undefined;
}

function extractAioseoJsonLd(aioseo: Record<string, unknown>): unknown[] | undefined {
  const schema = aioseo.schema as { '@graph'?: unknown[] } | unknown[] | undefined;
  if (!schema) return undefined;
  if (Array.isArray(schema)) return schema;
  return schema['@graph'];
}
