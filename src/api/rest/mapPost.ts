import { WPPost, SanitizeOptions, OutputOptions } from '../../types';
import { normalizeSeo } from '../../seo/normalize';
import { extractEmbeddedTerms } from './mapTerm';
import { extractEmbeddedAuthor } from './mapAuthor';
import { sanitizeHtml, sanitizeText } from '../../utils/sanitize';

/**
 * Maps a raw WordPress REST API item into a typed WPPost. Despite the name,
 * this works for posts, pages, and custom post types alike — they all share
 * the same underlying REST shape (title, content, excerpt, featured media).
 * `content` and `excerpt` are HTML-sanitized; `title` has all markup stripped.
 */
export function mapRawPost(
  raw: any,
  sanitizeOptions?: SanitizeOptions | false,
  outputOptions?: OutputOptions
): WPPost {
  const media = raw._embedded?.['wp:featuredmedia']?.[0];

  const post: WPPost = {
    id: raw.id,
    slug: raw.slug,
    date: raw.date,
    modified: raw.modified,
    title: sanitizeText(raw.title?.rendered ?? ''),
    excerpt: sanitizeHtml(raw.excerpt?.rendered ?? '', sanitizeOptions),
    content: sanitizeHtml(raw.content?.rendered ?? '', sanitizeOptions),
    featuredMedia: media
      ? {
          id: media.id,
          source_url: media.source_url,
          alt_text: media.alt_text ?? '',
          sizes: media.media_details?.sizes ?? {},
        }
      : null,
    categories: raw.categories ?? [],
    tags: raw.tags ?? [],
    categoryTerms: extractEmbeddedTerms(raw, 'category'),
    tagTerms: extractEmbeddedTerms(raw, 'post_tag'),
    author: extractEmbeddedAuthor(raw),
    seo: normalizeSeo(raw),
    raw,
  };

  if (outputOptions?.includeRaw === false) {
    post.raw = undefined;
  }

  return post;
}
