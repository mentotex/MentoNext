'use client';

import type { ReactNode } from 'react';
import { WPProvider } from 'mentonext/react';

/**
 * Wrap your existing root layout's children with this once:
 *
 *   // app/layout.tsx
 *   import { Providers } from './providers';
 *   export default function RootLayout({ children }) {
 *     return (
 *       <html lang="en">
 *         <body>
 *           <Providers>{children}</Providers>
 *         </body>
 *       </html>
 *     );
 *   }
 *
 * If adapter-test already wraps everything in a <WPProvider> from earlier
 * testing, you don't need this file at all — just make sure whatever's
 * already there points at the same NEXT_PUBLIC_WP_URL as lib/wp.ts.
 */
export function Providers({ children }: { children: ReactNode }) {
  return (
    <WPProvider config={{ baseUrl: process.env.NEXT_PUBLIC_WP_URL ?? 'http://localhost:8080' }}>
      {children}
    </WPProvider>
  );
}
