import { NextRequest, NextResponse } from 'next/server';
import { runAuthorizedSourceImport } from '@/lib/imports/importer';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const configuredSecret = process.env.IMPORT_CRON_SECRET || process.env.CRON_SECRET;
  const providedSecret = request.headers.get('x-import-secret');

  if (!configuredSecret || !providedSecret || providedSecret !== configuredSecret) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const source = typeof body.source === 'string' ? body.source.trim() : '';

  if (!source) {
    return NextResponse.json({ message: 'source is required' }, { status: 400 });
  }

  try {
    return NextResponse.json(await runAuthorizedSourceImport(source));
  } catch (error) {
    console.error('IMPORT_RUN_ERROR', error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Import failed' },
      { status: 500 }
    );
  }
}
