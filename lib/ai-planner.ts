import { buildBudget } from "./budget";
import {
  coordinatesForLocation,
  coordinatesForValues,
  locationOptions,
  milesBetween,
  parseLocation,
  serviceRadiusMilesFor,
} from "./location";
import type {
  BudgetData,
  BudgetItem,
  Vendor,
  VendorBooking,
  VendorCategory,
} from "./types";
import { vendors as sampleVendors } from "./vendors";
import { vendorCategoryToBudgetCategory } from "./wedding-plan";

type PlanProfile = Record<string, string | undefined>;

export type AiPlannerContext = {
  profile?: PlanProfile | null;
  budget?: BudgetData | null;
  bookings?: VendorBooking[];
  vendors?: Vendor[];
};

export type VendorMatch = {
  vendor: Vendor;
  score: number;
  reasons: string[];
  budgetTarget: number;
  budgetCategory: string;
  status?: VendorBooking["status"];
};

export type PlanPreferences = {
  priorityCategories: VendorCategory[];
  skippedCategories: VendorCategory[];
  mustHaveTerms: string[];
  avoidTerms: string[];
  vibeTags: string[];
  constraints: string[];
};

type PlanSignals = {
  outdoor: boolean;
  foodFocused: boolean;
  photoFocused: boolean;
  musicFocused: boolean;
  floralFocused: boolean;
  plannerFocused: boolean;
  videoFocused: boolean;
  cakeFocused: boolean;
  beautyFocused: boolean;
  budgetFocused: boolean;
};

const scoreWeights = {
  base: 36,
  priorityCategory: 24,
  missingCategory: 9,
  existingBooking: 18,
  bookedCategoryPenalty: -30,
  skippedCategoryPenalty: -48,
  packageFit: 10,
  contentMatch: 10,
  contentAvoidPenalty: -22,
  budgetFocusedFit: 8,
  outdoorRental: 4,
} as const;

const categoryLabels: Record<VendorCategory, string> = {
  Venues: "venue",
  Caterers: "catering",
  Photographers: "photography",
  DJs: "music",
  Florists: "florals",
  Videographers: "video",
  "Wedding Planners": "coordination",
  "Makeup Artists": "beauty",
  "Cake Vendors": "cake",
};

const requiredCategoryOrder: VendorCategory[] = [
  "Venues",
  "Caterers",
  "Photographers",
  "DJs",
  "Wedding Planners",
  "Florists",
  "Videographers",
  "Makeup Artists",
  "Cake Vendors",
];

export function generatePlan(prompt: string, context: AiPlannerContext = {}) {
  const lower = prompt.toLowerCase();
  const profile = context.profile ?? {};
  const bookings = context.bookings ?? [];
  const marketplaceVendors = context.vendors?.length
    ? context.vendors
    : sampleVendors;
  const totalBudget = extractBudget(prompt, context.budget, profile);
  const guests = extractGuests(prompt, profile);
  const perGuest = totalBudget / guests;
  const location = extractLocation(prompt, profile);
  const locationPoint = coordinatesForValues(location);
  const signals = extractSignals(lower);
  const preferences = extractPreferences(lower, signals);
  const style = extractStyle(lower, preferences);
  const budget = context.budget?.items?.length
    ? context.budget.items
    : buildBudget(totalBudget);
  const bookedCategorySet = new Set(
    bookings
      .filter((booking) =>
        ["booked", "contract_signed", "paid"].includes(booking.status),
      )
      .map((booking) => booking.category),
  );
  const activeCategorySet = new Set(
    bookings.map((booking) => booking.category),
  );
  const preferredCategories = preferences.priorityCategories;
  const missingCategories = requiredCategoryOrder.filter(
    (category) =>
      !activeCategorySet.has(category) &&
      !preferences.skippedCategories.includes(category),
  );
  const vendorMatches = scoreVendors({
    vendors: marketplaceVendors,
    budget,
    bookings,
    bookedCategorySet,
    preferredCategories,
    missingCategories,
    preferences,
    location,
    locationPoint,
    signals,
  });
  const committedTotal = bookings
    .filter((booking) =>
      ["booked", "contract_signed", "paid"].includes(booking.status),
    )
    .reduce(
      (total, booking) =>
        total + Number(booking.bookedPrice || booking.quotedPrice || 0),
      0,
    );
  const estimatedActiveTotal = bookings.reduce(
    (total, booking) =>
      total + Number(booking.bookedPrice || booking.quotedPrice || 0),
    0,
  );

  return {
    totalBudget,
    guests,
    perGuest,
    location: location.formattedLocation,
    style,
    preferences,
    budget,
    priorities: buildPriorities(signals, {
      perGuest,
      missingCategories,
      committedTotal,
      totalBudget,
    }),
    alerts: buildAlerts({
      totalBudget,
      guests,
      perGuest,
      location: location.formattedLocation,
      signals,
      committedTotal,
      estimatedActiveTotal,
      missingCategories,
    }),
    tradeoffs: buildTradeoffs({
      totalBudget,
      guests,
      perGuest,
      signals,
      missingCategories,
      committedTotal,
    }),
    followUps: buildFollowUps(signals, profile, bookings),
    vendorMatches,
    vendors: vendorMatches.map((match) => match.vendor),
    savings: buildSavings(signals),
    planSnapshot: {
      committedTotal,
      estimatedActiveTotal,
      missingCategories,
      bookedCategories: Array.from(bookedCategorySet),
    },
  };
}

function extractBudget(
  prompt: string,
  budget: BudgetData | null | undefined,
  profile: PlanProfile,
) {
  const budgetMatch = prompt.match(
    /\$?\s?(\d{1,3}(?:,\d{3})+|\d{4,6})\s*(budget|total)?/i,
  );
  if (budgetMatch) return Number(budgetMatch[1].replace(/,/g, ""));
  if (budget?.total && budget.total > 0) return budget.total;
  const profileBudget = Number(profile.budget);
  if (Number.isFinite(profileBudget) && profileBudget > 0) return profileBudget;
  return 25000;
}

function extractGuests(prompt: string, profile: PlanProfile) {
  const guestMatch = prompt.match(/(\d{2,3})\s*(guests|people|person)/i);
  if (guestMatch) return Number(guestMatch[1]);
  const profileGuests = Number(profile.guests || profile.guestCount);
  if (Number.isFinite(profileGuests) && profileGuests > 0) return profileGuests;
  return 100;
}

function extractLocation(prompt: string, profile: PlanProfile) {
  const promptLocation = locationOptions.find((option) => {
    const city = option.city.toLowerCase();
    const formatted = `${option.city}, ${option.state}`.toLowerCase();
    const lower = prompt.toLowerCase();
    return lower.includes(city) || lower.includes(formatted);
  });

  if (promptLocation) {
    return {
      city: promptLocation.city,
      state: promptLocation.state,
      formattedLocation: `${promptLocation.city}, ${promptLocation.state}`,
      ...promptLocation.coordinates,
    };
  }

  const savedLocation =
    profile.formattedLocation || profile.location || profile.locationCity;
  if (savedLocation) {
    const parsed = parseLocation(savedLocation);
    return {
      city: profile.city || profile.locationCity || parsed.city,
      state: profile.state || profile.locationState || parsed.state,
      formattedLocation: savedLocation,
      lat: Number(profile.lat) || undefined,
      lng: Number(profile.lng) || undefined,
    };
  }

  const defaultCoordinates = coordinatesForLocation("San Jose, CA");
  return {
    city: "San Jose",
    state: "CA",
    formattedLocation: "San Jose, CA",
    lat: defaultCoordinates?.lat,
    lng: defaultCoordinates?.lng,
  };
}

function extractStyle(lower: string, preferences: PlanPreferences) {
  if (preferences.vibeTags.includes("editorial")) return "editorial";
  if (preferences.vibeTags.includes("casual")) return "casual";
  if (preferences.vibeTags.includes("moody")) return "moody";
  if (/outdoor|garden|beach|vineyard/.test(lower)) return "outdoor";
  if (/modern|city|loft|minimal/.test(lower)) return "modern";
  if (/classic|traditional|ballroom|indoor/.test(lower)) return "classic";
  if (/party|dance|nightlife/.test(lower)) return "party-forward";
  return "romantic";
}

function extractSignals(lower: string): PlanSignals {
  return {
    outdoor: /outdoor|garden|beach|vineyard/.test(lower),
    foodFocused: /food|catering|dinner|menu|meal|buffet|plated/.test(lower),
    photoFocused: /photo|photography|pictures|editorial|portrait/.test(lower),
    musicFocused: /dj|music|dance|party|mc/.test(lower),
    floralFocused: /floral|florist|flowers|romantic|garden/.test(lower),
    plannerFocused: /stress|planner|planning|coordinate|coordinator|calm/.test(
      lower,
    ),
    videoFocused: /video|film|videographer|highlight/.test(lower),
    cakeFocused: /cake|dessert|sweets/.test(lower),
    beautyFocused: /makeup|hair|beauty|glam/.test(lower),
    budgetFocused: /budget|affordable|save|cheap|cost|tight|under/.test(lower),
  };
}

function extractPreferences(
  lower: string,
  signals: PlanSignals,
): PlanPreferences {
  const skippedCategories: VendorCategory[] = [];
  const mustHaveTerms: string[] = [];
  const avoidTerms: string[] = [];
  const vibeTags: string[] = [];
  const constraints: string[] = [];

  const skipPatterns: Array<[VendorCategory, RegExp]> = [
    [
      "Videographers",
      /\b(no|skip|without|do not need|don't need)\s+(video|videographer|film)\b/,
    ],
    ["DJs", /\b(no|skip|without|do not need|don't need)\s+(dj|music|dance)\b/],
    [
      "Florists",
      /\b(no|skip|without|do not need|don't need)\s+(florals?|flowers?|florist)\b/,
    ],
    [
      "Wedding Planners",
      /\b(no|skip|without|do not need|don't need)\s+(planner|coordinator|coordination)\b/,
    ],
    [
      "Cake Vendors",
      /\b(no|skip|without|do not need|don't need)\s+(cake|dessert)\b/,
    ],
    [
      "Makeup Artists",
      /\b(no|skip|without|do not need|don't need)\s+(makeup|hair|beauty|glam)\b/,
    ],
  ];

  skipPatterns.forEach(([category, pattern]) => {
    if (pattern.test(lower)) skippedCategories.push(category);
  });

  addIf(mustHaveTerms, lower, /\bgarden|outdoor|ceremony lawn\b/, "garden");
  addIf(mustHaveTerms, lower, /\bvineyard|winery\b/, "vineyard");
  addIf(mustHaveTerms, lower, /\brooftop|loft|industrial\b/, "loft");
  addIf(mustHaveTerms, lower, /\bbuffet\b/, "buffet");
  addIf(mustHaveTerms, lower, /\bfamily[- ]style\b/, "family-style");
  addIf(mustHaveTerms, lower, /\bplated\b/, "plated");
  addIf(mustHaveTerms, lower, /\bceremony\s+and\s+reception\b/, "ceremony");
  addIf(mustHaveTerms, lower, /\blow[- ]stress|calm|easy\b/, "coordination");
  addIf(
    mustHaveTerms,
    lower,
    /\bweekday|friday|sunday|brunch|off[- ]season\b/,
    "flexible pricing",
  );

  addIf(
    avoidTerms,
    lower,
    /\bno\s+ballroom|avoid\s+ballroom|not\s+.*ballroom\b/,
    "ballroom",
  );
  addIf(
    avoidTerms,
    lower,
    /\bno\s+banquet|avoid\s+banquet|not\s+.*banquet\b/,
    "banquet",
  );
  addIf(avoidTerms, lower, /\bno\s+hotel|avoid\s+hotel\b/, "hotel");
  addIf(
    avoidTerms,
    lower,
    /\bno\s+traditional|avoid\s+traditional|not\s+traditional\b/,
    "traditional",
  );
  addIf(avoidTerms, lower, /\bnot\s+too\s+formal|casual\b/, "formal");
  addIf(
    avoidTerms,
    lower,
    /\bavoid\s+expensive|not\s+expensive|keep\s+.*cheap\b/,
    "premium",
  );

  addIf(vibeTags, lower, /\beditorial|fashion\b/, "editorial");
  addIf(
    vibeTags,
    lower,
    /\bdocumentary|candid|photojournalistic\b/,
    "documentary",
  );
  addIf(vibeTags, lower, /\bmoody|candlelit|dramatic\b/, "moody");
  addIf(vibeTags, lower, /\bcasual|relaxed|laid[- ]back\b/, "casual");
  addIf(vibeTags, lower, /\bluxe|luxury|elevated|premium\b/, "elevated");
  addIf(vibeTags, lower, /\bminimal|modern|clean\b/, "modern");
  addIf(vibeTags, lower, /\bclassic|timeless|traditional\b/, "classic");
  addIf(vibeTags, lower, /\bparty|dance|nightlife\b/, "party");

  if (signals.budgetFocused) constraints.push("budget-conscious");
  if (signals.outdoor) constraints.push("weather backup");
  if (/\baccessible|wheelchair|mobility\b/.test(lower))
    constraints.push("accessibility");
  if (/\bkids|children|family-friendly\b/.test(lower))
    constraints.push("family-friendly");
  if (/\bvegan|vegetarian|halal|kosher|gluten[- ]free\b/.test(lower))
    constraints.push("dietary needs");

  return {
    priorityCategories: preferredCategoriesFor(signals).filter(
      (category) => !skippedCategories.includes(category),
    ),
    skippedCategories,
    mustHaveTerms,
    avoidTerms,
    vibeTags,
    constraints,
  };
}

function addIf(list: string[], text: string, pattern: RegExp, value: string) {
  if (pattern.test(text) && !list.includes(value)) list.push(value);
}

function preferredCategoriesFor(signals: PlanSignals) {
  const preferred: VendorCategory[] = ["Venues"];
  if (signals.foodFocused) preferred.push("Caterers");
  if (signals.photoFocused) preferred.push("Photographers");
  if (signals.musicFocused) preferred.push("DJs");
  if (signals.floralFocused) preferred.push("Florists");
  if (signals.plannerFocused) preferred.push("Wedding Planners");
  if (signals.videoFocused) preferred.push("Videographers");
  if (signals.cakeFocused) preferred.push("Cake Vendors");
  if (signals.beautyFocused) preferred.push("Makeup Artists");
  return preferred;
}

function scoreVendors({
  vendors,
  budget,
  bookings,
  bookedCategorySet,
  preferredCategories,
  missingCategories,
  preferences,
  location,
  locationPoint,
  signals,
}: {
  vendors: Vendor[];
  budget: BudgetItem[];
  bookings: VendorBooking[];
  bookedCategorySet: Set<VendorCategory>;
  preferredCategories: VendorCategory[];
  missingCategories: VendorCategory[];
  preferences: PlanPreferences;
  location: { city?: string; state?: string; formattedLocation: string };
  locationPoint: { lat: number; lng: number } | null;
  signals: PlanSignals;
}) {
  const bookingByVendor = new Map(
    bookings.map((booking) => [booking.vendorId, booking]),
  );
  const targetByCategory = new Map(
    budget.map((item) => [item.name, item.amount]),
  );

  return vendors
    .map((vendor): VendorMatch => {
      const budgetCategory = vendorCategoryToBudgetCategory[vendor.category];
      const budgetTarget = targetByCategory.get(budgetCategory) ?? 0;
      const existingBooking = bookingByVendor.get(vendor.id);
      const scoreReasons: string[] = [];
      let score = scoreWeights.base;

      if (preferredCategories.includes(vendor.category)) {
        score += scoreWeights.priorityCategory;
        scoreReasons.push(
          `Matches your ${categoryLabels[vendor.category]} focus`,
        );
      }

      if (missingCategories.includes(vendor.category)) {
        score += scoreWeights.missingCategory;
        scoreReasons.push(
          `Fills an open ${categoryLabels[vendor.category]} need`,
        );
      }

      if (existingBooking) {
        score += scoreWeights.existingBooking;
        scoreReasons.push(
          `Already ${statusLabel(existingBooking.status)} in your plan`,
        );
      } else if (bookedCategorySet.has(vendor.category)) {
        score += scoreWeights.bookedCategoryPenalty;
        scoreReasons.push(
          `Lower priority because ${categoryLabels[vendor.category]} is already booked`,
        );
      }

      if (preferences.skippedCategories.includes(vendor.category)) {
        score += scoreWeights.skippedCategoryPenalty;
        scoreReasons.push(
          `Deprioritized because you said to skip ${categoryLabels[vendor.category]}`,
        );
      }

      score += priceScore(vendor.startingPrice, budgetTarget, scoreReasons);
      score += packageFitScore(vendor, budgetTarget, scoreReasons);
      score += locationScore(vendor, location, locationPoint, scoreReasons);
      score += qualityScore(vendor, scoreReasons);
      score += preferenceContentScore(vendor, preferences, scoreReasons);

      if (signals.budgetFocused && vendor.budgetFit === "Great fit") {
        score += scoreWeights.budgetFocusedFit;
        scoreReasons.push("Strong fit for a cost-conscious plan");
      }

      if (
        signals.outdoor &&
        vendor.description.toLowerCase().includes("rental")
      ) {
        score += scoreWeights.outdoorRental;
        scoreReasons.push("Included rentals may reduce outdoor add-ons");
      }

      return {
        vendor,
        score: Math.max(0, Math.min(100, Math.round(score))),
        reasons: scoreReasons.slice(0, 3),
        budgetTarget,
        budgetCategory,
        status: existingBooking?.status,
      };
    })
    .filter((match) => match.score >= 35)
    .sort(
      (a, b) =>
        b.score - a.score || a.vendor.startingPrice - b.vendor.startingPrice,
    )
    .slice(0, 6);
}

function packageFitScore(
  vendor: Vendor,
  budgetTarget: number,
  reasons: string[],
) {
  if (!budgetTarget || !vendor.packages.length) return 0;
  const fittingPackage = vendor.packages.find(
    (vendorPackage) => vendorPackage.price <= budgetTarget,
  );

  if (!fittingPackage) return 0;

  reasons.push(`${fittingPackage.name} package fits this category target`);
  return scoreWeights.packageFit;
}

function preferenceContentScore(
  vendor: Vendor,
  preferences: PlanPreferences,
  reasons: string[],
) {
  const vendorText = [
    vendor.name,
    vendor.category,
    vendor.venueSubcategory,
    vendor.description,
    ...vendor.packages.flatMap((vendorPackage) => [
      vendorPackage.name,
      vendorPackage.includes,
    ]),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  const matchedMustHaves = preferences.mustHaveTerms.filter((term) =>
    vendorText.includes(term),
  );
  const matchedAvoids = preferences.avoidTerms.filter((term) =>
    vendorText.includes(term),
  );
  const matchedVibes = preferences.vibeTags.filter((term) =>
    vendorText.includes(term),
  );

  let score = 0;
  if (matchedMustHaves.length) {
    score += scoreWeights.contentMatch;
    reasons.push(`Matches ${matchedMustHaves.slice(0, 2).join(" and ")}`);
  }

  if (matchedVibes.length) {
    score += Math.round(scoreWeights.contentMatch / 2);
    reasons.push(`Supports your ${matchedVibes[0]} style`);
  }

  if (matchedAvoids.length) {
    score += scoreWeights.contentAvoidPenalty;
    reasons.push(`May conflict with your ${matchedAvoids[0]} preference`);
  }

  return score;
}

function priceScore(price: number, target: number, reasons: string[]) {
  if (!target) return 0;
  const ratio = price / target;
  if (ratio <= 0.85) {
    reasons.push("Leaves room in the category budget");
    return 18;
  }
  if (ratio <= 1) {
    reasons.push("Fits the category budget");
    return 14;
  }
  if (ratio <= 1.18) {
    reasons.push("Slight stretch, but still realistic");
    return 6;
  }
  if (ratio <= 1.4) return -4;
  reasons.push("Price needs a tradeoff elsewhere");
  return -14;
}

function locationScore(
  vendor: Vendor,
  location: { city?: string; state?: string; formattedLocation: string },
  locationPoint: { lat: number; lng: number } | null,
  reasons: string[],
) {
  const vendorPoint = coordinatesForValues(vendor);
  if (locationPoint && vendorPoint) {
    const distance = milesBetween(locationPoint, vendorPoint);
    const radius = serviceRadiusMilesFor(vendor);
    if (distance <= 8) {
      reasons.push("Very close to your wedding location");
      return 14;
    }
    if (distance <= radius) {
      reasons.push(`Within ${Math.round(distance)} miles of your location`);
      return 9;
    }
    return -8;
  }

  const vendorCity = (vendor.city || parseLocation(vendor.location).city)
    .trim()
    .toLowerCase();
  const vendorState = (vendor.state || parseLocation(vendor.location).state)
    .trim()
    .toLowerCase();
  if (location.city && vendorCity === location.city.toLowerCase()) {
    reasons.push("Same-city match");
    return 12;
  }
  if (location.state && vendorState === location.state.toLowerCase()) return 5;
  return 0;
}

function qualityScore(vendor: Vendor, reasons: string[]) {
  let score = 0;
  if (vendor.rating >= 4.8) score += 8;
  else if (vendor.rating >= 4.6) score += 4;
  if (vendor.reviewCount >= 100) score += 5;
  if (vendor.availability === "High") score += 6;
  if (vendor.availability === "Waitlist") score -= 10;
  if (score >= 10) reasons.push("Strong reviews and availability signal");
  return score;
}

function buildAlerts({
  totalBudget,
  guests,
  perGuest,
  location,
  signals,
  committedTotal,
  estimatedActiveTotal,
  missingCategories,
}: {
  totalBudget: number;
  guests: number;
  perGuest: number;
  location: string;
  signals: PlanSignals;
  committedTotal: number;
  estimatedActiveTotal: number;
  missingCategories: VendorCategory[];
}) {
  const alerts: string[] = [];
  if (perGuest < 175) {
    alerts.push(
      `At ${Math.round(perGuest)} per guest, the budget is tight for a full-service ${location} wedding.`,
    );
  }
  if (guests > 150 && totalBudget < 30000) {
    alerts.push(
      "Large guest count plus a modest budget means catering and venue choices need careful tradeoffs.",
    );
  }
  if (signals.outdoor && totalBudget < 22000) {
    alerts.push(
      "Outdoor venues can need extra rentals, lighting, heaters, or restroom plans, so confirm what is included before booking.",
    );
  }
  if (committedTotal > totalBudget * 0.65 && missingCategories.length > 3) {
    alerts.push(
      "Your committed bookings use most of the budget while several vendor categories are still open.",
    );
  }
  if (estimatedActiveTotal > totalBudget) {
    alerts.push(
      "Saved and quoted vendors are currently above the total budget, so compare alternates before signing more contracts.",
    );
  }
  return alerts;
}

function buildPriorities(
  signals: PlanSignals,
  context: {
    perGuest: number;
    missingCategories: VendorCategory[];
    committedTotal: number;
    totalBudget: number;
  },
) {
  const openTopCategory = context.missingCategories[0];
  return [
    openTopCategory
      ? `Resolve ${categoryLabels[openTopCategory]} next before comparing lower-impact upgrades.`
      : "Review signed vendors for payment dates, final counts, and scope gaps.",
    signals.outdoor
      ? "Prioritize a venue with included ceremony space, rentals, weather backup, and lighting."
      : "Choose a venue with included tables, chairs, lighting, and clear service rules.",
    signals.foodFocused
      ? "Protect catering quality, but compare buffet and family-style service before choosing plated dinner."
      : "Protect catering, photography, and coordination before premium decor upgrades.",
    signals.photoFocused
      ? "Book photography early and keep albums or second shooters as optional upgrades."
      : "Ask vendors for weekday, Friday, brunch, or off-season pricing.",
    signals.plannerFocused || context.committedTotal > context.totalBudget * 0.5
      ? "Use coordination support to keep quotes, payment dates, and vendor handoffs from drifting."
      : "Assign one person to track quote expirations and payment deadlines.",
  ];
}

function buildTradeoffs({
  totalBudget,
  guests,
  perGuest,
  signals,
  missingCategories,
  committedTotal,
}: {
  totalBudget: number;
  guests: number;
  perGuest: number;
  signals: PlanSignals;
  missingCategories: VendorCategory[];
  committedTotal: number;
}) {
  const tradeoffs: string[] = [];
  if (perGuest < 200) {
    tradeoffs.push(
      `${guests} guests on ${formatCompactMoney(totalBudget)} works best with buffet or family-style catering, restrained rentals, and fewer premium decor moments.`,
    );
  }
  if (signals.photoFocused && signals.floralFocused) {
    tradeoffs.push(
      "If photography and florals both matter, keep large installs limited to the ceremony focal point and main tables.",
    );
  }
  if (signals.musicFocused && !missingCategories.includes("DJs")) {
    tradeoffs.push(
      "Since music is already represented in the plan, spend upgrades on ceremony audio or lighting only if the package includes setup support.",
    );
  }
  if (committedTotal > totalBudget * 0.45 && missingCategories.length > 4) {
    tradeoffs.push(
      "Pause premium add-ons until the remaining core categories have real quotes.",
    );
  }
  if (!tradeoffs.length) {
    tradeoffs.push(
      "Keep the first quote in each category as a ceiling, then compare alternatives by what is included rather than price alone.",
    );
  }
  return tradeoffs;
}

function buildFollowUps(
  signals: PlanSignals,
  profile: PlanProfile,
  bookings: VendorBooking[],
) {
  const questions: string[] = [];
  if (!profile.date)
    questions.push("Do you already have a wedding date or season?");
  if (!signals.foodFocused && !signals.photoFocused && !signals.musicFocused) {
    questions.push(
      "What matters most: food, photos, party energy, or low stress?",
    );
  }
  if (!bookings.length) {
    questions.push(
      "Have you already booked a venue, or should the planner start there?",
    );
  }
  questions.push(
    "Are you flexible on Friday, Sunday, brunch, or off-season pricing?",
  );
  return questions.slice(0, 3);
}

function buildSavings(signals: PlanSignals) {
  return [
    signals.floralFocused
      ? "Repurpose ceremony florals at the reception."
      : "Keep decor flexible until venue and catering quotes are confirmed.",
    "Use a cutting cake plus sheet cake for dessert service.",
    "Book fewer hours for photo/video if the timeline allows.",
    signals.outdoor
      ? "Compare included rentals before choosing the lowest venue fee."
      : "Use bundled vendor packages only when the included services match your plan.",
  ];
}

function statusLabel(status: VendorBooking["status"]) {
  return status.replace("_", " ");
}

function formatCompactMoney(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
    notation: "compact",
  }).format(value);
}
