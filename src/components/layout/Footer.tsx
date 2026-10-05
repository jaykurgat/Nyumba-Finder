import Link from 'next/link';

const groups = [
  {
    title: 'Explore',
    links: [
      ['Search Homes', '/properties'],
      ['How It Works', '/info/how-it-works'],
      ['FAQ', '/info/faq'],
      ['About NyumbaFinder', '/info/about'],
    ],
  },
  {
    title: 'For Landlords',
    links: [
      ['List Your Property', '/list-property'],
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
    <footer className="border-t bg-secondary/50">
      <div className="container mx-auto px-4 py-10 md:px-8">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {groups.map((group) => (
            <div key={group.title}>
              <h2 className="text-sm font-semibold text-foreground">{group.title}</h2>
              <nav className="mt-3 flex flex-col items-start gap-2" aria-label={group.title}>
                {group.links.map(([label, href]) => (
                  <Link
                    key={href}
                    href={href}
                    className="text-sm text-muted-foreground transition-colors hover:text-foreground hover:underline underline-offset-4"
                  >
                    {label}
                  </Link>
                ))}
              </nav>
            </div>
          ))}
        </div>

        <div className="mt-10 flex flex-col gap-2 border-t pt-5 text-sm text-muted-foreground md:flex-row md:items-center md:justify-between">
          <span>&copy; {currentYear} NyumbaFinder. All rights reserved.</span>
          <span>Find your next home in Kenya.</span>
        </div>
      </div>
    </footer>
  );
}
