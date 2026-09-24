import { createWPClient } from 'mentonext';

/**
 * Server-side singleton — import this from Server Components and Route
 * Handlers (app/posts/[slug]/page.tsx, app/api/revalidate/route.ts, etc.).
 *
 * Client Components use a *separate* instance instead, created inside
 * <WPProvider> (see app/providers.tsx) — React Context can't cross the
 * server/client boundary, so each side needs its own createWPClient() call.
 * Both read the same NEXT_PUBLIC_WP_URL so they point at the same site.
 */
export const wp = createWPClient({
  baseUrl: process.env.NEXT_PUBLIC_WP_URL ?? 'http://localhost:8080',
  cache: { ttlMs: 30_000 },
});
