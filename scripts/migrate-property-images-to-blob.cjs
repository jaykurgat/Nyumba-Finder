const { PrismaClient } = require('@prisma/client');
const { put } = require('@vercel/blob');

const prisma = new PrismaClient();
const token = process.env.BLOB_READ_WRITE_TOKEN;
const batchSize = 25;

if (!token) {
  console.error('Missing BLOB_READ_WRITE_TOKEN. Connect the NyumbaFinder Blob store before running this migration.');
  process.exit(1);
}

function extensionFor(mimeType) {
  if (mimeType === 'image/webp') return 'webp';
  if (mimeType === 'image/png') return 'png';
  if (mimeType === 'image/gif') return 'gif';
  return 'jpg';
}

async function main() {
  let migrated = 0;

  while (true) {
    const images = await prisma.propertyImage.findMany({
      where: { url: null, data: { not: null } },
      orderBy: { createdAt: 'asc' },
      take: batchSize,
      select: { id: true, propertyId: true, data: true, mimeType: true },
    });

    if (!images.length) break;

    for (const image of images) {
      if (!image.data) continue;
      const pathname = `properties/${image.propertyId}/legacy-${image.id}.${extensionFor(image.mimeType)}`;
      const blob = await put(pathname, Buffer.from(image.data), {
        access: 'public',
        contentType: image.mimeType,
        addRandomSuffix: false,
        token,
      });

      await prisma.propertyImage.update({
        where: { id: image.id },
        data: { url: blob.url, data: null },
      });

      migrated += 1;
      console.log(`Migrated ${migrated} property image(s)`);
    }
  }

  console.log(`Finished. Migrated ${migrated} existing image(s) to Vercel Blob.`);
}

main()
  .catch((error) => {
    console.error('Property image migration failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
