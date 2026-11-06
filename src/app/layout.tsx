import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { Suspense } from 'react';
import { AuthGate } from '@/components/shell/auth';
import { FloatingTerminal } from '@/components/shell/floating-terminal';
import { Providers } from '@/components/shell/providers';
import { Sidebar } from '@/components/shell/sidebar';
import { TopBar } from '@/components/shell/top-bar';
import './globals.css';

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] });
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] });

export const metadata: Metadata = {
  title: { default: 'DARK AGI', template: '%s · DARK AGI' },
  description: 'Unified Windows-native AI cybersecurity engineering platform',
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="h-full">
        <Providers>
          {/* Sign-in / first-run setup until a session exists; the backend enforces every permission. */}
          <AuthGate>
            <div className="flex h-full flex-col">
              <TopBar />
              <div className="flex min-h-0 flex-1">
                <aside className="hidden w-56 shrink-0 border-r border-edge bg-panel md:block">
                  {/* usePathname suspends on fallback params (cacheComponents) — keep the shell prerenderable. */}
                  <Suspense fallback={null}>
                    <Sidebar />
                  </Suspense>
                </aside>
                <main className="min-w-0 flex-1 overflow-y-auto">{children}</main>
              </div>
            </div>
            <FloatingTerminal />
          </AuthGate>
        </Providers>
      </body>
    </html>
  );
}
