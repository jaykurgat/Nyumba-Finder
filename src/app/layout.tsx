import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Header } from '@/components/layout/Header';
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
    icon: '/icon.svg',
    apple: '/nyumbafinder-mark.svg',
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="h-full" suppressHydrationWarning>
      <body className={cn("min-h-full font-sans antialiased", inter.variable)}>
        <div className="flex min-h-screen flex-col">
          <Header />
          <main className="flex-1"><div className="container mx-auto px-4 md:px-6">{children}</div></main>
          <Footer />
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
