import { type NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

function normalize(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

export async function GET(request: NextRequest) {
  try {
    const params = new URL(request.url).searchParams;
    const query = params.get('q')?.trim() || '';
    const countyId = params.get('countyId')?.trim() || '';
    const parentId = params.get('parentId')?.trim() || '';
    const level = params.get('level')?.trim() || '';
    const excludeLevel = params.get('excludeLevel')?.trim() || '';

    if (!query && !countyId && !parentId && !level) return NextResponse.json({ locations: [] });

    const normalizedQuery = normalize(query);
    const rows = await prisma.locationNode.findMany({
      where: {
        searchable: true,
        ...(countyId ? { countyId } : {}),
        ...(parentId ? { parentId } : {}),
        ...(level ? { level } : {}),
        ...(excludeLevel ? { NOT: { level: excludeLevel } } : {}),
        ...(query ? {
          OR: [
            { name: { contains: query, mode: 'insensitive' } },
            { slug: { contains: normalizedQuery.replace(/ /g, '-'), mode: 'insensitive' } },
            { aliases: { some: { normalized: { contains: normalizedQuery } } } },
          ],
        } : {}),
      },
      include: {
        county: { select: { id: true, name: true } },
        parent: { select: { id: true, name: true, level: true } },
      },
      take: query ? 30 : 1000,
    });

    const results = rows.map((node) => {
      const name = normalize(node.name);
      const exact = name === normalizedQuery;
      const starts = name.startsWith(normalizedQuery);
      const levelWeight =
        node.level === 'TOWN' || node.level === 'CITY' ? 300 :
        node.level === 'ESTATE' ? 250 :
        node.level === 'NEIGHBORHOOD' ? 240 :
        node.level === 'AREA' ? 230 :
        node.level === 'ADMIN_LOCATION' ? 180 :
        node.level === 'ADMIN_UNIT' ? 120 : 50;

      return {
        id: node.id,
        name: node.name,
        level: node.level,
        typeLabel: node.level === 'TOWN' ? 'Town / City' : node.level === 'ADMIN_UNIT' || node.level === 'ADMIN_LOCATION' ? 'Location' : node.level.charAt(0) + node.level.slice(1).toLowerCase().replace(/_/g, ' '),
        countyId: node.countyId,
        countyName: node.county.name,
        parentId: node.parentId,
        parentName: node.parent?.name ?? null,
        latitude: node.latitude,
        longitude: node.longitude,
        searchRadiusKm: node.searchRadiusKm,
        searchPriority: node.searchPriority,
        label: node.parent?.name && node.parent.name !== node.name
          ? node.name + ', ' + node.parent.name + ', ' + node.county.name
          : node.name + ', ' + node.county.name,
        _score: (exact ? 1000 : 0) + (starts ? 300 : 0) + levelWeight,
      };
    }).sort((a, b) => b._score - a._score || a.name.localeCompare(b.name))
      .slice(0, 15)
      .map(({ _score, ...location }) => location);

    return NextResponse.json({ locations: results });
  } catch (error) {
    console.error('API_ROUTE_ERROR: [GET /api/locations]', error);
    return NextResponse.json({ message: 'Error fetching locations.' }, { status: 500 });
  }
}
