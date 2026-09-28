import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Heart, Home, Search, PlusCircle } from 'lucide-react';

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur">
      <div className="container mx-auto flex h-16 items-center gap-6 px-4 md:px-6">
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <span className="flex h-9 w-9 items-center justify-center bg-primary text-primary-foreground">
            <Home className="h-5 w-5" />
          </span>
          <span className="text-lg font-semibold tracking-tight">NyumbaFinder</span>
        </Link>
        <nav className="hidden md:flex items-center gap-1">
          <Button variant="ghost" asChild><Link href="/properties"><Search className="mr-2 h-4 w-4" />Find a House</Link></Button>
          <Button variant="ghost" asChild><Link href="/properties?view=locations">Locations</Link></Button>
          <Button variant="ghost" asChild><Link href="/properties?view=saved"><Heart className="mr-2 h-4 w-4" />Saved</Link></Button>
        </nav>
        <div className="ml-auto"><Button variant="outline" asChild><Link href="/list-property"><PlusCircle className="mr-2 h-4 w-4" />List Your House</Link></Button></div>
      </div>
    </header>
  );
}
