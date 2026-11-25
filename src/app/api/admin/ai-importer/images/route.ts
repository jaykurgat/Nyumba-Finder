import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/require-admin';
import { fetchListingPage } from '@/lib/imports/source-fetch';
import { discoverPropertyImages, downloadPublicImage } from '@/lib/imports/source-images';
import { isSupportedImage } from '@/lib/security';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const MAX_IMAGE_BYTES = 3_000_000;
const kinds = ['PROPERTY', 'LOGO', 'BANNER', 'UNRELATED'];

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();
    const id = request.nextUrl.searchParams.get('id');
    if (!id) return NextResponse.json({ message: 'Image ID is required.' }, { status: 400 });
    const image = await prisma.importedListingImage.findUnique({ where: { id }, select: { data: true, mimeType: true } });
    if (!image) return NextResponse.json({ message: 'Review image not found.' }, { status: 404 });
    return new NextResponse(image.data, { headers: { 'Content-Type': image.mimeType, 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' } });
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED_ADMIN') return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    console.error('AI_IMPORTER_IMAGE_GET', error);
    return NextResponse.json({ message: 'Unable to load review image.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();
    const contentType = request.headers.get('content-type') ?? '';
    if (contentType.includes('multipart/form-data')) {
      const form = await request.formData();
      const listingId = String(form.get('listingId') ?? '');
      const file = form.get('file');
      if (!(file instanceof File) || !listingId) return NextResponse.json({ message: 'Choose an image file and listing.' }, { status: 400 });
      if (file.size <= 0 || file.size > MAX_IMAGE_BYTES) return NextResponse.json({ message: 'Each image must be between 1 byte and 3 MB.' }, { status: 413 });
      const listing = await prisma.externalListing.findUnique({ where: { id: listingId }, select: { id: true, status: true } });
      if (!listing || !['PENDING_REVIEW', 'POSSIBLE_DUPLICATE'].includes(listing.status)) return NextResponse.json({ message: 'Listing is not available for image review.' }, { status: 404 });
      const count = await prisma.importedListingImage.count({ where: { externalListingId: listingId } });
      if (count >= 12) return NextResponse.json({ message: 'A listing can have up to 12 review images.' }, { status: 400 });
      const data = new Uint8Array(await file.arrayBuffer());
      const mimeType = file.type.toLowerCase();
      if (!isSupportedImage(data, mimeType) || !['image/jpeg', 'image/png', 'image/webp'].includes(mimeType)) return NextResponse.json({ message: 'Upload a valid JPEG, PNG or WebP image.' }, { status: 415 });
      const position = await prisma.importedListingImage.count({ where: { externalListingId: listingId } });
      const image = await prisma.importedListingImage.create({ data: { externalListingId: listingId, data: data as Uint8Array<ArrayBuffer>, mimeType, kind: 'PROPERTY', position } });
      return NextResponse.json({ image: { id: image.id, url: `/api/admin/ai-importer/images?id=${image.id}`, kind: image.kind, permission: image.reusePermitted, position: image.position } }, { status: 201 });
    }

    const body = await request.json().catch(() => ({}));
    const listingId = typeof body.listingId === 'string' ? body.listingId : '';
    if (!listingId) return NextResponse.json({ message: 'Listing ID is required.' }, { status: 400 });
    const listing = await prisma.externalListing.findUnique({ where: { id: listingId }, select: { id: true, sourceUrl: true, rawData: true, status: true } });
    if (!listing || !['PENDING_REVIEW', 'POSSIBLE_DUPLICATE'].includes(listing.status)) return NextResponse.json({ message: 'Listing is not available for image review.' }, { status: 404 });

    if (body.action === 'discover') {
      let html = '';
      let pageUrl = typeof body.sourceUrl === 'string' && body.sourceUrl.trim() ? body.sourceUrl.trim() : listing.sourceUrl;
      if (pageUrl) {
        const fetched = await fetchListingPage(new URL(pageUrl));
        html = fetched.html;
        pageUrl = fetched.finalUrl;
      } else {
        const quick = (listing.rawData as any)?.quickImport ?? {};
        html = typeof quick.originalContent === 'string' ? quick.originalContent : '';
        pageUrl = typeof quick.originalUrl === 'string' ? quick.originalUrl : '';
      }
      if (!html) return NextResponse.json({ message: 'Add the source URL first, or use a pasted HTML import that contains image links.' }, { status: 400 });
      const manualPaste = !pageUrl;
      const candidates = discoverPropertyImages(html, pageUrl || 'https://manual.invalid/').filter(candidate => !manualPaste || new URL(candidate.url).hostname !== 'manual.invalid');
      return NextResponse.json({ candidates, message: candidates.length ? `Found ${candidates.length} image candidates. Select only photos of this property.` : 'No image candidates were found. You can upload property photos instead.' });
    }

    if (body.action === 'retrieve') {
      const url = typeof body.url === 'string' ? body.url.trim() : '';
      const kind = kinds.includes(body.kind) ? body.kind : 'PROPERTY';
      if (!url) return NextResponse.json({ message: 'Select a source image URL.' }, { status: 400 });
      const downloaded = await downloadPublicImage(url);
      const position = await prisma.importedListingImage.count({ where: { externalListingId: listingId } });
      if (position >= 12) return NextResponse.json({ message: 'A listing can have up to 12 review images.' }, { status: 400 });
      const image = await prisma.importedListingImage.create({ data: { externalListingId: listingId, data: downloaded.data as Uint8Array<ArrayBuffer>, mimeType: downloaded.mimeType, sourceUrl: downloaded.sourceUrl, kind, position } });
      return NextResponse.json({ image: { id: image.id, url: `/api/admin/ai-importer/images?id=${image.id}`, kind: image.kind, permission: image.reusePermitted, position: image.position } }, { status: 201 });
    }
    return NextResponse.json({ message: 'Unsupported image action.' }, { status: 400 });
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED_ADMIN') return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    console.error('AI_IMPORTER_IMAGE_POST', error);
    const message = error instanceof Error ? error.message : 'Unable to process review image.';
    return NextResponse.json({ message }, { status: /valid property URL|public HTTPS|Private and local|resolves exclusively/.test(message) ? 422 : 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    await requireAdmin();
    const id = request.nextUrl.searchParams.get('id');
    if (!id) return NextResponse.json({ message: 'Image ID is required.' }, { status: 400 });
    const image = await prisma.importedListingImage.findUnique({ where: { id }, include: { listing: { select: { status: true } } } });
    if (!image || !['PENDING_REVIEW', 'POSSIBLE_DUPLICATE'].includes(image.listing.status)) return NextResponse.json({ message: 'Review image not found.' }, { status: 404 });
    await prisma.importedListingImage.delete({ where: { id } });
    return NextResponse.json({ message: 'Review image removed.' });
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED_ADMIN') return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    console.error('AI_IMPORTER_IMAGE_DELETE', error);
    return NextResponse.json({ message: 'Unable to remove review image.' }, { status: 500 });
  }
}
