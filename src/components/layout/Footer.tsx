import Link from 'next/link';

const groups = [
  {
    title: 'Explore',
    links: [
      ['Search Homes', '/properties'],
      ['Find a House', '/find-a-house'],
      ['How It Works', '/info/how-it-works'],
      ['FAQ', '/info/faq'],
      ['About NyumbaFinder', '/info/about'],
    ],
  },
  {
    title: 'For Landlords',
    links: [
      ['List Your Property', '/list-property'],
      ['Promote a Listing', '/promote'],
      ['Landlord Guidelines', '/info/landlord-guidelines'],
      ['Listing Rules', '/info/listing-rules'],
      ['Report a Listing', '/info/report-listing'],
    ],
  },
  {
    title: 'Help & Safety',
    links: [
      ['Safety & Scam Awareness', '/info/safety-scams'],
      ['Contact Us', '/info/contact'],
    ],
  },
  {
    title: 'Legal',
    links: [
      ['Privacy & Analytics', '/privacy'],
      ['Cookie Policy', '/info/cookies'],
      ['Terms of Use', '/info/terms'],
      ['Disclaimer', '/info/disclaimer'],
    ],
  },
];

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-[#334b36] bg-[#1d3824] text-white">
      <div className="mx-auto max-w-7xl px-5 pb-[calc(6rem+env(safe-area-inset-bottom))] pt-9 sm:px-8 md:pb-8 lg:px-10">
        <div className="grid gap-x-8 gap-y-8 sm:grid-cols-2 lg:grid-cols-[1.25fr_1fr_1fr_1fr_1fr]">
          <div className="sm:col-span-2 lg:col-span-1">
            <Link href="/" aria-label="NyumbaFinder home" className="inline-flex items-center">
              <img src="/nyumbafinder-logo.svg" alt="NyumbaFinder" className="h-9 w-auto max-w-[165px] brightness-0 invert" />
            </Link>
            <p className="mt-3 max-w-xs text-sm leading-6 text-white/65">Find a place that feels like home. Rental homes and local house-hunting support across Kenya.</p>
            <Link href="/properties" className="mt-4 inline-flex items-center border-b border-[#f28c28] pb-1 text-sm font-semibold text-white hover:text-[#f7b15f]">Explore homes <span aria-hidden="true" className="ml-2 text-[#f28c28]">→</span></Link>
          </div>
          {groups.map((group) => (
            <div key={group.title} className="border-t border-white/15 pt-4 lg:border-0 lg:pt-1">
              <h2 className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#f2a14b]">{group.title}</h2>
              <nav className="mt-3 flex flex-col items-start gap-2.5" aria-label={group.title}>
                {group.links.map(([label, href]) => (
                  <Link key={href} href={href} className="text-[13px] leading-5 text-white/70 transition-colors hover:text-white hover:underline underline-offset-4">
                    {label}
                  </Link>
                ))}
              </nav>
            </div>
          ))}
        </div>

        <div className="mt-8 flex flex-col gap-2 border-t border-white/15 pt-5 text-[11px] text-white/55 sm:flex-row sm:items-center sm:justify-between">
          <span>&copy; {currentYear} NyumbaFinder. All rights reserved.</span>
          <span>Made for the way Kenya finds home.</span>
        </div>
      </div>
    </footer>
  );
}
