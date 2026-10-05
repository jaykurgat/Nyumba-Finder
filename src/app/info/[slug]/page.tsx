import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

const pages = {
  about: {
    title: 'About NyumbaFinder',
    description: 'NyumbaFinder is built to make finding a rental home in Kenya simpler, more focused and less dependent on walking from property to property.',
    sections: [
      ['Our goal', 'NyumbaFinder helps people discover rental homes by location, budget, property type and other practical criteria before they make the trip to view a property.'],
      ['For renters', 'Search active listings, narrow your options and use the available property details and location information to decide which homes are worth visiting.'],
      ['For landlords', 'Landlords can publish property information so prospective tenants can discover homes that match their needs.'],
    ],
  },
  'how-it-works': {
    title: 'How NyumbaFinder Works',
    description: 'A simple way to search for rental homes in Kenya.',
    sections: [
      ['1. Choose a location', 'Search by county, town, estate, neighbourhood or another recognised location.'],
      ['2. Filter what fits', 'Use rent, bedrooms, bathrooms, property type and available amenities to narrow the results.'],
      ['3. Review the property', 'Open a listing to review its photos, description, key details, amenities and map location.'],
      ['4. Contact the listing party', 'Use the contact information provided on the listing to arrange questions or a viewing. Always verify important details before making any payment.'],
    ],
  },
  faq: {
    title: 'Frequently Asked Questions',
    description: 'Common questions about using NyumbaFinder.',
    sections: [
      ['Is NyumbaFinder a landlord?', 'No. NyumbaFinder is a property discovery platform. A listing may be submitted by a landlord, agent or another permitted listing party.'],
      ['Can I trust every listing?', 'You should verify every property independently. Availability, rent, ownership or agency status and payment instructions can change, so do not send money based only on a website listing.'],
      ['How do I report a property?', 'Open the property listing and use its reporting option when you believe the information is inaccurate, misleading, unavailable or otherwise problematic.'],
      ['Can I list a property?', 'Yes. Use the List Your Property link in the footer or the listing option on the website.'],
    ],
  },
  'landlord-guidelines': {
    title: 'Landlord Guidelines',
    description: 'Guidance for publishing useful and trustworthy rental listings.',
    sections: [
      ['Provide accurate information', 'Use the correct rent, property type, bedroom and bathroom counts, location and description.'],
      ['Use genuine photos', 'Upload photos that represent the actual property. Avoid misleading images or photos belonging to another property.'],
      ['Keep listings current', 'Update or remove a listing when the property is no longer available or important details change.'],
      ['Use the correct map location', 'Place the map pin in the appropriate area for the property. Do not deliberately place a property in another town or neighbourhood to attract unrelated searches.'],
    ],
  },
  'listing-rules': {
    title: 'Listing Rules',
    description: 'Basic standards for properties published on NyumbaFinder.',
    sections: [
      ['Allowed', 'Listings should represent genuine rental properties and contain useful, accurate information for prospective tenants.'],
      ['Not allowed', 'Do not publish fraudulent, deliberately misleading, duplicate, abusive, illegal or unrelated content.'],
      ['Reporting and review', 'NyumbaFinder may review listings that receive reports or otherwise appear problematic. A listing can be reviewed or removed when appropriate.'],
      ['Responsibility', 'The person submitting a listing is responsible for the accuracy of the information they provide.'],
    ],
  },
  'report-listing': {
    title: 'Report a Listing',
    description: 'Help keep NyumbaFinder useful by reporting property information that appears problematic.',
    sections: [
      ['When to report', 'Report a listing if it appears fraudulent, unavailable, misleading, duplicated, inappropriate or materially different from the information presented.'],
      ['How reporting works', 'Open the property page and use the report option. Provide a clear reason so the issue can be reviewed.'],
      ['Do not make payments to report', 'NyumbaFinder does not require a tenant to pay money in order to report a property.'],
    ],
  },
  'safety-scams': {
    title: 'Safety & Scam Awareness',
    description: 'Practical precautions when searching for a rental home.',
    sections: [
      ['Verify before paying', 'Do not pay a deposit, viewing fee or rent solely because a property appears online. Confirm the property and the person you are dealing with first.'],
      ['View the property where possible', 'Inspect the property or use a trusted representative before committing to a tenancy.'],
      ['Be cautious with pressure', 'Be careful when someone insists on immediate payment, refuses reasonable verification or offers a deal that does not make sense.'],
      ['Protect personal information', 'Do not unnecessarily share passwords, banking credentials, identification documents or other sensitive information with strangers.'],
    ],
  },
  contact: {
    title: 'Contact NyumbaFinder',
    description: 'For questions, feedback or problems with the platform.',
    sections: [
      ['Property problems', 'Use the Report a Listing option on the relevant property page when your concern relates to a specific listing.'],
      ['Website problems', 'If something on the website is not working correctly, please report the problem through the available website reporting/contact channel.'],
      ['Feedback', 'We welcome practical feedback that helps make rental searches easier, clearer and more useful for ordinary renters in Kenya.'],
    ],
  },
  disclaimer: {
    title: 'Disclaimer',
    description: 'Important information about using property information on NyumbaFinder.',
    sections: [
      ['Property information', 'NyumbaFinder provides a platform for discovering property listings. Listing information can change and may not always reflect current availability or conditions.'],
      ['Verify independently', 'Users should independently verify the property, listing party, rent, availability, location, ownership or agency status and payment instructions before entering into a transaction.'],
      ['No guarantee of a transaction', 'Publication of a listing does not constitute an endorsement, guarantee, tenancy agreement or promise that a property will be available when contacted.'],
      ['Third-party interactions', 'Any agreement or payment between a tenant and a landlord, agent or other listing party is between those parties. Exercise appropriate caution before transacting.'],
    ],
  },
  terms: {
    title: 'Terms of Use',
    description: 'Basic rules for using NyumbaFinder.',
    sections: [
      ['Use of the website', 'Use NyumbaFinder lawfully and do not interfere with the website, misuse its services or attempt to access systems or information you are not authorised to access.'],
      ['Listings', 'Property information should be accurate and submitted only when you have the right or permission to publish it.'],
      ['Content and misuse', 'Do not copy, republish, scrape, manipulate or redistribute website content in a way that violates applicable law or the rights of NyumbaFinder or third parties.'],
      ['Changes', 'NyumbaFinder may update features, listings and these terms as the platform develops. Continued use of the website after changes means you should review the updated terms.'],
    ],
  },
  cookies: {
    title: 'Cookie Policy',
    description: 'How cookies and similar technologies are used on NyumbaFinder.',
    sections: [
      ['Analytics cookies', 'NyumbaFinder uses Google Analytics to measure website traffic and usage. Google Analytics may use cookies or similar technologies to provide these measurements.'],
      ['Why they are used', 'Analytics helps us understand how visitors use the site and where the search experience can be improved.'],
      ['Your browser controls', 'You can manage or delete cookies through your browser settings. Blocking cookies or analytics scripts may affect some website functionality or measurement.'],
      ['More information', 'For more detail about analytics and privacy, see the Privacy & Analytics page.'],
    ],
  },
} as const;

type PageKey = keyof typeof pages;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const page = pages[slug as PageKey];
  if (!page) return {};
  return {
    title: `${page.title} | NyumbaFinder`,
    description: page.description,
  };
}

export default async function InfoPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const page = pages[slug as PageKey];
  if (!page) notFound();

  return (
    <div className="mx-auto max-w-4xl py-10 md:py-14">
      <div className="mb-8 rounded-2xl border bg-card px-6 py-7 md:px-8">
        <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
          NyumbaFinder
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight md:text-3xl">{page.title}</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">{page.description}</p>
      </div>

      <div className="grid gap-3">
        {page.sections.map(([heading, body], index) => (
          <section
            key={heading}
            className="rounded-xl border bg-card px-5 py-5 md:px-6"
          >
            <div className="flex gap-4">
              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground">
                {index + 1}
              </span>
              <div>
                <h2 className="text-base font-semibold text-foreground">{heading}</h2>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{body}</p>
              </div>
            </div>
          </section>
        ))}

        {slug === 'cookies' && (
          <section className="rounded-xl border border-dashed bg-muted/30 px-5 py-4 md:px-6">
            <Link href="/privacy" className="text-sm font-medium text-foreground underline underline-offset-4">
              Read Privacy & Analytics
            </Link>
          </section>
        )}

        <p className="pt-3 text-xs text-muted-foreground">
          Last updated: October 5, 2026
        </p>
      </div>
    </div>
  );
}
