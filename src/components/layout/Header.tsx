import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Heart, Search, PlusCircle, UserRound } from 'lucide-react';
import { getCurrentUser } from '@/lib/user-auth';

export async function Header() {
  const user = await getCurrentUser();
  const accountLabel = user
    ? user.profile?.firstName?.trim() || user.profile?.displayName?.trim().split(/\s+/)[0] || user.email || 'Account'
    : 'Account';

  return (
    <header className="sticky top-0 z-50 w-full min-w-0 border-b bg-background/95 backdrop-blur">
      <div className="container mx-auto flex h-14 min-w-0 items-center gap-2 px-3 sm:h-16 sm:px-4 md:gap-6 md:px-6">
        <Link href="/" className="flex items-center shrink-0" aria-label="NyumbaFinder home">
          <img src="/nyumbafinder-logo.svg" alt="NyumbaFinder" className="h-8 w-auto max-w-[145px] sm:h-9 md:h-10" />
        </Link>
        <nav className="hidden md:flex items-center gap-1">
          <Button variant="ghost" asChild><Link href="/find-a-house"><Search className="mr-2 h-4 w-4" />Find a House</Link></Button>
          <Button variant="ghost" asChild><Link href="/properties?view=locations">Locations</Link></Button>
          <Button variant="ghost" asChild><Link href="/properties?view=saved"><Heart className="mr-2 h-4 w-4" />Saved</Link></Button>
        </nav>
        <div className="ml-auto flex shrink-0 items-center gap-1.5 md:gap-2">
          <Button variant="ghost" className="h-9 w-9 p-0 md:h-10 md:w-auto md:px-3" asChild>
            <Link href={user ? '/account' : '/account?mode=login'} aria-label={user ? 'Your account' : 'Sign in'}>
              <UserRound className="h-4 w-4 md:mr-2" />
              <span className="hidden max-w-36 truncate md:inline">{accountLabel}</span>
            </Link>
          </Button>
          <Button variant="outline" className="h-9 gap-1.5 px-2.5 text-xs sm:text-sm md:h-10 md:px-4" asChild>
            <Link href="/list-property" aria-label="List your house">
              <PlusCircle className="h-4 w-4 md:mr-2" />
              <span className="md:hidden">List</span>
              <span className="hidden md:inline">List Your House</span>
            </Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
