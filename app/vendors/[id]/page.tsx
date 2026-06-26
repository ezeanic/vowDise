"use client";

import { notFound, useParams, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { ArrowLeft, CalendarDays, CheckCircle2, Heart, ImageIcon, MapPin, Star, WalletCards } from "lucide-react";
import { useAccountGate } from "@/components/account-gate";
import { QuoteModal } from "@/components/quote-modal";
import { VendorCard } from "@/components/vendor-card";
import { Button, LinkButton, Section } from "@/components/ui";
import { money } from "@/lib/budget";
import type { Vendor, VendorReview } from "@/lib/types";
import { getMarketplaceVendors, getMarketplaceVendorsWithRemote, getReviewsForVendor, saveVendorReview } from "@/lib/vendor-profile";
import { vendors as sampleVendors } from "@/lib/vendors";
import { addVendorToPlan } from "@/lib/wedding-plan";

export default function VendorDetailPage() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const [marketplaceVendors, setMarketplaceVendors] = useState<Vendor[]>(sampleVendors);
  const [hasLoadedVendors, setHasLoadedVendors] = useState(false);
  const vendor = marketplaceVendors.find((item) => item.id === params.id);
  const [quoteVendor, setQuoteVendor] = useState<Vendor | null>(null);
  const [localReviews, setLocalReviews] = useState<VendorReview[]>([]);
  const [reviewRating, setReviewRating] = useState(5);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [reviewText, setReviewText] = useState("");
  const [savingReview, setSavingReview] = useState(false);
  const [reviewError, setReviewError] = useState("");
  const [planMessage, setPlanMessage] = useState("");
  const { account, requireAccount, AccountGate } = useAccountGate();

  useEffect(() => {
    let isMounted = true;

    async function syncVendors() {
      setHasLoadedVendors(false);
      setMarketplaceVendors(getMarketplaceVendors());
      const nextVendors = await getMarketplaceVendorsWithRemote();
      if (!isMounted) return;
      setMarketplaceVendors(nextVendors);
      setHasLoadedVendors(true);
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
    if (!vendor?.id) return;

    const updateReviews = async () => setLocalReviews(await getReviewsForVendor(vendor.id));
    void updateReviews();
    window.addEventListener("vowdise-vendor-review-changed", updateReviews);
    return () => window.removeEventListener("vowdise-vendor-review-changed", updateReviews);
  }, [vendor?.id]);

  const allReviews = useMemo(() => [...localReviews, ...(vendor?.reviews || [])], [localReviews, vendor?.reviews]);
  const totalReviews = allReviews.length;
  const reviewSummary = totalReviews > 0 ? `${totalReviews} total` : "No reviews yet";
  const requestedReturnTo = searchParams.get("returnTo");
  const backHref = requestedReturnTo?.startsWith("/") ? requestedReturnTo : "/vendors";
  const backLabel = searchParams.get("returnLabel") || "Back to Vendors";

  if (!vendor && hasLoadedVendors) notFound();

  if (!vendor) {
    return (
      <main>
        <Section>
          <LinkButton href={backHref} variant="ghost" className="mb-6 px-0">
            <ArrowLeft size={18} /> {backLabel}
          </LinkButton>
          <div className="rounded-[8px] bg-white/60 p-8 text-charcoal/65 ring-1 ring-champagne/45">
            Loading vendor profile...
          </div>
        </Section>
      </main>
    );
  }

  const similar = marketplaceVendors.filter((item) => item.category === vendor.category && item.id !== vendor.id).concat(marketplaceVendors.filter((item) => item.id !== vendor.id)).slice(0, 3);
  const lowestPackage = vendor.packages.reduce((lowest, pkg) => (pkg.price < lowest.price ? pkg : lowest), vendor.packages[0]);
  const messageVendorId = vendor.id;
  const isOwnVendorProfile = Boolean(
    account?.roles.vendor && (account.uid === vendor.ownerUid || account.uid === vendor.id)
  );

  const handleSubmitReview = async () => {
    if (!reviewText.trim()) return;
    const nextReview = {
      name: account?.name || "Couple",
      rating: reviewRating,
      text: reviewText.trim(),
      createdAt: new Date().toISOString(),
    };

    setReviewError("");
    setSavingReview(true);
    setLocalReviews((current) => [nextReview, ...current]);
    setReviewRating(5);
    setReviewText("");

    try {
      const saved = await saveVendorReview(vendor.id, nextReview);
      setLocalReviews(saved);
    } catch (error) {
      setLocalReviews((current) => current.filter((review) => review.createdAt !== nextReview.createdAt));
      setReviewError(error instanceof Error ? error.message : "Review could not be saved. Please try again.");
    } finally {
      setSavingReview(false);
    }
  };

  async function handleAddToPlan(nextVendor: Vendor, uid = account?.uid) {
    if (!uid) return;
    await addVendorToPlan(uid, nextVendor);
    setPlanMessage(`${nextVendor.name} was added to your wedding plan.`);
    window.setTimeout(() => setPlanMessage(""), 3000);
  }

  return (
    <main>
      <Section>
        <LinkButton href={backHref} variant="ghost" className="mb-6 px-0">
          <ArrowLeft size={18} /> {backLabel}
        </LinkButton>

        <div className="grid gap-3 lg:grid-cols-[1.35fr_0.65fr]">
            <div className="relative min-h-[28rem] overflow-hidden rounded-[8px]">
              <Image
                src={vendor.gallery[0]}
                alt={vendor.name}
                fill
                priority
                sizes="(min-width: 1024px) 68vw, 100vw"
                className="object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-charcoal/88 via-charcoal/18 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-6 text-white sm:p-8">
                <div className="mb-4 flex flex-wrap gap-2">
                  <span className="rounded-full bg-white/16 px-4 py-2 text-xs font-bold uppercase tracking-[0.14em] backdrop-blur">
                    {vendor.category}
                  </span>
                  {vendor.category === "Venues" && vendor.venueSubcategory ? (
                    <span className="rounded-full bg-white/16 px-4 py-2 text-xs font-bold uppercase tracking-[0.14em] backdrop-blur">
                      {vendor.venueSubcategory}
                    </span>
                  ) : null}
                  <span className="rounded-full bg-sage px-4 py-2 text-xs font-bold text-white">
                    {vendor.budgetFit}
                  </span>
                </div>
                <h1 className="max-w-3xl font-serif text-5xl font-semibold leading-tight sm:text-6xl">{vendor.name}</h1>
                <div className="mt-4 flex flex-wrap gap-4 text-sm font-semibold text-white/82">
                  <span className="flex items-center gap-1"><MapPin size={16} /> {vendor.location}</span>
                  {totalReviews > 0 ? (
                    <span className="flex items-center gap-1"><Star className="fill-gold text-gold" size={16} /> {vendor.rating} rating · {totalReviews} reviews</span>
                  ) : (
                    <span className="font-semibold">No reviews yet</span>
                  )}
                  <span className="flex items-center gap-1"><CalendarDays size={16} /> {vendor.availability} availability</span>
                </div>
              </div>
            </div>
            <div className="grid gap-3">
              {vendor.gallery.slice(1, 3).map((image, index) => (
                <div key={image} className="relative min-h-48 overflow-hidden rounded-[8px]">
                  <Image
                    src={image}
                    alt={`${vendor.name} gallery ${index + 2}`}
                    fill
                    sizes="(min-width: 1024px) 32vw, 100vw"
                    className="object-cover"
                  />
                </div>
              ))}
              <div className="flex items-center justify-center gap-2 rounded-[8px] bg-white/55 p-4 text-sm font-bold text-charcoal/65 ring-1 ring-champagne/45 backdrop-blur">
                <ImageIcon size={17} /> {vendor.gallery.length} gallery photos
              </div>
            </div>
        </div>
      </Section>

      <Section className={`grid gap-8 pt-0 lg:items-start ${isOwnVendorProfile ? "" : "lg:grid-cols-[1fr_22rem]"}`}>
        <div className="min-w-0 space-y-8">
          <div className="min-w-0 overflow-hidden">
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-rose">About this vendor</p>
            <h2 className="mt-2 font-serif text-4xl font-semibold">A strong fit for budget-aware couples</h2>
            <p className="mt-4 max-w-3xl leading-8 text-charcoal/72">{vendor.description}</p>
            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              {[
                [WalletCards, "Starting price", money(vendor.startingPrice)],
                [CheckCircle2, "Best package", lowestPackage.name],
                [Star, "Reviews", reviewSummary],
              ].map(([Icon, label, value]) => (
                <div key={String(label)} className="rounded-[8px] bg-white/55 p-4 ring-1 ring-champagne/45 backdrop-blur">
                  <Icon className="text-gold" size={20} />
                  <p className="mt-3 text-xs font-bold uppercase tracking-[0.16em] text-charcoal/45">{String(label)}</p>
                  <p className="mt-1 font-bold">{String(value)}</p>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
              <div>
                <p className="text-sm font-bold uppercase tracking-[0.18em] text-rose">Packages</p>
                <h2 className="mt-2 font-serif text-4xl font-semibold">Clear options to compare</h2>
              </div>
              <span className="w-max rounded-full bg-white/60 px-4 py-2 text-sm font-bold text-charcoal/65 ring-1 ring-champagne/50 backdrop-blur">
                From {money(vendor.startingPrice)}
              </span>
            </div>
            <div className="grid gap-4">
            {vendor.packages.map((pkg) => (
              <div key={pkg.name} className="rounded-[8px] bg-white/58 p-5 ring-1 ring-champagne/45 backdrop-blur">
                <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                  <div>
                    <h3 className="text-xl font-bold">{pkg.name}</h3>
                    <p className="mt-2 text-sm leading-6 text-charcoal/65">{pkg.includes}</p>
                  </div>
                  <span className="w-max rounded-full bg-blush px-4 py-2 font-bold text-rose">{money(pkg.price)}</span>
                </div>
              </div>
            ))}
            </div>
          </div>

          <div>
            <div className="mb-4">
              <p className="text-sm font-bold uppercase tracking-[0.18em] text-rose">Couple reviews</p>
              <h2 className="mt-2 font-serif text-4xl font-semibold">What couples say</h2>
            </div>
            <div className="scrollbar-hidden flex max-w-full snap-x gap-4 overflow-x-auto scroll-smooth pb-2 [mask-image:linear-gradient(to_right,black_calc(100%-2rem),transparent)]">
            {allReviews.length ? (
              allReviews.map((review, index) => (
                <blockquote key={`${review.name}-${index}`} className="w-[82vw] max-w-md flex-none snap-start rounded-[8px] bg-white/58 p-5 ring-1 ring-champagne/45 backdrop-blur sm:w-96">
                  <p className="flex items-center gap-1 font-bold"><Star className="fill-gold text-gold" size={16} /> {review.rating}.0 · {review.name}</p>
                  <p className="mt-3 leading-7 text-charcoal/68">“{review.text}”</p>
                </blockquote>
              ))
            ) : (
              <div className="w-full rounded-[8px] bg-white/58 p-5 text-charcoal/65 ring-1 ring-champagne/45 backdrop-blur">
                Reviews will appear here once couples start booking this vendor through Vowdise.
              </div>
            )}
            </div>
          </div>

          <div className="rounded-[12px] border border-champagne/35 bg-white/70 p-5 shadow-sm">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-charcoal/70">Leave a review</p>
            <p className="mt-2 text-sm text-charcoal/65">Share your rating and comments to help other couples compare this vendor.</p>
            <div className="mt-4 space-y-4">
              <div>
                <p className="text-sm font-semibold text-charcoal/75">Rating</p>
                <div className="mt-3 flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((score) => {
                    const isActive = score <= (hoverRating ?? reviewRating);
                    return (
                      <button
                        key={score}
                        type="button"
                        onClick={() => setReviewRating(score)}
                        onMouseEnter={() => setHoverRating(score)}
                        onMouseLeave={() => setHoverRating(null)}
                        className="grid h-10 w-10 place-items-center text-charcoal/35 transition hover:scale-110 hover:text-gold focus:outline-none focus:ring-2 focus:ring-gold/30"
                        aria-label={`${score} star${score === 1 ? "" : "s"}`}
                      >
                        <Star size={26} className={isActive ? "fill-gold text-gold" : "text-charcoal/35"} />
                      </button>
                    );
                  })}
                  <span className="ml-2 text-sm font-semibold text-charcoal/55">{hoverRating ?? reviewRating}.0</span>
                </div>
              </div>
              <label className="block text-sm font-semibold text-charcoal/75">Comment</label>
              <textarea
                value={reviewText}
                onChange={(event) => setReviewText(event.target.value)}
                rows={4}
                placeholder="Tell other couples what you liked about this vendor"
                className="w-full rounded-[12px] border border-champagne bg-ivory px-4 py-3 text-sm text-charcoal outline-none focus:border-rose focus:ring-2 focus:ring-rose/10"
              />
              {!account && (
                <p className="text-sm text-charcoal/60">Sign in to submit your review so it appears under your name.</p>
              )}
              {reviewError && (
                <p className="rounded-[8px] bg-rose/10 p-3 text-sm font-semibold text-rose">{reviewError}</p>
              )}
              <Button
                className="w-full"
                onClick={() => requireAccount(handleSubmitReview, "add a review for this vendor")}
                disabled={savingReview || !reviewText.trim()}
              >
                {savingReview ? "Saving review…" : "Submit review"}
              </Button>
            </div>
          </div>
        </div>

        {!isOwnVendorProfile && (
          <aside className="sticky top-24 rounded-[8px] bg-white/68 p-6 shadow-soft ring-1 ring-champagne/50 backdrop-blur">
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-rose">Request pricing</p>
            <p className="mt-3 text-charcoal/55">Starting at</p>
            <p className="mt-1 text-4xl font-bold">{money(vendor.startingPrice)}</p>
            <div className="mt-5 grid gap-2 text-sm">
                <span className="flex items-center justify-between rounded-[8px] bg-ivory/70 px-3 py-2">
                  <span className="font-semibold text-charcoal/60">Budget fit</span>
                  <span className="font-bold text-sage">{vendor.budgetFit}</span>
                </span>
                {vendor.category === "Venues" && vendor.venueSubcategory ? (
                  <span className="flex items-center justify-between rounded-[8px] bg-ivory/70 px-3 py-2">
                    <span className="font-semibold text-charcoal/60">Venue type</span>
                    <span className="font-bold">{vendor.venueSubcategory}</span>
                  </span>
                ) : null}
                <span className="flex items-center justify-between rounded-[8px] bg-ivory/70 px-3 py-2">
                  <span className="font-semibold text-charcoal/60">Availability</span>
                  <span className="font-bold">{vendor.availability}</span>
              </span>
              <span className="flex items-center justify-between rounded-[8px] bg-ivory/70 px-3 py-2">
                <span className="font-semibold text-charcoal/60">Location</span>
                <span className="font-bold">{vendor.location}</span>
              </span>
            </div>
              <Button className="mt-6 w-full" onClick={() => requireAccount(() => setQuoteVendor(vendor), "request a quote from this vendor")}>Request Quote</Button>
              <Button className="mt-3 w-full" variant="secondary" onClick={() => requireAccount(() => {
                const params = new URLSearchParams({
                  vendor: messageVendorId,
                  vendorName: vendor.name,
                  vendorBusinessName: vendor.name,
                });
                if (vendor.ownerUid) params.set("vendorOwner", vendor.ownerUid);
                window.location.href = `/messages?${params.toString()}`;
              }, "message this vendor")}>
                Message vendor
              </Button>
              <Button className="mt-3 w-full" variant="secondary" onClick={() => requireAccount((activeAccount) => void handleAddToPlan(vendor, activeAccount.uid), "add this vendor to your wedding plan") }>
                <Heart size={17} /> Add to wedding plan
              </Button>
              {planMessage && (
                <p className="mt-3 rounded-[8px] bg-sage/10 p-3 text-sm font-semibold text-sage">{planMessage}</p>
              )}
            <p className="mt-4 text-center text-xs leading-5 text-charcoal/50">No payment is collected. Your request is saved to your plan so you can compare options.</p>
          </aside>
        )}
      </Section>

      <Section className="pt-0">
        <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-rose">Keep comparing</p>
            <h2 className="mt-2 font-serif text-4xl font-semibold">Similar vendors</h2>
          </div>
          <LinkButton href={`/vendors?category=${encodeURIComponent(vendor.category)}`} variant="secondary">
            View all {vendor.category}
          </LinkButton>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {similar.map((item) => (
            <VendorCard
              key={item.id}
              vendor={item}
            />
          ))}
        </div>
      </Section>
      <QuoteModal vendor={quoteVendor} onClose={() => setQuoteVendor(null)} />
      <AccountGate />
    </main>
  );
}
