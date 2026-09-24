import { WPInvalidResponseError, WPNetworkError } from 'mentonext';

/**
 * Renders inline, in place of a page's normal content, for any WordPress
 * fetch failure that isn't a genuine 404 (see app/posts/[slug]/page.tsx and
 * app/events/[slug]/page.tsx, which call notFound() for a real
 * WPNotFoundError and render this for everything else instead).
 *
 * WHY THIS ISN'T JUST `throw err` + app/error.tsx (verified, not assumed):
 * both of those routes define generateStaticParams. In Next.js 16, when a
 * slug outside that list is requested, Next renders the page on demand as
 * part of its static-generation pipeline -- and confirmed with a minimal
 * repro app, an error THROWN during that on-demand render does NOT reach
 * the route's app/error.tsx boundary. The visitor gets a bare, unstyled
 * "Internal Server Error" with no retry button and no help text, even on
 * a second request for the same slug. The exact same throw in a route
 * with NO generateStaticParams (fully dynamic, no static params list)
 * correctly renders app/error.tsx -- so this is specific to on-demand
 * generation of an out-of-list static param, not a general Next.js 16
 * regression, and not a bug in mentonext's error types.
 *
 * The fix: catch the error in the page itself and return this component
 * instead of re-throwing. That makes it an ordinary successful render (the
 * page's own content just happens to be an error message) rather than a
 * failed static-generation attempt, so it always reaches the visitor.
 * app/error.tsx is kept as a defensive fallback for genuinely unexpected
 * render bugs elsewhere in the tree, not for these two routes' WordPress
 * fetch failures.
 */
export function FetchError({ error }: { error: unknown }) {
  const name = error instanceof Error ? error.name : 'Error';
  const message = error instanceof Error ? error.message : String(error);

  return (
    <main style={{ maxWidth: 720, margin: '0 auto', padding: '2rem 1rem' }}>
      <h1>Something went wrong</h1>

      <p style={{ color: 'crimson' }}>
        {name}: {message}
      </p>

      {error instanceof WPInvalidResponseError && (
        <p style={{ fontSize: '0.85rem', color: '#888' }}>
          WordPress returned a 2xx response that wasn&apos;t valid JSON — check
          for a firewall/security-plugin block page, a PHP warning printed
          before the JSON, or maintenance mode.
        </p>
      )}
      {error instanceof WPNetworkError && (
        <p style={{ fontSize: '0.85rem', color: '#888' }}>
          The request to WordPress never got a response — check that{' '}
          <code>NEXT_PUBLIC_WP_URL</code> in <code>.env.local</code> is correct
          and the site is actually reachable.
        </p>
      )}

      <p style={{ fontSize: '0.8rem', color: '#aaa' }}>
        Refreshing the page will retry the request.
      </p>
    </main>
  );
}
