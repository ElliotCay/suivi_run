import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from '@/components/ui/sonner';
import TopNav from '@/components/TopNav';
import { ThemeProvider } from '@/components/providers/ThemeProvider';
import { MissingFeedbackModal } from '@/components/missing-feedback-modal';

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
    <html lang="fr" suppressHydrationWarning>
      <body className="antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <TopNav />
          <main className="min-h-screen">
            <div className="container mx-auto p-8 max-w-7xl">
              {children}
            </div>
          </main>
          <Toaster />
          <MissingFeedbackModal />
        </ThemeProvider>
      </body>
    </html>
  );
}
