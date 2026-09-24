'use client';

import { useMenu } from 'mentonext/react';
import type { WPMenuItem } from 'mentonext';

function MenuTree({ items }: { items: WPMenuItem[] }) {
  if (items.length === 0) return null;
  return (
    <ul>
      {items.map((item) => (
        <li key={item.id}>
          <a href={item.url} target={item.target || undefined}>
            {item.title}
          </a>
          <MenuTree items={item.children} />
        </li>
      ))}
    </ul>
  );
}

/**
 * Tests: useMenu('primary') + the WPMenuAccessError path. The docker
 * demo's mu-plugin registers the 'primary' location and turns on
 * `rest_menu_read_access`, so this should work out of the box against the
 * Compose stack. If you point this at a different WordPress site that
 * hasn't enabled that filter, you should see the WPMenuAccessError message
 * below instead of a generic network error.
 */
export default function MenuPage() {
  const { data, isLoading, error } = useMenu('primary');

  return (
    <main style={{ maxWidth: 720, margin: '0 auto', padding: '2rem 1rem' }}>
      <h1>Primary menu (useMenu hook)</h1>

      {isLoading && <p>Loading…</p>}
      {error && (
        <p style={{ color: 'crimson' }}>
          Error ({error.name}): {error.message}
        </p>
      )}
      {data && <MenuTree items={data} />}
    </main>
  );
}
