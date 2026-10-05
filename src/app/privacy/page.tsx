import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy & Analytics | NyumbaFinder',
  description: 'Learn how NyumbaFinder uses cookies, Google Analytics and website usage information.',
};

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl py-12 md:py-16">
      <div className="mb-10">
        <p className="text-sm font-medium text-muted-foreground">NyumbaFinder</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight md:text-4xl">
          Privacy & Analytics
        </h1>
        <p className="mt-4 text-muted-foreground">
          We use website analytics to understand how people use NyumbaFinder and to improve
          the experience of finding rental homes in Kenya.
        </p>
      </div>

      <div className="space-y-10 text-sm leading-7 text-muted-foreground">
        <section>
          <h2 className="text-xl font-semibold text-foreground">Google Analytics</h2>
          <p className="mt-3">
            NyumbaFinder uses Google Analytics 4 (GA4) to understand website traffic and
            engagement. This helps us understand which pages people visit, how visitors find
            NyumbaFinder, which parts of the site are useful, and where we can improve the
            rental search experience.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground">What analytics may collect</h2>
          <p className="mt-3">
            Analytics may collect information about your interaction with the website, such as
            pages viewed, approximate location derived from your connection, device and browser
            information, referral source, and general usage events. Analytics is used for
            aggregated website measurement rather than to identify you personally.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground">Cookies and similar technologies</h2>
          <p className="mt-3">
            NyumbaFinder and its analytics services may use cookies or similar technologies to
            support website functionality and measure usage. These technologies help us
            understand how the site is being used and improve its performance and features.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground">How we use this information</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5">
            <li>Understand how visitors discover and use NyumbaFinder.</li>
            <li>Improve property search, filters, location features and navigation.</li>
            <li>Identify pages or features that need improvement.</li>
            <li>Measure the effectiveness of future NyumbaFinder features and services.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground">Google Analytics</h2>
          <p className="mt-3">
            Google provides analytics services used by NyumbaFinder. Information collected
            through GA4 is processed according to Google's applicable policies and settings.
            You can learn more about Google's handling of analytics data in Google's own
            privacy documentation.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground">Your choices</h2>
          <p className="mt-3">
            You can control or delete cookies through your browser settings. You can also use
            browser privacy features or extensions that limit analytics and tracking
            technologies. Blocking cookies or scripts may affect some website functionality.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground">Updates</h2>
          <p className="mt-3">
            We may update this page as NyumbaFinder adds features, changes its analytics setup,
            or as applicable privacy requirements change. The latest version will always be
            available on this page.
          </p>
        </section>

        <p className="border-t pt-6 text-xs">
          Last updated: October 5, 2026
        </p>
      </div>
    </div>
  );
}
