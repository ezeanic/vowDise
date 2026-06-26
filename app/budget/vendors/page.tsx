"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Sparkles, DollarSign } from "lucide-react";
import { useAccountGate } from "@/components/account-gate";
import { VendorCard } from "@/components/vendor-card";
import { Section } from "@/components/ui";
import { money } from "@/lib/budget";
import { citiesForState, formatLocation, locationMatchesState, locationStates, milesBetween, coordinatesForLocation, parseLocation } from "@/lib/location";
import type { Vendor, BudgetItem } from "@/lib/types";
import { getMarketplaceVendorsWithRemote } from "@/lib/vendor-profile";
import { loadBudget } from "@/lib/account-service";

const categoryAccent: Record<string, string> = {
  Venues: "bg-rose text-white",
  Photographers: "bg-charcoal text-white",
  Caterers: "bg-sage text-white",
  DJs: "bg-gold text-white",
  Florists: "bg-blush text-charcoal",
};

// Map budget categories to vendor categories
const budgetToVendorCategory: Record<string, string[]> = {
  "Venue": ["Venues"],
  "Food/catering": ["Caterers"],
  "Photography": ["Photographers"],
  "Videography": ["Videographers"],
  "DJ/music": ["DJs"],
  "Florals": ["Florists"],
  "Dress/attire": [],
  "Cake": ["Cake Vendors"],
  "Transportation": [],
  "Decor": [],
  "Miscellaneous": ["Wedding Planners", "Makeup Artists"],
};

function BudgetVendorMatcher() {
  const [marketplaceVendors, setMarketplaceVendors] = useState<Vendor[]>([]);
  const [isLoadingVendors, setIsLoadingVendors] = useState(true);
  const [budget, setBudget] = useState<{ total: number; items: BudgetItem[] } | null>(null);
  const [state, setState] = useState("");
  const [city, setCity] = useState("");
  const [radius, setRadius] = useState(25);
  const { account, requireAccount, AccountGate } = useAccountGate();
  const cityOptions = useMemo(() => citiesForState(state), [state]);
  const searchLocation = formatLocation(city, state);

  useEffect(() => {
    let isMounted = true;

    async function syncVendors() {
      setIsLoadingVendors(true);
      const nextVendors = await getMarketplaceVendorsWithRemote();
      if (!isMounted) return;
      setMarketplaceVendors(nextVendors);
      setIsLoadingVendors(false);
    }

    void syncVendors();
    window.addEventListener("storage", syncVendors);
    window.addEventListener("vowdise-vendor-profile-changed", syncVendors);

    return () => {
      isMounted = false;
      window.removeEventListener("storage", syncVendors);
      window.removeEventListener("vowdise-vendor-profile-changed", syncVendors);
    };
  }, []);

  useEffect(() => {
    async function loadUserBudget() {
      if (!account) return;
      const saved = await loadBudget(account.uid);
      if (saved) {
        setBudget(saved);
      }
    }
    loadUserBudget();
  }, [account]);

  const filteredVendors = useMemo(() => {
    const searchPoint = coordinatesForLocation(searchLocation) ?? coordinatesForLocation(city);
    const hasCity = city.trim().length > 0;

    return marketplaceVendors.filter((vendor) => {
      const vendorPoint = coordinatesForLocation(vendor.location);
      const vendorCity = parseLocation(vendor.location).city.toLowerCase();
      const matchesLocation =
        locationMatchesState(vendor.location, state) &&
        (!hasCity ||
        (searchPoint && vendorPoint
          ? milesBetween(searchPoint, vendorPoint) <= radius
          : vendorCity.includes(city.trim().toLowerCase())));

      return matchesLocation;
    });
  }, [marketplaceVendors, city, state, searchLocation, radius]);

  const budgetMatches = useMemo(() => {
    if (!budget) return [];

    return budget.items
      .filter(item => budgetToVendorCategory[item.name]?.length > 0)
      .map(budgetItem => {
        const vendorCategories = budgetToVendorCategory[budgetItem.name];
        const matchingVendors = filteredVendors.filter(vendor =>
          vendorCategories.includes(vendor.category) &&
          vendor.startingPrice <= budgetItem.amount
        );

        return {
          budgetItem,
          matchingVendors,
          hasMatches: matchingVendors.length > 0,
        };
      });
  }, [budget, filteredVendors]);

  const totalMatches = budgetMatches.reduce((sum, match) => sum + match.matchingVendors.length, 0);

  return (
    <main className="min-h-screen bg-[#fbf7ef] text-charcoal">
      <Section className="space-y-8 pb-20 pt-8 sm:pt-10">
        <a
          href="/budget"
          className="inline-flex items-center gap-2 text-sm font-semibold text-charcoal/60 hover:text-charcoal transition-colors"
        >
          <ArrowLeft size={16} />
          Back to budget
        </a>
        <div className="overflow-hidden rounded-[8px] border border-champagne/45 bg-white shadow-[0_30px_90px_-55px_rgba(45,42,39,0.45)]">
          <div className="grid min-h-[460px] lg:grid-cols-[0.92fr_1.08fr]">
            <div className="flex flex-col justify-between gap-10 px-6 py-8 sm:px-10 sm:py-10 lg:px-12">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-champagne/60 bg-ivory px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-charcoal/70">
                  <Sparkles size={14} className="text-rose" />
                  Budget to vendors
                </div>
                <h1 className="mt-5 font-serif text-5xl font-semibold leading-[0.95] text-charcoal sm:text-6xl lg:text-7xl">
                  See what fits your budget.
                </h1>
                <p className="mt-6 max-w-xl text-base leading-8 text-charcoal/72">
                  Enter your wedding location and we&apos;ll show you vendors that fit within each budget category. No more guessing what&apos;s available.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="border-t border-champagne/60 pt-4">
                  <p className="text-3xl font-semibold text-charcoal">{budget ? money(budget.total) : "---"}</p>
                  <p className="mt-1 text-xs font-semibold uppercase tracking-[0.16em] text-charcoal/50">Your budget</p>
                </div>
                <div className="border-t border-champagne/60 pt-4">
                  <p className="text-3xl font-semibold text-charcoal">{totalMatches}</p>
                  <p className="mt-1 text-xs font-semibold uppercase tracking-[0.16em] text-charcoal/50">Matching vendors</p>
                </div>
                <div className="border-t border-champagne/60 pt-4">
                  <p className="text-3xl font-semibold text-charcoal">{budgetMatches.filter(m => m.hasMatches).length}</p>
                  <p className="mt-1 text-xs font-semibold uppercase tracking-[0.16em] text-charcoal/50">Categories covered</p>
                </div>
              </div>
            </div>

            <div className="relative min-h-[360px] overflow-hidden lg:min-h-full bg-gradient-to-br from-rose/10 to-gold/10">
              <div className="absolute inset-0 flex items-center justify-center p-8">
                <div className="text-center">
                  <DollarSign size={64} className="mx-auto text-charcoal/20" />
                  <p className="mt-4 text-2xl font-semibold text-charcoal/40">Smart budget matching</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Location Filter */}
        <div className="rounded-[8px] border border-champagne/50 bg-white px-5 py-5 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:gap-6">
            <div className="flex-1">
              <label className="block text-sm font-semibold text-charcoal/75">Your wedding location</label>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <select
                  value={state}
                  onChange={(event) => {
                    setState(event.target.value);
                    setCity("");
                  }}
                  className="rounded-[8px] border border-champagne bg-ivory px-4 py-3 text-sm text-charcoal outline-none focus:border-rose focus:ring-2 focus:ring-rose/10"
                >
                  <option value="">All states</option>
                  {locationStates.map((item) => <option key={item}>{item}</option>)}
                </select>
                <input
                  value={city}
                  onChange={(event) => setCity(event.target.value)}
                  placeholder={state ? "Search city" : "Choose a state first"}
                  list="budget-city-options"
                  disabled={!state}
                  className="rounded-[8px] border border-champagne bg-ivory px-4 py-3 text-sm text-charcoal outline-none focus:border-rose focus:ring-2 focus:ring-rose/10 disabled:cursor-not-allowed disabled:opacity-60"
                />
                <datalist id="budget-city-options">
                  {cityOptions.map((item) => <option key={item} value={item} />)}
                </datalist>
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-charcoal/75">Search radius</label>
              <div className="mt-3 flex items-center gap-3">
                <input
                  type="range"
                  min={5}
                  max={75}
                  step={5}
                  value={radius}
                  onChange={(event) => setRadius(Number(event.target.value))}
                  className="w-32 accent-rose"
                />
                <span className="text-sm font-semibold text-charcoal">{radius} miles</span>
              </div>
            </div>
          </div>
        </div>

        {!budget ? (
          <div className="rounded-[8px] border border-champagne/35 bg-white p-8 text-center">
            <p className="text-lg font-semibold text-charcoal">Set your budget first</p>
            <p className="mt-2 text-charcoal/65">Create a wedding budget to see matching vendors in your area.</p>
            <button
              type="button"
              onClick={() => requireAccount(() => {}, "set your wedding budget")}
              className="mt-4 inline-flex items-center gap-2 rounded-full bg-charcoal px-6 py-3 text-sm font-semibold text-white transition hover:bg-black"
            >
              Go to budget editor <ArrowRight size={16} />
            </button>
          </div>
        ) : (
          <div className="space-y-8">
            {isLoadingVendors && (
              <div className="rounded-[8px] border border-champagne/35 bg-white p-6 text-sm font-semibold text-charcoal/65">
                Loading budget-matched vendors...
              </div>
            )}
            {budgetMatches.map(({ budgetItem, matchingVendors, hasMatches }) => (
              <div key={budgetItem.name} className="rounded-[8px] border border-champagne/45 bg-white shadow-sm">
                <div className="flex items-center justify-between border-b border-champagne/35 px-6 py-4">
                  <div className="flex items-center gap-4">
                    <div className={`rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] ${categoryAccent[budgetToVendorCategory[budgetItem.name]?.[0]] ?? 'bg-charcoal text-white'}`}>
                      {budgetToVendorCategory[budgetItem.name]?.[0] || budgetItem.name}
                    </div>
                    <div>
                      <h3 className="font-semibold text-charcoal">{budgetItem.name}</h3>
                      <p className="text-sm text-charcoal/60">Budget: {money(budgetItem.amount)}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-semibold text-charcoal">{matchingVendors.length}</p>
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-charcoal/50">Vendors in range</p>
                  </div>
                </div>

                <div className="p-6">
                  {hasMatches ? (
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {matchingVendors.slice(0, 6).map((vendor) => (
                        <VendorCard
                          key={vendor.id}
                          vendor={vendor}
                          href={`/vendors/${vendor.id}?returnTo=${encodeURIComponent("/budget/vendors")}&returnLabel=${encodeURIComponent("Back to budget matches")}`}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-lg bg-ivory p-6 text-center">
                      <p className="font-semibold text-charcoal">No vendors match this budget in your area</p>
                      <p className="mt-1 text-sm text-charcoal/60">Try expanding your search radius or adjusting your budget allocation.</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>
      <AccountGate />
    </main>
  );
}

export default function BudgetVendorsPage() {
  return (
    <Suspense>
      <BudgetVendorMatcher />
    </Suspense>
  );
}
