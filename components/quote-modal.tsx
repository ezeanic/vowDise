"use client";

import { useState, useEffect } from "react";
import { doc, getDoc } from "firebase/firestore";
import { X } from "lucide-react";
import type { Vendor } from "@/lib/types";
import { dateLabel, isDateBlocked } from "@/lib/availability";
import { db, isFirebaseConfigured } from "@/lib/firebase";
import {
  formatCoupleName,
  getUserProfile,
  saveUserProfile,
} from "@/lib/user-profile";
import { findOrCreateConversation, sendMessage } from "@/lib/chat";
import { addVendorToPlan } from "@/lib/wedding-plan";
import { useAccountGate } from "./account-gate";
import { Button } from "./ui";

export function QuoteModal({
  vendor,
  onClose,
}: {
  vendor: Vendor | null;
  onClose: () => void;
}) {
  const [sent, setSent] = useState(false);
  const [eventDate, setEventDate] = useState("");
  const [name, setName] = useState("");
  const [profileName, setProfileName] = useState("");
  const [spouseName, setSpouseName] = useState("");
  const [email, setEmail] = useState("");
  const [guestCount, setGuestCount] = useState("");
  const [message, setMessage] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { account } = useAccountGate();

  function quoteMessageContent() {
    const lines = [
      `Hi ${vendor?.name}, I would like a quote for our wedding.`,
      eventDate ? `Wedding date: ${dateLabel(eventDate)}` : "",
      guestCount ? `Guest count: ${guestCount}` : "",
      message.trim() ? `Details: ${message.trim()}` : "",
    ].filter(Boolean);

    return lines.join("\n");
  }

  async function resolveVendorEmail() {
    if (vendor?.contactEmail || vendor?.email) {
      return vendor.contactEmail || vendor.email;
    }

    if (!vendor?.ownerUid || !isFirebaseConfigured || !db) return undefined;

    const snapshot = await getDoc(doc(db, "users", vendor.ownerUid));
    const user = snapshot.exists()
      ? (snapshot.data() as { email?: string })
      : null;
    return user?.email;
  }

  async function notifyVendorByEmail(content: string) {
    const vendorEmail = await resolveVendorEmail();
    if (!vendorEmail) {
      console.warn("Quote email skipped: vendor has no contact email.");
      return;
    }

    const response = await fetch("/api/quote-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        vendorEmail,
        vendorName: vendor?.name,
        coupleName: name || account?.name,
        coupleEmail: email || account?.email,
        message: content,
      }),
    });

    if (!response.ok) {
      console.warn("Quote email could not be sent.");
      return;
    }
  }

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
    <div className="fixed inset-0 z-50 grid place-items-center bg-charcoal/45 p-4 backdrop-blur-sm motion-safe:duration-200 motion-safe:animate-in motion-safe:fade-in">
      <div className="w-full max-w-xl rounded-[8px] bg-ivory p-6 shadow-soft motion-safe:duration-300 motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-95 motion-safe:slide-in-from-bottom-3">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-rose">
              Request quote
            </p>
            <h2 className="mt-1 font-serif text-3xl font-semibold">
              {vendor.name}
            </h2>
          </div>
          <button
            className="rounded-full p-2 transition duration-200 hover:-translate-y-0.5 hover:bg-white active:scale-95"
            onClick={onClose}
            aria-label="Close quote form"
          >
            <X size={20} />
          </button>
        </div>
        {sent ? (
          <div className="mt-8 rounded-[8px] bg-white p-6 text-center motion-safe:duration-300 motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-95">
            <h3 className="text-xl font-bold">Quote request sent</h3>
            <div className="mt-4 grid gap-2 text-left text-sm font-semibold text-charcoal/70">
              <p className="rounded-[8px] bg-ivory px-4 py-3">
                Added to your plan
              </p>
              <p className="rounded-[8px] bg-ivory px-4 py-3">
                Message started with {vendor.name}
              </p>
            </div>
            <Button className="mt-5" onClick={onClose}>
              Done
            </Button>
          </div>
        ) : (
          <form
            className="mt-6 grid gap-4"
            onSubmit={async (event) => {
              event.preventDefault();
              if (blocked) return;
              setSubmitError("");
              setIsSubmitting(true);

              try {
                if (!account) {
                  throw new Error("Sign in to send this quote request.");
                }

                await saveUserProfile({
                  uid: account.uid,
                  name: spouseName ? profileName || account.name : name,
                  spouseName: spouseName || undefined,
                  email,
                  weddingDate: eventDate,
                  guestCount: guestCount ? Number(guestCount) : undefined,
                  notes: message,
                });

                const booking = await addVendorToPlan(
                  account.uid,
                  vendor,
                  "inquired",
                  {
                    status: "inquired",
                    weddingDate: eventDate,
                    notes: message,
                  },
                  { requireRemote: true },
                );

                if (booking.id.startsWith("local-")) {
                  throw new Error(
                    "We could not save this request to Firebase, so the vendor will not see it yet. Check Firebase configuration and permissions, then try again.",
                  );
                }

                const conversation = await findOrCreateConversation(
                  account.uid,
                  name || account.name,
                  vendor.id,
                  vendor.name,
                  vendor.name,
                  vendor.ownerUid,
                );
                const quoteMessage = quoteMessageContent();
                const sentMessage = await sendMessage(
                  conversation.id,
                  account.uid,
                  name || account.name,
                  "couple",
                  quoteMessage,
                );

                if (
                  conversation.id.startsWith("local-") ||
                  sentMessage.id.startsWith("local-")
                ) {
                  throw new Error(
                    "We saved the request, but the message could not be sent to Firebase. Please try messaging the vendor again.",
                  );
                }

                void notifyVendorByEmail(quoteMessage);
                setSent(true);
              } catch (error) {
                setSubmitError(
                  error instanceof Error
                    ? error.message
                    : "Quote request could not be sent. Please try again.",
                );
              } finally {
                setIsSubmitting(false);
              }
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
              <div
                className={`rounded-[8px] p-3 text-sm font-semibold motion-safe:duration-200 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-top-1 ${blocked ? "bg-rose/10 text-rose" : "bg-sage/10 text-sage"}`}
              >
                {blocked
                  ? `${vendor.name} is blocked out on ${dateLabel(eventDate)}. Choose another date.`
                  : `${vendor.name} appears available on ${dateLabel(eventDate)}.`}
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
            <Button type="submit" disabled={blocked || isSubmitting}>
              {isSubmitting ? "Sending..." : "Send Request"}
            </Button>
            {submitError && (
              <p className="rounded-[8px] bg-rose/10 p-3 text-sm font-semibold text-rose">
                {submitError}
              </p>
            )}
          </form>
        )}
      </div>
    </div>
  );
}
