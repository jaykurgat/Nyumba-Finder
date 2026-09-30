import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const result = await prisma.$queryRaw<Array<{ postgis_version: string }>>`
      SELECT PostGIS_Version() AS postgis_version
    `;

    return NextResponse.json({
      ok: true,
      database: 'postgresql',
      postgis: result[0]?.postgis_version ?? null,
    });
  } catch (error) {
    console.error('Database health check failed:', error);

    return NextResponse.json(
      {
        ok: false,
        database: 'postgresql',
        message: 'Database connection failed',
      },
      { status: 503 },
    );
  }
}
