import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { PlusCircle, UserRound } from 'lucide-react';
import { getCurrentUser } from '@/lib/user-auth';
import { PrimaryNavigation } from '@/components/layout/PrimaryNavigation';

export async function Header() {
  const user = await getCurrentUser();
  const accountLabel = user
    ? user.profile?.firstName?.trim() || user.profile?.displayName?.trim().split(/\\s+/)[0] || user.email || 'Account'
    : 'Account';

  return (
    <header className="sticky top-0 z-50 w-full min-w-0 border-b border-border/70 bg-background/90 shadow-[0_4px_24px_-22px_rgba(20,30,20,0.5)] backdrop-blur-xl supports-[backdrop-filter]:bg-background/80">
      <div className="container mx-auto flex h-[68px] min-w-0 items-center gap-3 px-3 sm:px-5 lg:h-[76px] lg:px-6">
        <Link href="/" className="flex shrink-0 items-center rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" aria-label="NyumbaFinder home">
          <img src="/nyumbafinder-logo.svg" alt="NyumbaFinder" className="h-8 w-auto max-w-[142px] sm:h-9 sm:max-w-[160px] lg:h-10" />
        </Link>

        <div className="hidden flex-1 justify-center md:flex">
          <PrimaryNavigation />
        </div>

        <div className="ml-auto flex shrink-0 items-center gap-1.5 sm:gap-2">
          <Button variant="ghost" className="h-9 w-9 rounded-full p-0 text-muted-foreground hover:text-foreground sm:h-10 sm:w-auto sm:rounded-full sm:px-3" asChild>
            <Link href={user ? '/account' : '/account?mode=login'} aria-label={user ? 'Your account' : 'Sign in'}>
              <UserRound className="h-[17px] w-[17px] sm:mr-2" />
              <span className="hidden max-w-28 truncate text-sm sm:inline">{accountLabel}</span>
            </Link>
          </Button>
          <Button className="h-9 rounded-full px-3 text-xs font-semibold shadow-sm transition-transform hover:-translate-y-0.5 sm:h-10 sm:px-4 sm:text-sm" asChild>
            <Link href="/list-property" aria-label="List your property">
              <PlusCircle className="mr-1.5 h-4 w-4 sm:mr-2" />
              <span className="sm:hidden">List</span>
              <span className="hidden sm:inline">List Your Property</span>
            </Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
