export type ExtractionContradiction = { field: string; values: string[]; evidence: string[] };

export function normalizeExtractionEvidence(value: {
  confidence?: unknown;
  fieldEvidence?: unknown;
  missingFields?: unknown;
  contradictions?: unknown;
}) {
  const confidence: Record<string, number> = {};
  if (value.confidence && typeof value.confidence === 'object' && !Array.isArray(value.confidence)) {
    for (const [field, score] of Object.entries(value.confidence as Record<string, unknown>).slice(0, 40)) {
      if (field.trim() && typeof score === 'number' && Number.isFinite(score)) confidence[field.slice(0, 80)] = Math.max(0, Math.min(1, score));
    }
  }

  const fieldEvidence: Record<string, string> = {};
  if (value.fieldEvidence && typeof value.fieldEvidence === 'object' && !Array.isArray(value.fieldEvidence)) {
    for (const [field, quote] of Object.entries(value.fieldEvidence as Record<string, unknown>).slice(0, 40)) {
      if (field.trim() && typeof quote === 'string' && quote.trim()) fieldEvidence[field.slice(0, 80)] = quote.trim().slice(0, 400);
    }
  }

  const missingFields = Array.isArray(value.missingFields)
    ? [...new Set(value.missingFields.filter((field): field is string => typeof field === 'string' && !!field.trim()).map((field) => field.trim().slice(0, 80)))].slice(0, 40)
    : [];

  const contradictions: ExtractionContradiction[] = Array.isArray(value.contradictions)
    ? value.contradictions.filter((item): item is ExtractionContradiction =>
      !!item && typeof item === 'object' && typeof (item as ExtractionContradiction).field === 'string' &&
      Array.isArray((item as ExtractionContradiction).values) && Array.isArray((item as ExtractionContradiction).evidence) &&
      (item as ExtractionContradiction).values.every((part) => typeof part === 'string') &&
      (item as ExtractionContradiction).evidence.every((part) => typeof part === 'string'))
      .slice(0, 20)
      .map((item) => ({
        field: item.field.trim().slice(0, 80),
        values: item.values.map((part) => part.trim().slice(0, 200)).slice(0, 10),
        evidence: item.evidence.map((part) => part.trim().slice(0, 400)).slice(0, 10),
      }))
    : [];

  for (const contradiction of contradictions) {
    const field = contradiction.field.toLowerCase();
    const affected = field.includes('price') || field.includes('amount') ? 'price'
      : field.includes('bed') ? 'bedrooms'
      : field.includes('bath') ? 'bathrooms'
      : field.includes('area') || field.includes('size') || field.includes('sqm') ? 'sizeSqm'
      : field.includes('location') || field.includes('address') || field.includes('county') ? 'location'
      : field.includes('transaction') || field.includes('listing type') || field.includes('sale') || field.includes('rent') ? 'listingType'
      : null;
    if (affected) confidence[affected] = Math.min(confidence[affected] ?? 0.4, 0.4);
  }

  return { confidence, fieldEvidence, missingFields, contradictions };
}
