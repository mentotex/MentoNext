// Mount-level tests for the v1.1 React hooks (useAuthors, useAuthor, useMenu,
// useSearch) against the built dist/react.mjs, mirroring the rigor used for
// usePosts in step 6: real react-test-renderer mounts + act(), not just
// type-checking, so we actually catch render-cycle/dependency-array bugs.
import React from 'react';
import { act, create } from 'react-test-renderer';
import { WPProvider, useAuthors, useAuthor, useMenu, useSearch } from '../dist/react.mjs';

let passed = 0, failed = 0;
function check(label, ok) {
  console.log(`${ok ? '✅' : '❌'} ${label}`);
  ok ? passed++ : failed++;
}

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

// Generic harness: mounts a hook inside WPProvider, captures every render's
// result onto `captured`, exposes a way to await settle + flush effects.
function mountHook(useHookFn) {
  const captured = [];
  function Harness() {
    const result = useHookFn();
    captured.push(result);
    return null;
  }
  let root;
  act(() => {
    root = create(React.createElement(WPProvider, { config: { baseUrl: 'https://example.com', cache: { ttlMs: false } } }, React.createElement(Harness)));
  });
  return { captured, root };
}

async function flush() {
  // let pending mocked-fetch promises resolve and their .then() setState calls
  // land inside act() so React doesn't warn and state is fully committed.
  await act(async () => {
    await new Promise((r) => setTimeout(r, 0));
  });
}

// ============ useAuthors / useAuthor ============
{
  const rawUser = { id: 5, name: 'Jane Doe', slug: 'jane', description: 'Writer', avatar_urls: { '96': 'https://example.com/avatar.jpg' }, link: 'https://example.com/author/jane/' };
  global.fetch = makeFetchMock([
    ['/wp/v2/users', () => jsonRes([rawUser], { headers: { 'X-WP-Total': '1', 'X-WP-TotalPages': '1' } })],
  ]);

  const { captured } = mountHook(() => useAuthors({ page: 1 }));
  check('useAuthors: first render is loading with no data', captured[0].isLoading === true && captured[0].data === undefined);

  await flush();
  const last = captured[captured.length - 1];
  check('useAuthors: settles with mapped author list', last.isLoading === false && last.data?.items?.[0]?.name === 'Jane Doe');
  check('useAuthors: exactly one render on data arrival (no extra-render bug)', captured.length === 2);
}

{
  const rawUser = { id: 5, name: 'Jane Doe', slug: 'jane', description: 'Writer', avatar_urls: { '96': 'https://example.com/avatar.jpg' }, link: 'https://example.com/author/jane/' };
  global.fetch = makeFetchMock([
    ['/wp/v2/users', () => jsonRes([rawUser], { headers: { 'X-WP-Total': '1', 'X-WP-TotalPages': '1' } })],
  ]);

  const { captured } = mountHook(() => useAuthor('jane'));
  await flush();
  const last = captured[captured.length - 1];
  check('useAuthor: settles with the single mapped author', last.data?.slug === 'jane' && last.data?.name === 'Jane Doe');
}

// ============ useMenu ============
{
  const locations = { primary: { name: 'Primary', description: '', menu: 7 } };
  const menuItems = [
    { id: 1, title: { rendered: 'Home' }, url: '/', parent: 0, menu_order: 1, target: '', classes: [] },
    { id: 2, title: { rendered: 'About' }, url: '/about', parent: 0, menu_order: 2, target: '', classes: [] },
  ];
  global.fetch = makeFetchMock([
    ['/wp/v2/menu-locations', () => jsonRes(locations)],
    ['/wp/v2/menu-items', () => jsonRes(menuItems)],
  ]);

  const { captured } = mountHook(() => useMenu('primary'));
  await flush();
  const last = captured[captured.length - 1];
  check('useMenu: settles with nested top-level menu items', last.data?.length === 2 && last.data[0].title === 'Home');
}

// ============ useSearch ============
{
  const rawResult = { id: 9, title: 'Hello World', url: 'https://example.com/hello-world/', type: 'post', subtype: 'post' };
  let sawQuery = false;
  global.fetch = makeFetchMock([
    ['/wp/v2/search', (u) => { sawQuery = u.includes('search=hello'); return jsonRes([rawResult]); }],
  ]);

  const { captured } = mountHook(() => useSearch('hello'));
  await flush();
  const last = captured[captured.length - 1];
  check('useSearch: request includes the query string', sawQuery);
  check('useSearch: settles with mapped results', last.data?.[0]?.title === 'Hello World');
}

// ============ useMenu: WPMenuAccessError surfaces through the hook as `error` ============
{
  global.fetch = makeFetchMock([
    ['/wp/v2/menu-locations', () => jsonRes({}, { status: 401 })],
  ]);

  const { captured } = mountHook(() => useMenu('primary'));
  await flush();
  const last = captured[captured.length - 1];
  check('useMenu: WordPress 401 (menu filter not enabled) surfaces as hook error, not a thrown/uncaught rejection', last.isLoading === false && last.error instanceof Error);
}

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
