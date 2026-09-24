# mentonext example

A runnable Next.js App Router app, each page exercising a different part of
[`mentonext`](https://www.npmjs.com/package/mentonext) against a real
WordPress site — not mocked data.

## Setup

```bash
npm install
cp .env.local.example .env.local
```

Edit `.env.local` and point `NEXT_PUBLIC_WP_URL` at your own WordPress
site (or the repo's `../docker` demo stack — see the main README's
"Docker demo" section — which defaults to `http://localhost:8080`).

```bash
npm run dev
```

Open `http://localhost:3000`.

If you're testing against the `docker/` demo stack from the main repo,
start it first (`cd ../docker && docker compose up -d && ./wp-init.sh`) —
the events/menu pages specifically depend on its mu-plugin (`event` CPT +
`primary` menu location + `rest_menu_read_access`).

## What each route tests

| Route | Tests |
|---|---|
| `/` | Nothing itself — links to everything below |
| `/posts` | `usePosts` (client), pagination, embedded `post.author`/`post.categoryTerms` |
| `/posts/[slug]` | Server Component: `getPostBySlug`, `generateStaticParams`/`toStaticParams`, `generateMetadata`/`toNextMetadata`, `toJsonLdScriptProps`, `getMediaUrl`, and every `SeoData` field (source, title, description, canonical, OG image, JSON-LD) |
| `/wp-pages` | `usePages` |
| `/events` | `useCustomPostType('events')` (client) |
| `/events/[slug]` | Server Component: `generateStaticParams` against a CPT collection directly |
| `/taxonomies` | `useCategories`, `useTags` |
| `/authors` | `useAuthors` |
| `/authors/[slug]` | `useAuthor`, and the Client Component `params` pattern (`use()` instead of `await`) |
| `/menu` | `useMenu('primary')`, recursive tree rendering, `WPMenuAccessError` |
| `/search` | `useSearch`, cross-post-type search |
| `POST /api/revalidate` | Bonus Route Handler: `verifyWebhookSecret`, `wp.clearCache()` |

## Error handling

`/posts/[slug]` and `/events/[slug]` distinguish a real 404 (`WPNotFoundError`
→ `notFound()` → `app/not-found.tsx`) from any other failure — WordPress
down, a WAF returning HTML instead of JSON, a rate limit — which renders
`components/FetchError.tsx` inline instead. See that file's comment for why
it's rendered inline rather than thrown to `app/error.tsx`: both routes use
`generateStaticParams`, and Next.js doesn't route an error thrown during
on-demand rendering of an out-of-list param through the route's error
boundary the way it does for a fully dynamic route.

## Notes

- Every Client Component page treats `error` as a plain `Error` from the
  hook's `{ data, error, isLoading, refetch }` shape — no try/catch needed,
  since the hooks never throw.
- SEO/menu-access behavior depends on what's actually installed/configured
  on the WordPress site you point `NEXT_PUBLIC_WP_URL` at — see the main
  package README's "SEO normalization" and "Authors, menus, and search"
  sections for what to expect from each plugin/WordPress version.
- RankMath's SEO data needs `seo: { rankMathHeadless: true }` in `lib/wp.ts`
  *and* "Headless CMS Support" enabled in RankMath's WordPress settings —
  both are off by default. Yoast and AIOSEO need no config.
