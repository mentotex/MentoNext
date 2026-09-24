'use client';

import { use } from 'react';
import { useAuthor } from 'mentonext/react';

/**
 * Tests: useAuthor. This is a *Client* Component page, so `params` is
 * unwrapped with React's `use()` hook rather than `await` (a Client
 * Component's default export can't be `async`) — different from the
 * server-side app/posts/[slug]/page.tsx, deliberately, to show both
 * patterns side by side.
 */
export default function AuthorPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const { data: author, isLoading, error } = useAuthor(slug);

  return (
    <main style={{ maxWidth: 720, margin: '0 auto', padding: '2rem 1rem' }}>
      <p>
        <a href="/authors">&larr; All authors</a>
      </p>

      {isLoading && <p>Loading…</p>}
      {error && <p style={{ color: 'crimson' }}>Error: {error.message}</p>}

      {author && (
        <>
          <h1>{author.name}</h1>
          {author.avatarUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={author.avatarUrl}
              alt={author.name}
              width={64}
              height={64}
              style={{ borderRadius: '50%' }}
            />
          )}
          <p>{author.description || 'No bio.'}</p>
        </>
      )}
    </main>
  );
}
