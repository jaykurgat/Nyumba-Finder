import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Plus, UserRound } from 'lucide-react';
import { getCurrentUser } from '@/lib/user-auth';
import { PrimaryNavigation } from '@/components/layout/PrimaryNavigation';
import { AccountMenu } from '@/components/layout/AccountMenu';
import { ReportNotifications } from '@/components/notifications/ReportNotifications';

export async function Header() {
  const user = await getCurrentUser();
  const accountLabel = user
    ? user.profile?.displayName?.trim() || [user.profile?.firstName, user.profile?.lastName].filter(Boolean).join(' ') || user.email?.split('@')[0] || 'Account'
    : 'Sign in';

  return (
    <header className="relative z-50 w-full min-w-0 border-b border-[#d9ded4] bg-[#fbfaf6]">
      <div className="mx-auto flex min-h-[62px] max-w-7xl min-w-0 items-center gap-3 px-4 sm:px-6 lg:min-h-[70px] lg:px-10">
        <Link href="/" className="flex shrink-0 items-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f28c28] focus-visible:ring-offset-2" aria-label="NyumbaFinder home">
          <img src="/nyumbafinder-logo.svg?v=4" alt="NyumbaFinder — Find your next home" className="h-auto w-[190px] max-w-[42vw] sm:w-[220px]" />
        </Link>
        <div className="hidden flex-1 justify-center md:flex"><PrimaryNavigation signedIn={Boolean(user)} /></div>
        <div className="ml-auto flex shrink-0 items-center gap-1.5 sm:gap-3">
          {user ? <>
            <ReportNotifications audience="account" />
            <AccountMenu name={accountLabel} email={user.email} superlandlord={user.accessRole === 'SUPERLANDLORD'} />
          </> : <Button variant="ghost" className="h-9 w-9 rounded-none p-0 text-[#596257] hover:bg-[#edf0e8] hover:text-[#244c2c] sm:h-10 sm:w-auto sm:px-3" asChild>
            <Link href="/account?mode=login" aria-label="Sign in">
              <UserRound className="h-[17px] w-[17px] sm:mr-2" /><span className="hidden max-w-28 truncate text-sm sm:inline">Sign in</span>
            </Link>
          </Button>}
          <Button className="h-10 shrink-0 gap-1.5 rounded-full bg-[#244c2c] px-3.5 text-xs font-semibold text-white shadow-sm transition hover:bg-[#193c21] focus-visible:ring-2 focus-visible:ring-[#f28c28] sm:px-4 sm:text-[13px]" asChild>
            <Link href="/list-property" aria-label="List a property"><Plus className="h-4 w-4 shrink-0" /><span className="lg:hidden">List</span><span className="hidden lg:inline">List property</span></Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
