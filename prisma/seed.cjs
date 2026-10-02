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
        source: "NyumbaFinder county-capital master"
      },
      create: {
        countyId: county.id,
        level: "TOWN",
        name: townName,
        slug: townName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
        source: "NyumbaFinder county-capital master"
      }
    });
  }

  console.log(`Seeded ${counties.length} Kenyan counties and county-capital location nodes.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
}).finally(() => prisma.$disconnect());
