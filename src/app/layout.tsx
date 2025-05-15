import type { Metadata } from 'next';
import { Geist } from 'next/font/google'; // Using Geist Sans as the modern sans-serif font
import './globals.css';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Toaster } from "@/components/ui/toaster";
import { cn } from "@/lib/utils";

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Nyumba Finder',
  description: 'Find your next rental home in Kenya',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body className={cn(
        "relative h-full font-sans antialiased",
        geistSans.variable
      )}>
        <div className="flex flex-col min-h-screen">
          <Header />
          <main className="flex-grow relative flex flex-col items-center justify-center py-12">
            <div className="container px-4 md:px-6">
               {children}
            </div>
          </main>
          <Footer />
        </div>
        <Toaster />
      </body>
    </html>
  );
}
