'use client';

import { usePathname } from 'next/navigation';

const FULL_WIDTH_PAGES = ['/cinematic', '/'];

export function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isFullWidth = FULL_WIDTH_PAGES.includes(pathname);

  if (isFullWidth) {
    return <>{children}</>;
  }

  return (
    <main className="min-h-screen mt-6">
      <div className="container mx-auto p-8 max-w-7xl">
        {children}
      </div>
    </main>
  );
}
