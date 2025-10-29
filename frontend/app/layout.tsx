import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from '@/components/ui/sonner';
import Navigation from '@/components/Navigation';

export const metadata: Metadata = {
  title: 'Suivi Course',
  description: 'Application de suivi d\'entraînement de course à pied',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body>
        <Navigation />
        <main>
          {children}
        </main>
        <Toaster />
      </body>
    </html>
  );
}
