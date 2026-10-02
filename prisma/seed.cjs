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
  // User-facing rental geography: major towns/cities by county.
  // The first town in each list is the county headquarters; additional entries are established major towns.
  // Areas/estates/neighborhoods are intentionally left as landlord-entered local names.
  const countyTowns = {
    "Mombasa": ["Mombasa"],
    "Kwale": ["Kwale", "Ukunda", "Msambweni", "Lunga Lunga"],
    "Kilifi": ["Kilifi", "Malindi", "Mariakani", "Watamu", "Mtwapa"],
    "Tana River": ["Hola", "Garsen", "Bura"],
    "Lamu": ["Lamu", "Mpeketoni", "Hindi"],
    "Taita Taveta": ["Wundanyi", "Voi", "Taveta", "Mwatate"],
    "Garissa": ["Garissa", "Dadaab", "Masalani"],
    "Wajir": ["Wajir", "Habaswein", "Buna", "Griftu"],
    "Mandera": ["Mandera", "El Wak", "Rhamu", "Takaba"],
    "Marsabit": ["Marsabit", "Moyale", "North Horr", "Laisamis"],
    "Isiolo": ["Isiolo", "Merti", "Garbatulla"],
    "Meru": ["Meru", "Maua", "Nkubu", "Timau"],
    "Tharaka Nithi": ["Kathwana", "Chuka", "Marimanti", "Maara"],
    "Embu": ["Embu", "Runyenjes", "Siakago", "Kiritiri"],
    "Kitui": ["Kitui", "Mwingi", "Mutomo", "Kyuso"],
    "Machakos": ["Machakos", "Athi River", "Mlolongo", "Kangundo", "Tala"],
    "Makueni": ["Wote", "Kibwezi", "Makindu", "Mtito Andei", "Sultan Hamud"],
    "Nyandarua": ["Ol Kalou", "Engineer", "Njabini", "Kinangop"],
    "Nyeri": ["Nyeri", "Othaya", "Karatina", "Mukurwe-ini"],
    "Kirinyaga": ["Kerugoya", "Kutus", "Wanguru", "Sagana"],
    "Murang'a": ["Murang'a", "Kenol", "Maragua", "Kangema", "Kandara"],
    "Kiambu": ["Kiambu", "Thika", "Ruiru", "Limuru", "Kikuyu", "Githunguri"],
    "Turkana": ["Lodwar", "Kakuma", "Lokichar", "Lokichoggio"],
    "West Pokot": ["Kapenguria", "Kacheliba", "Ortum"],
    "Samburu": ["Maralal", "Baragoi", "Archers Post"],
    "Trans Nzoia": ["Kitale", "Endebess", "Kiminini", "Kwanza"],
    "Uasin Gishu": ["Eldoret", "Burnt Forest", "Moiben", "Kesses"],
    "Elgeyo Marakwet": ["Iten", "Kapsowar", "Chebiemit", "Tambach"],
    "Nandi": ["Kapsabet", "Nandi Hills", "Mosoriot", "Meteitei"],
    "Baringo": ["Kabarnet", "Eldama Ravine", "Marigat", "Mogotio", "Kabartonjo"],
    "Laikipia": ["Nanyuki", "Nyahururu", "Rumuruti", "Doldol"],
    "Nakuru": ["Nakuru", "Naivasha", "Gilgil", "Molo", "Njoro", "Bahati"],
    "Narok": ["Narok", "Kilgoris", "Suswa", "Ololulunga"],
    "Kajiado": ["Kajiado", "Kitengela", "Ngong", "Ongata Rongai", "Loitokitok", "Namanga"],
    "Kericho": ["Kericho", "Litein", "Londiani", "Kipkelion"],
    "Bomet": ["Bomet", "Sotik", "Litein", "Longisa"],
    "Kakamega": ["Kakamega", "Mumias", "Butere", "Malava", "Shinyalu"],
    "Vihiga": ["Mbale", "Luanda", "Chavakali", "Majengo"],
    "Bungoma": ["Bungoma", "Webuye", "Kimilili", "Chwele", "Sirisia"],
    "Busia": ["Busia", "Malaba", "Nambale", "Funyula", "Port Victoria"],
    "Siaya": ["Siaya", "Bondo", "Ukwala", "Ugunja", "Yala"],
    "Kisumu": ["Kisumu", "Ahero", "Maseno", "Muhoroni", "Awasi"],
    "Homa Bay": ["Homa Bay", "Mbita", "Oyugis", "Kendu Bay", "Ndhiwa"],
    "Migori": ["Migori", "Rongo", "Kehancha", "Awendo", "Isebania"],
    "Kisii": ["Kisii", "Ogembo", "Keroka", "Suneka"],
    "Nyamira": ["Nyamira", "Keroka", "Nyansiongo", "Manga"],
    "Nairobi City": ["Nairobi"]
  };

  for (const [countyName, townNames] of Object.entries(countyTowns)) {
    const county = await prisma.county.findUnique({ where: { name: countyName } });
    if (!county) continue;

    for (const townName of townNames) {
      const slug = townName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      await prisma.locationNode.upsert({
        where: {
          countyId_level_slug_parentId: {
            countyId: county.id,
            level: "TOWN",
            slug,
            parentId: null
          }
        },
        update: {
          name: townName,
          source: "NyumbaFinder major-town master",
          searchRadiusKm: townName === townNames[0] ? 20 : 12,
          searchPriority: townName === townNames[0] ? 400 : 300
        },
        create: {
          countyId: county.id,
          level: "TOWN",
          name: townName,
          slug,
          source: "NyumbaFinder major-town master",
          searchRadiusKm: townName === townNames[0] ? 20 : 12,
          searchPriority: townName === townNames[0] ? 400 : 300
        }
      });
    }
  }

  // Import the supplied Kenyan administrative location master.
  // NAME_3 is represented as an administrative unit and NAME_4 as its child location.
  // This is deliberately separate from rental-market towns/estates, which will be layered on later.
  const locationMaster = require('./kenya-location-master.json');
  const normalizeSlug = (value) => String(value)
    .normalize('NFD')
    .replace(/[\\u0300-\\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  const parentIds = new Map();
  for (const [countyName, adminUnitName] of [...new Set(locationMaster.rows.map(([countyName, adminUnitName]) => [countyName, adminUnitName]).map(JSON.stringify))].map(JSON.parse)) {
    const county = await prisma.county.findUnique({ where: { name: countyName } });
    if (!county) continue;
    const slug = normalizeSlug(adminUnitName);
    const node = await prisma.locationNode.upsert({
      where: { countyId_level_slug_parentId: { countyId: county.id, level: 'ADMIN_UNIT', slug, parentId: null } },
      update: { name: adminUnitName, source: 'KEN_adm4.csv' },
      create: { countyId: county.id, level: 'ADMIN_UNIT', name: adminUnitName, slug, source: 'KEN_adm4.csv' }
    });
    parentIds.set(countyName + '::' + slug, node.id);
  }
  for (const [countyName, adminUnitName, locationName] of locationMaster.rows) {
    const county = await prisma.county.findUnique({ where: { name: countyName } });
    if (!county) continue;
    const parentId = parentIds.get(countyName + '::' + normalizeSlug(adminUnitName));
    if (!parentId) continue;
    const slug = normalizeSlug(locationName);
    await prisma.locationNode.upsert({
      where: { countyId_level_slug_parentId: { countyId: county.id, level: 'ADMIN_LOCATION', slug, parentId } },
      update: { name: locationName, source: 'KEN_adm4.csv' },
      create: { countyId: county.id, parentId, level: 'ADMIN_LOCATION', name: locationName, slug, source: 'KEN_adm4.csv' }
    });
  }

  console.log(`Seeded ${counties.length} Kenyan counties and county-capital location nodes.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
}).finally(() => prisma.$disconnect());
