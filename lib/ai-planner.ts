import { buildBudget } from "./budget";
import { vendors } from "./vendors";

export function generatePlan(prompt: string) {
  const lower = prompt.toLowerCase();
  const budgetMatch = lower.match(/\$?\s?(\d{1,3}(?:,\d{3})+|\d{4,6})\s*(budget|total)?/);
  const guestMatch = lower.match(/(\d{2,3})\s*(guests|people|person)/);
  const totalBudget = budgetMatch ? Number(budgetMatch[1].replace(",", "")) : 25000;
  const guests = guestMatch ? Number(guestMatch[1]) : 100;
  const perGuest = totalBudget / guests;
  const outdoor = /outdoor|garden|beach|vineyard/.test(lower);
  const foodFocused = /food|catering|dinner|menu|meal/.test(lower);
  const photoFocused = /photo|photography|pictures|editorial/.test(lower);
  const musicFocused = /dj|music|dance|party/.test(lower);
  const floralFocused = /floral|florist|flowers|romantic/.test(lower);
  const plannerFocused = /stress|planner|planning|coordinate|coordinator/.test(lower);
  const location = lower.includes("san jose") ? "San Jose" : "your area";
  const style = outdoor ? "outdoor" : lower.includes("modern") ? "modern" : lower.includes("classic") ? "classic" : "romantic";

  const alerts: string[] = [];
  if (perGuest < 175) alerts.push(`At ${Math.round(perGuest)} per guest, the budget is tight for a full-service ${location} wedding.`);
  if (guests > 150 && totalBudget < 30000) alerts.push("Large guest count plus a modest budget means catering and venue choices need careful tradeoffs.");
  if (outdoor && totalBudget < 22000) alerts.push("Outdoor venues can need extra rentals, lighting, heaters, or restroom plans, so confirm what is included before booking.");

  const priorities = [
    outdoor ? "Prioritize a venue with included ceremony space and rentals." : "Choose a venue with included tables, chairs, and lighting.",
    foodFocused ? "Protect catering quality, but compare buffet and family-style service before choosing plated dinner." : "Protect catering, photography, and coordination before premium decor upgrades.",
    photoFocused ? "Book photography early and keep albums or second shooters as optional upgrades." : "Ask vendors for weekday, Friday, brunch, or off-season pricing.",
    musicFocused ? "A DJ with ceremony audio included can replace separate sound rental costs." : "Use bundled vendor packages only when the included services match your plan.",
    floralFocused ? "Spend florals where guests and photos notice them most: bouquet, ceremony focal point, and main tables." : "Keep decor flexible until venue and catering quotes are confirmed.",
    plannerFocused ? "Consider month-of coordination if full planning is too expensive." : "Assign one person to track quote expirations and payment deadlines.",
  ];

  const preferredCategories = [
    "Venues",
    foodFocused ? "Caterers" : null,
    photoFocused ? "Photographers" : null,
    musicFocused ? "DJs" : null,
    floralFocused ? "Florists" : null,
    plannerFocused ? "Wedding Planners" : null,
  ].filter(Boolean);

  const matches = vendors
    .filter((vendor) => vendor.location.includes("San Jose") || vendor.budgetFit === "Great fit")
    .sort((a, b) => {
      const aPreferred = preferredCategories.includes(a.category) ? 0 : 1;
      const bPreferred = preferredCategories.includes(b.category) ? 0 : 1;
      return aPreferred - bPreferred || a.startingPrice - b.startingPrice;
    })
    .slice(0, 6);

  return {
    totalBudget,
    guests,
    perGuest,
    location,
    style,
    budget: buildBudget(totalBudget),
    priorities,
    alerts,
    vendors: matches,
    savings: [
      "Repurpose ceremony florals at the reception.",
      "Use a cutting cake plus sheet cake for dessert service.",
      "Book fewer hours for photo/video if the timeline allows.",
      "Compare included rentals before choosing the lowest venue fee.",
    ],
  };
}
