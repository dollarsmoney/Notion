import type { Metadata } from 'next';
import { AuthProvider } from '@/components/AuthProvider';
import { Nav } from '@/components/Nav';
import { Footer } from '@/components/Footer';
import './globals.css';

export const metadata: Metadata = {
  title: 'Marketplace',
  description: 'Buy and sell products, with payments verified through Paystack',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col">
        <AuthProvider>
          <Nav />
          <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">{children}</main>
          <Footer />
        </AuthProvider>
      </body>
    </html>
  );
}
