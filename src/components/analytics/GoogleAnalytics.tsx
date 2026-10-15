'use client';

import Script from 'next/script';

const GA_ID = process.env.NEXT_PUBLIC_GA_ID;
const GOOGLE_ADS_ID = process.env.NEXT_PUBLIC_GOOGLE_ADS_ID;

declare global {
  interface Window {
    dataLayer?: unknown[][];
    gtag?: (...args: unknown[]) => void;
  }
}

/**
 * Records a Google Ads conversion only when the matching conversion label is
 * configured in Vercel. Calls are queued in dataLayer if gtag is still loading.
 */
export function trackGoogleAdsConversion(conversionLabel: string | undefined) {
  if (typeof window === "undefined" || !GOOGLE_ADS_ID || !conversionLabel) return;

  window.dataLayer = window.dataLayer || [];
  const gtag = window.gtag || function (...args: unknown[]) {
    window.dataLayer?.push(args);
  };
  gtag("event", "conversion", {
    send_to: GOOGLE_ADS_ID + "/" + conversionLabel,
  });
}

export function GoogleAnalytics() {
  const tagId = GA_ID || GOOGLE_ADS_ID;
  if (!tagId) return null;

  return (
    <>
      <Script
        async
        src={`https://www.googletagmanager.com/gtag/js?id=${tagId}`}
        strategy="afterInteractive"
      />
      <Script id="google-analytics" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          ${GA_ID ? `gtag('config', '${GA_ID}');` : ''}
          ${GOOGLE_ADS_ID ? `gtag('config', '${GOOGLE_ADS_ID}');` : ''}
        `}
      </Script>
    </>
  );
}
