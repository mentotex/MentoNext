import Link from 'next/link';

const routes: { href: string; label: string; tests: string }[] = [
  { href: '/posts', label: 'Posts', tests: 'usePosts (client) + getPostBySlug/generateMetadata/generateStaticParams (server)' },
  { href: '/wp-pages', label: 'Pages', tests: 'usePages' },
  { href: '/events', label: 'Events (custom post type)', tests: 'useCustomPostType + generateStaticParams on a CPT' },
  { href: '/taxonomies', label: 'Categories & Tags', tests: 'useCategories, useTags' },
  { href: '/authors', label: 'Authors', tests: 'useAuthors, useAuthor' },
  { href: '/menu', label: 'Nav menu', tests: 'useMenu + WPMenuAccessError handling' },
  { href: '/search', label: 'Search', tests: 'useSearch' },
];

export default function Home() {
  return (
    <main style={{ maxWidth: 720, margin: '0 auto', padding: '2rem 1rem' }}>
      <h1>mentonext test pages</h1>
      <p>
        Each link below exercises a different part of the package against your
        Docker WordPress instance (<code>http://localhost:8080</code> by default).
      </p>
      <ul>
        {routes.map((r) => (
          <li key={r.href} style={{ marginBottom: '0.75rem' }}>
            <Link href={r.href}>
              <strong>{r.label}</strong>
            </Link>
            <div style={{ fontSize: '0.85rem', color: '#666' }}>{r.tests}</div>
          </li>
        ))}
      </ul>
    </main>
  );
}
