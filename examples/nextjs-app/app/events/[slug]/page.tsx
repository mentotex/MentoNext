import { notFound } from 'next/navigation';
import { toStaticParams, WPNotFoundError } from 'mentonext';
import { wp } from '@/lib/wp';
import { FetchError } from '@/components/FetchError';

/**
 * Tests: generateStaticParams against a custom post type collection
 * directly (wp.customPostType('events') already has the getAll() shape
 * toStaticParams needs — no wrapper required, unlike wp.getPosts).
 */
export async function generateStaticParams() {
  return toStaticParams(wp.customPostType('events'));
}

export default async function EventPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  // Same distinction as app/posts/[slug]/page.tsx: only a real "this event
  // doesn't exist" (WPNotFoundError) should render Next's not-found page.
  // Anything else (WordPress down, misconfigured, etc.) renders inline via
  // <FetchError> instead of masquerading as a 404 -- and instead of
  // re-throwing to app/error.tsx, which a Next.js 16 quirk means this
  // generateStaticParams route can't reliably reach (see
  // components/FetchError.tsx).
  let event;
  try {
    event = await wp.customPostType('events').getBySlug(slug);
  } catch (err) {
    if (err instanceof WPNotFoundError) notFound();
    return <FetchError error={err} />;
  }

  return (
    <main style={{ maxWidth: 720, margin: '0 auto', padding: '2rem 1rem' }}>
      <p>
        <a href="/events">&larr; All events</a>
      </p>
      <h1>{event.title}</h1>
      <div dangerouslySetInnerHTML={{ __html: event.content }} />
    </main>
  );
}
