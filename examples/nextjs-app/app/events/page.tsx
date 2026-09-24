'use client';

import Link from 'next/link';
import { useCustomPostType } from 'mentonext/react';

/**
 * Tests: useCustomPostType('events') — the `event` CPT registered by the
 * package's own docker/mu-plugins/mentonext-demo.php. If this comes
 * back empty or errors, check that mu-plugin is mounted and that
 * `wp post generate --post_type=event` ran during wp-init.sh.
 */
export default function EventsPage() {
  const { data, isLoading, error } = useCustomPostType('events');

  return (
    <main style={{ maxWidth: 720, margin: '0 auto', padding: '2rem 1rem' }}>
      <h1>Events (useCustomPostType hook)</h1>

      {isLoading && <p>Loading…</p>}
      {error && <p style={{ color: 'crimson' }}>Error: {error.message}</p>}

      {data && (
        <ul>
          {data.items.map((event) => (
            <li key={event.id}>
              <Link href={`/events/${event.slug}`}>{event.title}</Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
