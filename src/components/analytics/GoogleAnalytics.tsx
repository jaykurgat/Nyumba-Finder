'use client';

import Script from 'next/script';
import { useEffect, useState } from 'react';
import { getCookieConsent } from '@/components/privacy/CookieConsentBanner';

const GA_ID = process.env.NEXT_PUBLIC_GA_ID;

export function GoogleAnalytics() {
  const [analyticsAllowed, setAnalyticsAllowed] = useState(false);

  useEffect(() => {
    const syncConsent = () => {
      setAnalyticsAllowed(getCookieConsent()?.analytics === true);
    };

    syncConsent();
    window.addEventListener('nyumbafinder:consent', syncConsent);

    return () => {
      window.removeEventListener('nyumbafinder:consent', syncConsent);
    };
  }, []);

  if (!GA_ID || !analyticsAllowed) return null;

  return (
    <>
      <Script
        async
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
        strategy="afterInteractive"
      />
      <Script id="google-analytics" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${GA_ID}');
        `}
      </Script>
    </>
  );
}
