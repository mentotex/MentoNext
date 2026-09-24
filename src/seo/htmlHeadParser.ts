/**
 * Small regex-based extractors for a raw <head> HTML blob — used both for
 * RankMath's getHead endpoint (which returns exactly this) and as a shared
 * fallback if any SEO plugin embeds a similar raw-HTML field on the post
 * object directly.
 *
 * Deliberately not a full HTML parser (no DOM dependency in this package) —
 * good enough for well-formed head tags emitted by SEO plugins.
 */

export function extractTag(html: string, tag: string): string | undefined {
  const match = html.match(new RegExp(`<${tag}[^>]*>([^<]*)</${tag}>`, 'i'));
  return match?.[1];
}

export function extractMeta(html: string, nameOrProperty: string): string | undefined {
  const match = html.match(
    new RegExp(`<meta[^>]*(?:name|property)=["']${nameOrProperty}["'][^>]*content=["']([^"']*)["']`, 'i')
  );
  return match?.[1];
}

export function extractLinkHref(html: string, rel: string): string | undefined {
  const match = html.match(new RegExp(`<link[^>]*rel=["']${rel}["'][^>]*href=["']([^"']*)["']`, 'i'));
  return match?.[1];
}

export function extractJsonLd(html: string): unknown[] | undefined {
  const scripts = [
    ...html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi),
  ];
  if (!scripts.length) return undefined;

  const parsed = scripts
    .map((m) => {
      try {
        return JSON.parse(m[1]);
      } catch {
        return null;
      }
    })
    .filter((v) => v !== null);

  return parsed.length ? parsed : undefined;
}
