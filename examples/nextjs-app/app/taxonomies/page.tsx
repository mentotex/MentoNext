'use client';

import { useCategories, useTags } from 'mentonext/react';

/** Tests: useCategories, useTags (both share the RestTermCollection code path). */
export default function TaxonomiesPage() {
  const categories = useCategories();
  const tags = useTags();

  return (
    <main style={{ maxWidth: 720, margin: '0 auto', padding: '2rem 1rem' }}>
      <h1>Taxonomies</h1>

      <section style={{ marginBottom: '2rem' }}>
        <h2>Categories (useCategories)</h2>
        {categories.isLoading && <p>Loading…</p>}
        {categories.error && <p style={{ color: 'crimson' }}>Error: {categories.error.message}</p>}
        <ul>
          {categories.data?.items.map((c) => (
            <li key={c.id}>
              {c.name} ({c.count})
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2>Tags (useTags)</h2>
        {tags.isLoading && <p>Loading…</p>}
        {tags.error && <p style={{ color: 'crimson' }}>Error: {tags.error.message}</p>}
        <ul>
          {tags.data?.items.map((t) => (
            <li key={t.id}>
              {t.name} ({t.count})
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
