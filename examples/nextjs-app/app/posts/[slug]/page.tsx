import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getMediaUrl, toNextMetadata, toJsonLdScriptProps, toStaticParams, WPNotFoundError } from 'mentonext';
import { wp } from '@/lib/wp';
import { FetchError } from '@/components/FetchError';

/**
 * Tests (all server-side, core adapter — no React hooks involved):
 *   - getPostBySlug
 *   - generateStaticParams via toStaticParams (paginates the whole collection at build time)
 *   - generateMetadata via toNextMetadata (maps post.seo -> Next.js Metadata)
 *   - toJsonLdScriptProps (renders the SEO plugin's schema.org JSON-LD, if any)
 *   - getMediaUrl (featured image with a fallback size)
 *
 * Written for Next.js 15's async `params` (a Promise). If adapter-test is on
 * Next.js 14 or earlier, `params` is a plain object instead — drop the
 * `await` and the `Promise<...>` type below.
 */

export async function generateStaticParams() {
  return toStaticParams({ getAll: (p) => wp.getPosts(p) });
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  try {
    const post = await wp.getPostBySlug(slug);
    return toNextMetadata(post);
  } catch {
    return {};
  }
}

export default async function PostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  // Distinguish "this post doesn't exist" (a real 404 — Next.js's own
  // not-found page is the right response) from any other failure (the
  // WordPress site is down, misconfigured, rate-limiting us, etc.).
  //
  // The other failure is rendered here via <FetchError>, not re-thrown to
  // app/error.tsx: this route defines generateStaticParams, and in
  // Next.js 16 an error thrown while rendering an out-of-list slug on
  // demand does not reach the route's error boundary — it serves a bare,
  // unstyled 500 instead (verified with a minimal repro; see
  // components/FetchError.tsx for the full explanation).
  let post;
  try {
    post = await wp.getPostBySlug(slug);
  } catch (err) {
    if (err instanceof WPNotFoundError) notFound();
    return <FetchError error={err} />;
  }

  const jsonLd = toJsonLdScriptProps(post);
  const imageUrl = getMediaUrl(post.featuredMedia, 'medium_large');

  return (
    <main style={{ maxWidth: 720, margin: '0 auto', padding: '2rem 1rem' }}>
      {jsonLd && <script {...jsonLd} />}

      <p>
        <a href="/posts">&larr; All posts</a>
      </p>

      <h1>{post.title}</h1>
      <p style={{ color: '#666', fontSize: '0.9rem' }}>
        {new Date(post.date).toLocaleDateString()}
        {post.author && <> · by {post.author.name}</>}
      </p>

      {imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={imageUrl} alt={post.featuredMedia?.alt_text ?? ''} style={{ maxWidth: '100%' }} />
      )}

      <div dangerouslySetInnerHTML={{ __html: post.content }} />

      <hr />
      <div style={{ fontSize: '0.85rem', color: '#888' }}>
        <p>
          SEO source detected: <strong>{post.seo.source}</strong>
          {post.seo.title && <> — title: &quot;{post.seo.title}&quot;</>}
        </p>
        {/* Not every SEO plugin/response includes every field — RankMath's
            headless getHead response, for example, has no <title> tag at
            all (it expects the frontend to use the post's own title
            instead), so seo.title can legitimately be undefined even when
            seo.source isn't 'none'. Showing each field independently here
            makes that visible instead of the page looking "empty". */}
        {post.seo.description && <p>Description: &quot;{post.seo.description}&quot;</p>}
        {post.seo.canonical && <p>Canonical: {post.seo.canonical}</p>}
        {post.seo.ogImage && <p>OG image: {post.seo.ogImage}</p>}
        {post.seo.jsonLd && <p>JSON-LD: {post.seo.jsonLd.length} item(s) (rendered as a &lt;script&gt; tag above, view page source to see it)</p>}
      </div>
      {post.categoryTerms.length > 0 && (
        <p style={{ fontSize: '0.85rem', color: '#888' }}>
          Categories: {post.categoryTerms.map((c) => c.name).join(', ')}
        </p>
      )}
    </main>
  );
}
