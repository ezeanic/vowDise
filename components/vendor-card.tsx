"use client";

import Image from "next/image";
import Link from "next/link";
import { CalendarCheck, MapPin, Star } from "lucide-react";
import type { Vendor } from "@/lib/types";
import { money } from "@/lib/budget";

export function VendorCard({
  vendor,
  href,
}: {
  vendor: Vendor;
  href?: string;
}) {
  const target = href ?? `/vendors/${vendor.id}`;
  const categoryLabel = vendor.category === "Venues" && vendor.venueSubcategory
    ? vendor.venueSubcategory
    : vendor.category;

  return (
    <article className="group overflow-hidden rounded-[8px] border border-champagne/45 bg-white shadow-[0_18px_55px_-45px_rgba(45,42,39,0.55)] transition duration-300 hover:-translate-y-1 hover:border-champagne hover:shadow-[0_30px_80px_-48px_rgba(45,42,39,0.48)]">
      <Link href={target} className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-rose/35">
        <div className="relative overflow-hidden bg-charcoal">
          <div className="aspect-[1.12/1] overflow-hidden">
            <Image
              src={vendor.image}
              alt={vendor.name}
              width={600}
              height={450}
              sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
              className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
            />
          </div>
          <div className="absolute inset-0 bg-gradient-to-t from-charcoal/72 via-charcoal/0 to-charcoal/10 opacity-90" />
          <div className="absolute left-3 right-3 top-3 w-max max-w-[calc(100%-1.5rem)] truncate rounded-full bg-white/92 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-charcoal shadow-sm backdrop-blur sm:left-4 sm:right-auto sm:top-4 sm:max-w-[calc(100%-2rem)] sm:text-[11px] sm:tracking-[0.18em]">
            {categoryLabel}
          </div>
          <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between gap-3 text-white sm:bottom-4 sm:left-4 sm:right-4">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.15em] text-white/70">From</p>
              <p className="text-xl font-semibold sm:text-2xl">{money(vendor.startingPrice)}</p>
            </div>
            <span className="max-w-[8rem] shrink-0 truncate rounded-full bg-white/90 px-3 py-1 text-xs font-bold text-charcoal">{vendor.budgetFit}</span>
          </div>
        </div>

        <div className="space-y-4 p-4 sm:space-y-5 sm:p-5">
          <div>
            <p className="text-lg font-semibold leading-tight text-charcoal transition group-hover:text-rose sm:text-xl">
              {vendor.name}
            </p>
            {vendor.category === "Venues" && vendor.venueSubcategory ? (
              <p className="mt-2 text-xs font-semibold uppercase tracking-[0.14em] text-rose">{vendor.venueSubcategory}</p>
            ) : null}
            <p className="mt-3 line-clamp-3 text-sm leading-6 text-charcoal/68">{vendor.description}</p>
          </div>

          <div className="grid gap-3 border-t border-champagne/45 py-4 text-sm text-charcoal/70">
            <p className="flex min-w-0 items-center gap-2">
              <MapPin size={15} className="shrink-0 text-rose" /> <span className="truncate">{vendor.location}</span>
            </p>
            <p className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
              {vendor.reviewCount > 0 ? (
                <>
                  <Star className="shrink-0 fill-gold text-gold" size={16} /> <span className="font-semibold text-charcoal">{vendor.rating}</span> <span>({vendor.reviewCount} reviews)</span>
                </>
              ) : (
                <span className="font-semibold text-charcoal/55">No reviews yet</span>
              )}
            </p>
            {vendor.availability ? (
              <p className="flex min-w-0 items-center gap-2">
                <CalendarCheck size={15} className="shrink-0 text-sage" /> <span className="min-w-0 truncate">{vendor.availability} availability</span>
              </p>
            ) : null}
          </div>
        </div>
      </Link>
    </article>
  );
}
