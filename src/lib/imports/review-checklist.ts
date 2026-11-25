export type ReviewImage = { id?: string; url?: string; kind: 'PROPERTY' | 'LOGO' | 'BANNER' | 'UNRELATED'; permission: boolean };

export function reviewChecklist(input: {
  title?: string | null; description?: string | null; propertyType?: string | null; price?: number | null;
  location?: string | null; sourceUrl?: string | null; manualSourceException?: boolean;
  images?: ReviewImage[]; duplicateChecked?: boolean; administratorVerified?: boolean;
}) {
  const propertyPhotos = (input.images ?? []).filter((image) => image.kind === 'PROPERTY' && image.permission && (!!image.id || /^https:\/\//i.test(image.url ?? '')));
  const checks = [
    ['Title', !!input.title?.trim()], ['Description', !!input.description?.trim()],
    ['Property type', !!input.propertyType?.trim()], ['Valid price', input.price != null && Number.isFinite(input.price) && input.price > 0],
    ['Location', !!input.location?.trim()], ['Source URL or documented exception', !!input.sourceUrl?.trim() || input.manualSourceException === true],
    ['At least one property photo', propertyPhotos.length > 0], ['Duplicate check', input.duplicateChecked === true],
    ['Administrator verification', input.administratorVerified === true],
  ] as const;
  return { checks: checks.map(([label, complete]) => ({ label, complete })), complete: checks.every(([, complete]) => complete), photoCount: propertyPhotos.length, recommendedPhotoCount: 3 };
}
