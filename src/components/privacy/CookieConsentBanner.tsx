"use client";

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';

const CONSENT_KEY = 'nyumbafinder_cookie_consent';

export type CookieConsent = {
  analytics: boolean;
  personalization: boolean;
};

export function getCookieConsent(): CookieConsent | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp('(?:^|; )' + CONSENT_KEY + '=([^;]*)'));
  if (!match) return null;
  try {
    return JSON.parse(decodeURIComponent(match[1])) as CookieConsent;
  } catch {
    return null;
  }
}

export function setCookieConsent(consent: CookieConsent) {
  document.cookie = `${CONSENT_KEY}=${encodeURIComponent(JSON.stringify(consent))}; Max-Age=31536000; Path=/; SameSite=Lax`;
}

export function CookieConsentBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(!getCookieConsent());
  }, []);

  if (!visible) return null;

  const choose = (consent: CookieConsent) => {
    setCookieConsent(consent);
    setVisible(false);
  };

  return (
    <aside className="fixed bottom-4 left-4 right-4 z-[100] mx-auto max-w-2xl border bg-background p-5 shadow-2xl">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-xl">
          <h2 className="font-semibold">Your privacy matters</h2>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            NyumbaFinder uses essential cookies to keep the site working. With your permission, we can also remember your search preferences to make future house suggestions more relevant.
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <Button variant="outline" onClick={() => choose({ analytics: false, personalization: false })}>Essential only</Button>
          <Button onClick={() => choose({ analytics: true, personalization: true })}>Allow preferences</Button>
        </div>
      </div>
    </aside>
  );
}
