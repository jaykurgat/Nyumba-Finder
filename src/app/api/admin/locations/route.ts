import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/require-admin';

export async function GET() {
  try {
    await requireAdmin();
    const counties = await prisma.county.findMany({
      orderBy: { name: 'asc' },
      include: { towns: { orderBy: { name: 'asc' }, include: { areas: { orderBy: { name: 'asc' } } } } },
    });
    return NextResponse.json(counties);
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED_ADMIN') return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    return NextResponse.json({ message: 'Unable to load locations.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();
    const body = await request.json();
    const kind = typeof body.kind === 'string' ? body.kind : '';
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    if (!name || !slug) return NextResponse.json({ message: 'Location name is required.' }, { status: 400 });

    if (kind === 'county') {
      const code = Number(body.code);
      if (!Number.isInteger(code)) return NextResponse.json({ message: 'County code is required.' }, { status: 400 });
      return NextResponse.json(await prisma.county.create({ data: { name, slug, code } }), { status: 201 });
    }
    if (kind === 'town') {
      const countyId = typeof body.countyId === 'string' ? body.countyId : '';
      return NextResponse.json(await prisma.town.create({ data: { name, slug, countyId } }), { status: 201 });
    }
    if (kind === 'area') {
      const townId = typeof body.townId === 'string' ? body.townId : '';
      return NextResponse.json(await prisma.area.create({ data: { name, slug, townId } }), { status: 201 });
    }
    return NextResponse.json({ message: 'Invalid location type.' }, { status: 400 });
  } catch (error: any) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED_ADMIN') return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    if (error?.code === 'P2002') return NextResponse.json({ message: 'That location already exists.' }, { status: 409 });
    return NextResponse.json({ message: 'Unable to create location.' }, { status: 500 });
  }
}
