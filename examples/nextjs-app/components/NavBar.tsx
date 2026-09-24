import Link from 'next/link';

const links = [
  { href: '/', label: 'Home' },
  { href: '/posts', label: 'Posts' },
  { href: '/wp-pages', label: 'Pages' },
  { href: '/events', label: 'Events (CPT)' },
  { href: '/taxonomies', label: 'Taxonomies' },
  { href: '/authors', label: 'Authors' },
  { href: '/menu', label: 'Menu' },
  { href: '/search', label: 'Search' },
];

export function NavBar() {
  return (
    <nav
      style={{
        display: 'flex',
        gap: '1rem',
        padding: '1rem',
        borderBottom: '1px solid #ddd',
        flexWrap: 'wrap',
        fontSize: '0.9rem',
      }}
    >
      {links.map((l) => (
        <Link key={l.href} href={l.href}>
          {l.label}
        </Link>
      ))}
    </nav>
  );
}
