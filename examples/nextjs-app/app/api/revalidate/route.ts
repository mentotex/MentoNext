import { verifyWebhookSecret } from 'mentonext';
import { wp } from '@/lib/wp';

/**
 * Bonus (not a .tsx page — a Route Handler): tests verifyWebhookSecret and
 * wp.clearCache(). Point WordPress's publish webhook at this route (see the
 * package README's "Cache invalidation via webhook" section for the
 * functions.php snippet), or just curl it yourself to see it work:
 *
 *   curl -X POST http://localhost:3000/api/revalidate \
 *     -H "X-Webhook-Secret: $WP_WEBHOOK_SECRET"
 *
 * Set WP_WEBHOOK_SECRET in adapter-test's .env.local before testing this —
 * there's no default, on purpose (a hardcoded fallback secret would defeat
 * the point of the check).
 */
export async function POST(request: Request) {
  const secret = request.headers.get('X-Webhook-Secret');
  const expected = process.env.WP_WEBHOOK_SECRET;

  if (!expected) {
    return new Response('WP_WEBHOOK_SECRET is not set on the server', { status: 500 });
  }
  if (!verifyWebhookSecret(secret, expected)) {
    return new Response('Unauthorized', { status: 401 });
  }

  await wp.clearCache();
  // If you've tagged requests with cache: { tags: [...] }, also call
  // revalidateTag from 'next/cache' here. On Next.js 16, it takes a
  // required second cacheLife-profile argument:
  //   revalidateTag('wp-posts', 'max');
  // On Next.js 15 and earlier, call it with just the tag instead:
  //   revalidateTag('wp-posts');

  return new Response('OK');
}
