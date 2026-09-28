import { getCookieConsent } from './CookieConsentBanner';

type SearchPreference = {
  location?: string;
  propertyType?: string;
  bedrooms?: string;
};

const PREFERENCE_KEY = 'nyumbafinder_search_preferences';

export function rememberSearchPreference(preference: SearchPreference) {
  if (typeof document === 'undefined') return;
  if (!getCookieConsent()?.personalization) return;

  let existing: SearchPreference[] = [];
  const match = document.cookie.match(new RegExp('(?:^|; )' + PREFERENCE_KEY + '=([^;]*)'));
  if (match) {
    try { existing = JSON.parse(decodeURIComponent(match[1])) as SearchPreference[]; } catch {}
  }

  const normalized = {
    location: preference.location?.trim() || undefined,
    propertyType: preference.propertyType && preference.propertyType !== 'Any type' ? preference.propertyType : undefined,
    bedrooms: preference.bedrooms && preference.bedrooms !== 'Any bedrooms' ? preference.bedrooms : undefined,
  };

  existing = [normalized, ...existing.filter(item => JSON.stringify(item) !== JSON.stringify(normalized))].slice(0, 10);
  document.cookie = `${PREFERENCE_KEY}=${encodeURIComponent(JSON.stringify(existing))}; Max-Age=15552000; Path=/; SameSite=Lax`;
}
