import type { Metadata } from "next";
import Link from "next/link";
import FindAHouseClient from "./FindAHouseClient";

const SITE_URL = "https://www.nyumba-finder.com";
const PAGE_URL = `${SITE_URL}/find-a-house`;

export const metadata: Metadata = {
  title: "Find a House to Rent in Kenya | NyumbaFinder",
  description:
    "Find rental homes in Kenya that fit your location, budget and needs. Choose your preferred town or neighbourhood, set your rent range and explore suitable homes with NyumbaFinder.",
  alternates: { canonical: PAGE_URL },
  openGraph: {
    type: "website",
    url: PAGE_URL,
    siteName: "NyumbaFinder",
    title: "Find a House to Rent in Kenya | NyumbaFinder",
    description:
      "Looking for a rental home in Kenya? Narrow your search by location, home type and monthly budget, then explore suitable listings.",
    locale: "en_KE",
  },
  twitter: {
    card: "summary",
    title: "Find a House to Rent in Kenya | NyumbaFinder",
    description: "Find rental homes in Kenya by location, home type and monthly budget.",
  },
};

const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebPage",
      "@id": `${PAGE_URL}#webpage`,
      url: PAGE_URL,
      name: "Find a House to Rent in Kenya | NyumbaFinder",
      description: "Find rental homes in Kenya by location, home type and budget with NyumbaFinder.",
      isPartOf: { "@id": `${SITE_URL}/#website` },
      breadcrumb: { "@id": `${PAGE_URL}#breadcrumb` },
      inLanguage: "en-KE",
    },
    {
      "@type": "BreadcrumbList",
      "@id": `${PAGE_URL}#breadcrumb`,
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
        { "@type": "ListItem", position: 2, name: "Find a House", item: PAGE_URL },
      ],
    },
  ],
};

export default function FindAHousePage() {
  return (
    <>
      <FindAHouseClient />
      <section aria-labelledby="find-a-house-guide" className="mx-auto max-w-6xl px-4 pb-14 pt-6 md:px-6 md:pb-20">
        <div className="grid gap-8 border-t border-[#e4e7df] pt-8 lg:grid-cols-[minmax(0,1fr)_280px] lg:gap-12">
          <article className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#62765a]">NyumbaFinder house-finding guide</p>
            <h2 id="find-a-house-guide" className="mt-2 text-2xl font-semibold tracking-tight text-[#263426] sm:text-3xl">
              Find a rental home in Kenya that fits your life
            </h2>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-muted-foreground sm:text-base">
              Finding a suitable home is about more than seeing a low rent. Location, transport, water,
              security, move-in timing and the total cost of moving all matter. NyumbaFinder helps you
              organise your requirements, explore relevant rental listings and identify the homes worth contacting about.
            </p>

            <h3 className="mt-8 text-lg font-semibold tracking-tight">How to use Find a House</h3>
            <ol className="mt-4 space-y-4">
              <li className="flex gap-3"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#edf2e8] text-sm font-semibold text-[#405638]">1</span><div><h4 className="font-medium">Choose the type of home</h4><p className="mt-1 text-sm leading-6 text-muted-foreground">Start with a bedsitter, studio, apartment, standalone house or shared accommodation. If you are flexible, keep your options open and compare what is available.</p></div></li>
              <li className="flex gap-3"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#edf2e8] text-sm font-semibold text-[#405638]">2</span><div><h4 className="font-medium">Prioritise your locations</h4><p className="mt-1 text-sm leading-6 text-muted-foreground">Add the counties, towns, estates or neighbourhoods you would genuinely consider. Be specific where possible, and check the actual property location before travelling for a viewing.</p></div></li>
              <li className="flex gap-3"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#edf2e8] text-sm font-semibold text-[#405638]">3</span><div><h4 className="font-medium">Set a realistic rent range</h4><p className="mt-1 text-sm leading-6 text-muted-foreground">Use your comfortable monthly rent, then consider the deposit, utilities, transport and any stated fees separately. A home with slightly higher rent may not be the more expensive option if it reduces other recurring costs.</p></div></li>
              <li className="flex gap-3"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#edf2e8] text-sm font-semibold text-[#405638]">4</span><div><h4 className="font-medium">Review the match before making a trip</h4><p className="mt-1 text-sm leading-6 text-muted-foreground">Read listing details, confirm availability and rent directly with the listing contact, and ask for recent photos or a video walkthrough when appropriate. Never send a deposit solely because of a message or an attractive listing.</p></div></li>
            </ol>

            <h3 className="mt-8 text-lg font-semibold tracking-tight">What to check before renting a house</h3>
            <p className="mt-3 text-sm leading-7 text-muted-foreground sm:text-base">
              Confirm the exact area, monthly rent, deposit, water availability, access and security arrangements,
              electricity setup, transport options and any additional charges. Ask who is authorised to let the
              property. Where possible, view the home or arrange a live video tour before paying. Listing information
              can change, so verify important details with the advertiser.
            </p>
            <p className="mt-3 text-sm leading-7 text-muted-foreground sm:text-base">
              If a location is missing from the suggestions, use the location-entry option in the form. A newly
              entered place may need review before it becomes part of the shared location database.
            </p>

            <div className="mt-8 rounded-2xl border border-[#dce4d5] bg-[#f5f6f0] p-5 sm:p-6">
              <h3 className="text-lg font-semibold tracking-tight text-[#2d3b29]">Prefer to browse homes yourself?</h3>
              <p className="mt-2 text-sm leading-6 text-[#606a5d]">Explore current property listings, compare the information available and contact advertisers about homes that suit your needs. Availability should always be confirmed before arranging a visit.</p>
              <Link href="/properties" className="mt-4 inline-flex min-h-11 items-center justify-center rounded-xl bg-[#53694b] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#43563c]">Browse property listings</Link>
            </div>

            <h3 className="mt-8 text-lg font-semibold tracking-tight">Frequently asked questions</h3>
            <div className="mt-3 divide-y divide-[#e4e7df] border-y border-[#e4e7df]">
              <details className="py-4"><summary className="cursor-pointer font-medium">Can I find a house by town or neighbourhood?</summary><p className="mt-2 text-sm leading-6 text-muted-foreground">Yes. Add the locations you prefer using the suggestions in the form. You can prioritise several places, and you can enter a missing location for review.</p></details>
              <details className="py-4"><summary className="cursor-pointer font-medium">What if there are no suitable listings?</summary><p className="mt-2 text-sm leading-6 text-muted-foreground">Try broadening your budget or adding another nearby location. You can also browse available property listings directly. Do not assume a property is available until the advertiser confirms it.</p></details>
              <details className="py-4"><summary className="cursor-pointer font-medium">Do I have to use the House Hunt assistance service?</summary><p className="mt-2 text-sm leading-6 text-muted-foreground">No. You can browse property listings directly. The guided House Hunt request is an optional assistance service shown in the form; it is listed at KSh 2,500, and submitting the form does not take payment.</p></details>
              <details className="py-4"><summary className="cursor-pointer font-medium">How can I avoid rental scams?</summary><p className="mt-2 text-sm leading-6 text-muted-foreground">Confirm the property and the advertiser's authority, verify the rent and terms, and view the home or request a live walkthrough before paying. Read our <Link href="/info/safety-scams" className="font-medium text-[#53694b] underline underline-offset-4">rental safety guidance</Link> for more precautions.</p></details>
            </div>
          </article>

          <aside className="self-start rounded-2xl border border-[#e0e4da] bg-white p-5 lg:sticky lg:top-6">
            <h3 className="text-base font-semibold text-[#2d3b29]">Continue your search</h3>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">Use the guided form to describe your needs or browse available listings directly.</p>
            <nav aria-label="House search resources" className="mt-4 flex flex-col gap-3 text-sm">
              <Link href="/properties" className="font-medium text-[#53694b] underline underline-offset-4">Browse homes and rentals</Link>
              <Link href="/info/how-it-works" className="font-medium text-[#53694b] underline underline-offset-4">How NyumbaFinder works</Link>
              <Link href="/info/faq" className="font-medium text-[#53694b] underline underline-offset-4">Frequently asked questions</Link>
              <Link href="/info/safety-scams" className="font-medium text-[#53694b] underline underline-offset-4">Rental safety and scam prevention</Link>
            </nav>
          </aside>
        </div>
      </section>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
    </>
  );
}
