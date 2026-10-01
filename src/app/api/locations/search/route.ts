import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const normalize = (value: string) =>
  value.trim().toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

export async function GET(request: NextRequest) {
  const q = normalize(new URL(request.url).searchParams.get('q') || '');
  if (q.length < 2) return NextResponse.json([]);

  try {
    const locations = await prisma.geoLocation.findMany({
      where: {
        searchable: true,
        OR: [
          { name: { contains: q, mode: 'insensitive' } },
          { slug: { contains: q, mode: 'insensitive' } },
          { countyName: { contains: q, mode: 'insensitive' } },
          { adminLevel3: { contains: q, mode: 'insensitive' } },
          { adminLevel4: { contains: q, mode: 'insensitive' } },
          { aliases: { some: { normalized: { contains: q, mode: 'insensitive' } } } },
        ],
      },
      include: {
        parent: { select: { id: true, name: true, level: true } },
        aliases: { select: { alias: true } },
      },
      orderBy: [{ level: 'asc' }, { name: 'asc' }],
      take: 12,
    });

    return NextResponse.json(locations.map((location) => ({
      id: location.id,
      name: location.name,
      type: location.type,
      level: location.level,
      parent: location.parent?.name || location.countyName || null,
      county: location.countyName,
      latitude: location.latitude,
      longitude: location.longitude,
      aliases: location.aliases.map((alias) => alias.alias),
    })));
  } catch (error) {
    console.error('LOCATION_SEARCH_ERROR', error);
    return NextResponse.json({ message: 'Unable to search locations.' }, { status: 500 });
  }
}
