export type RuleBasedExtraction = {
  isPropertyListing: boolean;
  country: string | null;
  currency: string | null;
  sourceTitle: string | null;
  sourceDescription: string | null;
  generatedTitle: string;
  generatedDescription: string;
  price: number | null;
  propertyCategory: 'RESIDENTIAL' | 'COMMERCIAL' | 'LAND';
  propertyType: string;
  listingType: 'FOR_SALE' | 'FOR_RENT';
  pricePeriod: 'ONE_TIME' | 'MONTH' | 'WEEK' | 'DAY';
  location: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  sizeSqm: number | null;
  amenities: string[];
  latitude: number | null;
  longitude: number | null;
  confidence: Record<string, number>;
  missingFields: string[];
  fieldEvidence: Record<string, string>;
  contradictions: Array<{ field: string; values: string[]; evidence: string[] }>;
  seoTitle: string;
  metaDescription: string;
};

const uniqueNumbers = (values: number[]) => [...new Set(values)];
const numberWords: Record<string, number> = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10 };
const titleValue = (content: string) => content.match(/PAGE TITLE:\s*([^\n]+)/i)?.[1]?.trim() ?? null;

function evidenceFor(content: string, pattern: RegExp) {
  const match = content.match(pattern);
  return match?.[0]?.replace(/\s+/g, ' ').trim().slice(0, 300) ?? '';
}

/** Conservative, evidence-only parser for service outages. It refuses ambiguous facts. */
export function extractRuleBasedProperty(content: string, sourceUrl: string): RuleBasedExtraction | null {
  const sourceTitle = titleValue(content);
  const title = sourceTitle?.replace(/\s*[|–-]\s*PropertyPro Kenya\s*$/i, '').trim() ?? '';
  const allText = `${sourceTitle ?? ''}\n${content}`;
  const lower = allText.toLowerCase();

  const land = /\b(?:land|plot|acreage|acre|hectare)\b/i.test(allText);
  const commercial = /\b(?:office space|retail shop|showroom|warehouse|industrial space|commercial property|business premises|co-working)\b/i.test(allText);
  const propertyCategory: RuleBasedExtraction['propertyCategory'] = land ? 'LAND' : commercial ? 'COMMERCIAL' : 'RESIDENTIAL';
  const propertyType = propertyCategory === 'LAND' ? 'Land'
    : /\b(?:apartment|flat)\b/i.test(allText) ? 'Apartment'
    : /\bbedsitter\b/i.test(allText) ? 'Bedsitter'
    : /\bsingle room\b/i.test(allText) ? 'Single Room'
    : /\bmaisonette\b/i.test(allText) ? 'Maisonette'
    : /\btownhouse\b/i.test(allText) ? 'Townhouse'
    : /\bbungalow\b/i.test(allText) ? 'Bungalow'
    : /\bvilla\b/i.test(allText) ? 'Villa'
    : propertyCategory === 'COMMERCIAL' && /\bwarehouse\b/i.test(allText) ? 'Warehouse'
    : propertyCategory === 'COMMERCIAL' && /\boffice space\b/i.test(allText) ? 'Office Space'
    : propertyCategory === 'COMMERCIAL' && /\bretail shop|shop\b/i.test(allText) ? 'Retail Shop'
    : propertyCategory === 'COMMERCIAL' ? 'Business Premises'
    : /\bhouse\b/i.test(allText) ? 'House' : '';
  if (!propertyType) return null;

  const saleEvidence = evidenceFor(allText, /\b(?:for\s+sale|for\s+sell|sale)\b/i);
  const rentEvidence = evidenceFor(allText, /\b(?:for\s+rent|to\s+let|rent(?:al)?)\b/i);
  if (!!saleEvidence === !!rentEvidence) return null;
  const listingType = saleEvidence ? 'FOR_SALE' : 'FOR_RENT';

  const currencyMatch = allText.match(/\b(KSh|KES)\b/i);
  const currency = currencyMatch ? (/^kes$/i.test(currencyMatch[1]) ? 'KES' : 'KSh') : null;
  const priceMatches = [...allText.matchAll(/\b(?:KSh|KES)\s*([\d,]+(?:\.\d{1,2})?)/gi)]
    .map((match) => Number(match[1].replace(/,/g, '')))
    .filter((value) => Number.isFinite(value) && value > 0);
  const prices = uniqueNumbers(priceMatches);
  const price = currency && prices.length === 1 ? prices[0] : null;
  const priceEvidence = evidenceFor(allText, /\b(?:KSh|KES)\s*[\d,]+(?:\.\d{1,2})?/i);

  const bedroomValues = [...allText.matchAll(/\b(\d+|one|two|three|four|five|six|seven|eight|nine|ten)\s*(?:bed(?:room)?s?)\b/gi)]
    .map((match) => numberWords[match[1].toLowerCase()] ?? Number(match[1]))
    .filter((value) => Number.isInteger(value) && value >= 0 && value <= 30);
  const bedroomsFound = uniqueNumbers(bedroomValues);
  const bedrooms = bedroomsFound.length === 1 ? bedroomsFound[0] : null;
  const bedroomEvidence = evidenceFor(allText, /\b(?:\d+|one|two|three|four|five|six|seven|eight|nine|ten)\s*(?:bed(?:room)?s?)\b/i);

  const sizeValues = [...allText.matchAll(/\b([\d,.]+)\s*(?:sqm|sq\.?\s*m|m²|square\s*met(?:er|re)s?)\b/gi)]
    .map((match) => Number(match[1].replace(/,/g, '')))
    .filter((value) => Number.isFinite(value) && value > 0);
  const sizes = uniqueNumbers(sizeValues);
  const sizeSqm = sizes.length === 1 ? sizes[0] : null;
  const sizeEvidence = evidenceFor(allText, /\b[\d,.]+\s*(?:sqm|sq\.?\s*m|m²|square\s*met(?:er|re)s?)\b/i);

  const locationLine = content.match(/(?:og:description|description)\s*:\s*([^\n]+)/i)?.[1]
    ?? content.match(/VISIBLE PAGE TEXT:\s*[\s\S]*?\n[^\n]+\n([^\n]+)/i)?.[1]
    ?? '';
  const location = locationLine
    .split(/\b(?:KSh|KES|price|pid\s*:|for\s+sale|for\s+rent|to\s+let)\b/i)[0]
    .replace(/[.·|–-]+\s*$/g, '').trim() || null;
  const locationEvidence = location ? locationLine.trim().slice(0, 300) : '';

  const contradictions: RuleBasedExtraction['contradictions'] = [];
  if (prices.length > 1) contradictions.push({ field: 'price', values: prices.map(String), evidence: [priceEvidence] });
  if (bedroomsFound.length > 1) contradictions.push({ field: 'bedrooms', values: bedroomsFound.map(String), evidence: [bedroomEvidence] });
  if (sizes.length > 1) contradictions.push({ field: 'sizeSqm', values: sizes.map(String), evidence: [sizeEvidence] });

  const locationPhrase = location ? ` in ${location}` : '';
  const bedroomPhrase = bedrooms ? `${bedrooms}-Bedroom ` : '';
  const generatedTitle = `${bedroomPhrase}${propertyType}${locationPhrase}`.trim();
  const pricePhrase = price == null ? '' : ` The asking price is ${currency} ${price.toLocaleString('en-KE')}.`;
  const sizePhrase = sizeSqm == null ? '' : ` It has ${sizeSqm} sqm of space.`;
  const transactionPhrase = listingType === 'FOR_SALE' ? 'For sale' : 'For rent';
  const generatedDescription = `${transactionPhrase}${location ? ` in ${location}` : ''}: ${bedroomPhrase}${propertyType.toLowerCase()}.${sizePhrase}${pricePhrase}`.replace(/\s+/g, ' ').trim();

  const fieldEvidence: Record<string, string> = {};
  const confidence: Record<string, number> = {};
  const add = (field: string, evidence: string, score: number) => { if (evidence) { fieldEvidence[field] = evidence; confidence[field] = score; } };
  add('sourceTitle', title, 0.95);
  add('propertyType', evidenceFor(allText, /\b(?:apartment|flat|bedsitter|single room|maisonette|townhouse|bungalow|villa|house|land|plot|office space|warehouse|retail shop|shop)\b/i), 0.9);
  add('propertyCategory', land ? evidenceFor(allText, /\b(?:land|plot|acreage|acre|hectare)\b/i) : evidenceFor(allText, /\b(?:apartment|flat|residential|commercial|office|warehouse|shop)\b/i), 0.85);
  add('listingType', saleEvidence || rentEvidence, 0.95);
  add('currency', currencyMatch?.[0] ?? '', 0.99);
  add('price', priceEvidence, prices.length === 1 ? 0.98 : 0.2);
  add('bedrooms', bedroomEvidence, bedroomsFound.length === 1 ? 0.95 : 0.2);
  add('sizeSqm', sizeEvidence, sizes.length === 1 ? 0.95 : 0.2);
  add('location', locationEvidence, 0.8);

  const missingFields = ['bathrooms', 'amenities', 'latitude', 'longitude'];
  if (!location) missingFields.push('location');
  if (price == null) missingFields.push('price');
  if (bedrooms == null) missingFields.push('bedrooms');
  if (sizeSqm == null) missingFields.push('sizeSqm');
  const country = /\.co\.ke\b/i.test(sourceUrl) ? 'Kenya' : null;
  if (country) add('country', 'Kenyan source URL: ' + new URL(sourceUrl).hostname, 0.75);
  const sourceDescription = content.match(/(?:og:description|description)\s*:\s*([^\n]+)/i)?.[1]?.trim() ?? null;
  const seoTitle = generatedTitle.slice(0, 70);
  const metaDescription = generatedDescription.slice(0, 160);

  return {
    isPropertyListing: true, country, currency, sourceTitle: title || sourceTitle, sourceDescription,
    generatedTitle, generatedDescription, price, propertyCategory, propertyType,
    listingType, pricePeriod: listingType === 'FOR_SALE' ? 'ONE_TIME' : 'MONTH',
    location, bedrooms, bathrooms: null, sizeSqm, amenities: [], latitude: null, longitude: null,
    confidence, missingFields, fieldEvidence, contradictions, seoTitle, metaDescription,
  };
}
