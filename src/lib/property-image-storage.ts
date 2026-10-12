import { del, put } from '@vercel/blob';

const BLOB_TOKEN = process.env.BLOB_READ_WRITE_TOKEN;

export async function storePropertyImage(
  propertyId: string,
  bytes: Uint8Array,
  contentType: string,
): Promise<string> {
  if (!BLOB_TOKEN) {
    throw new Error('Property image storage is not configured. Set BLOB_READ_WRITE_TOKEN in the deployment environment.');
  }

  const extension = contentType === 'image/webp' ? 'webp' : 'jpg';
  const blob = await put(
    `properties/${propertyId}/${crypto.randomUUID()}.${extension}`,
    Buffer.from(bytes),
    {
      access: 'public',
      contentType,
      addRandomSuffix: false,
      cacheControlMaxAge: 60 * 60 * 24 * 365,
      token: BLOB_TOKEN,
    },
  );
  return blob.url;
}

export async function deletePropertyImages(urls: string[]): Promise<void> {
  const blobUrls = urls.filter((url) => {
    try {
      return new URL(url).hostname.endsWith('.public.blob.vercel-storage.com')
        || new URL(url).hostname.endsWith('.blob.vercel-storage.com');
    } catch {
      return false;
    }
  });

  if (!blobUrls.length) return;
  if (!BLOB_TOKEN) {
    console.error('BLOB_READ_WRITE_TOKEN is missing; skipped deleting property images from Blob.');
    return;
  }

  try {
    await del(blobUrls, { token: BLOB_TOKEN });
  } catch (error) {
    // A failed cleanup should not break listing edits/deletions; log for later cleanup.
    console.error('PROPERTY_IMAGE_BLOB_CLEANUP_FAILED', error);
  }
}
