import type { BudgetCategory } from "./types";

export const budgetTemplate: BudgetCategory[] = [
  { name: "Venue", percent: 0.28 },
  { name: "Food/catering", percent: 0.24 },
  { name: "Photography", percent: 0.1 },
  { name: "Videography", percent: 0.06 },
  { name: "DJ/music", percent: 0.05 },
  { name: "Florals", percent: 0.07 },
  { name: "Dress/attire", percent: 0.06 },
  { name: "Cake", percent: 0.025 },
  { name: "Transportation", percent: 0.025 },
  { name: "Decor", percent: 0.055 },
  { name: "Miscellaneous", percent: 0.045 },
];

export function buildBudget(total: number) {
  return budgetTemplate.map((item) => ({
    ...item,
    amount: Math.round(total * item.percent),
  }));
}

export function money(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

export function healthScore(total: number, allocated: number) {
  const ratio = allocated / total;
  if (ratio <= 0.9) return 92;
  if (ratio <= 1) return 78;
  if (ratio <= 1.12) return 54;
  return 31;
}
