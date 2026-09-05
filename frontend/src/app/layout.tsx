import type { Metadata } from 'next';
import { AuthProvider } from '@/components/AuthProvider';
import { Nav } from '@/components/Nav';
import './globals.css';

export const metadata: Metadata = {
  title: 'Marketplace',
  description: 'Buy and sell products',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <Nav />
          <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
        </AuthProvider>
      </body>
    </html>
  );
}
