const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const counties = [
  {
    "code": 1,
    "name": "Mombasa",
    "slug": "mombasa"
  },
  {
    "code": 2,
    "name": "Kwale",
    "slug": "kwale"
  },
  {
    "code": 3,
    "name": "Kilifi",
    "slug": "kilifi"
  },
  {
    "code": 4,
    "name": "Tana River",
    "slug": "tana-river"
  },
  {
    "code": 5,
    "name": "Lamu",
    "slug": "lamu"
  },
  {
    "code": 6,
    "name": "Taita Taveta",
    "slug": "taita-taveta"
  },
  {
    "code": 7,
    "name": "Garissa",
    "slug": "garissa"
  },
  {
    "code": 8,
    "name": "Wajir",
    "slug": "wajir"
  },
  {
    "code": 9,
    "name": "Mandera",
    "slug": "mandera"
  },
  {
    "code": 10,
    "name": "Marsabit",
    "slug": "marsabit"
  },
  {
    "code": 11,
    "name": "Isiolo",
    "slug": "isiolo"
  },
  {
    "code": 12,
    "name": "Meru",
    "slug": "meru"
  },
  {
    "code": 13,
    "name": "Tharaka Nithi",
    "slug": "tharaka-nithi"
  },
  {
    "code": 14,
    "name": "Embu",
    "slug": "embu"
  },
  {
    "code": 15,
    "name": "Kitui",
    "slug": "kitui"
  },
  {
    "code": 16,
    "name": "Machakos",
    "slug": "machakos"
  },
  {
    "code": 17,
    "name": "Makueni",
    "slug": "makueni"
  },
  {
    "code": 18,
    "name": "Nyandarua",
    "slug": "nyandarua"
  },
  {
    "code": 19,
    "name": "Nyeri",
    "slug": "nyeri"
  },
  {
    "code": 20,
    "name": "Kirinyaga",
    "slug": "kirinyaga"
  },
  {
    "code": 21,
    "name": "Murang'a",
    "slug": "muranga"
  },
  {
    "code": 22,
    "name": "Kiambu",
    "slug": "kiambu"
  },
  {
    "code": 23,
    "name": "Turkana",
    "slug": "turkana"
  },
  {
    "code": 24,
    "name": "West Pokot",
    "slug": "west-pokot"
  },
  {
    "code": 25,
    "name": "Samburu",
    "slug": "samburu"
  },
  {
    "code": 26,
    "name": "Trans Nzoia",
    "slug": "trans-nzoia"
  },
  {
    "code": 27,
    "name": "Uasin Gishu",
    "slug": "uasin-gishu"
  },
  {
    "code": 28,
    "name": "Elgeyo Marakwet",
    "slug": "elgeyo-marakwet"
  },
  {
    "code": 29,
    "name": "Nandi",
    "slug": "nandi"
  },
  {
    "code": 30,
    "name": "Baringo",
    "slug": "baringo"
  },
  {
    "code": 31,
    "name": "Laikipia",
    "slug": "laikipia"
  },
  {
    "code": 32,
    "name": "Nakuru",
    "slug": "nakuru"
  },
  {
    "code": 33,
    "name": "Narok",
    "slug": "narok"
  },
  {
    "code": 34,
    "name": "Kajiado",
    "slug": "kajiado"
  },
  {
    "code": 35,
    "name": "Kericho",
    "slug": "kericho"
  },
  {
    "code": 36,
    "name": "Bomet",
    "slug": "bomet"
  },
  {
    "code": 37,
    "name": "Kakamega",
    "slug": "kakamega"
  },
  {
    "code": 38,
    "name": "Vihiga",
    "slug": "vihiga"
  },
  {
    "code": 39,
    "name": "Bungoma",
    "slug": "bungoma"
  },
  {
    "code": 40,
    "name": "Busia",
    "slug": "busia"
  },
  {
    "code": 41,
    "name": "Siaya",
    "slug": "siaya"
  },
  {
    "code": 42,
    "name": "Kisumu",
    "slug": "kisumu"
  },
  {
    "code": 43,
    "name": "Homa Bay",
    "slug": "homa-bay"
  },
  {
    "code": 44,
    "name": "Migori",
    "slug": "migori"
  },
  {
    "code": 45,
    "name": "Kisii",
    "slug": "kisii"
  },
  {
    "code": 46,
    "name": "Nyamira",
    "slug": "nyamira"
  },
  {
    "code": 47,
    "name": "Nairobi City",
    "slug": "nairobi-city"
  }
];

async function main() {
  for (const county of counties) {
    await prisma.county.upsert({
      where: { code: county.code },
      update: { name: county.name, slug: county.slug },
      create: county,
    });
  }
  const countyCapitals = [
    ["Mombasa","Mombasa"],["Kwale","Kwale"],["Kilifi","Kilifi"],["Tana River","Hola"],["Lamu","Lamu"],
    ["Taita Taveta","Voi"],["Garissa","Garissa"],["Wajir","Wajir"],["Mandera","Mandera"],["Marsabit","Marsabit"],
    ["Isiolo","Isiolo"],["Meru","Meru"],["Tharaka Nithi","Kathwana"],["Embu","Embu"],["Kitui","Kitui"],
    ["Machakos","Machakos"],["Makueni","Wote"],["Nyandarua","Ol Kalou"],["Nyeri","Nyeri"],["Kirinyaga","Kerugoya"],
    ["Murang'a","Murang'a"],["Kiambu","Kiambu"],["Turkana","Lodwar"],["West Pokot","Kapenguria"],["Samburu","Maralal"],
    ["Trans Nzoia","Kitale"],["Uasin Gishu","Eldoret"],["Elgeyo Marakwet","Iten"],["Nandi","Kapsabet"],["Baringo","Kabarnet"],
    ["Laikipia","Nanyuki"],["Nakuru","Nakuru"],["Narok","Narok"],["Kajiado","Kajiado"],["Kericho","Kericho"],
    ["Bomet","Bomet"],["Kakamega","Kakamega"],["Vihiga","Vihiga"],["Bungoma","Bungoma"],["Busia","Busia"],
    ["Siaya","Siaya"],["Kisumu","Kisumu"],["Homa Bay","Homa Bay"],["Migori","Migori"],["Kisii","Kisii"],
    ["Nyamira","Nyamira"],["Nairobi City","Nairobi"]
  ];

  for (const county of counties) {
    const dbCounty = await prisma.county.findUnique({ where: { name: county.name } });
    if (!dbCounty) continue;
    await prisma.locationNode.upsert({
      where: { countyId_level_slug_parentId: {
        countyId: dbCounty.id, level: 'COUNTY', slug: county.slug, parentId: null
      } },
      update: { name: county.name, source: 'NyumbaFinder county master', searchRadiusKm: 35, searchPriority: 100 },
      create: {
        countyId: dbCounty.id, level: 'COUNTY', name: county.name, slug: county.slug,
        source: 'NyumbaFinder county master', searchRadiusKm: 35, searchPriority: 100
      }
    });
  }

  for (const [countyName, townName] of countyCapitals) {
    const county = await prisma.county.findUnique({ where: { name: countyName } });
    if (!county) continue;
    await prisma.locationNode.upsert({
      where: {
        countyId_level_slug_parentId: {
          countyId: county.id,
          level: "TOWN",
          slug: townName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
          parentId: null
        }
      },
      update: {
        name: townName,
        source: "NyumbaFinder county-capital master",
        searchRadiusKm: 15,
        searchPriority: 300
      },
      create: {
        countyId: county.id,
        level: "TOWN",
        name: townName,
        slug: townName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
        source: "NyumbaFinder county-capital master",
        searchRadiusKm: 15,
        searchPriority: 300
      }
    });
  }

  // Import the supplied Kenyan administrative location master.\n  // NAME_3 is represented as an administrative unit and NAME_4 as its child location.\n  // This is deliberately separate from rental-market towns/estates, which will be layered on later.\n  const locationMaster = require('./kenya-location-master.json');\n  const normalizeSlug = (value) => String(value)\n    .normalize('NFD')\n    .replace(/[\\u0300-\\u036f]/g, '')\n    .toLowerCase()\n    .replace(/[^a-z0-9]+/g, '-')\n    .replace(/^-|-$/g, '');\n  const parentIds = new Map();\n  for (const [countyName, adminUnitName] of [...new Set(locationMaster.rows.map(([countyName, adminUnitName]) => [countyName, adminUnitName]).map(JSON.stringify))].map(JSON.parse)) {\n    const county = await prisma.county.findUnique({ where: { name: countyName } });\n    if (!county) continue;\n    const slug = normalizeSlug(adminUnitName);\n    const node = await prisma.locationNode.upsert({\n      where: { countyId_level_slug_parentId: { countyId: county.id, level: 'ADMIN_UNIT', slug, parentId: null } },\n      update: { name: adminUnitName, source: 'KEN_adm4.csv' },\n      create: { countyId: county.id, level: 'ADMIN_UNIT', name: adminUnitName, slug, source: 'KEN_adm4.csv' }\n    });\n    parentIds.set(countyName + '::' + slug, node.id);\n  }\n  for (const [countyName, adminUnitName, locationName] of locationMaster.rows) {\n    const county = await prisma.county.findUnique({ where: { name: countyName } });\n    if (!county) continue;\n    const parentId = parentIds.get(countyName + '::' + normalizeSlug(adminUnitName));\n    if (!parentId) continue;\n    const slug = normalizeSlug(locationName);\n    await prisma.locationNode.upsert({\n      where: { countyId_level_slug_parentId: { countyId: county.id, level: 'ADMIN_LOCATION', slug, parentId } },\n      update: { name: locationName, source: 'KEN_adm4.csv' },\n      create: { countyId: county.id, parentId, level: 'ADMIN_LOCATION', name: locationName, slug, source: 'KEN_adm4.csv' }\n    });\n  }\n\n  console.log(`Seeded ${counties.length} Kenyan counties and county-capital location nodes.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
}).finally(() => prisma.$disconnect());
