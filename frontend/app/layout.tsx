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
});

const branch = localFont({
  src: './fonts/Branch.otf',
  variable: '--font-branch',
  display: 'swap',
});

const sonder = localFont({
  src: './fonts/Sonder.otf',
  variable: '--font-sonder',
  display: 'swap',
});

const casta = localFont({
  src: './fonts/Casta.otf',
  variable: '--font-casta',
  display: 'swap',
});

const kate = localFont({
  src: './fonts/Kate.otf',
  variable: '--font-kate',
  display: 'swap',
});

const kenoky = localFont({
  src: './fonts/Kenoky.ttf',
  variable: '--font-kenoky',
  display: 'swap',
});

const castaThinSlanted = localFont({
  src: './fonts/Casta-ThinSlanted.otf',
  variable: '--font-casta-thin-slanted',
  display: 'swap',
});

const kateBlack = localFont({
  src: './fonts/Kate-Black.otf',
  variable: '--font-kate-black',
  display: 'swap',
});

const kateDisplay = localFont({
  src: './fonts/Kate-Display.otf',
  variable: '--font-kate-display',
  display: 'swap',
});

const coffekan = localFont({
  src: './fonts/Coffekan.ttf',
  variable: '--font-coffekan',
  display: 'swap',
});

const flaviotte = localFont({
  src: './fonts/Flaviotte.otf',
  variable: '--font-flaviotte',
  display: 'swap',
});

const augeExtraLight = localFont({
  src: './fonts/Auge-ExtraLight.otf',
  variable: '--font-auge-extralight',
  display: 'swap',
});

const augeLight = localFont({
  src: './fonts/Auge-Light.otf',
  variable: '--font-auge-light',
  display: 'swap',
});

const augeRegular = localFont({
  src: './fonts/Auge-Regular.otf',
  variable: '--font-auge-regular',
  display: 'swap',
});

const augeSemiBold = localFont({
  src: './fonts/Auge-SemiBold.otf',
  variable: '--font-auge-semibold',
  display: 'swap',
});

const augeBold = localFont({
  src: './fonts/Auge-Bold.otf',
  variable: '--font-auge-bold',
  display: 'swap',
});

const augeExtraBold = localFont({
  src: './fonts/Auge-ExtraBold.otf',
  variable: '--font-auge-extrabold',
  display: 'swap',
});

const augeBlack = localFont({
  src: './fonts/Auge-Black.otf',
  variable: '--font-auge-black',
  display: 'swap',
});

const augeExtraBlack = localFont({
  src: './fonts/Auge-ExtraBlack.otf',
  variable: '--font-auge-extrablack',
  display: 'swap',
});

const bantayog = localFont({
  src: './fonts/Bantayog.otf',
  variable: '--font-bantayog',
  display: 'swap',
});

const behowled = localFont({
  src: './fonts/Behowled.otf',
  variable: '--font-behowled',
  display: 'swap',
});

const roundelay = localFont({
  src: './fonts/Roundelay.otf',
  variable: '--font-roundelay',
  display: 'swap',
});

const roundelayBold = localFont({
  src: './fonts/Roundelay-Bold.otf',
  variable: '--font-roundelay-bold',
  display: 'swap',
});

const roundelayExtraBold = localFont({
  src: './fonts/Roundelay-ExtraBold.otf',
  variable: '--font-roundelay-extrabold',
  display: 'swap',
});

const theMightiest = localFont({
  src: './fonts/TheMightiest.otf',
  variable: '--font-themightiest',
  display: 'swap',
});

const maghfirea = localFont({
  src: './fonts/Maghfirea.otf',
  variable: '--font-maghfirea',
  display: 'swap',
});

const mocka = localFont({
  src: './fonts/Mocka.otf',
  variable: '--font-mocka',
  display: 'swap',
});

const stanley = localFont({
  src: './fonts/Stanley.otf',
  variable: '--font-stanley',
  display: 'swap',
});

const outfitThin = localFont({
  src: './fonts/Outfit-Thin.otf',
  variable: '--font-outfit-thin',
  display: 'swap',
});

const outfitLight = localFont({
  src: './fonts/Outfit-Light.otf',
  variable: '--font-outfit-light',
  display: 'swap',
});

const outfitRegular = localFont({
  src: './fonts/Outfit-Regular.otf',
  variable: '--font-outfit-regular',
  display: 'swap',
});

const outfitMedium = localFont({
  src: './fonts/Outfit-Medium.otf',
  variable: '--font-outfit-medium',
  display: 'swap',
});

const outfitSemiBold = localFont({
  src: './fonts/Outfit-SemiBold.otf',
  variable: '--font-outfit-semibold',
  display: 'swap',
});

const outfitBold = localFont({
  src: './fonts/Outfit-Bold.otf',
  variable: '--font-outfit-bold',
  display: 'swap',
});

const outfitExtraBold = localFont({
  src: './fonts/Outfit-ExtraBold.otf',
  variable: '--font-outfit-extrabold',
  display: 'swap',
});

const outfitBlack = localFont({
  src: './fonts/Outfit-Black.otf',
  variable: '--font-outfit-black',
  display: 'swap',
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
      <body className={`antialiased ${magilio.variable} ${branch.variable} ${sonder.variable} ${casta.variable} ${kate.variable} ${kenoky.variable} ${castaThinSlanted.variable} ${kateBlack.variable} ${kateDisplay.variable} ${coffekan.variable} ${flaviotte.variable} ${augeExtraLight.variable} ${augeLight.variable} ${augeRegular.variable} ${augeSemiBold.variable} ${augeBold.variable} ${augeExtraBold.variable} ${augeBlack.variable} ${augeExtraBlack.variable} ${bantayog.variable} ${behowled.variable} ${roundelay.variable} ${roundelayBold.variable} ${roundelayExtraBold.variable} ${theMightiest.variable} ${maghfirea.variable} ${mocka.variable} ${stanley.variable} ${outfitThin.variable} ${outfitLight.variable} ${outfitRegular.variable} ${outfitMedium.variable} ${outfitSemiBold.variable} ${outfitBold.variable} ${outfitExtraBold.variable} ${outfitBlack.variable}`}>
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
