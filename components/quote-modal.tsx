"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";
import type { Vendor } from "@/lib/types";
import { dateLabel, isDateBlocked } from "@/lib/availability";
import { formatCoupleName, getUserProfile, saveUserProfile } from "@/lib/user-profile";
import { addVendorToPlan } from "@/lib/wedding-plan";
import { useAccountGate } from "./account-gate";
import { Button } from "./ui";

export function QuoteModal({ vendor, onClose }: { vendor: Vendor | null; onClose: () => void }) {
  const [sent, setSent] = useState(false);
  const [eventDate, setEventDate] = useState("");
  const [name, setName] = useState("");
  const [profileName, setProfileName] = useState("");
  const [spouseName, setSpouseName] = useState("");
  const [email, setEmail] = useState("");
  const [guestCount, setGuestCount] = useState("");
  const [message, setMessage] = useState("");
  const { account } = useAccountGate();

  useEffect(() => {
    async function loadProfile() {
      if (!account) return;
      const profile = await getUserProfile(account.uid);
      if (profile) {
        const primaryName = profile.name || account.name || "";
        setProfileName(primaryName);
        setSpouseName(profile.spouseName || "");
        setName(formatCoupleName(primaryName, profile.spouseName));
        setEmail(profile.email || account.email || "");
        setEventDate(profile.weddingDate || "");
        setGuestCount(profile.guestCount?.toString() || "");
      } else {
        setProfileName(account.name || "");
        setSpouseName("");
        setName(account.name || "");
        setEmail(account.email || "");
      }
    }
    loadProfile();
  }, [account]);

  if (!vendor) return null;
  const blocked = isDateBlocked(eventDate, vendor.blockedDates);

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-charcoal/45 p-4 backdrop-blur-sm">
      <div className="w-full max-w-xl rounded-[8px] bg-ivory p-6 shadow-soft">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-rose">Request quote</p>
            <h2 className="mt-1 font-serif text-3xl font-semibold">{vendor.name}</h2>
          </div>
          <button className="rounded-full p-2 hover:bg-white" onClick={onClose} aria-label="Close quote form">
            <X size={20} />
          </button>
        </div>
        {sent ? (
          <div className="mt-8 rounded-[8px] bg-white p-6 text-center">
            <h3 className="text-xl font-bold">Quote request sent</h3>
            <p className="mt-2 text-charcoal/70">We saved the request locally for {eventDate ? dateLabel(eventDate) : "your date"}. {vendor.name} will be ready to compare in your plan.</p>
            <Button className="mt-5" onClick={onClose}>Done</Button>
          </div>
        ) : (
          <form
            className="mt-6 grid gap-4"
            onSubmit={async (event) => {
              event.preventDefault();
              if (blocked) return;

              // Save user profile data for reuse
              if (account) {
                await saveUserProfile({
                  uid: account.uid,
                  name: spouseName ? profileName || account.name : name,
                  spouseName: spouseName || undefined,
                  email,
                  weddingDate: eventDate,
                  guestCount: guestCount ? Number(guestCount) : undefined,
                  notes: message,
                });

                await addVendorToPlan(account.uid, vendor, "inquired", {
                  status: "inquired",
                  weddingDate: eventDate,
                  notes: message,
                });
              }

              setSent(true);
            }}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <input
                required
                placeholder="Your name"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (!spouseName) setProfileName(e.target.value);
                }}
                className="rounded-[8px] border border-champagne bg-white px-4 py-3 outline-none focus:ring-2 focus:ring-gold/30"
              />
              <input
                required
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="rounded-[8px] border border-champagne bg-white px-4 py-3 outline-none focus:ring-2 focus:ring-gold/30"
              />
              <input
                required
                type="date"
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
                className="rounded-[8px] border border-champagne bg-white px-4 py-3 outline-none focus:ring-2 focus:ring-gold/30"
              />
              <input
                required
                type="number"
                placeholder="Guest count"
                value={guestCount}
                onChange={(e) => setGuestCount(e.target.value)}
                className="rounded-[8px] border border-champagne bg-white px-4 py-3 outline-none focus:ring-2 focus:ring-gold/30"
              />
            </div>
            {eventDate && (
              <div className={`rounded-[8px] p-3 text-sm font-semibold ${blocked ? "bg-rose/10 text-rose" : "bg-sage/10 text-sage"}`}>
                {blocked ? `${vendor.name} is blocked out on ${dateLabel(eventDate)}. Choose another date.` : `${vendor.name} appears available on ${dateLabel(eventDate)}.`}
              </div>
            )}
            <textarea
              required
              placeholder="Tell them what you are planning"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              className="rounded-[8px] border border-champagne bg-white px-4 py-3 outline-none focus:ring-2 focus:ring-gold/30"
            />
            <Button type="submit" disabled={blocked}>Send Request</Button>
          </form>
        )}
      </div>
    </div>
  );
}
