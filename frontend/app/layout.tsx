import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from '@/components/ui/sonner';
import TopNav from '@/components/TopNav';
import { ThemeProvider } from '@/components/providers/ThemeProvider';
import { MissingFeedbackModal } from '@/components/missing-feedback-modal';
import { ScrollToTop } from '@/components/ScrollToTop';
import localFont from 'next/font/local';

const magilio = localFont({
  src: './fonts/MagilioRegular-8Mxvg.otf',
  variable: '--font-magilio',
  display: 'swap',
  preload: false,
});

const branch = localFont({
  src: './fonts/Branch.otf',
  variable: '--font-branch',
  display: 'swap',
  preload: false,
});

const outfit = localFont({
  src: [
    { path: './fonts/Outfit-Thin.otf', weight: '100', style: 'normal' },
    { path: './fonts/Outfit-Light.otf', weight: '300', style: 'normal' },
    { path: './fonts/Outfit-Regular.otf', weight: '400', style: 'normal' },
    { path: './fonts/Outfit-Medium.otf', weight: '500', style: 'normal' },
    { path: './fonts/Outfit-SemiBold.otf', weight: '600', style: 'normal' },
    { path: './fonts/Outfit-Bold.otf', weight: '700', style: 'normal' },
    { path: './fonts/Outfit-ExtraBold.otf', weight: '800', style: 'normal' },
    { path: './fonts/Outfit-Black.otf', weight: '900', style: 'normal' },
  ],
  variable: '--font-outfit',
  display: 'swap',
  preload: false,
});

const jetbrainsMono = localFont({
  src: [
    { path: './fonts/JetBrainsMono-Variable.ttf', style: 'normal' },
    { path: './fonts/JetBrainsMono-Italic-Variable.ttf', style: 'italic' },
  ],
  variable: '--font-jetbrains',
  display: 'swap',
  preload: false,
});

export const metadata: Metadata = {
  title: 'allure',
  description: 'Votre coach de course à pied intelligent - Suivi d\'entraînement avec IA',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body className={`antialiased ${magilio.variable} ${branch.variable} ${outfit.variable} ${jetbrainsMono.variable} font-sans`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <ScrollToTop />
          <TopNav />
          <main className="min-h-screen mt-6">
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
