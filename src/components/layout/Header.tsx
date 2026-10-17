import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowRight, Plus, UserRound } from 'lucide-react';
import { getCurrentUser } from '@/lib/user-auth';
import { PrimaryNavigation } from '@/components/layout/PrimaryNavigation';

export async function Header() {
  const user = await getCurrentUser();
  const accountLabel = user
    ? user.profile?.firstName?.trim() || user.profile?.displayName?.trim().split(/\\s+/)[0] || user.email || 'Account'
    : 'Sign in';

  return (
    <header className="relative z-50 w-full min-w-0 border-b border-[#d9ded4] bg-[#fbfaf6]">
      <div className="mx-auto flex min-h-[62px] max-w-7xl min-w-0 items-center gap-3 px-4 sm:px-6 lg:min-h-[70px] lg:px-10">
        <Link href="/" className="flex shrink-0 items-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f28c28] focus-visible:ring-offset-2" aria-label="NyumbaFinder home">
          <img src="/nyumbafinder-logo.svg" alt="NyumbaFinder" className="h-8 w-auto max-w-[138px] sm:h-9 sm:max-w-[158px]" />
        </Link>

        <div className="hidden flex-1 justify-center md:flex">
          <PrimaryNavigation />
        </div>

        <div className="ml-auto flex shrink-0 items-center gap-1.5 sm:gap-3">
          <Button variant="ghost" className="h-9 w-9 rounded-none p-0 text-[#596257] hover:bg-[#edf0e8] hover:text-[#244c2c] sm:h-10 sm:w-auto sm:px-3" asChild>
            <Link href={user ? '/account' : '/account?mode=login'} aria-label={user ? 'Your account' : 'Sign in'}>
              <UserRound className="h-[17px] w-[17px] sm:mr-2" />
              <span className="hidden max-w-28 truncate text-sm sm:inline">{accountLabel}</span>
            </Link>
          </Button>
          <Button className="h-9 rounded-none bg-[#244c2c] px-3 text-xs font-semibold text-white hover:bg-[#193c21] sm:h-10 sm:px-4 sm:text-sm" asChild>
            <Link href="/list-property" aria-label="List your property">
              <Plus className="mr-1.5 h-4 w-4 sm:mr-2" />
              <span className="sm:hidden">List</span>
              <span className="hidden sm:inline">List your property</span>
              <ArrowRight className="ml-2 hidden h-3.5 w-3.5 lg:inline" />
            </Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
