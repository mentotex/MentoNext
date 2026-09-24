'use client';

import { useState, type FormEvent } from 'react';
import { useSearch } from 'mentonext/react';

/**
 * Tests: useSearch, WordPress's dedicated cross-post-type /wp/v2/search —
 * distinct from usePosts({ search }), which only searches posts.
 *
 * Note: the hook fires on every `query` change, including the initial
 * empty string on mount (documented behavior — see useSearch's doc
 * comment). This page only *renders* results once something has actually
 * been submitted, via the separate `submittedQuery` state, so you don't
 * see a confusing "results for nothing" flash.
 */
export default function SearchPage() {
  const [inputValue, setInputValue] = useState('');
  const [submittedQuery, setSubmittedQuery] = useState('');
  const { data, isLoading, error } = useSearch(submittedQuery);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmittedQuery(inputValue.trim());
  }

  return (
    <main style={{ maxWidth: 720, margin: '0 auto', padding: '2rem 1rem' }}>
      <h1>Search (useSearch hook)</h1>

      <form onSubmit={handleSubmit} style={{ marginBottom: '1rem' }}>
        <input
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="Search…"
          style={{ padding: '0.4rem', marginRight: '0.5rem' }}
        />
        <button type="submit">Search</button>
      </form>

      {isLoading && submittedQuery && <p>Searching…</p>}
      {error && <p style={{ color: 'crimson' }}>Error: {error.message}</p>}

      {data && submittedQuery && (
        <ul>
          {data.length === 0 && <li>No results for &quot;{submittedQuery}&quot;.</li>}
          {data.map((r) => (
            <li key={`${r.type}-${r.subtype}-${r.id}`}>
              <a href={r.url}>{r.title}</a> <small>({r.subtype})</small>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
