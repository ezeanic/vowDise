"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import { ArrowUpRight, BadgeCheck, Filter, MapPin, Search, SlidersHorizontal, Sparkles } from "lucide-react";
import { VendorCard } from "@/components/vendor-card";
import { Section } from "@/components/ui";
import { money } from "@/lib/budget";
import { citiesForState, coordinatesForLocation, formatLocation, locationMatchesState, locationStates, milesBetween, parseLocation } from "@/lib/location";
import type { Vendor } from "@/lib/types";
import { venueSubcategories } from "@/lib/venue-subcategories";
import { getMarketplaceVendorsWithRemote } from "@/lib/vendor-profile";
import { categories, vendors as sampleVendors } from "@/lib/vendors";

const categoryAccent: Record<string, string> = {
  Venues: "bg-rose text-white",
  Photographers: "bg-charcoal text-white",
  Caterers: "bg-sage text-white",
  DJs: "bg-gold text-white",
  Florists: "bg-blush text-charcoal",
};

function VendorsMarketplace() {
  const searchParams = useSearchParams();
  const initialCategory = searchParams.get("category");
  const initialCategoryIsValid = initialCategory && categories.includes(initialCategory as Vendor["category"]);
  const [category, setCategory] = useState(initialCategoryIsValid ? initialCategory : "All");
  const [venueSubcategory, setVenueSubcategory] = useState("All");
  const [state, setState] = useState("");
  const [city, setCity] = useState("");
  const [radius, setRadius] = useState(25);
  const [maxPrice, setMaxPrice] = useState(10000);
  const [rating, setRating] = useState(0);
  const [budgetFit, setBudgetFit] = useState("All");
  const [marketplaceVendors, setMarketplaceVendors] = useState<Vendor[]>(sampleVendors);
  const [isLoadingVendors, setIsLoadingVendors] = useState(true);
  const cityOptions = useMemo(() => citiesForState(state), [state]);
  const searchLocation = formatLocation(city, state);
  const categoryOptions = useMemo(() => Array.from(new Set([...categories, ...marketplaceVendors.map((vendor) => vendor.category)])), [marketplaceVendors]);
  const activeCategoryOptions = useMemo(() => categoryOptions.slice(0, 6), [categoryOptions]);
  const filterStorageKey = "vowdise-vendors-filters";

  useEffect(() => {
    const raw = window.sessionStorage.getItem(filterStorageKey);
    if (!raw) return;

    try {
      const saved = JSON.parse(raw) as {
        category?: string;
        venueSubcategory?: string;
        state?: string;
        city?: string;
        radius?: number;
        maxPrice?: number;
        rating?: number;
        budgetFit?: string;
      };

      if (!initialCategoryIsValid && saved.category && categories.includes(saved.category as Vendor["category"])) {
        setCategory(saved.category);
      }
      if (typeof saved.venueSubcategory === "string") setVenueSubcategory(saved.venueSubcategory);
      if (typeof saved.state === "string") setState(saved.state);
      if (typeof saved.city === "string") setCity(saved.city);
      if (typeof saved.radius === "number") setRadius(saved.radius);
      if (typeof saved.maxPrice === "number") setMaxPrice(saved.maxPrice);
      if (typeof saved.rating === "number") setRating(saved.rating);
      if (typeof saved.budgetFit === "string") setBudgetFit(saved.budgetFit);
    } catch {
      // ignore malformed storage data
    }
  }, [initialCategoryIsValid]);

  useEffect(() => {
    const saved = {
      category,
      venueSubcategory,
      state,
      city,
      radius,
      maxPrice,
      rating,
      budgetFit,
    };

    window.sessionStorage.setItem(filterStorageKey, JSON.stringify(saved));
  }, [category, venueSubcategory, state, city, radius, maxPrice, rating, budgetFit]);

  useEffect(() => {
    if (category !== "Venues") setVenueSubcategory("All");
  }, [category]);

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

  const filtered = useMemo(() => {
    const searchPoint = coordinatesForLocation(searchLocation) ?? coordinatesForLocation(city);
    const hasCity = city.trim().length > 0;

    return marketplaceVendors
      .filter((vendor) => {
        const vendorPoint = coordinatesForLocation(vendor.location);
        const vendorCity = parseLocation(vendor.location).city.toLowerCase();
        const matchesLocation =
          locationMatchesState(vendor.location, state) &&
          (!hasCity ||
          (searchPoint && vendorPoint
            ? milesBetween(searchPoint, vendorPoint) <= radius
            : vendorCity.includes(city.trim().toLowerCase())));

        return (
          (category === "All" || vendor.category === category) &&
          (venueSubcategory === "All" || (vendor.category === "Venues" && vendor.venueSubcategory === venueSubcategory)) &&
          matchesLocation &&
          vendor.startingPrice <= maxPrice &&
          vendor.rating >= rating &&
          (budgetFit === "All" || vendor.budgetFit === budgetFit)
        );
      })
      .sort((a, b) => {
        if (!searchPoint) return 0;
        const aPoint = coordinatesForLocation(a.location);
        const bPoint = coordinatesForLocation(b.location);
        if (!aPoint || !bPoint) return 0;
        return milesBetween(searchPoint, aPoint) - milesBetween(searchPoint, bPoint);
      });
  }, [marketplaceVendors, category, venueSubcategory, city, state, searchLocation, radius, maxPrice, rating, budgetFit]);

  const featuredVendor = filtered[0] ?? marketplaceVendors[0] ?? sampleVendors[0];
  const categoryCount = category === "All" ? categoryOptions.length : 1;
  const averageStartingPrice = filtered.length
    ? Math.round(filtered.reduce((total, vendor) => total + vendor.startingPrice, 0) / filtered.length)
    : 0;
  const topRatedCount = filtered.filter((vendor) => vendor.rating >= 4.8).length;

  return (
    <main className="min-h-screen bg-[#fbf7ef] text-charcoal">
      <Section className="space-y-8 pb-20 pt-8 sm:pt-10">
        <div className="overflow-hidden rounded-[8px] border border-champagne/45 bg-white shadow-[0_30px_90px_-55px_rgba(45,42,39,0.45)]">
          <div className="grid min-h-[460px] lg:grid-cols-[0.92fr_1.08fr]">
            <div className="flex flex-col justify-between gap-10 px-6 py-8 sm:px-10 sm:py-10 lg:px-12">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-champagne/60 bg-ivory px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-charcoal/70">
                  <Sparkles size={14} className="text-rose" />
                  Vendor marketplace
                </div>
                <h1 className="mt-5 font-serif text-4xl font-semibold leading-tight text-charcoal sm:text-5xl lg:text-6xl">
                  Find the team behind your wedding day.
                </h1>
                <p className="mt-6 max-w-xl text-base leading-8 text-charcoal/72">
                  Compare trusted venues, creatives, planners, and party makers with clear starting prices and budget-fit signals before you send a single inquiry.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="border-t border-champagne/60 pt-4">
                  <p className="text-3xl font-semibold text-charcoal">{filtered.length}</p>
                  <p className="mt-1 text-xs font-semibold uppercase tracking-[0.16em] text-charcoal/50">Matches</p>
                </div>
                <div className="border-t border-champagne/60 pt-4">
                  <p className="text-3xl font-semibold text-charcoal">{categoryCount}</p>
                  <p className="mt-1 text-xs font-semibold uppercase tracking-[0.16em] text-charcoal/50">Categories</p>
                </div>
                <div className="border-t border-champagne/60 pt-4">
                  <p className="text-3xl font-semibold text-charcoal">{topRatedCount}</p>
                  <p className="mt-1 text-xs font-semibold uppercase tracking-[0.16em] text-charcoal/50">Top rated</p>
                </div>
              </div>
            </div>

            <div className="relative min-h-[360px] overflow-hidden lg:min-h-full">
              <Image
                src={featuredVendor.image}
                alt={featuredVendor.name}
                fill
                priority
                sizes="(min-width: 1024px) 54vw, 100vw"
                className="object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-charcoal/82 via-charcoal/22 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-5 sm:p-7">
                <div className="max-w-md">
                  <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-white/82">
                    <BadgeCheck size={14} />
                    Featured match
                  </p>
                  <div className="mt-3 flex items-start justify-between gap-4">
                    <div>
                      <p className="text-2xl font-semibold leading-tight text-white drop-shadow-sm">{featuredVendor.name}</p>
                      <p className="mt-2 flex items-center gap-2 text-sm text-white/80">
                        <MapPin size={15} />
                        {featuredVendor.location}
                      </p>
                    </div>
                    <span className="rounded-full border border-white/30 bg-white/12 px-3 py-1 text-xs font-bold text-white backdrop-blur-sm">{money(featuredVendor.startingPrice)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-3 overflow-x-auto pb-1 pl-4 pr-6 scrollbar-hidden sm:pl-0">
          <button
            type="button"
            onClick={() => setCategory("All")}
            className={`inline-flex shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition ${category === "All" ? "border-charcoal bg-charcoal text-white" : "border-champagne bg-white text-charcoal/75 hover:border-charcoal/40"}`}
          >
            All vendors
          </button>
          {activeCategoryOptions.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setCategory(item)}
              className={`inline-flex shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition ${category === item ? "border-transparent shadow-soft " + (categoryAccent[item] ?? "bg-rose text-white") : "border-champagne bg-white text-charcoal/75 hover:border-charcoal/40"}`}
            >
              {item}
            </button>
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-[20rem_1fr] lg:items-start">
          <aside className="h-max rounded-[8px] border border-champagne/50 bg-white px-5 py-5 shadow-[0_24px_70px_-55px_rgba(45,42,39,0.42)] lg:sticky lg:top-24 lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto lg:overscroll-contain lg:pr-4">
            <div className="mb-5 flex items-center justify-between border-b border-champagne/45 pb-4">
              <div>
                <p className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.16em] text-charcoal/70">
                  <SlidersHorizontal size={15} />
                  Refine
                </p>
                <p className="mt-1 text-sm text-charcoal/58">Shape the shortlist.</p>
              </div>
              <span className="rounded-full bg-ivory px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-charcoal/70">{filtered.length}</span>
            </div>

            <div className="space-y-5 divide-y divide-champagne/35">
              <div className="pb-5">
                <label className="block text-sm font-semibold text-charcoal/75">Category</label>
                <select value={category} onChange={(event) => setCategory(event.target.value)} className="mt-3 w-full rounded-[8px] border border-champagne bg-ivory px-4 py-3 text-sm text-charcoal outline-none focus:border-rose focus:ring-2 focus:ring-rose/10">
                  <option>All</option>
                  {categoryOptions.map((item) => <option key={item}>{item}</option>)}
                </select>
              </div>

              {category === "Venues" && (
                <div className="py-5">
                  <label className="block text-sm font-semibold text-charcoal/75">Venue type</label>
                  <select value={venueSubcategory} onChange={(event) => setVenueSubcategory(event.target.value)} className="mt-3 w-full rounded-[8px] border border-champagne bg-ivory px-4 py-3 text-sm text-charcoal outline-none focus:border-rose focus:ring-2 focus:ring-rose/10">
                    <option>All</option>
                    {venueSubcategories.map((subcategory) => <option key={subcategory}>{subcategory}</option>)}
                  </select>
                </div>
              )}

              <div className="py-5">
                <label className="block text-sm font-semibold text-charcoal/75">Location</label>
                <div className="mt-3 space-y-4">
                  <select
                    value={state}
                    onChange={(event) => {
                      setState(event.target.value);
                      setCity("");
                    }}
                    className="w-full rounded-[8px] border border-champagne bg-ivory px-4 py-3 text-sm text-charcoal outline-none focus:border-rose focus:ring-2 focus:ring-rose/10"
                  >
                    <option value="">All states</option>
                    {locationStates.map((item) => <option key={item}>{item}</option>)}
                  </select>
                  <span className="relative block">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-charcoal/40" size={17} />
                    <input
                      value={city}
                      onChange={(event) => setCity(event.target.value)}
                      placeholder={state ? "Search city" : "Choose a state first"}
                      list="vendor-city-options"
                      disabled={!state}
                      className="w-full rounded-[8px] border border-champagne bg-ivory py-3 pl-11 pr-4 text-sm text-charcoal outline-none focus:border-rose focus:ring-2 focus:ring-rose/10 disabled:cursor-not-allowed disabled:opacity-60"
                    />
                    <datalist id="vendor-city-options">
                      {cityOptions.map((item) => <option key={item} value={item} />)}
                    </datalist>
                  </span>
                </div>
              </div>

              <div className="py-5">
                <div className="flex items-center justify-between text-sm font-semibold text-charcoal/75">
                  <span>Distance</span>
                  <span>{radius} mi</span>
                </div>
                <input
                  type="range"
                  min={5}
                  max={75}
                  step={5}
                  value={radius}
                  onChange={(event) => setRadius(Number(event.target.value))}
                  className="mt-4 w-full accent-rose"
                />
              </div>

              <div className="py-5">
                <label className="block text-sm font-semibold text-charcoal/75">Price</label>
                <div className="mt-3 flex items-center justify-between text-sm text-charcoal/70">
                  <span>Max starting price</span>
                  <span>${maxPrice.toLocaleString()}</span>
                </div>
                <input type="range" min={500} max={10000} step={250} value={maxPrice} onChange={(event) => setMaxPrice(Number(event.target.value))} className="mt-4 w-full accent-rose" />
              </div>

              <div className="grid gap-4 pt-5 sm:grid-cols-2 lg:grid-cols-1">
                <div>
                  <label className="block text-sm font-semibold text-charcoal/75">Rating</label>
                  <select value={rating} onChange={(event) => setRating(Number(event.target.value))} className="mt-3 w-full rounded-[8px] border border-champagne bg-ivory px-4 py-3 text-sm text-charcoal outline-none focus:border-rose focus:ring-2 focus:ring-rose/10">
                    <option value={0}>Any rating</option>
                    <option value={4.7}>4.7+</option>
                    <option value={4.8}>4.8+</option>
                    <option value={4.9}>4.9+</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-charcoal/75">Budget fit</label>
                  <select value={budgetFit} onChange={(event) => setBudgetFit(event.target.value)} className="mt-3 w-full rounded-[8px] border border-champagne bg-ivory px-4 py-3 text-sm text-charcoal outline-none focus:border-rose focus:ring-2 focus:ring-rose/10">
                    <option>All</option>
                    <option>Great fit</option>
                    <option>Stretch</option>
                    <option>Premium</option>
                  </select>
                </div>
              </div>
            </div>
          </aside>

          <div>
            <div className="mb-4 rounded-[8px] border border-champagne/45 bg-white px-5 py-4 shadow-sm">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-charcoal">
                    {category === "Venues" && venueSubcategory !== "All" ? venueSubcategory : category === "All" ? "All vendor categories" : category}
                  </p>
                  <p className="mt-1 text-sm text-charcoal/65">
                    {state
                      ? city.trim()
                        ? `Showing vendors within ${radius} miles of ${formatLocation(city, state)}.`
                        : `Showing vendors in ${state}.`
                      : averageStartingPrice
                        ? `Average starting price ${money(averageStartingPrice)} across current matches.`
                        : "Sorted for fast comparison and budget confidence."}
                  </p>
                </div>
                <span className="inline-flex items-center gap-2 rounded-full bg-charcoal px-4 py-2 text-sm font-semibold text-white">
                  <Filter size={16} /> {filtered.length} matches
                </span>
              </div>
            </div>

            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {isLoadingVendors ? (
                <div className="rounded-[8px] border border-champagne/35 bg-white p-6 text-sm font-semibold text-charcoal/65 sm:col-span-2 xl:col-span-3">
                  Loading vendor listings...
                </div>
              ) : filtered.length ? (
                filtered.map((vendor) => (
                  <VendorCard
                    key={vendor.id}
                    vendor={vendor}
                  />
                ))
              ) : (
                <div className="rounded-[8px] border border-champagne/35 bg-white p-8 text-sm text-charcoal/65 sm:col-span-2 xl:col-span-3">
                  <p className="text-lg font-semibold text-charcoal">No vendors match these filters yet.</p>
                  <button type="button" onClick={() => {
                    setCategory("All");
                    setVenueSubcategory("All");
                    setState("");
                    setCity("");
                    setRadius(25);
                    setMaxPrice(10000);
                    setRating(0);
                    setBudgetFit("All");
                  }} className="mt-4 inline-flex items-center gap-2 rounded-full bg-charcoal px-4 py-2 text-sm font-semibold text-white transition hover:bg-black">
                    Reset filters <ArrowUpRight size={15} />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </Section>
    </main>
  );
}

export default function VendorsPage() {
  return (
    <Suspense>
      <VendorsMarketplace />
    </Suspense>
  );
}
