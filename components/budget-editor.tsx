"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  ArrowUpRight,
  BookmarkCheck,
  CheckCircle2,
  ChevronDown,
  DollarSign,
  PiggyBank,
  Plus,
  SlidersHorizontal,
  Store,
  Trash2,
  TrendingUp,
} from "lucide-react";
import { buildBudget, healthScore, money } from "@/lib/budget";
import { useAccountGate } from "./account-gate";
import { loadBudget, saveBudget } from "@/lib/account-service";
import {
  deleteBooking,
  getBookingsForAccount,
  getBookingsByBudgetCategory,
  updateBookingStatus,
} from "@/lib/bookings";
import type { BookingStatus, Vendor, VendorBooking } from "@/lib/types";
import { getMarketplaceVendorsWithRemote } from "@/lib/vendor-profile";
import { addVendorToPlan, budgetCategoryForVendor } from "@/lib/wedding-plan";
import { Button, LinkButton } from "./ui";

const statusLabels: Record<BookingStatus, string> = {
  saved: "Saved",
  inquired: "Contacted",
  quoted: "Quoted",
  booked: "Booked",
  contract_signed: "Contract signed",
  paid: "Paid",
};

export function BudgetEditor({
  initialTotal = 25000,
}: {
  initialTotal?: number;
}) {
  const [total, setTotal] = useState(initialTotal);
  const [items, setItems] = useState(buildBudget(initialTotal));
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [bookings, setBookings] = useState<VendorBooking[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const saveTimeout = useRef<number | null>(null);
  const allocated = useMemo(
    () => items.reduce((sum, item) => sum + item.amount, 0),
    [items],
  );
  const bookedSpend = useMemo(
    () => bookings.reduce((sum, booking) => sum + (booking.bookedPrice || 0), 0),
    [bookings],
  );
  const remaining = total - allocated;
  const score = healthScore(total, allocated);
  const allocationPercent = total > 0 ? Math.round((allocated / total) * 100) : 0;
  const savedCount = bookings.filter(
    (booking) => booking.status === "saved",
  ).length;
  const contactedCount = bookings.filter(
    (booking) => booking.status === "inquired" || booking.status === "quoted",
  ).length;
  const bookedCount = bookings.filter(
    (booking) =>
      booking.status === "booked" ||
      booking.status === "contract_signed" ||
      booking.status === "paid",
  ).length;
  const { account, requireAccount, AccountGate } = useAccountGate();

  const refreshBookings = async (uid = account?.uid) => {
    if (!uid) return;
    const userBookings = await getBookingsForAccount(uid);
    setBookings(userBookings);
  };

  useEffect(() => {
    async function loadSavedBudget() {
      if (!account) return;
      const saved = await loadBudget(account.uid);
      if (saved) {
        setTotal(saved.total);
        setItems(saved.items);
      }
    }
    loadSavedBudget();
  }, [account]);

  useEffect(() => {
    async function loadBookings() {
      if (!account) return;
      const userBookings = await getBookingsForAccount(account.uid);
      setBookings(userBookings);
    }
    loadBookings();
    window.addEventListener("vowdise-plan-changed", loadBookings);
    return () =>
      window.removeEventListener("vowdise-plan-changed", loadBookings);
  }, [account]);

  useEffect(() => {
    let isMounted = true;

    async function loadVendors() {
      const nextVendors = await getMarketplaceVendorsWithRemote();
      if (isMounted) setVendors(nextVendors);
    }

    void loadVendors();
    window.addEventListener("storage", loadVendors);
    window.addEventListener("vowdise-vendor-profile-changed", loadVendors);

    return () => {
      isMounted = false;
      window.removeEventListener("storage", loadVendors);
      window.removeEventListener("vowdise-vendor-profile-changed", loadVendors);
    };
  }, []);

  function updateTotal(value: number) {
    setTotal(value);
    setItems(buildBudget(value));
    setDirty(true);
  }

  async function handleAddVendor(vendor: Vendor, uid = account?.uid) {
    if (!uid) return;
    await addVendorToPlan(uid, vendor);
    await refreshBookings(uid);
    setSaveMessage(`${vendor.name} added to your plan.`);
    window.setTimeout(() => setSaveMessage(""), 3000);
  }

  async function handleStatusChange(
    booking: VendorBooking,
    status: BookingStatus,
    uid = account?.uid,
  ) {
    if (!uid) return;
    await updateBookingStatus(uid, booking.id, status);
    await refreshBookings(uid);
  }

  async function handleRemoveVendor(
    booking: VendorBooking,
    uid = account?.uid,
  ) {
    if (!uid) return;
    await deleteBooking(uid, booking.id);
    await refreshBookings(uid);
  }

  useEffect(() => {
    if (!dirty) return;
    if (saveTimeout.current) {
      window.clearTimeout(saveTimeout.current);
    }

    saveTimeout.current = window.setTimeout(() => {
      requireAccount(async () => {
        if (!account) return;
        setIsSaving(true);
        setSaveMessage("");
        try {
          await saveBudget(account.uid, { total, items });
          setSaveMessage("Budget saved successfully!");
          setDirty(false);
          setTimeout(() => setSaveMessage(""), 3000);
        } catch {
          setSaveMessage("Failed to save budget. Please try again.");
          setTimeout(() => setSaveMessage(""), 3000);
        } finally {
          setIsSaving(false);
        }
      }, "save your wedding budget");
    }, 800);

    return () => {
      if (saveTimeout.current) {
        window.clearTimeout(saveTimeout.current);
      }
    };
  }, [dirty, total, items, account, requireAccount]);

  return (
    <>
      <AccountGate />

      <div className="mx-auto max-w-7xl space-y-6">
        <section className="overflow-hidden rounded-[8px] bg-charcoal text-white shadow-elevated">
          <div className="grid gap-0 lg:grid-cols-[minmax(0,1.15fr)_minmax(360px,0.85fr)]">
            <div className="p-5 sm:p-8 lg:p-10">
              <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-white/60">
                <PiggyBank className="h-4 w-4 text-honey" />
                Budget Command Center
              </div>
              <div className="mt-8 grid gap-6 md:grid-cols-[minmax(0,1fr)_220px] md:items-end">
                <div>
                  <p className="text-sm font-medium text-white/55">
                    Total wedding budget
                  </p>
                  <label
                    htmlFor="total-budget"
                    className="mt-3 flex max-w-lg items-center gap-3 border-b border-white/20 pb-3 focus-within:border-honey"
                  >
                    <span className="text-2xl font-semibold text-white/45">
                      $
                    </span>
                    <input
                      id="total-budget"
                      type="number"
                      value={total}
                      onChange={(e) => updateTotal(Number(e.target.value || 0))}
                      className="min-w-0 flex-1 bg-transparent text-5xl font-semibold leading-none text-white outline-none sm:text-6xl"
                    />
                  </label>
                </div>
                <div className="rounded-[8px] bg-white/9 p-4 ring-1 ring-white/10">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/50">
                    Plan health
                  </p>
                  <div className="mt-4 flex items-end justify-between gap-3">
                    <span className="text-4xl font-semibold">{score}</span>
                    <span className="pb-1 text-sm text-white/50">/100</span>
                  </div>
                  <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/12">
                    <div
                      className="h-full rounded-full bg-honey"
                      style={{ width: `${score}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="grid border-t border-white/10 bg-white/[0.04] sm:grid-cols-2 lg:border-l lg:border-t-0">
              <div className="border-b border-white/10 p-5 sm:border-r lg:border-b">
                <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-white/45">
                  <DollarSign className="h-4 w-4" />
                  Allocated
                </p>
                <p className="mt-3 text-3xl font-semibold">{money(allocated)}</p>
                <p className="mt-2 text-sm text-white/50">
                  {allocationPercent}% of total
                </p>
              </div>
              <div
                className={`border-b border-white/10 p-5 ${
                  remaining < 0 ? "bg-rose/20" : "bg-eucalyptus/20"
                }`}
              >
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/45">
                  {remaining < 0 ? "Over budget" : "Unassigned"}
                </p>
                <p className="mt-3 text-3xl font-semibold">{money(remaining)}</p>
                <p className="mt-2 text-sm text-white/50">
                  {remaining < 0 ? "Trim categories or raise total" : "Room for changes"}
                </p>
              </div>
              <div className="border-b border-white/10 p-5 sm:border-r sm:border-b-0">
                <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-white/45">
                  <Store className="h-4 w-4" />
                  Booked spend
                </p>
                <p className="mt-3 text-3xl font-semibold">{money(bookedSpend)}</p>
                <p className="mt-2 text-sm text-white/50">{bookedCount} booked</p>
              </div>
              <div className="p-5">
                <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-white/45">
                  <TrendingUp className="h-4 w-4" />
                  Pipeline
                </p>
                <p className="mt-3 text-3xl font-semibold">
                  {savedCount + contactedCount}
                </p>
                <p className="mt-2 text-sm text-white/50">
                  {savedCount} saved, {contactedCount} contacted
                </p>
              </div>
            </div>
          </div>
        </section>

        {remaining < 0 && (
          <div className="flex items-center gap-3 rounded-[8px] border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            <AlertCircle size={18} />
            You are over budget by {money(Math.abs(remaining))}.
          </div>
        )}

        <section className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
          <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-[8px] border border-champagne/45 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-2 text-sm font-semibold text-charcoal">
                <SlidersHorizontal className="h-4 w-4 text-rose" />
                Working method
              </div>
              <p className="mt-3 text-sm leading-6 text-charcoal/62">
                Change the total to reset the recommended split. Edit a line
                item to protect the categories that matter most.
              </p>
            </div>

            <div className="rounded-[8px] border border-champagne/45 bg-white p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-charcoal/45">
                Vendor progress
              </p>
              <div className="mt-4 space-y-3">
                {[
                  ["Saved", savedCount, "bg-honey"],
                  ["Contacted", contactedCount, "bg-rose"],
                  ["Booked", bookedCount, "bg-eucalyptus"],
                ].map(([label, value, color]) => (
                  <div key={label} className="flex items-center justify-between gap-3">
                    <span className="text-sm font-medium text-charcoal/70">
                      {label}
                    </span>
                    <span className="flex items-center gap-2 text-sm font-semibold text-charcoal">
                      <span className={`h-2 w-2 rounded-full ${color}`} />
                      {value}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <LinkButton href="/vendors" variant="secondary" className="w-full">
              Browse all vendors
              <ArrowUpRight className="h-4 w-4" />
            </LinkButton>

            {(isSaving || saveMessage) && (
              <div
                className={`rounded-[8px] border px-4 py-3 text-sm font-medium ${
                  isSaving
                    ? "border-champagne/45 bg-white text-charcoal/60"
                    : saveMessage.includes("Failed")
                      ? "border-red-200 bg-red-50 text-red-700"
                      : "border-green-200 bg-green-50 text-green-700"
                }`}
              >
                {!isSaving && saveMessage.includes("success") && (
                  <CheckCircle2 className="mr-2 inline-block h-4 w-4" />
                )}
                {isSaving ? "Saving budget..." : saveMessage}
              </div>
            )}
          </aside>

          <div className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="font-serif text-3xl font-semibold leading-tight text-charcoal">
                  Category Allocation
                </h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-charcoal/62">
                  Each row shows the planned amount, vendors already attached,
                  and matching vendors that fit the current cap.
                </p>
              </div>
              <div className="rounded-[8px] bg-white px-4 py-3 text-sm font-semibold text-charcoal shadow-sm ring-1 ring-champagne/45">
                {items.length} categories
              </div>
            </div>

            <div className="overflow-hidden rounded-[8px] border border-champagne/45 bg-white shadow-soft">
              {items.map((item, index) => {
                const categoryBookings = getBookingsByBudgetCategory(
                  bookings,
                  item.name,
                );
                const bookedTotal = categoryBookings.reduce(
                  (sum, b) => sum + (b.bookedPrice || 0),
                  0,
                );
                const remainingCat = item.amount - bookedTotal;
                const isOver = remainingCat < 0;
                const plannedVendorIds = new Set(
                  categoryBookings.map((booking) => booking.vendorId),
                );
                const matchingVendors = vendors
                  .filter((vendor) => budgetCategoryForVendor(vendor) === item.name)
                  .filter((vendor) => vendor.startingPrice <= item.amount)
                  .filter((vendor) => !plannedVendorIds.has(vendor.id))
                  .slice(0, 4);
                const isExpanded = expandedCategory === item.name;
                const categoryUsage =
                  item.amount > 0 ? Math.min((bookedTotal / item.amount) * 100, 100) : 0;

                return (
                  <article
                    key={item.name}
                    className="border-b border-champagne/40 transition-colors last:border-b-0 hover:bg-ivory/35"
                  >
                    <div className="grid gap-4 p-5 sm:p-6 xl:grid-cols-[minmax(0,1fr)_190px_150px] xl:items-center">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                          <h3 className="font-serif text-2xl font-semibold leading-tight text-charcoal">
                            {item.name}
                          </h3>
                          <span className="rounded-full bg-rose/8 px-3 py-1 text-xs font-bold uppercase tracking-[0.12em] text-rose ring-1 ring-rose/15">
                            {Math.round(item.percent * 100)}% suggested
                          </span>
                        </div>
                        <div className="mt-4 grid gap-3 text-sm text-charcoal/62 sm:grid-cols-3">
                          <span className="border-t border-champagne/55 pt-2">
                            <span className="block text-[10px] font-bold uppercase tracking-[0.14em] text-charcoal/40">
                              Vendors
                            </span>
                            <span className="mt-1 block font-semibold text-charcoal">
                              {categoryBookings.length}{" "}
                              {categoryBookings.length === 1
                                ? "vendor"
                                : "vendors"}
                            </span>
                          </span>
                          <span className="border-t border-champagne/55 pt-2">
                            <span className="block text-[10px] font-bold uppercase tracking-[0.14em] text-charcoal/40">
                              Booked
                            </span>
                            <span className="mt-1 block font-semibold text-charcoal">
                              {money(bookedTotal)}
                            </span>
                          </span>
                          <span className="border-t border-champagne/55 pt-2">
                            <span className="block text-[10px] font-bold uppercase tracking-[0.14em] text-charcoal/40">
                              Remaining
                            </span>
                            <span
                              className={`mt-1 block font-semibold ${
                                isOver ? "text-red-600" : "text-charcoal"
                              }`}
                            >
                              {isOver
                                ? `Over by ${money(Math.abs(remainingCat))}`
                                : money(remainingCat)}
                            </span>
                          </span>
                        </div>
                        <div className="mt-4 h-2 overflow-hidden rounded-full bg-ivory ring-1 ring-champagne/30">
                          <div
                            className={`h-full rounded-full ${
                              isOver ? "bg-red-500" : "bg-eucalyptus"
                            }`}
                            style={{ width: `${categoryUsage}%` }}
                          />
                        </div>
                      </div>

                      <label className="rounded-[8px] border border-champagne/50 bg-ivory/70 px-3 py-2 focus-within:border-rose focus-within:ring-2 focus-within:ring-rose/10">
                        <span className="block text-[11px] font-semibold uppercase tracking-[0.12em] text-charcoal/45">
                          Planned
                        </span>
                        <span className="mt-1 flex items-center gap-1">
                          <span className="text-sm font-semibold text-charcoal/45">
                            $
                          </span>
                          <input
                            type="number"
                            value={item.amount}
                            onChange={(e) => {
                              const next = [...items];
                              next[index].amount = Number(e.target.value || 0);
                              setItems(next);
                              setDirty(true);
                            }}
                            className="w-full min-w-0 bg-transparent text-right text-lg font-semibold text-charcoal outline-none"
                          />
                        </span>
                      </label>

                      <Button
                        type="button"
                        variant="secondary"
                        className="w-full px-4 py-2.5 xl:w-auto"
                        onClick={() =>
                          setExpandedCategory(isExpanded ? null : item.name)
                        }
                      >
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4 rotate-180" />
                        ) : (
                          <Plus className="h-4 w-4" />
                        )}
                        Vendors
                      </Button>
                    </div>

                    {isExpanded && (
                      <div className="border-t border-champagne/35 bg-ivory/55 p-4 sm:p-5">
                        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(320px,0.9fr)]">
                          <div>
                            <p className="flex items-center gap-2 font-serif text-xl font-semibold text-charcoal">
                              <BookmarkCheck className="h-4 w-4 text-rose" />
                              In your plan
                            </p>
                            <div className="mt-3 space-y-2">
                              {categoryBookings.length > 0 ? (
                                categoryBookings.map((booking) => (
                                  <div
                                    key={booking.id}
                                    className="flex flex-col gap-3 rounded-[8px] border border-champagne/40 bg-white p-3 sm:flex-row sm:items-center sm:justify-between"
                                  >
                                    <div>
                                      <p className="font-semibold text-charcoal">
                                        {booking.vendorName}
                                      </p>
                                      <p className="mt-1 text-sm text-charcoal/58">
                                        {booking.quotedPrice
                                          ? `${money(booking.quotedPrice)} estimate`
                                          : booking.category}
                                        {booking.bookedPrice
                                          ? `, booked ${money(booking.bookedPrice)}`
                                          : ""}
                                      </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <select
                                        value={booking.status}
                                        onChange={(event) =>
                                          requireAccount(
                                            (activeAccount) =>
                                              void handleStatusChange(
                                                booking,
                                                event.target.value as BookingStatus,
                                                activeAccount.uid,
                                              ),
                                            "update your wedding plan",
                                          )
                                        }
                                        className="min-w-0 rounded-[8px] border border-champagne bg-white px-3 py-2 text-sm font-semibold text-charcoal outline-none focus:border-rose focus:ring-2 focus:ring-rose/10"
                                      >
                                        {Object.entries(statusLabels).map(
                                          ([value, label]) => (
                                            <option key={value} value={value}>
                                              {label}
                                            </option>
                                          ),
                                        )}
                                      </select>
                                      <button
                                        type="button"
                                        onClick={() =>
                                          requireAccount(
                                            (activeAccount) =>
                                              void handleRemoveVendor(
                                                booking,
                                                activeAccount.uid,
                                              ),
                                            "remove vendors from your wedding plan",
                                          )
                                        }
                                        className="grid h-10 w-10 shrink-0 place-items-center rounded-[8px] border border-rose/25 bg-white text-rose transition hover:bg-rose/5"
                                        aria-label={`Remove ${booking.vendorName}`}
                                      >
                                        <Trash2 size={16} />
                                      </button>
                                    </div>
                                  </div>
                                ))
                              ) : (
                                <div className="rounded-[8px] border border-dashed border-champagne/60 bg-white/70 p-4 text-sm text-charcoal/58">
                                  No vendors added to this category yet.
                                </div>
                              )}
                            </div>
                          </div>

                          <div>
                            <p className="flex items-center gap-2 font-serif text-xl font-semibold text-charcoal">
                              <Store className="h-4 w-4 text-eucalyptus" />
                              Fits under {money(item.amount)}
                            </p>
                            <div className="mt-3 grid gap-2">
                              {matchingVendors.length ? (
                                matchingVendors.map((vendor) => (
                                  <div
                                    key={vendor.id}
                                    className="rounded-[8px] border border-champagne/40 bg-white p-3"
                                  >
                                    <div className="flex items-start justify-between gap-3">
                                      <div className="min-w-0">
                                        <p className="truncate font-semibold text-charcoal">
                                          {vendor.name}
                                        </p>
                                        <p className="mt-1 truncate text-sm text-charcoal/58">
                                          {vendor.location}
                                        </p>
                                      </div>
                                      <span className="shrink-0 rounded-full bg-ivory px-3 py-1 text-sm font-semibold text-charcoal ring-1 ring-champagne/40">
                                        {money(vendor.startingPrice)}
                                      </span>
                                    </div>
                                    <div className="mt-3 flex items-center justify-between gap-3">
                                      <LinkButton
                                        href={`/vendors/${vendor.id}?returnTo=${encodeURIComponent("/budget")}&returnLabel=${encodeURIComponent("Back to plan")}`}
                                        variant="ghost"
                                        className="px-0 py-2"
                                      >
                                        View details
                                      </LinkButton>
                                      <Button
                                        type="button"
                                        className="px-4 py-2"
                                        onClick={() =>
                                          requireAccount(
                                            (activeAccount) =>
                                              void handleAddVendor(
                                                vendor,
                                                activeAccount.uid,
                                              ),
                                            "add vendors to your wedding plan",
                                          )
                                        }
                                      >
                                        Add
                                      </Button>
                                    </div>
                                  </div>
                                ))
                              ) : (
                                <div className="rounded-[8px] border border-dashed border-champagne/60 bg-white/70 p-4 text-sm text-charcoal/58">
                                  No matching vendors fit this amount yet.
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
