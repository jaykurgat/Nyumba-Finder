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
      const existingTown = await prisma.locationNode.findFirst({
        where: {
          countyId: county.id,
          level: "TOWN",
          slug,
          parentId: null
        }
      });
      const townData = {
        name: townName,
        source: "NyumbaFinder major-town master",
        searchRadiusKm: townName === townNames[0] ? 20 : 12,
        searchPriority: townName === townNames[0] ? 400 : 300
      };
      if (existingTown) {
        await prisma.locationNode.update({
          where: { id: existingTown.id },
          data: townData
        });
      } else {
        await prisma.locationNode.create({
          data: {
            countyId: county.id,
            level: "TOWN",
            name: townName,
            slug,
            ...townData
          }
        });
      }
    }
  }

  // Curated rental-market area names for major Kenyan cities. These are
  // user-facing search terms, not administrative boundaries.
  const majorCityAreaMasters = {
    "Mombasa": [
      "Mombasa Island", "Kizingo", "Tudor", "Tononoka", "Old Town", "Majengo",
      "Ganjoni", "Makupa", "Nyali", "Nyali Estate", "Kongowea", "Mkomani",
      "Kisauni", "Bamburi", "Bamburi Mtambo", "Bamburi Mwembeni", "Mtwapa",
      "Shanzu", "Mtwapa Creek", "Likoni", "Shelly Beach", "Mtongwe",
      "Changamwe", "Port Reitz", "Miritini", "Mikindani", "Jomvu", "Magongo",
      "Airport", "Dunga Road", "Mombasa CBD"
    ],
    "Nakuru": [
      "Nakuru CBD", "Biashara", "Milimani", "Milimani Estate", "Section 58",
      "London", "Kiamunyi", "Lanet", "Lanet Umoja", "Naka", "Pipeline",
      "Free Area", "Shabab", "Bondeni", "Flamingo", "Rhonda", "Kaptembwa",
      "Menengai", "Menengai West", "Kiamunyi Estate", "Kapkures",
      "Kivumbini", "Nakuru West", "Nakuru East"
    ],
    "Kisumu": [
      "Kisumu CBD", "Milimani", "Milimani Estate", "Mamboleo", "Mamboleo Junction",
      "Manyatta", "Manyatta B", "Manyatta Arab", "Nyalenda", "Nyalenda A",
      "Nyalenda B", "Kondele", "Migosi", "Tom Mboya Estate", "Lolwe",
      "Riat Hills", "Nyamasaria", "Polyview", "Dunga", "Kanyakwar",
      "Obunga", "Kajulu", "Airport", "Kibos", "Otonglo"
    ],
    "Eldoret": [
      "Eldoret CBD", "Pioneer", "Pioneer Estate", "Kapsoya", "Elgon View",
      "Elgon View Estate", "Langas", "Annex", "Huruma", "Kimumu", "Kipkenyo",
      "Kiplombe", "Chepkoilel", "Racecourse", "West Indies", "Kipkaren",
      "Maili Nne", "Munyaka", "Kesses Road", "Kapsoya Estate", "King'ong'o",
      "Hawaii", "Action", "Roadblock", "Kenmosa"
    ]
  };

  for (const [townName, areaNames] of Object.entries(majorCityAreaMasters)) {
    const countyForTown = await prisma.county.findFirst({
      where: {
        name: townName === "Eldoret" ? "Uasin Gishu" :
          townName === "Kisumu" ? "Kisumu" :
          townName === "Nakuru" ? "Nakuru" : "Mombasa"
      }
    });
    if (!countyForTown) continue;

    const townNode = await prisma.locationNode.findFirst({
      where: {
        countyId: countyForTown.id,
        level: "TOWN",
        slug: townName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
        parentId: null
      }
    });
    if (!townNode) continue;

    const seenAreaSlugs = new Set();
    for (const areaName of areaNames) {
      const slug = areaName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      if (seenAreaSlugs.has(slug)) continue;
      seenAreaSlugs.add(slug);

      const existingArea = await prisma.locationNode.findFirst({
        where: { countyId: countyForTown.id, level: "AREA", slug, parentId: townNode.id }
      });
      const areaData = {
        name: areaName,
        source: "NyumbaFinder major-city rental-area master",
        searchable: true,
        searchRadiusKm: 5,
        searchPriority: 200
      };
      if (existingArea) {
        await prisma.locationNode.update({ where: { id: existingArea.id }, data: areaData });
      } else {
        await prisma.locationNode.create({
          data: { countyId: countyForTown.id, parentId: townNode.id, level: "AREA", slug, ...areaData }
        });
      }
    }
  }

  // Nairobi rental-market area suggestions. These are user-facing place names, not
  // administrative boundaries. Landlords can still enter any local name not listed here.
  const nairobiAreaNames = [
    "Nairobi Central",
    "CBD",
    "Ngara",
    "Pangani",
    "Ziwani",
    "Kariokor",
    "Landimawe",
    "Nairobi River",
    "Pumwani",
    "Gikomba",
    "Eastleigh North",
    "Eastleigh South",
    "Eastleigh",
    "California",
    "Airbase",
    "Shauri Moyo",
    "Muthurwa",
    "Kamukunji",
    "Maringo",
    "Hamza",
    "Jericho",
    "Kaloleni",
    "Makongeni",
    "Harambee",
    "Bahati",
    "Mbotela",
    "Makadara",
    "Viwandani",
    "Industrial Area",
    "Jogoo Road",
    "Westlands",
    "Parklands",
    "Parklands/Highridge",
    "Highridge",
    "Kitisuru",
    "Karura",
    "Kangemi",
    "Mountain View",
    "Loresho",
    "Lower Kabete",
    "Kyuna",
    "Spring Valley",
    "Spring Valley Extension",
    "Muthaiga",
    "Muthaiga North",
    "New Muthaiga",
    "Gigiri",
    "Rosslyn",
    "Rosslyn Lone Tree",
    "Rosslyn Riviera",
    "Runda",
    "Runda Estate",
    "Runda Mimosa",
    "Runda Meadows",
    "Runda Evergreen",
    "Runda Paradise",
    "Nyari",
    "Nyari Estate",
    "Thigiri",
    "Ridgeways",
    "Garden Estate",
    "Marurui",
    "Githogoro",
    "Kibagare",
    "Deep Sea",
    "Fourways",
    "Five Star Gardens",
    "City Park",
    "City Park Estate",
    "Muthaiga Square",
    "Thindigua",
    "Kilimani",
    "Kilimani Estate",
    "Kileleshwa",
    "Lavington",
    "Lavington Green",
    "Hurlingham",
    "Hurlingham Estate",
    "Riverside",
    "Riverside Drive",
    "Brookside",
    "Woodlands",
    "Muthangari",
    "Yaya",
    "Adams Arcade",
    "Hatheru",
    "Kabarnet Gardens",
    "Valley Arcade",
    "Jamhuri",
    "Jamhuri Estate",
    "Woodley",
    "Woodley Estate",
    "Kenyatta Golf Course",
    "Golf Course",
    "Prestige",
    "Dennis Pritt",
    "Ngong Road",
    "Nairobi Dam",
    "Nairobi Dam Estate",
    "Caledonia",
    "Caledonia Estate",
    "Upper Hill",
    "Nairobi Upper Hill",
    "State House",
    "Milimani",
    "Madaraka",
    "Dagoretti",
    "Dagoretti Corner",
    "Gatina",
    "Kabiro",
    "Kawangware",
    "Kawangware 46",
    "Kawangware 56",
    "Riruta",
    "Riruta Satellite",
    "Satellite",
    "Mutuini",
    "Mutuini Estate",
    "Ngando",
    "Uthiru",
    "Uthiru/Ruthimitu",
    "Ruthimitu",
    "Waithaka",
    "Kinoo",
    "Kikuyu Road",
    "Waiyaki Way",
    "Muguga",
    "Kabete",
    "Karen",
    "Karen Hardy",
    "Karen Shopping Centre",
    "Lang'ata",
    "Langata",
    "Nairobi West",
    "Mugumo-ini",
    "Mugumoini",
    "South C",
    "South C Estate",
    "Nyayo Highrise",
    "Nyayo Estate",
    "Otiende",
    "Wilson",
    "Wilson Airport",
    "Mbagathi",
    "Mbagathi Way",
    "Nairobi South",
    "Mukuru Kwa Njenga",
    "Mukuru Kwa Reuben",
    "Mukuru Kayaba",
    "Kibra",
    "Kibera",
    "Laini Saba",
    "Lindi",
    "Makina",
    "Woodley/Kenyatta Golf",
    "Sarang'ombe",
    "Sarangombe",
    "Olympic",
    "Olympic Estate",
    "Ayany",
    "Kibera Drive",
    "Toi Market",
    "South B",
    "South B Estate",
    "Imara Daima",
    "Pipeline",
    "Kware",
    "Kwa Njenga",
    "Kwa Reuben",
    "Baraka",
    "Baraka Estate",
    "Nyayo Village",
    "Fedha",
    "Fedha Estate",
    "Tassia",
    "Tassia Estate",
    "Tasia",
    "Donholm",
    "Donholm Estate",
    "Greenfields",
    "Savannah",
    "Savannah Estate",
    "Mombasa Road",
    "Belle Vue",
    "Syokimau",
    "Athi View",
    "Airport View",
    "City Cabanas",
    "Embakasi",
    "Embakasi Village",
    "Umoja",
    "Umoja I",
    "Umoja II",
    "Umoja Innercore",
    "Umoja Estate",
    "Mowlem",
    "Kariobangi South",
    "Kariobangi North",
    "Kariobangi",
    "Dandora",
    "Dandora Area I",
    "Dandora Area II",
    "Dandora Area III",
    "Dandora Area IV",
    "Kayole",
    "Kayole North",
    "Kayole Central",
    "Kayole South",
    "Komarock",
    "Komarock Estate",
    "Matopeni",
    "Mihango",
    "Mihang'o",
    "Upper Savanna",
    "Lower Savanna",
    "Utawala",
    "Utawala Estate",
    "Njiru",
    "Ruai",
    "Ruai Town",
    "Kamulu",
    "Joska",
    "Mihango Estate",
    "Tena",
    "Tena Estate",
    "Soweto",
    "Saika",
    "Obama Estate",
    "Mukuru",
    "Kasarani",
    "Kasarani Mwiki",
    "Mwiki",
    "Clay City",
    "Roysambu",
    "Zimmerman",
    "Kahawa",
    "Kahawa West",
    "Kahawa Sukari",
    "Githurai",
    "Githurai 44",
    "Githurai 45",
    "Githurai Kimbo",
    "Ruaraka",
    "Babadogo",
    "Utalii",
    "Mathare North",
    "Lucky Summer",
    "Korogocho",
    "Mathare",
    "Huruma",
    "Mabatini",
    "Ngei",
    "Mlango Kubwa",
    "Hospital",
    "Mlango Soko",
    "Roysambu Estate",
    "Thika Road",
    "Mirema",
    "Mirema Springs",
    "Buruburu",
    "Buruburu Phase 1",
    "Buruburu Phase 2",
    "Buruburu Phase 3",
    "Buruburu Phase 4",
    "Buruburu Phase 5",
    "Uhuru Estate",
    "Uhuru",
    "Jericho Estate",
    "Bahati Estate",
    "Maringo Estate",
    "Makongeni Estate",
    "Harambee Estate",
    "Akiba",
    "Akiba Estate",
    "Hazina",
    "Hazina Estate",
    "Mugoya",
    "Mugoya Estate",
    "Riverbank",
    "River Bank Estate",
    "Kimathi",
    "Kimathi Estate",
    "Pioneer",
    "Pioneer Estate",
    "Donholm Phase 5",
    "Kayole Junction",
    "Soweto Kayole",
    "Mukuru Kwa Njenga Estate",
    "Mukuru Kwa Reuben Estate",
    "Lavington Estate",
    "Riverside Estate",
    "Kileleshwa Estate",
    "Parklands Estate",
    "Westlands Estate",
  ];
  const nairobiCounty = await prisma.county.findUnique({ where: { name: "Nairobi City" } });
  const nairobiTown = nairobiCounty
    ? await prisma.locationNode.findFirst({ where: { countyId: nairobiCounty.id, level: "TOWN", slug: "nairobi", parentId: null } })
    : null;
  if (nairobiCounty && nairobiTown) {
    for (const areaName of nairobiAreaNames) {
      const slug = areaName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      const existingArea = await prisma.locationNode.findFirst({
        where: { countyId: nairobiCounty.id, level: "AREA", slug, parentId: nairobiTown.id }
      });
      const areaData = { name: areaName, source: "NyumbaFinder Nairobi rental-area master", searchable: true, searchRadiusKm: 5, searchPriority: 200 };
      if (existingArea) {
        await prisma.locationNode.update({ where: { id: existingArea.id }, data: areaData });
      } else {
        await prisma.locationNode.create({ data: { countyId: nairobiCounty.id, parentId: nairobiTown.id, level: "AREA", slug, ...areaData } });
      }
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
    const existingAdminUnit = await prisma.locationNode.findFirst({
      where: { countyId: county.id, level: 'ADMIN_UNIT', slug, parentId: null }
    });
    const adminUnitData = { name: adminUnitName, source: 'KEN_adm4.csv' };
    const node = existingAdminUnit
      ? await prisma.locationNode.update({ where: { id: existingAdminUnit.id }, data: adminUnitData })
      : await prisma.locationNode.create({
          data: { countyId: county.id, level: 'ADMIN_UNIT', name: adminUnitName, slug, ...adminUnitData }
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
