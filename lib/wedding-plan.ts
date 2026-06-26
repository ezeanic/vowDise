import type {
  BookingStatus,
  Vendor,
  VendorBooking,
  VendorCategory,
} from "./types";
import {
  getBookingsForAccount,
  saveBooking,
  updateBookingStatus,
} from "./bookings";

export const vendorCategoryToBudgetCategory: Record<VendorCategory, string> = {
  Venues: "Venue",
  Photographers: "Photography",
  Caterers: "Food/catering",
  DJs: "DJ/music",
  Florists: "Florals",
  Videographers: "Videography",
  "Wedding Planners": "Miscellaneous",
  "Makeup Artists": "Miscellaneous",
  "Cake Vendors": "Cake",
};

const statusRank: Record<BookingStatus, number> = {
  saved: 0,
  inquired: 1,
  quoted: 2,
  booked: 3,
  contract_signed: 4,
  paid: 5,
};

export function budgetCategoryForVendor(vendor: Vendor) {
  return vendorCategoryToBudgetCategory[vendor.category] ?? "Miscellaneous";
}

export async function addVendorToPlan(
  uid: string,
  vendor: Vendor,
  status: BookingStatus = "saved",
  details: Partial<VendorBooking> = {},
  options: { requireRemote?: boolean } = {},
) {
  const existingBookings = await getBookingsForAccount(uid);
  const existing = existingBookings.find(
    (booking) =>
      booking.vendorId === vendor.id &&
      !(options.requireRemote && booking.id.startsWith("local-")),
  );
  const nextStatus =
    existing && statusRank[existing.status] > statusRank[status]
      ? existing.status
      : status;
  const nextData: Partial<VendorBooking> = {
    vendorId: vendor.id,
    vendorName: vendor.name,
    category: vendor.category,
    budgetCategory: budgetCategoryForVendor(vendor),
    quotedPrice: existing?.quotedPrice ?? vendor.startingPrice,
    ...details,
  };

  if (existing) {
    await updateBookingStatus(uid, existing.id, nextStatus, nextData, options);
    return { ...existing, ...nextData, status: nextStatus } as VendorBooking;
  }

  return saveBooking(
    uid,
    {
      vendorId: vendor.id,
      vendorName: vendor.name,
      category: vendor.category,
      budgetCategory: budgetCategoryForVendor(vendor),
      quotedPrice: vendor.startingPrice,
      status,
      ...details,
    },
    options,
  );
}
