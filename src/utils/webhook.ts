import { timingSafeEqual } from 'node:crypto';

/**
 * Constant-time comparison of a webhook's shared secret against the value
 * you expect, so a naive `provided === expected` check (which returns
 * faster on an early mismatching byte) can't be used as a timing
 * side-channel to guess the secret one byte at a time.
 *
 * Framework-agnostic on purpose: you pull the provided secret out of
 * whatever the webhook sender uses (a header, a query param) and pass both
 * strings in — this doesn't know or care about `Request`/`Headers` shapes.
 *
 * Node.js-only (uses `node:crypto`) — call this from a Next.js Route
 * Handler on the default Node.js runtime, not one set to
 * `export const runtime = 'edge'`.
 */
export function verifyWebhookSecret(provided: string | null | undefined, expected: string): boolean {
  if (!provided) return false;

  const providedBuf = Buffer.from(provided);
  const expectedBuf = Buffer.from(expected);

  // timingSafeEqual throws on mismatched lengths rather than returning
  // false, so the length check has to happen first. This is fine: a length
  // mismatch is not itself a meaningful timing signal (secrets are a fixed,
  // known length in practice), it's a precondition of the constant-time
  // comparison that follows.
  if (providedBuf.length !== expectedBuf.length) return false;

  return timingSafeEqual(providedBuf, expectedBuf);
}
