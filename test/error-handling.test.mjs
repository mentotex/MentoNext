// Tests for error-handling behavior that's easy to get wrong silently:
// a 2xx response whose body isn't actually JSON (a WAF challenge page, a
// PHP warning printed before the real output, a maintenance-mode page).
// Before this fix, `res.json()` was called with no try/catch, so this case
// leaked a raw native `SyntaxError` instead of one of the package's typed
// errors — this test exists specifically to make sure that regression
// can't come back unnoticed.
import { createWPClient, WPInvalidResponseError, WPApiError } from '../dist/index.mjs';

let passed = 0, failed = 0;
function check(label, ok) {
  console.log(`${ok ? '✅' : '❌'} ${label}`);
  ok ? passed++ : failed++;
}

const htmlChallengePage = '<html><head><title>Attention Required!</title></head><body>Just a moment...</body></html>';

// ============ getPosts() (paginated) hitting a non-JSON 200 response ============
{
  global.fetch = async () =>
    new Response(htmlChallengePage, {
      status: 200,
      headers: { 'Content-Type': 'text/html', 'X-WP-Total': '0', 'X-WP-TotalPages': '0' },
    });

  const wp = createWPClient({ baseUrl: 'https://example.com', cache: { ttlMs: false } });

  let caught;
  try {
    await wp.getPosts();
  } catch (err) {
    caught = err;
  }

  check('getPosts(): a non-JSON 200 response throws (does not silently return garbage)', caught !== undefined);
  check('getPosts(): throws WPInvalidResponseError specifically', caught instanceof WPInvalidResponseError);
  check('getPosts(): WPInvalidResponseError is also a WPApiError (catchable generically)', caught instanceof WPApiError);
  check('getPosts(): error is NOT a raw SyntaxError', caught?.name !== 'SyntaxError');
  check('getPosts(): message is actionable, not a native parser message', caught?.message.includes("isn't valid JSON") && !caught?.message.includes('Unexpected token'));
}

// ============ getPostBySlug() (single-item) hitting the same failure ============
{
  global.fetch = async () =>
    new Response(htmlChallengePage, {
      status: 200,
      headers: { 'Content-Type': 'text/html', 'X-WP-Total': '0', 'X-WP-TotalPages': '0' },
    });

  const wp = createWPClient({ baseUrl: 'https://example.com', cache: { ttlMs: false } });

  let caught;
  try {
    await wp.getPostBySlug('hello-world');
  } catch (err) {
    caught = err;
  }

  check('getPostBySlug(): also wraps a non-JSON response in WPInvalidResponseError', caught instanceof WPInvalidResponseError);
}

// ============ A genuinely valid JSON response still works (no false positives) ============
{
  global.fetch = async () =>
    new Response(JSON.stringify([]), {
      status: 200,
      headers: { 'X-WP-Total': '0', 'X-WP-TotalPages': '0' },
    });

  const wp = createWPClient({ baseUrl: 'https://example.com', cache: { ttlMs: false } });
  const result = await wp.getPosts();
  check('getPosts(): valid JSON still parses normally (no regression)', Array.isArray(result.items) && result.items.length === 0);
}

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
