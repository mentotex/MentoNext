'use client';

import { useEffect } from 'react';

/**
 * Next.js's error boundary convention — a defensive fallback for any
 * unexpected render error in this route tree that reaches it.
 *
 * It is NOT how app/posts/[slug]/page.tsx and app/events/[slug]/page.tsx
 * handle a WordPress fetch failure (WordPress down, a WPInvalidResponseError
 * from a WAF/misconfigured response, a rate limit, etc.) — those routes
 * catch that themselves and render components/FetchError.tsx inline.
 * That's a deliberate workaround, not a style choice: both of those routes
 * define generateStaticParams, and in Next.js 16, an error thrown while
 * rendering an out-of-list slug on demand does not reach this boundary —
 * it serves a bare, unstyled 500 instead (verified with a minimal repro:
 * a generateStaticParams route throwing for an out-of-list param
 * reproducibly serves plain "Internal Server Error" text with no retry,
 * even on a repeat request, while the identical throw in a route with NO
 * generateStaticParams correctly lands here). So this boundary mainly
 * catches bugs elsewhere in the tree, not WordPress errors from those two
 * routes.
 *
 * IMPORTANT, verified behavior: Next.js only sends `error.name` and
 * `error.message` to the client in development. In a production build
 * (`next build && next start`), a Server Component error is redacted down
 * to *only* `error.digest` — `name` and `message` come through as
 * `undefined`, by design, so server-side error details never leak to
 * visitors. That's why the branch below checks `error.name` first rather
 * than assuming it's there: in production, it won't match, and the
 * fallback shows the digest instead — cross-reference that digest against
 * wherever `next start` itself is running to find out what actually
 * happened.
 *
 * Prop name, verified against this Next.js version's own docs (this
 * project's AGENTS.md warns training-data assumptions about Next.js APIs
 * can be wrong): Next.js 16.3 renamed the recovery callback from `reset`
 * to `retry` (stable as of 16.3.0; `reset` still works but the docs say to
 * prefer `retry`).
 */
export default function ErrorBoundary({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main style={{ maxWidth: 720, margin: '0 auto', padding: '2rem 1rem' }}>
      <h1>Something went wrong</h1>

      {error.name && error.message ? (
        <p style={{ color: 'crimson' }}>
          {error.name}: {error.message}
        </p>
      ) : (
        <p style={{ color: 'crimson' }}>
          An error occurred. Next.js only sends error details to the browser in
          development — this is a production build, so all that reached the client
          is a digest.{' '}
          {error.digest && (
            <>
              Look for <code>{error.digest}</code> in your server logs to see the
              real error.
            </>
          )}
        </p>
      )}

      <button onClick={() => retry()} style={{ marginTop: '1rem' }}>
        Try again
      </button>
    </main>
  );
}
