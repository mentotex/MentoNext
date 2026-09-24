'use client';

import { usePages } from 'mentonext/react';

/**
 * Tests: usePages. Named "wp-pages" (not "pages") to avoid any confusion
 * with Next.js's own routing concepts — this route is just a plain segment.
 */
export default function WpPagesPage() {
  const { data, isLoading, error } = usePages();

  return (
    <main style={{ maxWidth: 720, margin: '0 auto', padding: '2rem 1rem' }}>
      <h1>Pages (usePages hook)</h1>

      {isLoading && <p>Loading…</p>}
      {error && <p style={{ color: 'crimson' }}>Error: {error.message}</p>}

      {data && (
        <ul>
          {data.items.map((page) => (
            <li key={page.id}>{page.title}</li>
          ))}
        </ul>
      )}
    </main>
  );
}
