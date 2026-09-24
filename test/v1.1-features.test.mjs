import { createWPClient, WPMenuAccessError, WPApiError } from '../dist/index.mjs';

let passed = 0, failed = 0;
function check(label, ok) {
  console.log(`${ok ? '✅' : '❌'} ${label}`);
  ok ? passed++ : failed++;
}

// ============ Fixtures ============
const rawPostWithAuthor = {
  id: 1,
  slug: 'hello-world',
  link: 'https://example.com/hello-world/',
  date: '2026-01-01T00:00:00',
  modified: '2026-01-01T00:00:00',
  title: { rendered: 'Hello World' },
  excerpt: { rendered: '<p>Excerpt</p>' },
  content: { rendered: '<p>Content</p>' },
  categories: [],
  tags: [],
  _embedded: {
    author: [{ id: 5, name: 'Jane Doe', slug: 'jane', description: 'Writer', avatar_urls: { '96': 'https://example.com/avatar.jpg' }, link: 'https://example.com/author/jane/' }],
  },
};

function makeFetchMock(handlers) {
  return async (url) => {
    const u = String(url);
    for (const [match, handler] of handlers) {
      if (u.includes(match)) return handler(u);
    }
    throw new Error('Unexpected fetch: ' + u);
  };
}

const jsonRes = (body, init = {}) => new Response(JSON.stringify(body), { status: 200, ...init });

// ============ Test 1: Author extraction from embedded post data ============
{
  global.fetch = makeFetchMock([
    ['/wp/v2/posts', () => jsonRes([rawPostWithAuthor], { headers: { 'X-WP-Total': '1', 'X-WP-TotalPages': '1' } })],
  ]);
  const wp = createWPClient({ baseUrl: 'https://example.com', cache: { ttlMs: false } });
  const post = await wp.getPostBySlug('hello-world');
  check('Embedded author extracted onto post.author', post.author?.name === 'Jane Doe');
  check('Author avatarUrl parsed from avatar_urls[96]', post.author?.avatarUrl === 'https://example.com/avatar.jpg');
}

// ============ Test 2: getAuthors / getAuthorBySlug (/wp/v2/users) ============
{
  const rawUser = { id: 5, name: 'Jane Doe', slug: 'jane', description: 'Writer', avatar_urls: { '96': 'https://example.com/avatar.jpg' }, link: 'https://example.com/author/jane/' };
  let calledUrl = null;
  global.fetch = makeFetchMock([
    ['/wp/v2/users', (u) => { calledUrl = u; return jsonRes([rawUser], { headers: { 'X-WP-Total': '1', 'X-WP-TotalPages': '1' } }); }],
  ]);
  const wp = createWPClient({ baseUrl: 'https://example.com', cache: { ttlMs: false } });
  const author = await wp.getAuthorBySlug('jane');
  check('getAuthorBySlug hits /wp/v2/users', calledUrl?.includes('/wp/v2/users'));
  check('getAuthorBySlug returns mapped WPAuthor', author.name === 'Jane Doe' && author.slug === 'jane');
}

// ============ Test 3: getMenu() by location name — full flow ============
{
  const locations = { primary: { name: 'Primary', description: '', menu: 7 } };
  const menuItems = [
    { id: 1, title: { rendered: 'Home' }, url: '/', parent: 0, menu_order: 1, target: '', classes: [] },
    { id: 2, title: { rendered: 'About' }, url: '/about', parent: 0, menu_order: 2, target: '', classes: [] },
    { id: 3, title: { rendered: 'Team' }, url: '/about/team', parent: 2, menu_order: 1, target: '', classes: [] },
  ];
  let sawMenusParam = false;
  global.fetch = makeFetchMock([
    ['/wp/v2/menu-locations', () => jsonRes(locations)],
    ['/wp/v2/menu-items', (u) => { sawMenusParam = u.includes('menus=7'); return jsonRes(menuItems); }],
  ]);
  const wp = createWPClient({ baseUrl: 'https://example.com', cache: { ttlMs: false } });
  const menu = await wp.getMenu('primary');
  check('getMenu resolves location name to menu ID and filters menu-items by it', sawMenusParam);
  check('getMenu returns top-level items sorted by order', menu.length === 2 && menu[0].title === 'Home' && menu[1].title === 'About');
  check('getMenu nests child items under their parent', menu[1].children.length === 1 && menu[1].children[0].title === 'Team');
}

// ============ Test 4: getMenu() — WordPress blocks it (no rest_menu_read_access filter) ============
{
  global.fetch = makeFetchMock([
    ['/wp/v2/menu-locations', () => new Response('Unauthorized', { status: 401 })],
  ]);
  const wp = createWPClient({ baseUrl: 'https://example.com', cache: { ttlMs: false } });
  let caughtCorrectError = false;
  try {
    await wp.getMenu('primary');
  } catch (err) {
    caughtCorrectError = err instanceof WPMenuAccessError;
  }
  check('getMenu throws WPMenuAccessError when WordPress returns 401 (filter not enabled)', caughtCorrectError);
}

// ============ Test 5: search() (/wp/v2/search) ============
{
  const rawResults = [
    { id: 10, title: 'Matching Post', url: 'https://example.com/matching-post/', type: 'post', subtype: 'post' },
  ];
  let calledUrl = null;
  global.fetch = makeFetchMock([
    ['/wp/v2/search', (u) => { calledUrl = u; return jsonRes(rawResults); }],
  ]);
  const wp = createWPClient({ baseUrl: 'https://example.com', cache: { ttlMs: false } });
  const results = await wp.search('matching');
  check('search() hits /wp/v2/search with the query', calledUrl?.includes('search=matching'));
  check('search() returns mapped results', results.length === 1 && results[0].title === 'Matching Post');
}

// ============ Test 6: Field allowlisting (_fields) + includeRaw:false ============
{
  let calledUrl = null;
  global.fetch = makeFetchMock([
    ['/wp/v2/posts', (u) => { calledUrl = u; return jsonRes([rawPostWithAuthor], { headers: { 'X-WP-Total': '1', 'X-WP-TotalPages': '1' } }); }],
  ]);
  const wp = createWPClient({
    baseUrl: 'https://example.com',
    cache: { ttlMs: false },
    output: { fields: ['id', 'slug', 'title'], includeRaw: false },
  });
  const post = await wp.getPostBySlug('hello-world');
  check('output.fields appends _fields param to the request URL', calledUrl?.includes('_fields=id%2Cslug%2Ctitle') || calledUrl?.includes('_fields=id,slug,title'));
  check('output.includeRaw:false strips the raw field', post.raw === undefined);
}

// ============ Test 7: Request deduplication (concurrent identical calls = 1 fetch) ============
{
  let fetchCallCount = 0;
  global.fetch = async (url) => {
    fetchCallCount++;
    await new Promise((r) => setTimeout(r, 20)); // simulate real network latency
    return jsonRes([rawPostWithAuthor], { headers: { 'X-WP-Total': '1', 'X-WP-TotalPages': '1' } });
  };
  const wp = createWPClient({ baseUrl: 'https://example.com', cache: { ttlMs: false } });
  const [a, b] = await Promise.all([wp.getPosts({ perPage: 5 }), wp.getPosts({ perPage: 5 })]);
  check('Two concurrent identical getPosts() calls trigger exactly 1 fetch', fetchCallCount === 1);
  check('Both concurrent callers receive the same resolved data', a.items[0].id === b.items[0].id);
}

// ============ Test 8: Stale-while-revalidate ============
{
  let fetchCallCount = 0;
  let currentTitle = 'First Title';
  global.fetch = async () => {
    fetchCallCount++;
    return jsonRes(
      [{ ...rawPostWithAuthor, title: { rendered: currentTitle } }],
      { headers: { 'X-WP-Total': '1', 'X-WP-TotalPages': '1' } }
    );
  };
  const wp = createWPClient({
    baseUrl: 'https://example.com',
    cache: { ttlMs: 20, staleWhileRevalidate: true },
  });

  const first = await wp.getPostBySlug('hello-world');
  check('SWR: first call fetches fresh data', fetchCallCount === 1 && first.title === 'First Title');

  await new Promise((r) => setTimeout(r, 40)); // let the entry go stale
  currentTitle = 'Second Title'; // simulate WordPress content changing

  const second = await wp.getPostBySlug('hello-world');
  check('SWR: stale read returns OLD value immediately (does not block on refetch)', second.title === 'First Title');

  await new Promise((r) => setTimeout(r, 10)); // let the background refresh complete, well inside the 20ms TTL to avoid re-triggering staleness
  check('SWR: exactly 2 real fetches happened (initial + 1 background refresh)', fetchCallCount === 2);

  const third = await wp.getPostBySlug('hello-world');
  check('SWR: after background refresh completes, next read gets NEW value', third.title === 'Second Title');
}

// ============ Test 9: Custom CacheStore injection ============
{
  let storeGetCalls = 0, storeSetCalls = 0, storeClearCalls = 0;
  const customStore = {
    map: new Map(),
    get(key) { storeGetCalls++; return this.map.get(key); },
    set(key, value) { storeSetCalls++; this.map.set(key, value); },
    clear() { storeClearCalls++; this.map.clear(); },
  };
  global.fetch = makeFetchMock([
    ['/wp/v2/posts', () => jsonRes([rawPostWithAuthor], { headers: { 'X-WP-Total': '1', 'X-WP-TotalPages': '1' } })],
  ]);
  const wp = createWPClient({ baseUrl: 'https://example.com', cache: { store: customStore } });
  await wp.getPostBySlug('hello-world');
  check('Custom CacheStore.get() was used', storeGetCalls > 0);
  check('Custom CacheStore.set() was used', storeSetCalls > 0);
  await wp.clearCache();
  check('wp.clearCache() calls the custom store\'s clear()', storeClearCalls === 1);
}

// ============ Test 10: 429 honors Retry-After header (faster than exponential backoff) ============
{
  let attempt = 0;
  global.fetch = async () => {
    attempt++;
    if (attempt === 1) {
      return new Response('Too Many Requests', { status: 429, headers: { 'Retry-After': '0' } });
    }
    return jsonRes([rawPostWithAuthor], { headers: { 'X-WP-Total': '1', 'X-WP-TotalPages': '1' } });
  };
  const wp = createWPClient({ baseUrl: 'https://example.com', cache: { ttlMs: false }, retries: 2 });
  const start = Date.now();
  await wp.getPostBySlug('hello-world');
  const elapsed = Date.now() - start;
  check(`429 with Retry-After:0 resolves quickly (${elapsed}ms, well under the ~300ms exponential-backoff floor)`, elapsed < 250);
}

// ============ Test 11: Yoast HTML fallback (yoast_head without yoast_head_json) ============
{
  const yoastHtml = '<title>Old Yoast Title</title><meta name="description" content="Old Yoast desc."><link rel="canonical" href="https://example.com/hello-world/"><meta property="og:image" content="https://example.com/img.jpg">';
  const rawPostOldYoast = { ...rawPostWithAuthor, yoast_head: yoastHtml };
  global.fetch = makeFetchMock([
    ['/wp/v2/posts', () => jsonRes([rawPostOldYoast], { headers: { 'X-WP-Total': '1', 'X-WP-TotalPages': '1' } })],
  ]);
  const wp = createWPClient({ baseUrl: 'https://example.com', cache: { ttlMs: false } });
  const post = await wp.getPostBySlug('hello-world');
  check('Pre-16.7 Yoast (yoast_head only) parsed via HTML fallback', post.seo.source === 'yoast' && post.seo.title === 'Old Yoast Title');
  check('Yoast HTML fallback parses description correctly', post.seo.description === 'Old Yoast desc.');
}

// ============ Test 12: AIOSEO support ============
{
  const rawPostAioseo = {
    ...rawPostWithAuthor,
    aioseo_head_json: { title: 'AIOSEO Title', description: 'AIOSEO desc', canonical: 'https://example.com/hello-world/', og_image: 'https://example.com/aioseo.jpg', schema: { '@graph': [{ '@type': 'Article' }] } },
  };
  global.fetch = makeFetchMock([
    ['/wp/v2/posts', () => jsonRes([rawPostAioseo], { headers: { 'X-WP-Total': '1', 'X-WP-TotalPages': '1' } })],
  ]);
  const wp = createWPClient({ baseUrl: 'https://example.com', cache: { ttlMs: false } });
  const post = await wp.getPostBySlug('hello-world');
  check('AIOSEO detected and normalized', post.seo.source === 'aioseo' && post.seo.title === 'AIOSEO Title');
  check('AIOSEO og_image (string form) parsed correctly', post.seo.ogImage === 'https://example.com/aioseo.jpg');
  check('AIOSEO jsonLd parsed correctly', Array.isArray(post.seo.jsonLd) && post.seo.jsonLd[0]['@type'] === 'Article');
}

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
