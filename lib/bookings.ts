import type { VendorBooking, BookingStatus } from "./types";
import { db, isFirebaseConfigured } from "./firebase";
import { collection, doc, getDocs, query, where, updateDoc, deleteDoc, orderBy, setDoc } from "firebase/firestore";
import { readableId } from "./readable-id";

const LOCAL_STORAGE_KEY = "vowdiseBookings";

function notifyPlanChanged() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event("vowdise-plan-changed"));
}

function getLocalBookings(): VendorBooking[] {
  if (typeof window === "undefined") return [];
  try {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
}

function setLocalBookings(bookings: VendorBooking[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(bookings));
  notifyPlanChanged();
}

function bookingDocumentId(uid: string, booking: Pick<VendorBooking, "vendorId" | "vendorName" | "status">) {
  return readableId(`${uid}-${booking.vendorId || booking.vendorName}-${booking.status}`, "booking");
}

export async function getBookingsForAccount(uid: string): Promise<VendorBooking[]> {
  const localBookings = getLocalBookings().filter((booking) =>
    booking.ownerUid ? booking.ownerUid === uid : booking.id.startsWith(uid) || booking.id.startsWith("local-")
  );

  if (!isFirebaseConfigured || !db || uid.startsWith("local-")) {
    return localBookings;
  }

  try {
    const snapshot = await getDocs(
      query(
        collection(db, "bookings"),
        where("ownerUid", "==", uid),
        orderBy("createdAt", "desc")
      )
    );
    const remoteBookings = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as VendorBooking));
    const remoteIds = new Set(remoteBookings.map((booking) => booking.vendorId));
    return [...remoteBookings, ...localBookings.filter((booking) => !remoteIds.has(booking.vendorId))];
  } catch {
    return localBookings;
  }
}

export async function getBookingsForVendor(vendorId: string): Promise<VendorBooking[]> {
  if (!isFirebaseConfigured || !db) {
    return getLocalBookings().filter((b) => b.vendorId === vendorId);
  }

  try {
    const snapshot = await getDocs(
      query(
        collection(db, "bookings"),
        where("vendorId", "==", vendorId),
        orderBy("createdAt", "desc")
      )
    );
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as VendorBooking));
  } catch {
    return [];
  }
}

export async function saveBooking(uid: string, booking: Omit<VendorBooking, "id" | "createdAt" | "updatedAt">): Promise<VendorBooking> {
  const now = new Date().toISOString();
  const remoteBookingId = bookingDocumentId(uid, booking);
  const newBooking: VendorBooking = {
    ...booking,
    ownerUid: uid,
    id: `local-${remoteBookingId}`,
    createdAt: now,
    updatedAt: now,
  };

  if (!isFirebaseConfigured || !db || uid.startsWith("local-")) {
    const localBookings = getLocalBookings();
    localBookings.push(newBooking);
    setLocalBookings(localBookings);
    return newBooking;
  }

  try {
    const bookingRef = doc(collection(db, "bookings"), remoteBookingId);
    await setDoc(bookingRef, {
      ...booking,
      ownerUid: uid,
      createdAt: now,
      updatedAt: now,
    });
    notifyPlanChanged();
    return { id: bookingRef.id, ...booking, createdAt: now, updatedAt: now };
  } catch (error) {
    console.error("Failed to save booking:", error);
    // Fallback to local storage
    const localBookings = getLocalBookings();
    localBookings.push(newBooking);
    setLocalBookings(localBookings);
    return newBooking;
  }
}

export async function updateBookingStatus(uid: string, bookingId: string, status: BookingStatus, additionalData?: Partial<VendorBooking>): Promise<void> {
  const now = new Date().toISOString();
  const updateData = { status, updatedAt: now, ...additionalData };

  if (!isFirebaseConfigured || !db || uid.startsWith("local-") || bookingId.startsWith("local-")) {
    const localBookings = getLocalBookings();
    const index = localBookings.findIndex(b => b.id === bookingId);
    if (index !== -1) {
      localBookings[index] = { ...localBookings[index], ...updateData };
      setLocalBookings(localBookings);
    }
    return;
  }

  try {
    await updateDoc(doc(db, "bookings", bookingId), updateData);
    notifyPlanChanged();
  } catch (error) {
    console.error("Failed to update booking:", error);
  }
}

export async function deleteBooking(uid: string, bookingId: string): Promise<void> {
  if (!isFirebaseConfigured || !db || uid.startsWith("local-") || bookingId.startsWith("local-")) {
    const localBookings = getLocalBookings().filter(b => b.id !== bookingId);
    setLocalBookings(localBookings);
    return;
  }

  try {
    await deleteDoc(doc(db, "bookings", bookingId));
    notifyPlanChanged();
  } catch (error) {
    console.error("Failed to delete booking:", error);
  }
}

export function getBookedTotal(bookings: VendorBooking[]): number {
  return bookings
    .filter(b => b.status === "booked" || b.status === "contract_signed" || b.status === "paid")
    .reduce((sum, b) => sum + (b.bookedPrice || 0), 0);
}

export function getBookingsByBudgetCategory(bookings: VendorBooking[], budgetCategory: string): VendorBooking[] {
  return bookings.filter(b => b.budgetCategory === budgetCategory);
}
