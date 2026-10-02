import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const counties = await prisma.county.findMany({
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        slug: true,
        code: true,
        locationNodes: {
          where: { level: 'COUNTY', parentId: null },
          select: { id: true },
          take: 1,
        },
      },
    });

    return NextResponse.json({
      counties: counties.map(({ locationNodes, ...county }) => ({
        ...county,
        locationNodeId: locationNodes[0]?.id ?? null,
      })),
    });
  } catch (error) {
    console.error('API_ROUTE_ERROR: [GET /api/counties]', error);
    return NextResponse.json({ message: 'Error fetching counties.' }, { status: 500 });
  }
}
