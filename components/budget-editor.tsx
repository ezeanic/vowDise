"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, BookmarkCheck, CheckCircle2, DollarSign, Edit3, Plus, Store, Trash2, TrendingUp } from "lucide-react";
import { buildBudget, healthScore, money } from "@/lib/budget";
import { useAccountGate } from "./account-gate";
import { loadBudget, saveBudget } from "@/lib/account-service";
import { deleteBooking, getBookingsForAccount, getBookingsByBudgetCategory, updateBookingStatus } from "@/lib/bookings";
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

export function BudgetEditor({ initialTotal = 25000 }: { initialTotal?: number }) {
  const [total, setTotal] = useState(initialTotal);
  const [items, setItems] = useState(buildBudget(initialTotal));
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [bookings, setBookings] = useState<VendorBooking[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const saveTimeout = useRef<number | null>(null);
  const allocated = useMemo(() => items.reduce((sum, item) => sum + item.amount, 0), [items]);
  const remaining = total - allocated;
  const score = healthScore(total, allocated);
  const savedCount = bookings.filter((booking) => booking.status === "saved").length;
  const contactedCount = bookings.filter((booking) => booking.status === "inquired" || booking.status === "quoted").length;
  const bookedCount = bookings.filter((booking) => booking.status === "booked" || booking.status === "contract_signed" || booking.status === "paid").length;
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
    return () => window.removeEventListener("vowdise-plan-changed", loadBookings);
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

  async function handleStatusChange(booking: VendorBooking, status: BookingStatus, uid = account?.uid) {
    if (!uid) return;
    await updateBookingStatus(uid, booking.id, status);
    await refreshBookings(uid);
  }

  async function handleRemoveVendor(booking: VendorBooking, uid = account?.uid) {
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

      <div className="mx-auto max-w-6xl py-4">
        <div className="overflow-hidden rounded-[8px] border border-champagne/45 bg-white shadow-soft">
          <div className="border-b border-champagne/35 bg-white px-5 py-5 sm:px-8">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-2xl">
                <div className="inline-flex items-center gap-2 rounded-full bg-rose/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-rose">
                  <DollarSign className="h-3.5 w-3.5" />
                  Budget and plan
                </div>
                <h2 className="mt-4 text-3xl font-semibold tracking-tight text-charcoal sm:text-4xl">
                  Build the plan around your budget.
                </h2>
                <p className="mt-3 text-sm leading-6 text-charcoal/65 sm:text-base">
                  Set each category amount, then add vendors that fit that specific part of the plan.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-3 lg:min-w-[520px]">
                <div className="rounded-[8px] border border-champagne/40 bg-ivory/70 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-charcoal/50">Allocated</p>
                  <p className="mt-2 text-xl font-semibold text-charcoal">{money(allocated)}</p>
                </div>
                <div
                  className={`rounded-[8px] border p-4 ${
                    remaining < 0
                      ? "border-red-200 bg-red-50 text-red-700"
                      : "border-emerald-200 bg-emerald-50 text-emerald-700"
                  }`}
                >
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-charcoal/50">
                    {remaining < 0 ? "Over budget" : "Remaining"}
                  </p>
                  <p className="mt-2 text-xl font-semibold">{money(remaining)}</p>
                </div>
                <div className="rounded-[8px] border border-champagne/40 bg-ivory/70 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-charcoal/50">Health</p>
                  <p className="mt-2 text-xl font-semibold text-charcoal">{score}/100</p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-0 lg:grid-cols-[340px_1fr]">
            <aside className="border-b border-champagne/35 bg-ivory/75 p-5 sm:p-8 lg:border-b-0 lg:border-r">
              <div className="rounded-[8px] border border-champagne/45 bg-white p-5 shadow-sm">
                <label htmlFor="total-budget" className="text-xs font-semibold uppercase tracking-[0.18em] text-charcoal/55">
                  Total budget
                </label>
                <div className="mt-3 flex items-center gap-2 rounded-[8px] border border-champagne/60 bg-ivory px-3 py-2 focus-within:border-rose focus-within:ring-2 focus-within:ring-rose/10">
                  <span className="text-sm font-semibold text-charcoal/50">$</span>
                  <input
                    id="total-budget"
                    type="number"
                    value={total}
                    onChange={(e) => updateTotal(Number(e.target.value || 0))}
                    className="min-w-0 flex-1 bg-transparent text-lg font-semibold text-charcoal outline-none"
                  />
                </div>
                <p className="mt-3 text-sm leading-6 text-charcoal/60">
                  Updating this rebuilds the suggested category split. You can still fine-tune every line item afterward.
                </p>
              </div>

              <div className="mt-4 rounded-[8px] border border-champagne/45 bg-white p-5 shadow-sm">
                <div className="flex items-center gap-2 text-sm font-semibold text-charcoal">
                  <Edit3 className="h-4 w-4 text-rose" />
                  Editable amounts
                </div>
                <p className="mt-2 text-sm leading-6 text-charcoal/60">
                  Tap any dollar field in the breakdown to adjust that category for real quotes, family contributions, or priority changes.
                </p>
              </div>

              <div className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-[8px] bg-white px-4 py-3 text-sm font-semibold text-charcoal ring-1 ring-champagne/45">
                <TrendingUp className="h-4 w-4 text-sage" />
                {total > 0 ? `${Math.round((allocated / total) * 100)}% allocated` : "0% allocated"}
              </div>
            </aside>

            <div className="space-y-5 p-5 sm:p-8">
              {remaining < 0 && (
                <div className="rounded-[8px] border border-red-200 bg-red-50 p-4 text-red-700">
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <AlertCircle size={18} />
                    Over budget by {money(Math.abs(remaining))}
                  </div>
                </div>
              )}

              <div>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h3 className="text-2xl font-semibold text-charcoal">Budget breakdown</h3>
                    <p className="mt-2 text-sm text-slate-600">
                      Each amount is editable. Use this to rebalance your budget around the vendors you actually choose.
                    </p>
                  </div>
                </div>

                {bookings.length > 0 && (
                  <div className="mt-6 rounded-[8px] border border-champagne/45 bg-white p-4 shadow-sm">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                      <div>
                        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-rose">Wedding plan</p>
                        <h4 className="mt-1 text-xl font-semibold text-charcoal">Your vendor decisions are taking shape.</h4>
                      </div>
                      <div className="grid gap-2 sm:grid-cols-3 lg:min-w-[420px]">
                        <div className="rounded-[8px] bg-ivory px-3 py-3">
                          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-charcoal/55"><BookmarkCheck size={14} /> Saved</p>
                          <p className="mt-1 text-xl font-semibold text-charcoal">{savedCount}</p>
                        </div>
                        <div className="rounded-[8px] bg-ivory px-3 py-3">
                          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-charcoal/55">Contacted</p>
                          <p className="mt-1 text-xl font-semibold text-charcoal">{contactedCount}</p>
                        </div>
                        <div className="rounded-[8px] bg-ivory px-3 py-3">
                          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-charcoal/55"><Store size={14} /> Booked</p>
                          <p className="mt-1 text-xl font-semibold text-charcoal">{bookedCount}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="mt-6 space-y-3">
                  {items.map((item, index) => {
                    const categoryBookings = getBookingsByBudgetCategory(bookings, item.name);
                    const bookedTotal = categoryBookings.reduce((sum, b) => sum + (b.bookedPrice || 0), 0);
                    const remainingCat = item.amount - bookedTotal;
                    const isOver = remainingCat < 0;
                    const plannedVendorIds = new Set(categoryBookings.map((booking) => booking.vendorId));
                    const matchingVendors = vendors
                      .filter((vendor) => budgetCategoryForVendor(vendor) === item.name)
                      .filter((vendor) => vendor.startingPrice <= item.amount)
                      .filter((vendor) => !plannedVendorIds.has(vendor.id))
                      .slice(0, 4);
                    const isExpanded = expandedCategory === item.name;

                    return (
                      <div
                        key={item.name}
                        className="rounded-[8px] border border-champagne/40 bg-ivory/80 p-4"
                      >
                        <div className="grid gap-4 md:grid-cols-[1fr_180px] md:items-center">
                          <div className="min-w-0">
                            <h4 className="text-base font-semibold text-charcoal">{item.name}</h4>
                            <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-600">
                              {Math.round(item.percent * 100)}% of total
                              {categoryBookings.length > 0 && (
                                <span className="inline-flex items-center gap-1 text-slate-500">
                                  <Store className="h-3.5 w-3.5" />
                                  {categoryBookings.length} {categoryBookings.length === 1 ? "vendor" : "vendors"} in plan
                                </span>
                              )}
                            </p>
                          </div>

                          <div className="rounded-[8px] bg-white px-3 py-2 shadow-sm ring-1 ring-champagne/40">
                            <label className="block text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                              Edit amount
                            </label>
                            <div className="mt-1 flex items-center gap-1">
                              <span className="text-sm font-semibold text-slate-500">$</span>
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
                            </div>
                          </div>
                        </div>

                        <div className="mt-4 space-y-3 rounded-[8px] bg-white p-4 ring-1 ring-champagne/40">
                          {categoryBookings.length > 0 ? (
                            <div className="space-y-3">
                              {categoryBookings.map((booking) => (
                                <div key={booking.id} className="flex flex-col gap-3 rounded-[8px] border border-champagne/40 bg-ivory/70 p-3 sm:flex-row sm:items-center sm:justify-between">
                                  <div>
                                    <p className="font-semibold text-charcoal">{booking.vendorName}</p>
                                    <p className="mt-1 text-sm text-charcoal/60">
                                      {booking.quotedPrice ? `${money(booking.quotedPrice)} estimate` : booking.category}
                                      {booking.bookedPrice ? ` · booked ${money(booking.bookedPrice)}` : ""}
                                    </p>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <select
                                      value={booking.status}
                                      onChange={(event) => requireAccount((activeAccount) => void handleStatusChange(booking, event.target.value as BookingStatus, activeAccount.uid), "update your wedding plan")}
                                      className="rounded-[8px] border border-champagne bg-white px-3 py-2 text-sm font-semibold text-charcoal outline-none focus:border-rose focus:ring-2 focus:ring-rose/10"
                                    >
                                      {Object.entries(statusLabels).map(([value, label]) => (
                                        <option key={value} value={value}>{label}</option>
                                      ))}
                                    </select>
                                    <button
                                      type="button"
                                      onClick={() => requireAccount((activeAccount) => void handleRemoveVendor(booking, activeAccount.uid), "remove vendors from your wedding plan")}
                                      className="grid h-10 w-10 place-items-center rounded-[8px] border border-rose/25 bg-white text-rose transition hover:bg-rose/5"
                                      aria-label={`Remove ${booking.vendorName}`}
                                    >
                                      <Trash2 size={16} />
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm text-charcoal/60">No vendors added to this part of your plan yet.</p>
                          )}

                          <div className="flex flex-col gap-3 border-t border-champagne/35 pt-4 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                              <p className="text-sm font-semibold text-charcoal">Add vendors for {item.name}</p>
                              <p className="mt-1 text-xs text-charcoal/55">
                                Showing options at or under {money(item.amount)}.
                              </p>
                            </div>
                            <Button
                              type="button"
                              variant="secondary"
                              className="w-full sm:w-auto"
                              onClick={() => setExpandedCategory(isExpanded ? null : item.name)}
                            >
                              <Plus size={16} />
                              {isExpanded ? "Hide matches" : "Show matches"}
                            </Button>
                          </div>

                          {isExpanded && (
                            <div className="grid gap-3 border-t border-champagne/35 pt-4 md:grid-cols-2">
                              {matchingVendors.length ? (
                                matchingVendors.map((vendor) => (
                                  <div key={vendor.id} className="rounded-[8px] border border-champagne/45 bg-ivory/75 p-4">
                                    <div className="flex items-start justify-between gap-3">
                                      <div>
                                        <p className="font-semibold text-charcoal">{vendor.name}</p>
                                        <p className="mt-1 text-sm text-charcoal/60">{vendor.location}</p>
                                      </div>
                                      <span className="rounded-full bg-white px-3 py-1 text-sm font-semibold text-charcoal ring-1 ring-champagne/45">
                                        {money(vendor.startingPrice)}
                                      </span>
                                    </div>
                                    <div className="mt-4 flex items-center justify-between gap-3">
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
                                        onClick={() => requireAccount((activeAccount) => void handleAddVendor(vendor, activeAccount.uid), "add vendors to your wedding plan")}
                                      >
                                        Add
                                      </Button>
                                    </div>
                                  </div>
                                ))
                              ) : (
                                <div className="rounded-[8px] bg-ivory p-4 text-sm text-charcoal/60 md:col-span-2">
                                  No matching vendors fit this category amount yet. Increase this category or browse the marketplace for more options.
                                </div>
                              )}
                            </div>
                          )}

                          {categoryBookings.length > 0 && (
                            <>
                            <div className="flex items-center justify-between text-sm text-slate-600">
                              <span>Booked</span>
                              <span className={isOver ? "text-red-600 font-semibold" : "text-green-600 font-semibold"}>
                                {money(bookedTotal)}
                              </span>
                            </div>

                            <div className="flex items-center justify-between text-sm text-slate-600">
                              <span>{isOver ? "Over" : "Remaining"}</span>
                              <span className={isOver ? "text-red-600 font-semibold" : "text-green-600 font-semibold"}>
                                {isOver ? `Over by ${money(Math.abs(remainingCat))}` : `${money(remainingCat)} left`}
                              </span>
                            </div>

                            <div className="h-2 overflow-hidden rounded-full bg-slate-200">
                              <div
                                className={`h-2 rounded-full ${isOver ? "bg-red-500" : "bg-green-500"}`}
                                style={{ width: `${item.amount > 0 ? Math.min((bookedTotal / item.amount) * 100, 100) : 0}%` }}
                              />
                            </div>
                            </>
                          )}
                          </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-champagne/35 px-5 py-5 sm:px-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <LinkButton href="/vendors" variant="secondary" className="w-full sm:w-auto">
                  Browse all vendors
                </LinkButton>
              </div>

              {isSaving ? (
                <div className="rounded-[8px] border border-champagne/45 bg-ivory px-4 py-3 text-sm font-medium text-charcoal/60">
                  Saving budget...
                </div>
              ) : saveMessage ? (
                <div
                  className={`rounded-[8px] border px-4 py-3 text-sm font-medium ${
                    saveMessage.includes("success")
                      ? "border-green-200 bg-green-50 text-green-700"
                      : "border-red-200 bg-red-50 text-red-700"
                  }`}
                >
                  {saveMessage.includes("success") && <CheckCircle2 className="mr-2 inline-block h-4 w-4" />}
                  {saveMessage}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
