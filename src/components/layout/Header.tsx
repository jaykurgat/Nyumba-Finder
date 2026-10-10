import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Heart, Search, PlusCircle, UserRound } from 'lucide-react';

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur">
      <div className="container mx-auto flex h-16 items-center gap-6 px-4 md:px-6">
        <Link href="/" className="flex items-center shrink-0" aria-label="NyumbaFinder home">
          <img src="/nyumbafinder-logo.svg" alt="NyumbaFinder" className="h-10 w-auto" />
        </Link>
        <nav className="hidden md:flex items-center gap-1">
          <Button variant="ghost" asChild><Link href="/properties"><Search className="mr-2 h-4 w-4" />Find a House</Link></Button>
          <Button variant="ghost" asChild><Link href="/properties?view=locations">Locations</Link></Button>
          <Button variant="ghost" asChild><Link href="/properties?view=saved"><Heart className="mr-2 h-4 w-4" />Saved</Link></Button>
        </nav>
        <div className="ml-auto flex items-center gap-2"><Button variant="ghost" asChild><Link href="/account?mode=login"><UserRound className="mr-2 h-4 w-4" />Account</Link></Button><Button variant="outline" asChild><Link href="/list-property"><PlusCircle className="mr-2 h-4 w-4" />List Your House</Link></Button></div>
      </div>
    </header>
  );
}
