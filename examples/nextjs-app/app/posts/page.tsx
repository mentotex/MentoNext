'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePosts } from 'mentonext/react';

/** Tests: usePosts (with pagination), post.categoryTerms, post.author embedding. */
export default function PostsPage() {
  const [page, setPage] = useState(1);
  const { data, isLoading, error, refetch } = usePosts({ page, perPage: 5 });

  return (
    <main style={{ maxWidth: 720, margin: '0 auto', padding: '2rem 1rem' }}>
      <h1>Posts (usePosts hook)</h1>

      {isLoading && <p>Loading…</p>}
      {error && (
        <p style={{ color: 'crimson' }}>
          Error: {error.message} <button onClick={() => refetch()}>Retry</button>
        </p>
      )}

      {data && (
        <>
          <ul>
            {data.items.map((post) => (
              <li key={post.id} style={{ marginBottom: '1rem' }}>
                <Link href={`/posts/${post.slug}`}>{post.title}</Link>
                <div
                  style={{ fontSize: '0.85rem', color: '#666' }}
                  dangerouslySetInnerHTML={{ __html: post.excerpt }}
                />
                {post.author && (
                  <div style={{ fontSize: '0.8rem', color: '#999' }}>by {post.author.name}</div>
                )}
                {post.categoryTerms.length > 0 && (
                  <div style={{ fontSize: '0.8rem', color: '#999' }}>
                    {post.categoryTerms.map((c) => c.name).join(', ')}
                  </div>
                )}
              </li>
            ))}
          </ul>

          <p>
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>
              &larr; Prev
            </button>{' '}
            Page {data.page} of {data.totalPages} ({data.total} total){' '}
            <button onClick={() => setPage((p) => p + 1)} disabled={page >= data.totalPages}>
              Next &rarr;
            </button>
          </p>
        </>
      )}
    </main>
  );
}
