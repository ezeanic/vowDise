export type TimelineItem = {
  category: string;
  vendorCategory: string[];
  monthsBefore: number;
  priority: "critical" | "high" | "medium" | "low";
  description: string;
  tips: string[];
};

export const bookingTimeline: TimelineItem[] = [
  {
    category: "Venue",
    vendorCategory: ["Venues"],
    monthsBefore: 12,
    priority: "critical",
    description:
      "Book your venue as early as possible - popular dates can be booked 12-18 months in advance.",
    tips: [
      "Have 2-3 backup dates in mind",
      "Consider weekday weddings for better availability and pricing",
      "Ask about off-season discounts",
      "Review cancellation policies carefully",
    ],
  },
  {
    category: "Food/catering",
    vendorCategory: ["Caterers"],
    monthsBefore: 9,
    priority: "critical",
    description:
      "Caterers often book up 6-12 months in advance, especially for peak wedding season.",
    tips: [
      "Schedule tastings before signing",
      "Clarify service fees and gratuity expectations",
      "Ask about dietary accommodation capabilities",
      "Review payment schedule and deposit requirements",
    ],
  },
  {
    category: "Photography",
    vendorCategory: ["Photographers"],
    monthsBefore: 10,
    priority: "high",
    description:
      "Top photographers often have limited availability and book 8-12 months out.",
    tips: [
      "Review full wedding galleries, not just highlights",
      "Check if they have a second shooter included",
      "Ask about turnaround time for photos",
      "Understand what's included in the package",
    ],
  },
  {
    category: "Videography",
    vendorCategory: ["Videographers"],
    monthsBefore: 8,
    priority: "high",
    description:
      "Videographers should be booked 6-10 months before your wedding date.",
    tips: [
      "Decide between highlight reel vs full ceremony coverage",
      "Ask about drone footage options",
      "Check audio quality capabilities for vows",
      "Review their editing style matches your preference",
    ],
  },
  {
    category: "DJ/music",
    vendorCategory: ["DJs"],
    monthsBefore: 6,
    priority: "high",
    description:
      "Book your DJ or band 4-8 months in advance to secure your date.",
    tips: [
      "Ask about MC services and announcements",
      "Review their music library and genre flexibility",
      "Discuss do-not-play list upfront",
      "Check if they provide lighting and sound equipment",
    ],
  },
  {
    category: "Florals",
    vendorCategory: ["Florists"],
    monthsBefore: 6,
    priority: "medium",
    description:
      "Florists typically need 4-6 months to plan and source materials for your wedding.",
    tips: [
      "Bring inspiration photos but stay open to seasonal alternatives",
      "Ask about repurposing ceremony pieces for reception",
      "Discuss setup and breakdown logistics",
      "Consider in-season flowers for better pricing",
    ],
  },
  {
    category: "Wedding Planners",
    vendorCategory: ["Wedding Planners"],
    monthsBefore: 10,
    priority: "high",
    description:
      "Hire a wedding planner 8-12 months before your wedding for best results.",
    tips: [
      "Clarify what's included in day-of vs full-service planning",
      "Ask about vendor relationships and discounts",
      "Review their planning process and timeline",
      "Check availability for rehearsal and wedding day",
    ],
  },
  {
    category: "Dress/attire",
    vendorCategory: [],
    monthsBefore: 8,
    priority: "medium",
    description:
      "Order your wedding dress 6-9 months in advance to allow for alterations.",
    tips: [
      "Budget for alterations (typically $500-1500)",
      "Consider the season for fabric choice",
      "Schedule multiple fitting appointments",
      "Don't forget groom and party attire",
    ],
  },
  {
    category: "Cake",
    vendorCategory: ["Cake Vendors"],
    monthsBefore: 4,
    priority: "medium",
    description:
      "Cake vendors typically need 3-6 months notice for custom designs.",
    tips: [
      "Schedule a tasting before finalizing",
      "Ask about delivery and setup fees",
      "Consider sheet cakes for budget-friendly options",
      "Discuss dietary restrictions and alternatives",
    ],
  },
  {
    category: "Transportation",
    vendorCategory: [],
    monthsBefore: 4,
    priority: "low",
    description: "Book transportation 3-4 months before your wedding date.",
    tips: [
      "Calculate exact vehicle needs for guest count",
      "Consider shuttle services for guest convenience",
      "Check insurance and licensing",
      "Plan for multiple pickup/drop-off locations",
    ],
  },
  {
    category: "Decor",
    vendorCategory: [],
    monthsBefore: 4,
    priority: "low",
    description:
      "Finalize decor rentals and purchases 3-4 months before the wedding.",
    tips: [
      "Consider DIY vs rental cost comparison",
      "Check venue restrictions on decor",
      "Plan for setup and breakdown time",
      "Coordinate with florist on centerpiece design",
    ],
  },
  {
    category: "Miscellaneous",
    vendorCategory: ["Makeup Artists"],
    monthsBefore: 3,
    priority: "low",
    description:
      "Book makeup artists and other beauty services 2-4 months in advance.",
    tips: [
      "Schedule a trial run before the wedding",
      "Ask about bridal party pricing",
      "Check if they travel to your venue",
      "Discuss touch-up kit options",
    ],
  },
];

export function getTimelineForWeddingDate(weddingDate: Date): TimelineItem[] {
  const now = new Date();
  const monthsUntil = Math.max(
    0,
    (weddingDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24 * 30),
  );

  return bookingTimeline
    .filter((item) => item.monthsBefore <= monthsUntil + 2) // Show items that should be booked soon or are overdue
    .sort((a, b) => b.monthsBefore - a.monthsBefore);
}

export function getTimelineStatus(
  monthsUntil: number,
  monthsBefore: number,
): "overdue" | "urgent" | "on-track" | "upcoming" {
  if (monthsUntil < monthsBefore - 2) return "overdue";
  if (monthsUntil < monthsBefore) return "urgent";
  if (monthsUntil < monthsBefore + 2) return "on-track";
  return "upcoming";
}
