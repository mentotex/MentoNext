import Link from 'next/link';

/**
 * Rendered when a Server Component calls notFound() — which
 * app/posts/[slug]/page.tsx and app/events/[slug]/page.tsx now only do for
 * a genuine WPNotFoundError, not for any other failure (see app/error.tsx
 * for those). Next.js's file-convention name — must stay `not-found.tsx`.
 */
export default function NotFound() {
  return (
    <main style={{ maxWidth: 720, margin: '0 auto', padding: '2rem 1rem' }}>
      <h1>Not found</h1>
      <p>That post or event doesn&apos;t exist on this WordPress site.</p>
      <p>
        <Link href="/">&larr; Back home</Link>
      </p>
    </main>
  );
}
