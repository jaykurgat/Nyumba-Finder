const fs = require('node:fs');
const path = require('node:path');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

function parseCsv(text) {
  const rows = [];
  let row = [], cell = '', quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"') {
        if (text[i + 1] === '"') { cell += '"'; i += 1; }
        else quoted = false;
      } else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',') { row.push(cell); cell = ''; }
    else if (ch === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; }
    else if (ch !== '\r') cell += ch;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows;
}

function slugify(value) {
  return value.toLowerCase().normalize('NFKD').replace(/[\\u0300-\\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function locationType(level, levelName) {
  if (level === 1) return 'COUNTY';
  if (level === 3) return 'ADMINISTRATIVE_UNIT';
  if (level === 4) return 'ADMINISTRATIVE_LOCATION';
  if (/town/i.test(levelName)) return 'TOWN';
  return 'AREA';
}

async function main() {
  const input = process.argv[2] || path.join(process.cwd(), 'data', 'NyumbaFinder_Kenya_Location_Master.csv');
  if (!fs.existsSync(input)) {
    throw new Error('Location master CSV not found. Expected: ' + input);
  }

  const rows = parseCsv(fs.readFileSync(input, 'utf8'));
  const headers = rows.shift();
  const index = Object.fromEntries(headers.map((header, i) => [header.trim(), i]));
  const records = rows.filter((row) => row.length >= headers.length).map((row) => ({
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
  })).filter((record) => record.id && record.name);

  records.sort((a, b) => a.level - b.level);

  let count = 0;
  for (const record of records) {
    await prisma.geoLocation.upsert({
      where: { id: record.id },
      create: { ...record, type: locationType(record.level, record.levelName) },
      update: { ...record, type: locationType(record.level, record.levelName) },
    });
    count += 1;
    if (count % 100 === 0) console.log('Imported', count, 'locations');
  }

  console.log('Imported', count, 'locations.');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}).finally(() => prisma.$disconnect());
