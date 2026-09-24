# mentonext

[![npm version](https://img.shields.io/npm/v/mentonext.svg)](https://www.npmjs.com/package/mentonext)
[![license](https://img.shields.io/npm/l/mentonext.svg)](./LICENSE)

Zero-config REST adapter for fetching WordPress content into Next.js — posts, pages, custom post types, taxonomies, authors, menus, and search, with built-in SEO normalization (Yoast/RankMath/AIOSEO), sanitization, pluggable caching, typed error handling, and React hooks.

A full runnable example exercising every feature against a real WordPress
site lives in [`examples/nextjs-app`](./examples/nextjs-app) — clone this
repo, `cd examples/nextjs-app`, and follow its README.

## Quickstart (server-side / core adapter)

```bash
npm install mentonext
```

Optionally, run the setup wizard — it checks your WordPress site is
reachable, detects whether Yoast/AIOSEO/RankMath-headless are already
active (by asking the live site, not by guessing), and writes a ready-to-use
config file:

```bash
npx mentonext init --url=https://your-wordpress-site.com
# or just `npx mentonext init` to be prompted for the URL
```

```ts
import wpConfig from './mentonext.config';
import { createWPClient } from 'mentonext';

const wp = createWPClient(wpConfig);
```

```ts
import { createWPClient, getMediaUrl } from 'mentonext';

const wp = createWPClient({ baseUrl: 'https://your-wordpress-site.com' });

const { items: posts, total, totalPages } = await wp.getPosts({ page: 1, perPage: 10 });
const post = await wp.getPostBySlug('hello-world');

const { items: pages } = await wp.getPages();
const events = wp.customPostType('events');
const genres = wp.taxonomy('genres', 'genre');

console.log(post.categoryTerms.map((t) => t.name)); // ['News', 'Updates']
const imageUrl = getMediaUrl(post.featuredMedia, 'medium_large');
console.log(post.seo.title, post.seo.description);

// Authors, menus, and site-wide search:
console.log(post.author?.name); // embedded automatically onto every post/page
const { items: authors } = await wp.getAuthors();
const menu = await wp.getMenu('primary'); // nested tree, sorted by order
const results = await wp.search('welcome');
```

The core adapter has zero React dependency — use it in Server Components,
API routes, `getStaticProps`/`getServerSideProps`, or plain Node scripts.

## React hooks (client components)

```tsx
'use client';
import { WPProvider, usePosts } from 'mentonext/react';

function App() {
  return (
    <WPProvider config={{ baseUrl: 'https://your-wordpress-site.com' }}>
      <PostList />
    </WPProvider>
  );
}

function PostList() {
  const { data, isLoading, error, refetch } = usePosts({ page: 1, perPage: 10 });
  if (isLoading) return <p>Loading…</p>;
  if (error) return <p>Error: {error.message}</p>;
  return <ul>{data!.items.map((post) => <li key={post.id}>{post.title}</li>)}</ul>;
}
```

Available hooks: `usePosts`, `usePost`, `usePages`, `usePage`,
`useCustomPostType`, `useCategories`, `useTags`, `useTaxonomy`, `useAuthors`,
`useAuthor`, `useMenu`, `useSearch`. All return
`{ data, error, isLoading, refetch }`.

### CORS (only relevant to the React hooks)

The core adapter (`usePosts` above being an exception — it runs in the
browser) makes its requests from Server Components, API routes, or plain
Node — server-to-server, so cross-origin rules never apply. The React hooks
are different: they call your WordPress site directly from the visitor's
browser, so the browser's CORS rules apply to every one of those requests.

**The good news: this usually works with zero WordPress-side configuration.**
WordPress's REST API sends permissive CORS headers
(`Access-Control-Allow-Origin`) by default for public, unauthenticated `GET`
requests — which is exactly what every hook in this package makes. WordPress
core deliberately doesn't restrict this by origin; it relies on nonces for
CSRF protection instead of strict CORS (see the [REST API
handbook](https://developer.wordpress.org/rest-api/frequently-asked-questions/)).
So in the common case, you can point `<WPProvider>` at a WordPress site you
don't control the server config of, and the hooks just work cross-origin.

This can still break in a few situations, and the symptom is always the
same unhelpful one: the browser's console shows a CORS error (or the
`fetch` inside a hook just rejects with a generic `TypeError: Failed to
fetch`, no further detail — that's the browser withholding the real reason
for security). Causes to check for:

- A security/hardening plugin (Wordfence, iThemes Security, etc.) or a
  "harden your REST API" tutorial the site once followed explicitly strips
  the default CORS headers.
- The host's own server config (Nginx/Apache/CDN layer) strips or overrides
  response headers before they reach the browser.
- You specifically want to **restrict** access to your own Next.js origin(s)
  only, rather than WordPress's default (any origin can read public data).

For any of these, add this to the WordPress site's `functions.php` (or a
must-use plugin) to explicitly allow just your origin(s):

```php
add_action('rest_api_init', function () {
    // Replace WordPress's default (permissive, any-origin) CORS handling
    // with one scoped to your known Next.js origins.
    remove_filter('rest_pre_serve_request', 'rest_send_cors_headers');
    add_filter('rest_pre_serve_request', function ($served) {
        $allowed_origins = [
            'https://your-nextjs-site.com',
            'http://localhost:3000', // remove in production
        ];
        $origin = get_http_origin();
        if ($origin && in_array($origin, $allowed_origins, true)) {
            header('Access-Control-Allow-Origin: ' . esc_url_raw($origin));
            header('Access-Control-Allow-Methods: GET');
            header('Vary: Origin');
        }
        return $served;
    });
}, 15);
```

This only needs to happen once, regardless of how many of this package's
endpoints (posts, menus, authors, search, RankMath's `getHead`) the hooks
end up calling — CORS is a per-origin, not a per-endpoint, policy.

## SEO normalization

Every post/page carries a normalized `seo` field:
```ts
interface SeoData {
  title?: string;
  description?: string;
  canonical?: string;
  ogImage?: string;
  jsonLd?: unknown[];
  source: 'yoast' | 'rankmath' | 'aioseo' | 'none';
}
```

**Yoast SEO** works automatically, zero config, on every version. Since
Yoast 14+ it embeds structured `yoast_head_json` directly into every
post/page REST response — no setting to enable, no extra request. On older
Yoast versions (pre-16.7) that don't have `yoast_head_json` yet, this
package automatically falls back to parsing the raw-HTML `yoast_head` field
that all versions provide, so the SEO data comes through either way without
you needing to know which version a given site runs.

**AIOSEO (All in One SEO)** works the same automatic way as Yoast — but
only when the site has AIOSEO's paid **REST API add-on** (Plus plan or
above) enabled, which is what actually embeds `aioseo_head_json`/
`aioseo_head` onto responses. Without that add-on, AIOSEO's data simply
isn't in the REST response at all, and this degrades quietly to
`{ source: 'none' }` — there's no free-plan equivalent to detect instead.

**RankMath works differently and needs one extra step**, both in WordPress
and in your config. Unlike Yoast, RankMath does **not** embed SEO data into
the standard `/wp/v2/posts` response. It exposes a separate endpoint
(`/wp-json/rankmath/v1/getHead?url=<page-url>`) that must be:

1. **Enabled on the WordPress site** — RankMath → General Settings →
   Others tab → **"Headless CMS Support"**. Off by default.
2. **Opted into on the client**, since it costs one extra HTTP request per
   post fetched:

```ts
const wp = createWPClient({
  baseUrl: 'https://your-wordpress-site.com',
  seo: { rankMathHeadless: true },
});

const post = await wp.getPostBySlug('hello-world'); // now includes RankMath SEO data
```

This only applies to **single-item fetches** (`getPostBySlug`,
`getPageBySlug`, `customPostType(...).getBySlug`) — never to
`getPosts`/`getAll` list results, because that would mean one extra request
*per item* on every paginated page load. If you need RankMath SEO data for
a list of posts, fetch it explicitly per item with the exported helper:

```ts
import { fetchRankMathSeo } from 'mentonext';

const seo = await fetchRankMathSeo('https://your-wordpress-site.com', post.raw.link as string);
```

If the endpoint isn't enabled, the request fails, or the site isn't using
RankMath at all, this degrades quietly to `{ source: 'none' }` rather than
throwing — it never breaks your page.

## Authors, menus, and search

**Authors** (`getAuthors`/`getAuthorBySlug`, `useAuthors`/`useAuthor`) wrap
`/wp/v2/users`, which is public by default but pre-filtered by WordPress
itself to only return users with at least one published post — a built-in
privacy safeguard this package doesn't need to reimplement. Every post/page
also carries its author embedded already (`post.author`), at no extra
request cost.

**Menus** (`getMenu(location)`, `useMenu(location)`) accept either a
registered theme location name (e.g. `'primary'`) or a numeric menu ID, and
return a nested tree (each item has a `children` array, sorted by menu
order). Unlike posts, **menu REST endpoints are not public by default**.
WordPress 6.8+ added an opt-in filter:

```php
add_filter('rest_menu_read_access', '__return_true');
```

Older WordPress versions have no built-in way to expose this at all without
a plugin or a custom REST permission callback. Without the filter enabled,
`getMenu`/`useMenu` throw/return a `WPMenuAccessError` (distinguishable from
"menu not found") with this same fix in its message, rather than a generic
network error. Fetches up to 100 items per menu in one request.

**Search** (`search(query, params?)`, `useSearch(query, params?)`) wraps
WordPress's dedicated cross-post-type search endpoint (`/wp/v2/search`) —
distinct from `getPosts({ search })`, which only searches posts. Restrict
to specific types with `params.subtype` (e.g. `['post', 'page']`).

## Field allowlisting & payload shaping

Two independent knobs for trimming what you get back, useful once a site
has large `content` fields or custom fields you don't want flowing further
up your stack:

```ts
const wp = createWPClient({
  baseUrl: 'https://your-wordpress-site.com',
  output: {
    fields: ['id', 'slug', 'title', 'excerpt'], // passed through as WP's own `_fields` param — WordPress sends less data over the wire
    includeRaw: false, // strips `post.raw` (the full unfiltered WP response) from returned objects — a request to this package, not to WordPress
  },
});
```

`fields` reduces what WordPress *sends*; `includeRaw` reduces what this
package *hands you* afterward. Note WordPress still includes certain fields
internally for some response shapes (e.g. `_links`) regardless of `_fields`.

## Next.js metadata & static params helpers

Two small zero-dependency helpers (no `next` import needed) for wiring
posts/pages into the App Router's conventions:

```ts
// app/blog/[slug]/page.tsx
import { toNextMetadata, toJsonLdScriptProps } from 'mentonext';

export async function generateMetadata({ params }) {
  const post = await wp.getPostBySlug(params.slug);
  return toNextMetadata(post); // maps post.seo -> Next.js's Metadata shape
}

export default async function Page({ params }) {
  const post = await wp.getPostBySlug(params.slug);
  const jsonLd = toJsonLdScriptProps(post); // JSON-LD has no Metadata field; it's a <script> tag
  return (
    <>
      {jsonLd && <script {...jsonLd} />}
      <article dangerouslySetInnerHTML={{ __html: post.content }} />
    </>
  );
}
```

`toNextMetadata` only sets fields WordPress actually provided — a post with
no SEO plugin configured (`source: 'none'`) returns `{}`, so it never
clobbers metadata your layout already defines with empty values.

```ts
// app/blog/[slug]/page.tsx
import { toStaticParams } from 'mentonext';

export async function generateStaticParams() {
  return toStaticParams({ getAll: (p) => wp.getPosts(p) });
}

// Works the same way for a custom post type or taxonomy:
export async function generateStaticParams() {
  return toStaticParams(wp.customPostType('events'));
}
export async function generateStaticParams() {
  return toStaticParams(wp.taxonomy('genres', 'genre'), { paramName: 'genre' });
}
```

`toStaticParams` paginates through the *entire* collection at build time
(WordPress's REST API caps `per_page` at 100, so e.g. a 350-item collection
means 4 build-time requests, not one) and maps each item's slug into the
params shape `generateStaticParams()` expects.

> **Next.js 16 gotcha (verified, not a mentonext bug):** if you only
> return a *subset* of slugs from `generateStaticParams` (e.g. the latest
> N posts) and someone requests a slug outside that list, Next.js renders
> it on demand — and if your page function throws during that on-demand
> render, the error does **not** reach `app/error.tsx`. The visitor gets a
> bare, unstyled "Internal Server Error" instead, even on a repeat
> request. The same throw in a route with no `generateStaticParams` at all
> correctly hits `error.tsx`, so this is specific to on-demand generation
> of an out-of-list static param. The fix is to catch the error inside the
> page itself and `return` fallback JSX instead of throwing/re-throwing —
> see `app/posts/[slug]/page.tsx` and `components/FetchError.tsx` in the
> test-pages bundle for a working example.

## Sanitization

`content` and `excerpt` are sanitized by default (safe tag/attribute allowlist,
`<script>` and `javascript:`/`data:` URLs stripped, links get `rel="noopener
noreferrer"`). `title` has all markup stripped. Customize or disable per client:

```ts
const wp = createWPClient({
  baseUrl: 'https://your-wordpress-site.com',
  sanitize: {
    allowedTags: ['p', 'a', 'strong', 'em'],
    allowedAttributes: { a: ['href'] },
  },
});
```

## Caching

```ts
const wp = createWPClient({
  baseUrl: 'https://your-wordpress-site.com',
  cache: { ttlMs: 30_000, revalidate: 3600, tags: ['wp-posts'] },
});

wp.clearCache(); // after a WordPress publish webhook fires
```

A few behaviors apply automatically, with no config needed:

- **Request deduplication** — two identical requests (same endpoint, same
  params) fired concurrently share a single in-flight fetch rather than
  hitting WordPress twice; both callers get the same resolved result.
- **429 (rate limit) handling** — a `429` response is retried honoring the
  server's `Retry-After` header (seconds or an HTTP-date, both supported),
  falling back to exponential backoff if the header is absent. Other 4xx
  responses (401, 403, ...) are never retried — they mean the request is
  wrong or not allowed, not that the server is temporarily busy, so
  retrying would just delay a real error for no benefit.

**Stale-while-revalidate**, opt-in, trades a slightly stale response for
consistently fast reads — a request past its TTL returns the cached value
immediately while a fresh fetch happens in the background for *next* time:

```ts
const wp = createWPClient({
  baseUrl: 'https://your-wordpress-site.com',
  cache: { ttlMs: 60_000, staleWhileRevalidate: true },
});
```

**Custom cache backend** — the default is a simple in-memory `Map`, which
doesn't survive across serverless invocations or get shared between
instances. Supply your own (Redis, Vercel KV/Upstash, ...) by implementing
the three-method `CacheStore` interface:

```ts
import type { CacheStore } from 'mentonext';

const redisStore: CacheStore = {
  get: (key) => redis.get(key).then((v) => (v ? JSON.parse(v) : undefined)),
  set: (key, value, ttlMs) => redis.set(key, JSON.stringify(value), 'PX', ttlMs).then(() => {}),
  clear: () => redis.flushdb().then(() => {}),
};

const wp = createWPClient({
  baseUrl: 'https://your-wordpress-site.com',
  cache: { store: redisStore },
});
```

## Cache invalidation via webhook

Rather than waiting out a TTL, you can have WordPress notify your Next.js
app the moment content changes, so it can invalidate its cache immediately
(both this package's own request cache and, separately, Next.js's own
ISR/fetch cache).

**1. WordPress side** — send a POST request on publish/update. There's no
built-in "webhook on save" feature in core WordPress, so add this to a
must-use plugin (or `functions.php`):

```php
add_action('transition_post_status', function ($new_status, $old_status, $post) {
    if ($new_status !== 'publish') return;

    wp_remote_post('https://your-nextjs-site.com/api/revalidate', [
        'headers' => ['Content-Type' => 'application/json', 'X-Webhook-Secret' => 'a-long-random-shared-secret'],
        'body'    => wp_json_encode(['postType' => $post->post_type, 'slug' => $post->post_name]),
        'timeout' => 5,
        'blocking' => false, // don't make the WP admin wait on your Next.js app responding
    ]);
}, 10, 3);
```

Generate the shared secret once (e.g. `openssl rand -hex 32`) and set it as
an environment variable on both sides — never hardcode it in the snippet
above for a real site.

**2. Next.js side** — a Route Handler that verifies the secret with
`verifyWebhookSecret` (constant-time, so the check itself can't be used to
guess the secret one byte at a time) before invalidating anything:

```ts
// app/api/revalidate/route.ts
import { revalidateTag } from 'next/cache';
import { verifyWebhookSecret } from 'mentonext';
import { wp } from '@/lib/wp'; // wherever you construct your createWPClient() instance

export async function POST(request: Request) {
  const secret = request.headers.get('X-Webhook-Secret');
  if (!verifyWebhookSecret(secret, process.env.WP_WEBHOOK_SECRET!)) {
    return new Response('Unauthorized', { status: 401 });
  }

  await wp.clearCache(); // this package's own in-memory (or custom CacheStore) cache

  // Next.js's own fetch cache, if you tagged requests with `cache: { tags: [...] }`.
  // As of Next.js 16, revalidateTag takes a required second `cacheLife`
  // profile argument: revalidateTag('wp-posts', 'max'). On Next.js 15 and
  // earlier, call it with just the tag: revalidateTag('wp-posts').
  revalidateTag('wp-posts', 'max');

  return new Response('OK');
}
```

`verifyWebhookSecret` uses `node:crypto`, so this route needs the default
Node.js runtime (don't set `export const runtime = 'edge'` on it).

## Local WordPress demo (Docker)

A `docker-compose.yml` under `docker/` spins up a real WordPress + MySQL
instance (with sample posts, an `event` custom post type, Yoast SEO active,
and a nav menu) for testing this package against real REST responses
instead of only mocked ones:

```bash
cd docker && docker compose up -d && ./wp-init.sh
```

See [`docker/README.md`](./docker/README.md) for details on what gets set
up and how it maps to each feature.

## Development & testing

```bash
npm install
npm test    # builds, then runs every test/*.test.mjs file against dist/
```

Tests are plain Node scripts (mocked `fetch`, and real `react-test-renderer`
mounts for the hooks) rather than a test-runner framework — chosen so every
check runs against the actual built output a consumer would import, not
just the TypeScript source. They exist because type-checking alone has
repeatedly missed real bugs during this package's development (an extra
React re-render, a retry loop hammering non-retryable 4xx errors, an IPv6
SSRF-guard bypass, a RankMath integration built on a wrong assumption about
its REST API) — each one only surfaced once an actual runtime check was
added. `npm run build` on its own is not a substitute for `npm test`.

## API reference

Full generated API docs (every exported function, hook, and type, with
their doc comments and examples):

```bash
npm run docs   # generates ./docs-api (open docs-api/index.html)
```

## Status

**Phase 1 (v1, complete)** — all must-haves:
- Posts, pages, and custom post types (shared `RestCollection`)
- Categories, tags, and custom taxonomies (shared `RestTermCollection`)
- SEO normalization: Yoast (automatic) and RankMath (opt-in, headless mode)
- HTML sanitization (safe by default, fully configurable)
- Media size helpers with fallback
- In-memory caching + Next.js fetch-cache passthrough
- React hooks under the `/react` subpath, with `<WPProvider>`

**v1.1 (complete)** — everything above, plus:
- Authors (`getAuthors`/`getAuthorBySlug`), embedded post authors, menus
  (`getMenu`, with the `WPMenuAccessError`/`rest_menu_read_access` handling
  above), and site-wide search (`search`)
- AIOSEO normalization, and a Yoast `yoast_head` HTML fallback for
  pre-16.7 sites without `yoast_head_json`
- Pluggable `CacheStore` interface (bring your own Redis/KV backend),
  opt-in stale-while-revalidate, automatic request deduplication, and
  `Retry-After`-aware 429 handling
- Field allowlisting (`output.fields`) and raw-payload stripping
  (`output.includeRaw`)
- `useAuthors`/`useAuthor`/`useMenu`/`useSearch` React hooks
- Next.js `generateMetadata`/`generateStaticParams` helpers
  (`toNextMetadata`, `toJsonLdScriptProps`, `toStaticParams`)
- Webhook cache-invalidation recipe + `verifyWebhookSecret` helper
- CORS documentation for the React hooks
- `npx mentonext init` setup wizard
- Local Docker Compose WordPress+MySQL demo environment (`docker/`)
- Generated Typedoc API reference (`npm run docs`)

**Roadmap**: a GraphQL adapter (second `WPDataSource` implementation, same
public interface), write operations (native WP comments, form submissions,
auth for private content), and a WooCommerce adapter as a separate package.

## Contributing

Issues and pull requests are welcome — please open an issue first for
anything beyond a small fix, so we can agree on the approach before you put
in the work. Run `npm test` before submitting a PR; it builds the package
and runs the full test suite.

## License

[MIT](./LICENSE) © Heshmat Bakhtiari
