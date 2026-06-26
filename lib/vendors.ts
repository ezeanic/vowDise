import type { Vendor } from "./types";
import { sampleBlockedDates, samplePendingRequestDates } from "./availability";

const img = (id: string) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=1200&q=80`;

export const vendors: Vendor[] = [
  {
    id: "willow-garden-estate",
    name: "Willow Garden Estate",
    category: "Venues",
    venueSubcategory: "Gardens",
    location: "San Jose, CA",
    startingPrice: 6200,
    rating: 4.9,
    reviewCount: 146,
    availability: "Limited",
    blockedDates: sampleBlockedDates,
    pendingRequestDates: samplePendingRequestDates,
    image: img("photo-1519167758481-83f550bb49b3"),
    gallery: [
      img("photo-1519167758481-83f550bb49b3"),
      img("photo-1464366400600-7168b8af9bc3"),
      img("photo-1519225421980-715cb0215aed"),
    ],
    description:
      "A garden-forward estate with ceremony lawns, a candlelit pavilion, and flexible packages for budget-conscious couples.",
    packages: [
      {
        name: "Garden Ceremony",
        price: 6200,
        includes:
          "Ceremony lawn, bridal suite, tables, chairs, and 6-hour rental.",
      },
      {
        name: "Estate Evening",
        price: 9100,
        includes:
          "Full estate access, coordination support, rentals, lighting, and rehearsal.",
      },
    ],
    reviews: [
      {
        name: "Maya R.",
        rating: 5,
        text: "Elegant without feeling stuffy. Their weekday package saved us thousands.",
      },
      {
        name: "Jordan P.",
        rating: 5,
        text: "The team helped us swap decor items to stay under budget.",
      },
    ],
    budgetFit: "Great fit",
  },
  {
    id: "madera-loft",
    name: "Madera Loft",
    category: "Venues",
    venueSubcategory: "Rooftops & Lofts",
    location: "San Jose, CA",
    startingPrice: 4800,
    rating: 4.7,
    reviewCount: 89,
    availability: "High",
    image: img("photo-1464366400600-7168b8af9bc3"),
    gallery: [
      img("photo-1464366400600-7168b8af9bc3"),
      img("photo-1511795409834-ef04bbd61622"),
      img("photo-1519225421980-715cb0215aed"),
    ],
    description:
      "A warm industrial loft with exposed beams, built-in lighting, and flexible catering rules for couples watching every line item.",
    packages: [
      {
        name: "Loft Ceremony",
        price: 4800,
        includes:
          "5-hour rental, ceremony seating, lounge furniture, and getting-ready suite.",
      },
      {
        name: "Full Celebration",
        price: 7600,
        includes:
          "8-hour rental, tables, chairs, lighting, setup support, and rehearsal access.",
      },
    ],
    reviews: [
      {
        name: "Dana C.",
        rating: 5,
        text: "The included furniture and lighting made our decor budget go so much farther.",
      },
    ],
    budgetFit: "Great fit",
  },
  {
    id: "vista-hill-vineyard",
    name: "Vista Hill Vineyard",
    category: "Venues",
    venueSubcategory: "Wineries & Breweries",
    location: "Morgan Hill, CA",
    startingPrice: 7800,
    rating: 4.8,
    reviewCount: 118,
    availability: "Limited",
    image: img("photo-1519225421980-715cb0215aed"),
    gallery: [
      img("photo-1519225421980-715cb0215aed"),
      img("photo-1519167758481-83f550bb49b3"),
      img("photo-1523438885200-e635ba2c371e"),
    ],
    description:
      "A vineyard venue with hillside ceremony views, a tented dinner lawn, and weekday packages that soften peak-season pricing.",
    packages: [
      {
        name: "Weekday Vineyard",
        price: 7800,
        includes:
          "Ceremony lawn, reception tent, rentals consultation, and 7-hour access.",
      },
      {
        name: "Weekend Estate",
        price: 11200,
        includes:
          "Full grounds access, premium getting-ready suites, lighting, and venue coordinator.",
      },
    ],
    reviews: [
      {
        name: "Leah F.",
        rating: 5,
        text: "It felt luxe, but the weekday option kept our total plan realistic.",
      },
    ],
    budgetFit: "Stretch",
  },
  {
    id: "pearl-room-santana",
    name: "The Pearl Room at Santana",
    category: "Venues",
    venueSubcategory: "Banquet Halls",
    location: "San Jose, CA",
    startingPrice: 5600,
    rating: 4.6,
    reviewCount: 76,
    availability: "High",
    image: img("photo-1527529482837-4698179dc6ce"),
    gallery: [
      img("photo-1527529482837-4698179dc6ce"),
      img("photo-1519741497674-611481863552"),
      img("photo-1520854221256-17451cc331bf"),
    ],
    description:
      "A polished indoor venue with neutral finishes, included tables and chairs, and easy hotel access for out-of-town guests.",
    packages: [
      {
        name: "Reception Room",
        price: 5600,
        includes:
          "Reception space, tables, chairs, security, and 6-hour rental.",
      },
      {
        name: "Ceremony + Reception",
        price: 8300,
        includes:
          "Room flip, ceremony setup, extended access, and day-of venue lead.",
      },
    ],
    reviews: [
      {
        name: "Victor N.",
        rating: 5,
        text: "Simple, clean, and the included rentals helped us avoid surprise costs.",
      },
    ],
    budgetFit: "Great fit",
  },
  {
    id: "luna-frame-studio",
    name: "Luna Frame Studio",
    category: "Photographers",
    location: "Santa Clara, CA",
    startingPrice: 3400,
    rating: 4.8,
    reviewCount: 98,
    availability: "High",
    image: img("photo-1520854221256-17451cc331bf"),
    gallery: [
      img("photo-1520854221256-17451cc331bf"),
      img("photo-1519741497674-611481863552"),
      img("photo-1532712938310-34cb3982ef74"),
    ],
    description:
      "Editorial wedding photography with warm color, quick previews, and intimate elopement-to-full-day coverage.",
    packages: [
      {
        name: "Essentials",
        price: 3400,
        includes: "6 hours, one photographer, online gallery, print rights.",
      },
      {
        name: "Signature",
        price: 5200,
        includes:
          "9 hours, second photographer, engagement session, album credit.",
      },
    ],
    reviews: [
      {
        name: "Elena S.",
        rating: 5,
        text: "They made our small budget look like a magazine spread.",
      },
    ],
    budgetFit: "Great fit",
  },
  {
    id: "harvest-table-catering",
    name: "Harvest Table Catering",
    category: "Caterers",
    location: "San Jose, CA",
    startingPrice: 7200,
    rating: 4.7,
    reviewCount: 184,
    availability: "High",
    image: img("photo-1555244162-803834f70033"),
    gallery: [
      img("photo-1555244162-803834f70033"),
      img("photo-1543353071-10c8ba85a904"),
      img("photo-1551218808-94e220e084d2"),
    ],
    description:
      "Seasonal California menus with plated, buffet, and family-style options designed around clear per-guest pricing.",
    packages: [
      {
        name: "Buffet Dinner",
        price: 7200,
        includes: "100 guests, two entrees, salad, sides, service team.",
      },
      {
        name: "Family Style",
        price: 9600,
        includes:
          "100 guests, passed bites, three entrees, rentals consultation.",
      },
    ],
    reviews: [
      {
        name: "Nia T.",
        rating: 5,
        text: "Transparent pricing and no surprise service fees.",
      },
    ],
    budgetFit: "Stretch",
  },
  {
    id: "golden-hour-dj",
    name: "Golden Hour DJ Co.",
    category: "DJs",
    location: "Campbell, CA",
    startingPrice: 1450,
    rating: 4.9,
    reviewCount: 211,
    availability: "High",
    image: img("photo-1492684223066-81342ee5ff30"),
    gallery: [
      img("photo-1492684223066-81342ee5ff30"),
      img("photo-1505236858219-8359eb29e329"),
      img("photo-1516450360452-9312f5e86fc7"),
    ],
    description:
      "A polished DJ and MC team known for packed dance floors, crisp timelines, and budget-friendly lighting bundles.",
    packages: [
      {
        name: "Reception Core",
        price: 1450,
        includes: "5 hours DJ/MC, sound, wireless mics, planning call.",
      },
      {
        name: "Dance Floor Plus",
        price: 2200,
        includes:
          "Ceremony audio, uplighting, and extended reception coverage.",
      },
    ],
    reviews: [
      {
        name: "Chris L.",
        rating: 5,
        text: "They kept the night moving and helped trim add-ons we did not need.",
      },
    ],
    budgetFit: "Great fit",
  },
  {
    id: "petal-and-vine",
    name: "Petal & Vine Atelier",
    category: "Florists",
    location: "Los Gatos, CA",
    startingPrice: 2800,
    rating: 4.8,
    reviewCount: 73,
    availability: "Limited",
    image: img("photo-1523438885200-e635ba2c371e"),
    gallery: [
      img("photo-1523438885200-e635ba2c371e"),
      img("photo-1487070183336-b863922373d4"),
      img("photo-1509610973147-232dfea52a97"),
    ],
    description:
      "Romantic floral design using seasonal stems, repurposed ceremony pieces, and a clear good-better-best proposal format.",
    packages: [
      {
        name: "Seasonal Romance",
        price: 2800,
        includes: "Personal flowers, ceremony pieces, bud vases, delivery.",
      },
      {
        name: "Full Bloom",
        price: 5200,
        includes:
          "Installations, reception centerpieces, candles, strike service.",
      },
    ],
    reviews: [
      {
        name: "Priya M.",
        rating: 5,
        text: "They reused our arch flowers at the sweetheart table and it looked stunning.",
      },
    ],
    budgetFit: "Stretch",
  },
  {
    id: "clear-sky-films",
    name: "Clear Sky Films",
    category: "Videographers",
    location: "San Jose, CA",
    startingPrice: 3100,
    rating: 4.8,
    reviewCount: 64,
    availability: "High",
    image: img("photo-1537633552985-df8429e8048b"),
    gallery: [
      img("photo-1537633552985-df8429e8048b"),
      img("photo-1511285560929-80b456fea0bc"),
      img("photo-1529636798458-92182e662485"),
    ],
    description:
      "Documentary-style wedding films with compact packages that focus on ceremony, speeches, and a cinematic highlight.",
    packages: [
      {
        name: "Highlight",
        price: 3100,
        includes: "6 hours, one filmmaker, 4-minute highlight, ceremony audio.",
      },
      {
        name: "Keepsake",
        price: 4800,
        includes:
          "8 hours, two filmmakers, highlight, ceremony and toast edits.",
      },
    ],
    reviews: [
      {
        name: "Sam K.",
        rating: 5,
        text: "Beautiful, calm, and very clear about what we could skip.",
      },
    ],
    budgetFit: "Great fit",
  },
  {
    id: "marigold-planning",
    name: "Marigold Planning House",
    category: "Wedding Planners",
    location: "Mountain View, CA",
    startingPrice: 2400,
    rating: 4.9,
    reviewCount: 121,
    availability: "Limited",
    image: img("photo-1511795409834-ef04bbd61622"),
    gallery: [
      img("photo-1511795409834-ef04bbd61622"),
      img("photo-1494955870715-979ca4f13bf0"),
      img("photo-1529634806980-85c3dd6d34ac"),
    ],
    description:
      "Coordination and planning for couples who want calm decisions, vendor negotiation, and budget accountability.",
    packages: [
      {
        name: "Final 60 Days",
        price: 2400,
        includes:
          "Timeline, vendor handoff, rehearsal, wedding day coordination.",
      },
      {
        name: "Budget Partner",
        price: 3900,
        includes:
          "Planning support, vendor sourcing, budget reviews, design guidance.",
      },
    ],
    reviews: [
      {
        name: "Ari D.",
        rating: 5,
        text: "They paid for themselves through vendor savings.",
      },
    ],
    budgetFit: "Great fit",
  },
  {
    id: "soft-glow-beauty",
    name: "Soft Glow Beauty",
    category: "Makeup Artists",
    location: "San Jose, CA",
    startingPrice: 950,
    rating: 4.7,
    reviewCount: 88,
    availability: "High",
    image: img("photo-1487412947147-5cebf100ffc2"),
    gallery: [
      img("photo-1487412947147-5cebf100ffc2"),
      img("photo-1516975080664-ed2fc6a32937"),
      img("photo-1522337660859-02fbefca4702"),
    ],
    description:
      "Soft glam hair and makeup packages with bridal trials, touch-up kits, and transparent bridal party pricing.",
    packages: [
      {
        name: "Bride Only",
        price: 950,
        includes: "Hair, makeup, trial, lashes, touch-up kit.",
      },
      {
        name: "Bridal Suite",
        price: 1850,
        includes: "Bride plus four services for wedding party.",
      },
    ],
    reviews: [
      {
        name: "Tessa W.",
        rating: 5,
        text: "Natural, glowy, on time, and exactly within quote.",
      },
    ],
    budgetFit: "Great fit",
  },
  {
    id: "buttercream-and-co",
    name: "Buttercream & Co.",
    category: "Cake Vendors",
    location: "Palo Alto, CA",
    startingPrice: 650,
    rating: 4.8,
    reviewCount: 132,
    availability: "High",
    image: img("photo-1621303837174-89787a7d4729"),
    gallery: [
      img("photo-1621303837174-89787a7d4729"),
      img("photo-1535141192574-5d4897c12636"),
      img("photo-1562777717-dc6984f65a63"),
    ],
    description:
      "Modern cakes, dessert bars, and cutting cakes for couples who want a beautiful sweets moment without overspending.",
    packages: [
      {
        name: "Cutting Cake",
        price: 650,
        includes: "Two-tier display cake plus sheet cake for 100 guests.",
      },
      {
        name: "Signature Dessert",
        price: 1400,
        includes: "Three-tier cake, tasting, delivery, and mini dessert set.",
      },
    ],
    reviews: [
      {
        name: "Joel H.",
        rating: 5,
        text: "The cutting cake approach saved us money and still photographed beautifully.",
      },
    ],
    budgetFit: "Great fit",
  },
];

export const categories = Array.from(
  new Set(vendors.map((vendor) => vendor.category)),
);
