import { WPAuthor } from '../../types';

export function mapRawAuthor(raw: any): WPAuthor {
  const avatarUrls = raw.avatar_urls as Record<string, string> | undefined;
  // Prefer the largest commonly-available avatar size WP provides (96px),
  // fall back to whatever's there.
  const avatarUrl = avatarUrls?.['96'] ?? Object.values(avatarUrls ?? {})[0] ?? null;

  return {
    id: raw.id,
    name: raw.name ?? '',
    slug: raw.slug ?? '',
    description: raw.description ?? '',
    avatarUrl,
    link: raw.link ?? '',
  };
}

/**
 * WordPress embeds the post author as `_embedded.author` (an array with
 * exactly one item, or absent if the post has no _embed request or the
 * author's REST data isn't public) — unlike terms, there's no per-taxonomy
 * filtering needed here.
 */
export function extractEmbeddedAuthor(raw: any): WPAuthor | null {
  const author = raw._embedded?.author?.[0];
  return author ? mapRawAuthor(author) : null;
}
