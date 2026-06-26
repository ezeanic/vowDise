"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Store } from "lucide-react";
import { BecomeVendorButton } from "@/components/become-vendor-button";
import { Section } from "@/components/ui";
import { getStoredAccount } from "@/lib/account-service";
import type { VendorProfile } from "@/lib/types";
import { getVendorProfilesForAccount } from "@/lib/vendor-profile";

type BusinessProfile = VendorProfile & { id: string };

export default function ForVendorsPage() {
  const router = useRouter();
  const [vendorProfiles, setVendorProfiles] = useState<BusinessProfile[]>([]);

  useEffect(() => {
    let isMounted = true;

    function syncVendorProfile() {
      const account = getStoredAccount();
      if (!account?.uid) {
        setVendorProfiles([]);
        return;
      }

      void getVendorProfilesForAccount(account.uid).then((profiles) => {
        if (!isMounted) return;
        setVendorProfiles(profiles);
      });
    }

    syncVendorProfile();
    window.addEventListener("storage", syncVendorProfile);
    window.addEventListener("vowdise-vendor-profile-changed", syncVendorProfile);

    return () => {
      isMounted = false;
      window.removeEventListener("storage", syncVendorProfile);
      window.removeEventListener("vowdise-vendor-profile-changed", syncVendorProfile);
    };
  }, []);

  function openBusiness(vendorId: string) {
    router.push(`/vendor-dashboard?vendor=${vendorId}`);
  }

  return (
    <main className="bg-ivory text-charcoal">
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-rose-950 to-charcoal text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.12),_transparent_35%),radial-gradient(circle_at_bottom_right,_rgba(255,255,255,0.08),_transparent_30%)]" />
        <div className="relative mx-auto grid min-h-[calc(100vh-4rem)] max-w-7xl content-center px-4 py-16 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-champagne ring-1 ring-white/10">
              <Store size={22} />
            </div>
            <h1 className="mt-8 max-w-3xl text-5xl font-semibold leading-tight tracking-[-0.03em] sm:text-6xl">Elegant vendor profiles for every business you own.</h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-white/70">Create and manage multiple businesses in one account, keep your public profile polished, and open the right dashboard for each brand.</p>
            <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:items-center">
              <BecomeVendorButton />
            </div>
          </div>
        </div>
      </section>

      {vendorProfiles.length > 0 && (
        <Section className="-mt-20 pb-10">
          <div className="mx-auto max-w-6xl rounded-[32px] border border-champagne/20 bg-white/95 p-8 shadow-[0_30px_80px_-40px_rgba(15,23,42,0.12)] backdrop-blur-sm">
            <div className="mb-10 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div className="max-w-xl">
                <p className="text-sm font-bold uppercase tracking-[0.18em] text-rose">Your businesses</p>
                <h2 className="mt-3 font-serif text-4xl font-semibold">Select the business to manage</h2>
                <p className="mt-3 text-base text-charcoal/70">Launch the dashboard for any business, or add another one to keep your brands distinct.</p>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {vendorProfiles.map((profile) => (
                <div
                  key={profile.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => openBusiness(profile.id)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") openBusiness(profile.id);
                  }}
                  className="group rounded-[28px] border border-champagne/40 bg-white p-6 text-left shadow-soft transition hover:-translate-y-1 hover:shadow-[0_20px_60px_-20px_rgba(15,23,42,0.2)]"
                >
                  <div className="mb-5 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-rose">
                        {[profile.category || "Untitled category", profile.category === "Venues" ? profile.venueSubcategory : null].filter(Boolean).join(" / ")}
                      </p>
                      <p className="mt-3 text-2xl font-semibold text-charcoal">{profile.businessName || "Untitled business"}</p>
                    </div>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-slate-700">Brand</span>
                  </div>
                  <div className="space-y-3 text-sm text-charcoal/70">
                    <p>{profile.location || "Location pending"}</p>
                    <p>From ${Number(profile.startingPrice || 0).toLocaleString()}</p>
                  </div>
                  <button
                    type="button"
                    className="mt-5 inline-flex items-center gap-2 rounded-full bg-charcoal px-4 py-2 text-sm font-bold text-white transition hover:bg-charcoal/85"
                    onClick={(event) => {
                      event.stopPropagation();
                      router.push(`/messages?vendorProfile=${encodeURIComponent(profile.id)}`);
                    }}
                  >
                    Open messages
                  </button>
                </div>
              ))}
              <div
                className="group flex cursor-pointer flex-col items-center justify-center rounded-[28px] border border-dashed border-champagne/40 bg-white p-6 text-center text-charcoal transition hover:-translate-y-1 hover:bg-slate-50 hover:shadow-[0_20px_60px_-20px_rgba(15,23,42,0.2)]"
                onClick={() => router.push(localStorage.getItem("vowdiseAccount") ? "/vendor-onboarding" : "/sign-in?capability=vendor&next=/vendor-onboarding")}
              >
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-rose/10 text-rose">
                  <Plus size={28} />
                </div>
                <p className="mt-4 text-xl font-semibold">Add another business</p>
                <p className="mt-2 text-sm text-charcoal/60">Create a new business profile in your account.</p>
              </div>
            </div>
          </div>
        </Section>
      )}
    </main>
  );
}
