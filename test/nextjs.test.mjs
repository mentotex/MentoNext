import { toNextMetadata, toJsonLdScriptProps, toStaticParams, createWPClient } from '../dist/index.mjs';

let passed = 0, failed = 0;
function check(label, ok) {
  console.log(`${ok ? '✅' : '❌'} ${label}`);
  ok ? passed++ : failed++;
}

// ============ toNextMetadata ============
{
  const post = {
    seo: {
      title: 'Hello World | My Site',
      description: 'A test post.',
      canonical: 'https://example.com/hello-world/',
      ogImage: 'https://example.com/image.jpg',
      jsonLd: [{ '@type': 'Article' }],
      source: 'yoast',
    },
  };
  const meta = toNextMetadata(post);
  check('toNextMetadata: title mapped', meta.title === 'Hello World | My Site');
  check('toNextMetadata: description mapped', meta.description === 'A test post.');
  check('toNextMetadata: canonical mapped to alternates.canonical', meta.alternates?.canonical === 'https://example.com/hello-world/');
  check('toNextMetadata: openGraph populated', meta.openGraph?.title === 'Hello World | My Site' && meta.openGraph?.images?.[0] === 'https://example.com/image.jpg');
}

{
  // source: 'none' — no SEO plugin data at all. Must return {} so Next.js's
  // layout-level metadata isn't clobbered with empty fields.
  const post = { seo: { source: 'none' } };
  const meta = toNextMetadata(post);
  check('toNextMetadata: no SEO data returns {} (no empty-field clobbering)', Object.keys(meta).length === 0);
}

// ============ toJsonLdScriptProps ============
{
  const post = { seo: { jsonLd: [{ '@type': 'Article', headline: 'Hi' }], source: 'yoast' } };
  const props = toJsonLdScriptProps(post);
  check('toJsonLdScriptProps: returns script props with correct type', props?.type === 'application/ld+json');
  check('toJsonLdScriptProps: __html is valid JSON matching the input', JSON.parse(props.dangerouslySetInnerHTML.__html)[0].headline === 'Hi');
}
{
  const post = { seo: { source: 'none' } };
  const props = toJsonLdScriptProps(post);
  check('toJsonLdScriptProps: returns null when no jsonLd present', props === null);
}

// ============ toStaticParams ============
{
  // Simulate a 250-item collection paginated at 100/page (3 pages: 100, 100, 50)
  const allSlugs = Array.from({ length: 250 }, (_, i) => `post-${i + 1}`);
  let fetchedPages = [];
  const fakeSource = {
    async getAll({ page, perPage }) {
      fetchedPages.push(page);
      const start = (page - 1) * perPage;
      const items = allSlugs.slice(start, start + perPage).map((slug) => ({ slug }));
      return { items, total: allSlugs.length, totalPages: Math.ceil(allSlugs.length / perPage), page };
    },
  };
  const params = await toStaticParams(fakeSource);
  check('toStaticParams: paginates through all pages (3 for 250 items @ 100/page)', fetchedPages.length === 3 && fetchedPages.join(',') === '1,2,3');
  check('toStaticParams: returns one params object per item, using default "slug" key', params.length === 250 && params[0].slug === 'post-1' && params[249].slug === 'post-250');
}

{
  // Custom param name (taxonomy term pages)
  const fakeSource = {
    async getAll() {
      return { items: [{ slug: 'fiction' }, { slug: 'non-fiction' }], total: 2, totalPages: 1, page: 1 };
    },
  };
  const params = await toStaticParams(fakeSource, { paramName: 'genre' });
  check('toStaticParams: honors a custom paramName', params[0].genre === 'fiction' && params[1].genre === 'non-fiction');
}

{
  // Empty collection shouldn't loop forever or throw
  const fakeSource = { async getAll() { return { items: [], total: 0, totalPages: 0, page: 1 }; } };
  const params = await toStaticParams(fakeSource);
  check('toStaticParams: empty collection returns [] without hanging', Array.isArray(params) && params.length === 0);
}

// ============ Sanity: toStaticParams works with the real customPostType() collection ============
{
  global.fetch = async (url) => {
    const u = String(url);
    if (u.includes('/wp/v2/events')) {
      return new Response(JSON.stringify([{ id: 1, slug: 'launch-party', date: '2026-01-01', modified: '2026-01-01', title: { rendered: 'Launch' }, excerpt: { rendered: '' }, content: { rendered: '' }, categories: [], tags: [] }]), {
        status: 200,
        headers: { 'X-WP-Total': '1', 'X-WP-TotalPages': '1' },
      });
    }
    throw new Error('Unexpected fetch: ' + u);
  };
  const wp = createWPClient({ baseUrl: 'https://example.com', cache: { ttlMs: false } });
  const params = await toStaticParams(wp.customPostType('events'));
  check('toStaticParams: works directly with a real customPostType() collection', params.length === 1 && params[0].slug === 'launch-party');
}

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
