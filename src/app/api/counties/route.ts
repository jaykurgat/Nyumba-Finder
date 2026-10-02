import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const counties = await prisma.county.findMany({
      orderBy: { name: 'asc' },
      select: { id: true, name: true, slug: true, code: true },
    });

    return NextResponse.json({ counties });
  } catch (error) {
    console.error('API_ROUTE_ERROR: [GET /api/counties]', error);
    return NextResponse.json({ message: 'Error fetching counties.' }, { status: 500 });
  }
}
