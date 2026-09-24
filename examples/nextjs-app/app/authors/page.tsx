'use client';

import Link from 'next/link';
import { useAuthors } from 'mentonext/react';

/**
 * Tests: useAuthors — wraps /wp/v2/users, which WordPress itself
 * pre-filters to only users with at least one published post.
 */
export default function AuthorsPage() {
  const { data, isLoading, error } = useAuthors();

  return (
    <main style={{ maxWidth: 720, margin: '0 auto', padding: '2rem 1rem' }}>
      <h1>Authors (useAuthors hook)</h1>

      {isLoading && <p>Loading…</p>}
      {error && <p style={{ color: 'crimson' }}>Error: {error.message}</p>}

      <ul>
        {data?.items.map((author) => (
          <li key={author.id}>
            <Link href={`/authors/${author.slug}`}>{author.name}</Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
