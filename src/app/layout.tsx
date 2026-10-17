import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Header } from '@/components/layout/Header';
import { MobileBottomNav } from '@/components/layout/MobileBottomNav';
import { Footer } from '@/components/layout/Footer';
import { Toaster } from "@/components/ui/toaster";
import { GoogleAnalytics } from '@/components/analytics/GoogleAnalytics';
import { cn } from "@/lib/utils";

const inter = Inter({ variable: '--font-inter', subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'NyumbaFinder | Find a Rental Home in Kenya',
  description: 'Find rental homes in Kenya by location, property type, budget and nearby places.',
  metadataBase: new URL('https://www.nyumba-finder.com'),
  alternates: { canonical: '/' },
  icons: {
    icon: [{ url: '/favicon.svg?v=3', type: 'image/svg+xml' }],
    shortcut: '/favicon.svg?v=3',
    apple: '/favicon.svg?v=3',
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="h-full" suppressHydrationWarning>
      <body className={cn("min-h-full font-sans antialiased", inter.variable)}>
        <div className="flex min-h-screen min-w-0 flex-col overflow-x-clip">
          <Header />
          <main className="min-w-0 flex-1 pb-20 md:pb-0">
            <div className="container mx-auto min-w-0 px-2 sm:px-4 md:px-6">{children}</div>
          </main>
          <Footer />
          <MobileBottomNav />
        </div>
        <GoogleAnalytics />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'Organization',
              name: 'NyumbaFinder',
              url: 'https://www.nyumba-finder.com',
              logo: 'https://www.nyumba-finder.com/nyumbafinder-logo.svg',
            }),
          }}
        />
        <Toaster />
      </body>
    </html>
  );
}
