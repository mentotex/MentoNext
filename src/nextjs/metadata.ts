import { SeoData } from '../types';

/**
 * A structural subset of Next.js's own `Metadata` type (from the `next`
 * package), covering just the fields this package can actually derive from
 * WordPress SEO data. Defined locally rather than imported so the core
 * package never needs `next` as a hard dependency (it's an optional peer
 * dependency, same as `react`) — the shape is compatible enough that
 * TypeScript accepts the return value wherever a real `Metadata` is
 * expected, structurally.
 */
export interface NextMetadataLike {
  title?: string;
  description?: string;
  alternates?: { canonical?: string };
  openGraph?: {
    title?: string;
    description?: string;
    url?: string;
    images?: string[];
  };
}

/**
 * Converts a post/page's normalized `seo` field into the shape Next.js's
 * App Router `generateMetadata()` expects, so you don't have to hand-map
 * Yoast/RankMath/AIOSEO's differently-shaped SEO data yourself:
 *
 * ```ts
 * // app/blog/[slug]/page.tsx
 * export async function generateMetadata({ params }): Promise<Metadata> {
 *   const post = await wp.getPostBySlug(params.slug);
 *   return toNextMetadata(post);
 * }
 * ```
 *
 * Only fields WordPress actually provided are set — an SEO plugin that
 * isn't installed/configured (source: 'none') returns `{}`, so Next.js
 * falls back to whatever metadata your layout already defines, rather than
 * this helper overwriting it with empty values.
 */
export function toNextMetadata(post: { seo: SeoData }): NextMetadataLike {
  const { seo } = post;
  const metadata: NextMetadataLike = {};

  if (seo.title) metadata.title = seo.title;
  if (seo.description) metadata.description = seo.description;
  if (seo.canonical) metadata.alternates = { canonical: seo.canonical };

  const hasOpenGraphData = Boolean(seo.title || seo.description || seo.canonical || seo.ogImage);
  if (hasOpenGraphData) {
    metadata.openGraph = {
      ...(seo.title && { title: seo.title }),
      ...(seo.description && { description: seo.description }),
      ...(seo.canonical && { url: seo.canonical }),
      ...(seo.ogImage && { images: [seo.ogImage] }),
    };
  }

  return metadata;
}

/**
 * JSON-LD (structured data / schema.org) has no equivalent field in
 * Next.js's `Metadata` API — it has to be rendered as a literal
 * `<script type="application/ld+json">` tag in the page body instead. This
 * returns ready-to-spread props for exactly that:
 *
 * ```tsx
 * export default async function Page({ params }) {
 *   const post = await wp.getPostBySlug(params.slug);
 *   const jsonLdProps = toJsonLdScriptProps(post);
 *   return (
 *     <>
 *       {jsonLdProps && <script {...jsonLdProps} />}
 *       <article>...</article>
 *     </>
 *   );
 * }
 * ```
 *
 * Returns `null` when the post has no `jsonLd` data (e.g. no SEO plugin, or
 * a plugin/version that doesn't expose a schema graph), so you can render
 * it conditionally without an extra null check on `post.seo.jsonLd` first.
 */
export function toJsonLdScriptProps(
  post: { seo: SeoData }
): { type: 'application/ld+json'; dangerouslySetInnerHTML: { __html: string } } | null {
  if (!post.seo.jsonLd || post.seo.jsonLd.length === 0) return null;
  return {
    type: 'application/ld+json',
    dangerouslySetInnerHTML: { __html: JSON.stringify(post.seo.jsonLd) },
  };
}
