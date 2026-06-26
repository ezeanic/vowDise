import type { Vendor, VendorCategory, VendorReview } from "./types";
import { categories, vendors } from "./vendors";
import { FirebaseError } from "firebase/app";
import { collection, doc, getDoc, getDocs, query, where, setDoc } from "firebase/firestore";
import { getDownloadURL, listAll, ref } from "firebase/storage";
import { auth, db, isFirebaseConfigured, storage } from "./firebase";
import { readableId } from "./readable-id";

const fallbackImage = "https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1200&q=80";

type StoredVendorProfile = {
  id?: string;
  businessName?: string;
  category?: string;
  venueSubcategory?: string;
  location?: string;
  locationState?: string;
  locationCity?: string;
  startingPrice?: string;
  description?: string;
  availabilityStatus?: string;
  serviceRadius?: string;
  bookingLeadTime?: string;
  availabilityNotes?: string;
  images?: string[];
  imageUrls?: string[];
  blockedDates?: string[];
  pendingRequestDates?: string[];
  rating?: number;
  reviewCount?: number;
  ownerUid?: string;
};

type NormalizedVendorProfile = StoredVendorProfile & { id: string };

async function getStorageGalleryImages(vendorId: string) {
  if (!isFirebaseConfigured || !storage) return [];

  try {
    const galleryRef = ref(storage, `vendors/${vendorId}/gallery`);
    const gallery = await listAll(galleryRef);
    return await Promise.all(gallery.items.map((item) => getDownloadURL(item)));
  } catch {
    return [];
  }
}

async function getRemoteReviewsForVendor(vendorId: string): Promise<VendorReview[]> {
  if (!isFirebaseConfigured || !db) return [];

  try {
    const snapshot = await getDocs(
      query(
        collection(db, "vendorReviews"),
        where("vendorId", "==", vendorId),
      ),
    );

    return snapshot.docs.map((doc) => doc.data() as VendorReview);
  } catch {
    return [];
  }
}

export async function getReviewsForVendor(vendorId: string) {
  const reviews = await getRemoteReviewsForVendor(vendorId);
  const unique = new Map<string, VendorReview>();

  reviews.forEach((review) => {
    const key = `${review.name}-${review.rating}-${review.createdAt ?? ""}-${review.text}`;
    unique.set(key, review);
  });

  return Array.from(unique.values()).sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));
}

export async function saveVendorReview(vendorId: string, review: Omit<VendorReview, "createdAt"> & { createdAt?: string }) {
  const createdAt = review.createdAt ?? new Date().toISOString();
  const newReview = {
    ...review,
    createdAt,
  };

  if (!isFirebaseConfigured || !db) {
    throw new Error("Reviews cannot be saved until the database is configured.");
  }

  if (!auth?.currentUser) {
    throw new Error("Sign in again before submitting your review.");
  }

  try {
    const reviewRef = doc(
      collection(db, "vendorReviews"),
      readableId(`${review.name}-${vendorId}`, "review")
    );
    await setDoc(reviewRef, {
      vendorId,
      reviewerUid: auth.currentUser.uid,
      ...newReview,
    });
  } catch (error) {
    if (error instanceof FirebaseError && error.code === "permission-denied") {
      throw new Error("Reviews are not enabled in the live database rules yet.");
    }

    throw error;
  }

  window.dispatchEvent(new Event("vowdise-vendor-review-changed"));

  const reviews = await getReviewsForVendor(vendorId);
  const unique = new Map<string, VendorReview>();

  [newReview, ...reviews].forEach((item) => {
    const key = `${item.name}-${item.rating}-${item.createdAt ?? ""}-${item.text}`;
    unique.set(key, item);
  });

  return Array.from(unique.values()).sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));
}

function normalizeProfile(profile: StoredVendorProfile): NormalizedVendorProfile {
  const sanitizedId = profile.id?.trim() || readableId(profile.businessName || "local-business", "local-business");
  return {
    ...profile,
    id: sanitizedId,
    businessName: profile.businessName?.trim(),
    category: profile.category?.trim(),
    venueSubcategory: profile.venueSubcategory?.trim(),
    location: profile.location?.trim(),
    locationState: profile.locationState?.trim(),
    locationCity: profile.locationCity?.trim(),
    startingPrice: profile.startingPrice?.trim(),
    description: profile.description?.trim(),
    availabilityStatus: profile.availabilityStatus?.trim(),
    serviceRadius: profile.serviceRadius?.trim(),
    bookingLeadTime: profile.bookingLeadTime?.trim(),
    availabilityNotes: profile.availabilityNotes?.trim(),
    images: (profile.images ?? profile.imageUrls)?.filter(Boolean) ?? [],
    blockedDates: profile.blockedDates ?? [],
    pendingRequestDates: profile.pendingRequestDates ?? [],
  };
}

function profileToVendor(profile: StoredVendorProfile): Vendor {
  const normalized = normalizeProfile(profile);
  const category = categories.includes(normalized.category as VendorCategory)
    ? (normalized.category as VendorCategory)
    : categories[0];
  const images = normalized.images?.filter(Boolean) ?? [];
  const startingPrice = Number(normalized.startingPrice || 0);
  const rating = Number(profile.rating ?? 0) || 0;
  const reviewCount = Number(profile.reviewCount ?? 0) || 0;

  return {
    id: normalized.id,
    name: normalized.businessName ?? "Unnamed business",
    category,
    venueSubcategory: category === "Venues" ? normalized.venueSubcategory : undefined,
    location: normalized.location || "Location pending",
    startingPrice,
    rating,
    reviewCount,
    availability: normalized.availabilityStatus === "Limited" ? "Limited" : "High",
    ownerUid: normalized.ownerUid,
    blockedDates: normalized.blockedDates,
    pendingRequestDates: normalized.pendingRequestDates,
    image: images[0] || fallbackImage,
    gallery: images.length ? images : [fallbackImage],
    description:
      normalized.description ||
      "This vendor is setting up their Vowdise profile. Request a quote to learn more about their services.",
    packages: [
      {
        name: "Starting package",
        price: startingPrice,
        includes: "Package details will be added by the vendor soon.",
      },
    ],
    reviews: [],
    budgetFit: "Great fit",
    isRealVendor: true,
  } satisfies Vendor;
}

function mergeVendors(primary: Vendor[], secondary: Vendor[]) {
  const seen = new Set<string>();
  const merged: Vendor[] = [];

  [...primary, ...secondary].forEach((vendor) => {
    const keys = [
      vendor.id,
      `${vendor.name.toLowerCase()}-${vendor.location.toLowerCase()}-${vendor.category.toLowerCase()}`,
    ];
    if (keys.some((key) => seen.has(key))) return;
    keys.forEach((key) => seen.add(key));
    merged.push(vendor);
  });

  return merged;
}

export function getMarketplaceVendors() {
  return vendors;
}

export async function getRemoteMarketplaceVendors() {
  if (!isFirebaseConfigured || !db) return [];

  try {
    const [vendorSnapshot, reviewSnapshot] = await Promise.all([
      getDocs(collection(db, "vendors")),
      getDocs(collection(db, "vendorReviews")),
    ]);

    const reviewStats = reviewSnapshot.docs.reduce((map, docSnapshot) => {
      const data = docSnapshot.data() as { vendorId?: string; rating?: number };
      const vendorId = data.vendorId;
      if (!vendorId) return map;

      const rating = Number(data.rating ?? 0);
      const stats = map.get(vendorId) ?? { count: 0, totalRating: 0 };
      stats.count += 1;
      stats.totalRating += rating;
      map.set(vendorId, stats);
      return map;
    }, new Map<string, { count: number; totalRating: number }>());

    return await Promise.all(vendorSnapshot.docs.map(async (docSnapshot) => {
      const data = docSnapshot.data() as StoredVendorProfile;
      const storedImages = (data.images ?? data.imageUrls)?.filter(Boolean) ?? [];
      const galleryImages = storedImages.length ? storedImages : await getStorageGalleryImages(docSnapshot.id);
      const vendor = profileToVendor({
        id: docSnapshot.id,
        ...data,
        images: galleryImages,
        imageUrls: galleryImages,
      });

      const stats = reviewStats.get(vendor.id);
      if (stats?.count) {
        vendor.reviewCount = stats.count;
        vendor.rating = Math.round((stats.totalRating / stats.count) * 10) / 10;
      }

      return vendor;
    }));
  } catch {
    return [];
  }
}

export async function getMarketplaceVendorsWithRemote() {
  const remoteVendors = await getRemoteMarketplaceVendors();
  return mergeVendors(remoteVendors, vendors);
}

export async function getVendorProfile(vendorId: string) {
  const localProfile = getLocalVendorProfile(vendorId);
  if (!isFirebaseConfigured || !db || vendorId.startsWith("local-")) return localProfile;

  try {
    const snapshot = await getDoc(doc(db, "vendors", vendorId));
    if (!snapshot.exists()) return localProfile;

    const data = snapshot.data() as StoredVendorProfile;
    const storedImages = (data.images ?? data.imageUrls)?.filter(Boolean) ?? [];
    const galleryImages = storedImages.length ? storedImages : await getStorageGalleryImages(snapshot.id);

    return normalizeProfile({
      id: snapshot.id,
      ...data,
      images: galleryImages,
      imageUrls: galleryImages,
    });
  } catch {
    return localProfile;
  }
}

export async function getVendorProfilesForAccount(uid: string) {
  if (!isFirebaseConfigured || !db || uid.startsWith("local-")) {
    const localProfile = getLocalVendorProfile(uid);
    return localProfile ? [localProfile] : [];
  }

  try {
    const snapshot = await getDocs(
      query(collection(db, "vendors"), where("ownerUid", "==", uid))
    );

    return await Promise.all(snapshot.docs.map(async (docSnapshot) => {
      const data = docSnapshot.data() as StoredVendorProfile;
      const storedImages = (data.images ?? data.imageUrls)?.filter(Boolean) ?? [];
      const galleryImages = storedImages.length ? storedImages : await getStorageGalleryImages(docSnapshot.id);

      return normalizeProfile({
        id: docSnapshot.id,
        ...data,
        images: galleryImages,
        imageUrls: galleryImages,
      });
    }));
  } catch {
    return [];
  }
}

export async function hasVendorProfile(uid: string) {
  // Check cache first
  const cacheKey = `vowdiseHasVendorProfile:${uid}`;
  const cached = localStorage.getItem(cacheKey);
  if (cached !== null) {
    return cached === "true";
  }

  const hasProfile = (await getVendorProfilesForAccount(uid)).length > 0;
  // Cache the result
  localStorage.setItem(cacheKey, String(hasProfile));
  return hasProfile;
}

function getLocalVendorProfile(vendorId: string) {
  if (typeof window === "undefined") return null;

  try {
    const saved = localStorage.getItem(`vowdiseVendorProfile:${vendorId}`);
    return saved ? normalizeProfile(JSON.parse(saved) as StoredVendorProfile) : null;
  } catch {
    localStorage.removeItem(`vowdiseVendorProfile:${vendorId}`);
    return null;
  }
}
