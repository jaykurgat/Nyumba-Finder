import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/require-admin';

function parseCsv(text: string) {
  const rows: string[][] = [];
  let row: string[] = [], cell = '', quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"') {
        if (text[i + 1] === '"') { cell += '"'; i += 1; } else quoted = false;
      } else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',') { row.push(cell); cell = ''; }
    else if (ch === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; }
    else if (ch !== '\r') cell += ch;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows;
}

const slugify = (value: string) =>
  value.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

function typeFor(level: number, levelName: string) {
  if (level === 1) return 'COUNTY';
  if (level === 3) return 'ADMINISTRATIVE_UNIT';
  if (level === 4) return 'ADMINISTRATIVE_LOCATION';
  if (/town/i.test(levelName)) return 'TOWN';
  return 'AREA';
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();
    const formData = await request.formData();
    const file = formData.get('file');
    if (!(file instanceof File)) return NextResponse.json({ message: 'CSV file is required.' }, { status: 400 });
    if (file.size > 5 * 1024 * 1024) return NextResponse.json({ message: 'Location master CSV is too large.' }, { status: 400 });

    const rows = parseCsv(await file.text());
    if (!rows.length) return NextResponse.json({ message: 'CSV is empty.' }, { status: 400 });

    const headers = rows.shift()!.map((header) => header.trim());
    const index = Object.fromEntries(headers.map((header, i) => [header, i]));
    const required = ['location_id','parent_id','level','level_name','name','slug','county_code','county_name','admin_level_3','admin_level_4','latitude','longitude'];
    const missing = required.filter((key) => index[key] === undefined);
    if (missing.length) return NextResponse.json({ message: 'Missing required columns: ' + missing.join(', ') }, { status: 400 });

    const records = rows
      .filter((row) => row.length >= headers.length)
      .map((row) => ({
        id: row[index.location_id],
        parentId: row[index.parent_id] || null,
        level: Number(row[index.level]),
        levelName: row[index.level_name],
        name: row[index.name],
        slug: row[index.slug] || slugify(row[index.name]),
        countyCode: row[index.county_code] ? Number(row[index.county_code]) : null,
        countyName: row[index.county_name] || null,
        adminLevel3: row[index.admin_level_3] || null,
        adminLevel4: row[index.admin_level_4] || null,
        latitude: row[index.latitude] ? Number(row[index.latitude]) : null,
        longitude: row[index.longitude] ? Number(row[index.longitude]) : null,
        source: 'KEN_adm4.csv / NyumbaFinder consolidated location master',
        sourceKey: row[index.location_id],
        searchable: true,
      }))
      .filter((record) => record.id && record.name && Number.isInteger(record.level));

    records.sort((a, b) => a.level - b.level);

    let imported = 0;
    for (let i = 0; i < records.length; i += 50) {
      const chunk = records.slice(i, i + 50);
      await Promise.all(chunk.map((record) => prisma.geoLocation.upsert({
        where: { id: record.id },
        create: { ...record, type: typeFor(record.level, record.levelName) },
        update: { ...record, type: typeFor(record.level, record.levelName) },
      })));
      imported += chunk.length;
    }

    return NextResponse.json({ message: 'Location master imported successfully.', imported }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED_ADMIN') return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    console.error('LOCATION_MASTER_IMPORT_ERROR', error);
    return NextResponse.json({ message: 'Unable to import location master.' }, { status: 500 });
  }
}
