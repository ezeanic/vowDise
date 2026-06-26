"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
  DollarSign,
  Edit3,
  Eye,
  ImagePlus,
  MapPin,
  MessageSquare,
  Plus,
  Save,
  Star,
  Trash2,
  X,
} from "lucide-react";
import { LocationSearch } from "@/components/location-search";
import { Button, LinkButton, Section, Stat } from "@/components/ui";
import { dateLabel } from "@/lib/availability";
import {
  deleteVendorProfile,
  friendlyAuthError,
  getStoredAccount,
  saveVendorProfile,
  uploadVendorImageFiles,
} from "@/lib/account-service";
import { getBookingsForVendor } from "@/lib/bookings";
import { subscribeToConversationsForUser } from "@/lib/chat";
import { optimizeVendorImageFile } from "@/lib/image-optimization";
import type { LocationSelection } from "@/lib/location";
import { venueSubcategories } from "@/lib/venue-subcategories";
import {
  getReviewsForVendor,
  getVendorProfile,
  getVendorProfilesForAccount,
} from "@/lib/vendor-profile";
import { categories } from "@/lib/vendors";
import type {
  Conversation,
  VendorPackage,
  VendorProfile,
  VendorReview,
} from "@/lib/types";

type DashboardVendorProfile = VendorProfile & { id?: string };

type QuoteRequest = {
  vendor: string;
  eventDate?: string;
  createdAt?: string;
};

const weekdayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function VendorDashboardPage() {
  return (
    <Suspense fallback={null}>
      <VendorDashboardContent />
    </Suspense>
  );
}

function VendorDashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const vendorIdParam = searchParams?.get("vendor");
  const [profile, setProfile] = useState<DashboardVendorProfile | null>(null);
  const [editValues, setEditValues] = useState<VendorProfile>({});
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [imageUploadMessage, setImageUploadMessage] = useState("");
  const [isUploadingImages, setIsUploadingImages] = useState(false);
  const [quoteRequests, setQuoteRequests] = useState<QuoteRequest[]>([]);
  const [unreadMessageCount, setUnreadMessageCount] = useState(0);
  const [reviews, setReviews] = useState<VendorReview[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1);
  });

  useEffect(() => {
    let isMounted = true;

    async function loadProfile() {
      const account = getStoredAccount();
      if (!account?.uid) {
        router.replace("/sign-in?capability=vendor&next=/vendor-dashboard");
        return;
      }

      const accountProfiles = await getVendorProfilesForAccount(account.uid);
      const targetVendorId =
        vendorIdParam || accountProfiles[0]?.id || account.uid;
      const nextProfile =
        accountProfiles.find((item) => item.id === targetVendorId) ??
        (await getVendorProfile(targetVendorId));
      if (!isMounted) return;

      if (!nextProfile) {
        router.replace("/for-vendors");
        return;
      }

      // Verify the profile belongs to the current user
      if (nextProfile.ownerUid && nextProfile.ownerUid !== account.uid) {
        router.replace("/for-vendors");
        return;
      }

      setProfile({ ...nextProfile, id: nextProfile.id || targetVendorId });
      setEditValues(nextProfile);
      void loadRequests(nextProfile.id || targetVendorId);
    }

    async function loadRequests(targetVendorId: string) {
      const bookingRequests = await getBookingsForVendor(targetVendorId);
      const requestsFromBookings = bookingRequests.map((booking) => ({
        vendor: booking.vendorName,
        eventDate: booking.weddingDate,
        createdAt: booking.createdAt,
      }));

      setQuoteRequests(requestsFromBookings);
    }

    void loadProfile();

    return () => {
      isMounted = false;
    };
  }, [router, vendorIdParam]);

  useEffect(() => {
    const profileId = profile?.id;
    if (!profileId) return;

    async function syncReviews() {
      if (!profileId) return;
      setReviews(await getReviewsForVendor(profileId));
    }

    void syncReviews();
    window.addEventListener("vowdise-vendor-review-changed", syncReviews);

    return () =>
      window.removeEventListener("vowdise-vendor-review-changed", syncReviews);
  }, [profile?.id]);

  useEffect(() => {
    const account = getStoredAccount();
    const profileId = profile?.id;
    if (!account?.uid || !profileId) {
      setUnreadMessageCount(0);
      return;
    }

    return subscribeToConversationsForUser(
      account.uid,
      "vendor",
      (conversations) => {
        setUnreadMessageCount(
          conversations
            .filter((conversation: Conversation) => {
              return (
                conversation.unreadCount > 0 &&
                (!conversation.unreadFor || conversation.unreadFor === "vendor")
              );
            })
            .reduce(
              (total, conversation) => total + conversation.unreadCount,
              0,
            ),
        );
      },
      profileId,
    );
  }, [profile?.id]);

  const images =
    (isEditingProfile ? editValues.images : profile?.images)?.filter(Boolean) ??
    [];
  const packageValues =
    (isEditingProfile ? editValues.packages : profile?.packages) ?? [];
  const blockedDates = profile?.blockedDates ?? [];
  const visibleQuoteRequests = quoteRequests;
  const pendingRequestDates = Array.from(
    new Set([
      ...(profile?.pendingRequestDates ?? []),
      ...visibleQuoteRequests
        .map((request) => request.eventDate)
        .filter((date): date is string => Boolean(date)),
    ]),
  );
  const availabilityStatus =
    blockedDates.length >= 8 ? "Limited availability" : "Available";
  const isBookedOut = blockedDates.length >= 12;
  const calendarDays = buildCalendarDays(calendarMonth);
  const monthLabel = new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
  }).format(calendarMonth);
  const isEditingVenue = editValues.category === "Venues";
  const isImageUploadSuccess =
    imageUploadMessage.startsWith("Images added") ||
    imageUploadMessage.startsWith("Optimized images added");

  function persistProfile(nextProfile: DashboardVendorProfile) {
    const account = getStoredAccount();
    if (!account?.uid) return Promise.resolve();

    setProfile(nextProfile);
    return saveVendorProfile(
      account.uid,
      {
        ...nextProfile,
        contactEmail: nextProfile.contactEmail || nextProfile.email || account.email,
        email: nextProfile.email || nextProfile.contactEmail || account.email,
        images: nextProfile.images ?? [],
      },
      nextProfile.id,
    ).catch((error) => {
      console.error("Vendor profile save failed:", error);
      throw error;
    });
  }

  function updateEditValue(key: keyof VendorProfile, value: string) {
    setSaveMessage("");
    setEditValues((current) => ({ ...current, [key]: value }));
  }

  function startProfileEdits() {
    if (profile) setEditValues(profile);
    setSaveMessage("");
    setImageUploadMessage("");
    setIsEditingProfile(true);
  }

  function updateEditCategory(value: string) {
    setSaveMessage("");
    setEditValues((current) => ({
      ...current,
      category: value,
      venueSubcategory: value === "Venues" ? current.venueSubcategory : "",
    }));
  }

  function updateEditLocation(location: LocationSelection) {
    setSaveMessage("");
    setEditValues((current) => ({
      ...current,
      location: location.formattedLocation,
      formattedLocation: location.formattedLocation,
      city: location.city,
      state: location.state,
      locationCity: location.city,
      locationState: location.state,
      lat: location.lat,
      lng: location.lng,
    }));
  }

  function updateServiceRadius(value: string) {
    setSaveMessage("");
    const radius = Number(value);
    setEditValues((current) => ({
      ...current,
      serviceRadius: value,
      serviceRadiusMiles:
        Number.isFinite(radius) && radius > 0 ? radius : undefined,
    }));
  }

  function addPackage() {
    setSaveMessage("");
    setEditValues((current) => ({
      ...current,
      packages: [
        ...(current.packages ?? []),
        {
          name: "",
          price: Number(current.startingPrice || 0),
          includes: "",
        },
      ],
    }));
  }

  function updatePackage(
    index: number,
    key: keyof VendorPackage,
    value: string,
  ) {
    setSaveMessage("");
    setEditValues((current) => {
      const nextPackages = [...(current.packages ?? [])];
      const currentPackage = nextPackages[index] ?? {
        name: "",
        price: 0,
        includes: "",
      };
      nextPackages[index] = {
        ...currentPackage,
        [key]: key === "price" ? Number(value || 0) : value,
      };
      return {
        ...current,
        packages: nextPackages,
      };
    });
  }

  function removePackage(index: number) {
    setSaveMessage("");
    setEditValues((current) => ({
      ...current,
      packages: (current.packages ?? []).filter((_, itemIndex) => itemIndex !== index),
    }));
  }

  function cleanPackages(packages: VendorPackage[] | undefined) {
    const cleaned =
      packages
        ?.map((pkg) => ({
          name: pkg.name.trim(),
          price: Number(pkg.price || 0),
          includes: pkg.includes.trim(),
        }))
        .filter(
          (pkg) =>
            pkg.name.length > 0 &&
            pkg.includes.length > 0 &&
            Number.isFinite(pkg.price) &&
            pkg.price >= 0,
        ) ?? [];

    return cleaned.length
      ? cleaned
      : [
          {
            name: "Starting package",
            price: Number(editValues.startingPrice || profile?.startingPrice || 0),
            includes: "Package details will be added by the vendor soon.",
          },
        ];
  }

  async function saveProfileEdits() {
    if (!profile) return;

    const nextProfile = {
      ...profile,
      ...editValues,
      venueSubcategory:
        editValues.category === "Venues" ? editValues.venueSubcategory : "",
      contactEmail: editValues.contactEmail || editValues.email,
      email: editValues.email || editValues.contactEmail,
      images,
      packages: cleanPackages(editValues.packages),
      blockedDates,
      pendingRequestDates,
    };

    setIsSavingProfile(true);
    setSaveMessage("");
    try {
      await persistProfile(nextProfile);
      setIsEditingProfile(false);
      setSaveMessage("Profile changes saved.");
    } catch (error) {
      console.error("Vendor profile save failed:", error);
      setSaveMessage("Unable to save changes. Try again.");
    } finally {
      setIsSavingProfile(false);
    }
  }

  function cancelProfileEdits() {
    if (profile) setEditValues(profile);
    setIsEditingProfile(false);
    setSaveMessage("");
    setImageUploadMessage("");
  }

  function removeBlockedDate(date: string) {
    persistProfile({
      ...(profile || {}),
      blockedDates: blockedDates.filter((item) => item !== date),
      pendingRequestDates,
    });
  }

  function toggleBlockedDate(date: string) {
    if (pendingRequestDates.includes(date)) return;

    if (blockedDates.includes(date)) {
      removeBlockedDate(date);
      return;
    }

    persistProfile({
      ...(profile || {}),
      blockedDates: [...blockedDates, date].sort(),
      pendingRequestDates,
    });
  }

  function shiftMonth(direction: number) {
    setCalendarMonth(
      (current) =>
        new Date(current.getFullYear(), current.getMonth() + direction, 1),
    );
  }

  async function uploadImages(files: FileList | null) {
    if (!files || !profile || !isEditingProfile) return;

    const remainingSlots = 10 - images.length;
    const selectedFiles = Array.from(files)
      .filter((file) => file.type.startsWith("image/"))
      .slice(0, remainingSlots);
    if (!selectedFiles.length) return;

    setIsUploadingImages(true);
    setImageUploadMessage("");
    try {
      const account = getStoredAccount();
      const optimizedResults = await Promise.allSettled(
        selectedFiles.map(optimizeVendorImageFile),
      );
      const optimizedFiles = optimizedResults
        .filter(
          (result): result is PromiseFulfilledResult<File> =>
            result.status === "fulfilled",
        )
        .map((result) => result.value);
      const skippedMessages = optimizedResults
        .filter(
          (result): result is PromiseRejectedResult =>
            result.status === "rejected",
        )
        .map((result) => friendlyAuthError(result.reason));

      if (!optimizedFiles.length) {
        setImageUploadMessage(
          skippedMessages[0] || "Choose a JPG, PNG, WebP, GIF, or SVG image.",
        );
        return;
      }

      const uploadedUrls = account
        ? await uploadVendorImageFiles(account.uid, optimizedFiles, profile.id)
        : [];
      const previewUrls = uploadedUrls.length
        ? uploadedUrls
        : await Promise.all(optimizedFiles.map(readFileAsDataUrl));

      setEditValues((current) => ({
        ...current,
        images: [...images, ...previewUrls].slice(0, 10),
      }));
      const successMessage = uploadedUrls.length
        ? "Images added. Save changes to update your profile."
        : "Optimized images added as local previews. Save changes to update your profile.";
      setImageUploadMessage(
        skippedMessages.length
          ? `${successMessage} ${skippedMessages.length} image${skippedMessages.length === 1 ? " was" : "s were"} skipped.`
          : successMessage,
      );
    } catch (error) {
      console.warn("Vendor image upload failed:", friendlyAuthError(error));
      setImageUploadMessage(friendlyAuthError(error));
    } finally {
      setIsUploadingImages(false);
    }
  }

  function removeImage(image: string) {
    if (!profile || !isEditingProfile) return;
    setImageUploadMessage("");
    setEditValues((current) => ({
      ...current,
      images: images.filter((item) => item !== image),
    }));
  }

  async function handleDeleteBusiness() {
    if (!profile?.id) return;

    setIsDeleting(true);
    try {
      await deleteVendorProfile(profile.id);
      router.push("/for-vendors");
    } catch (error) {
      console.error("Failed to delete business:", error);
      setIsDeleting(false);
    }
  }

  const categoryLabel = [
    profile?.category || "Vendor profile",
    profile?.category === "Venues" ? profile?.venueSubcategory : null,
  ]
    .filter(Boolean)
    .join(" / ");
  const displayLocation =
    profile?.formattedLocation || profile?.location || "Location pending";
  const startingPriceLabel = Number(
    profile?.startingPrice || 0,
  ).toLocaleString();
  const serviceRadiusLabel = `${profile?.serviceRadius || profile?.serviceRadiusMiles || 25} miles`;
  const leadTimeLabel = profile?.bookingLeadTime || "6 months";
  const hasGalleryImages = images.length > 0;

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#fbf7ef_0%,#fffaf2_45%,#fbf7ef_100%)] text-charcoal">
      <Section className="py-8 sm:py-10">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <LinkButton
            href="/for-vendors"
            variant="ghost"
            className="w-max px-0 text-charcoal/70 hover:text-charcoal"
          >
            <ArrowLeft size={18} /> Vendor home
          </LinkButton>
          <div className="flex flex-wrap items-center gap-2">
            {profile?.id && (
              <>
                <LinkButton
                  href={`/vendors/${encodeURIComponent(profile.id)}?returnTo=/vendor-dashboard%3Fvendor%3D${encodeURIComponent(profile.id)}&returnLabel=Dashboard`}
                  variant="secondary"
                  className="px-4 py-2.5"
                >
                  <Eye size={16} /> Public profile
                </LinkButton>
                <LinkButton
                  href={`/messages?vendorProfile=${encodeURIComponent(profile.id)}`}
                  variant="secondary"
                  className="relative px-4 py-2.5"
                >
                  <MessageSquare size={16} /> Messages
                  {unreadMessageCount > 0 && (
                    <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-rose ring-2 ring-white" />
                  )}
                </LinkButton>
              </>
            )}
            {profile &&
              (isEditingProfile ? (
                <>
                  <Button
                    type="button"
                    className="px-4 py-2.5"
                    onClick={saveProfileEdits}
                    disabled={isSavingProfile}
                  >
                    <Save size={16} /> {isSavingProfile ? "Saving" : "Save"}
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    className="px-4 py-2.5"
                    onClick={cancelProfileEdits}
                  >
                    <X size={16} /> Cancel
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    type="button"
                    className="px-4 py-2.5"
                    onClick={startProfileEdits}
                  >
                    <Edit3 size={16} /> Edit profile
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    className="px-4 py-2.5 text-rose hover:bg-rose/10"
                    onClick={() => setShowDeleteConfirm(true)}
                  >
                    <Trash2 size={16} /> Delete
                  </Button>
                </>
              ))}
          </div>
        </div>

        <div className="overflow-hidden rounded-[8px] border border-champagne/55 bg-white shadow-soft">
          <div className="grid lg:grid-cols-[1.05fr_0.95fr]">
            <div className="p-6 sm:p-8 lg:p-10">
              <div className="flex flex-wrap items-center gap-3">
                <span
                  className={`rounded-full px-4 py-2 text-xs font-bold uppercase tracking-[0.14em] ${isBookedOut ? "bg-rose/10 text-rose" : "bg-sage/12 text-sage"}`}
                >
                  {availabilityStatus}
                </span>
                <span className="rounded-full bg-ivory px-4 py-2 text-xs font-bold uppercase tracking-[0.14em] text-charcoal/55">
                  {categoryLabel}
                </span>
              </div>
              <h1 className="mt-6 max-w-3xl font-serif text-4xl font-semibold leading-tight sm:text-5xl">
                {profile?.businessName || "Manage your wedding business"}
              </h1>
              <p className="text-charcoal/68 mt-4 max-w-2xl text-base leading-8">
                {profile?.description ||
                  "Polish your storefront, respond to couples, and keep your calendar accurate from one calm workspace."}
              </p>
              <div className="mt-7 grid gap-3 sm:grid-cols-3">
                <div className="rounded-[8px] bg-ivory p-4 ring-1 ring-champagne/45">
                  <MapPin className="text-rose" size={19} />
                  <p className="mt-3 text-xs font-bold uppercase tracking-[0.14em] text-charcoal/45">
                    Location
                  </p>
                  <p className="mt-1 line-clamp-2 font-bold">
                    {displayLocation}
                  </p>
                </div>
                <div className="rounded-[8px] bg-ivory p-4 ring-1 ring-champagne/45">
                  <DollarSign className="text-gold" size={19} />
                  <p className="mt-3 text-xs font-bold uppercase tracking-[0.14em] text-charcoal/45">
                    Starting at
                  </p>
                  <p className="mt-1 font-bold">${startingPriceLabel}</p>
                </div>
                <div className="rounded-[8px] bg-ivory p-4 ring-1 ring-champagne/45">
                  <Clock3 className="text-sage" size={19} />
                  <p className="mt-3 text-xs font-bold uppercase tracking-[0.14em] text-charcoal/45">
                    Lead time
                  </p>
                  <p className="mt-1 font-bold">{leadTimeLabel}</p>
                </div>
              </div>
            </div>

            <div className="border-t border-champagne/45 bg-ivory p-3 lg:border-l lg:border-t-0">
              <div className="relative min-h-[26rem] overflow-hidden rounded-[8px] bg-charcoal">
                {hasGalleryImages ? (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={images[0]}
                      alt=""
                      className="absolute inset-0 h-full w-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-charcoal/80 via-charcoal/10 to-transparent" />
                  </>
                ) : (
                  <div className="text-white/72 absolute inset-0 grid place-items-center bg-[linear-gradient(135deg,#2d2a27,#6d5552)] p-8 text-center">
                    <div>
                      <ImagePlus
                        className="mx-auto mb-4 text-champagne"
                        size={34}
                      />
                      <p className="font-bold">
                        Add gallery images to bring this business to life.
                      </p>
                    </div>
                  </div>
                )}
                {hasGalleryImages && (
                  <div className="absolute bottom-0 left-0 right-0 flex items-end justify-between gap-4 p-5 text-white">
                    <div>
                      <p className="text-white/62 text-xs font-bold uppercase tracking-[0.16em]">
                        Gallery
                      </p>
                      <p className="text-white/88 mt-1 max-w-xs text-sm font-semibold">
                        {images.length} curated image
                        {images.length === 1 ? "" : "s"} on your storefront
                      </p>
                    </div>
                    <span className="bg-white/16 shrink-0 rounded-full px-4 py-2 text-sm font-bold ring-1 ring-white/25 backdrop-blur">
                      {images.length}/10
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {saveMessage && (
          <div className="mt-4 rounded-[8px] bg-sage/10 p-3 text-sm font-bold text-sage ring-1 ring-sage/15">
            {saveMessage}
          </div>
        )}

        <div className="mt-6 grid gap-4 md:grid-cols-4">
          <Stat label="New messages" value={String(unreadMessageCount)} />
          <Stat
            label="Quote threads"
            value={String(visibleQuoteRequests.length)}
          />
          <Stat label="Reviews" value={String(reviews.length)} />
          <Stat
            label="Blocked dates"
            value={String(blockedDates.length)}
            tone={isBookedOut ? "text-rose" : "text-sage"}
          />
        </div>

        {profile && (
          <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_24rem]">
            <div className="space-y-6">
              <div className="rounded-[8px] border border-champagne/50 bg-white p-6 shadow-sm sm:p-7">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-rose">
                      Profile details
                    </p>
                    <h2 className="mt-2 font-serif text-3xl font-semibold">
                      {isEditingProfile
                        ? "Edit storefront"
                        : "Business snapshot"}
                    </h2>
                  </div>
                </div>

                {isEditingProfile ? (
                  <form
                    className="mt-6 grid gap-4"
                    onSubmit={(event) => {
                      event.preventDefault();
                      void saveProfileEdits();
                    }}
                  >
                    <label className="grid gap-2">
                      <span className="font-bold">Business name</span>
                      <input
                        required
                        value={editValues.businessName || ""}
                        onChange={(event) =>
                          updateEditValue("businessName", event.target.value)
                        }
                        className="rounded-[8px] border border-champagne bg-ivory px-4 py-3 outline-none transition focus:border-gold focus:ring-2 focus:ring-gold/25"
                      />
                    </label>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <label className="grid gap-2">
                        <span className="font-bold">Category</span>
                        <select
                          required
                          value={editValues.category || ""}
                          onChange={(event) =>
                            updateEditCategory(event.target.value)
                          }
                          className="rounded-[8px] border border-champagne bg-ivory px-4 py-3 outline-none transition focus:border-gold focus:ring-2 focus:ring-gold/25"
                        >
                          <option value="">Choose a category</option>
                          {categories.map((category) => (
                            <option key={category}>{category}</option>
                          ))}
                        </select>
                      </label>
                      <label className="grid gap-2">
                        <span className="font-bold">Starting price</span>
                        <input
                          required
                          type="number"
                          min={0}
                          value={editValues.startingPrice || ""}
                          onChange={(event) =>
                            updateEditValue("startingPrice", event.target.value)
                          }
                          className="rounded-[8px] border border-champagne bg-ivory px-4 py-3 outline-none transition focus:border-gold focus:ring-2 focus:ring-gold/25"
                        />
                      </label>
                    </div>
                    {isEditingVenue && (
                      <label className="grid gap-2">
                        <span className="font-bold">Venue type</span>
                        <select
                          required
                          value={editValues.venueSubcategory || ""}
                          onChange={(event) =>
                            updateEditValue(
                              "venueSubcategory",
                              event.target.value,
                            )
                          }
                          className="rounded-[8px] border border-champagne bg-ivory px-4 py-3 outline-none transition focus:border-gold focus:ring-2 focus:ring-gold/25"
                        >
                          <option value="">Choose a venue type</option>
                          {venueSubcategories.map((subcategory) => (
                            <option key={subcategory}>{subcategory}</option>
                          ))}
                        </select>
                      </label>
                    )}
                    <label className="grid gap-2">
                      <span className="font-bold">Location</span>
                      <LocationSearch
                        required
                        value={
                          editValues.formattedLocation ||
                          editValues.location ||
                          ""
                        }
                        onChange={updateEditLocation}
                        placeholder="San Jose, CA"
                      />
                    </label>
                    <label className="grid gap-2">
                      <span className="font-bold">Notification email</span>
                      <input
                        required
                        type="email"
                        value={
                          editValues.contactEmail || editValues.email || ""
                        }
                        onChange={(event) => {
                          updateEditValue("contactEmail", event.target.value);
                          updateEditValue("email", event.target.value);
                        }}
                        placeholder="hello@example.com"
                        className="rounded-[8px] border border-champagne bg-ivory px-4 py-3 outline-none transition focus:border-gold focus:ring-2 focus:ring-gold/25"
                      />
                      <span className="text-xs font-semibold text-charcoal/45">
                        New quote messages are emailed here.
                      </span>
                    </label>
                    <label className="grid gap-2">
                      <span className="font-bold">Description</span>
                      <textarea
                        value={editValues.description || ""}
                        onChange={(event) =>
                          updateEditValue("description", event.target.value)
                        }
                        rows={5}
                        className="resize-none rounded-[8px] border border-champagne bg-ivory px-4 py-3 leading-7 outline-none transition focus:border-gold focus:ring-2 focus:ring-gold/25"
                      />
                    </label>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <label className="grid gap-2">
                        <span className="font-bold">Service radius</span>
                        <input
                          type="number"
                          min={0}
                          value={editValues.serviceRadius || ""}
                          onChange={(event) =>
                            updateServiceRadius(event.target.value)
                          }
                          placeholder="25"
                          className="rounded-[8px] border border-champagne bg-ivory px-4 py-3 outline-none transition focus:border-gold focus:ring-2 focus:ring-gold/25"
                        />
                      </label>
                      <label className="grid gap-2">
                        <span className="font-bold">Lead time</span>
                        <input
                          value={editValues.bookingLeadTime || ""}
                          onChange={(event) =>
                            updateEditValue(
                              "bookingLeadTime",
                              event.target.value,
                            )
                          }
                          placeholder="6 months"
                          className="rounded-[8px] border border-champagne bg-ivory px-4 py-3 outline-none transition focus:border-gold focus:ring-2 focus:ring-gold/25"
                        />
                      </label>
                    </div>
                    <div className="rounded-[8px] border border-champagne/50 bg-white p-4 shadow-sm">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <p className="text-xs font-bold uppercase tracking-[0.16em] text-rose">
                            Pricing
                          </p>
                          <p className="mt-1 text-xl font-bold">Packages</p>
                          <p className="mt-1 max-w-xl text-sm leading-6 text-charcoal/58">
                            These appear on your public profile for couples to
                            compare.
                          </p>
                        </div>
                        <Button
                          type="button"
                          variant="secondary"
                          className="w-full px-4 py-2.5 sm:w-auto"
                          onClick={addPackage}
                        >
                          <Plus size={16} /> Add package
                        </Button>
                      </div>

                      <div className="mt-4 space-y-3">
                        {packageValues.length ? (
                          packageValues.map((pkg, index) => (
                            <div
                              key={`package-editor-${index}`}
                              className="rounded-[8px] border border-champagne/45 bg-ivory/60 p-4"
                            >
                              <div className="flex min-w-0 items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-charcoal/45">
                                    Package {index + 1}
                                  </p>
                                  <p className="mt-0.5 truncate text-sm font-semibold text-charcoal/62">
                                    {pkg.name || "Untitled package"}
                                  </p>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => removePackage(index)}
                                  className="grid h-10 w-10 shrink-0 place-items-center rounded-[8px] text-rose transition hover:bg-rose/10"
                                  aria-label={`Remove package ${index + 1}`}
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                              <div className="mt-4 grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1fr)_10rem]">
                                <label className="grid min-w-0 gap-2">
                                  <span className="text-sm font-bold">
                                    Package name
                                  </span>
                                  <input
                                    value={pkg.name}
                                    onChange={(event) =>
                                      updatePackage(
                                        index,
                                        "name",
                                        event.target.value,
                                      )
                                    }
                                    placeholder="Essentials"
                                    className="w-full min-w-0 rounded-[8px] border border-champagne bg-white px-3 py-2.5 outline-none transition focus:border-gold focus:ring-2 focus:ring-gold/25"
                                  />
                                </label>
                                <label className="grid w-full min-w-0 gap-2 lg:max-w-[10rem] lg:justify-self-end">
                                  <span className="text-sm font-bold">
                                    Price
                                  </span>
                                  <div className="flex w-full min-w-0 items-center gap-2 rounded-[8px] border border-champagne bg-white px-3 py-2.5 focus-within:border-gold focus-within:ring-2 focus-within:ring-gold/25">
                                    <span className="text-sm font-bold text-charcoal/45">
                                      $
                                    </span>
                                    <input
                                      type="number"
                                      min={0}
                                      value={pkg.price}
                                      onChange={(event) =>
                                        updatePackage(
                                          index,
                                          "price",
                                          event.target.value,
                                        )
                                      }
                                      className="min-w-0 flex-1 bg-transparent text-right font-semibold outline-none"
                                    />
                                  </div>
                                </label>
                                <label className="grid min-w-0 gap-2 lg:col-span-2">
                                  <span className="text-sm font-bold">
                                    Included services
                                  </span>
                                  <textarea
                                    value={pkg.includes}
                                    onChange={(event) =>
                                      updatePackage(
                                        index,
                                        "includes",
                                        event.target.value,
                                      )
                                    }
                                    rows={3}
                                    placeholder="Ceremony coverage, edited gallery, planning call..."
                                    className="w-full min-w-0 resize-none rounded-[8px] border border-champagne bg-white px-3 py-2.5 leading-6 outline-none transition focus:border-gold focus:ring-2 focus:ring-gold/25"
                                  />
                                </label>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="rounded-[8px] border border-dashed border-champagne bg-white p-4 text-sm font-semibold text-charcoal/55">
                            No packages yet. Add one to replace the default
                            starting package.
                          </div>
                        )}
                      </div>
                    </div>
                    <label className="grid gap-2">
                      <span className="font-bold">Availability notes</span>
                      <textarea
                        value={editValues.availabilityNotes || ""}
                        onChange={(event) =>
                          updateEditValue(
                            "availabilityNotes",
                            event.target.value,
                          )
                        }
                        rows={3}
                        className="resize-none rounded-[8px] border border-champagne bg-ivory px-4 py-3 leading-7 outline-none transition focus:border-gold focus:ring-2 focus:ring-gold/25"
                      />
                    </label>
                  </form>
                ) : (
                  <div className="mt-6 space-y-6">
                    <p className="max-w-3xl leading-8 text-charcoal/70">
                      {profile.description ||
                        "Add a description so couples can understand your style, services, and best-fit events."}
                    </p>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="rounded-[8px] bg-ivory p-4 ring-1 ring-champagne/45">
                        <p className="text-xs font-bold uppercase tracking-[0.16em] text-charcoal/45">
                          Service area
                        </p>
                        <p className="mt-1 font-bold">{serviceRadiusLabel}</p>
                      </div>
                      <div className="rounded-[8px] bg-ivory p-4 ring-1 ring-champagne/45">
                        <p className="text-xs font-bold uppercase tracking-[0.16em] text-charcoal/45">
                          Lead time
                        </p>
                        <p className="mt-1 font-bold">{leadTimeLabel}</p>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.16em] text-charcoal/45">
                        Packages
                      </p>
                      <div className="mt-3 grid gap-3">
                        {packageValues.map((pkg, index) => (
                          <div
                            key={`package-summary-${index}`}
                            className="rounded-[8px] bg-ivory p-4 ring-1 ring-champagne/45"
                          >
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                              <div>
                                <p className="font-bold">{pkg.name}</p>
                                <p className="mt-1 text-sm leading-6 text-charcoal/62">
                                  {pkg.includes}
                                </p>
                              </div>
                              <span className="w-max rounded-full bg-white px-3 py-1 text-sm font-bold text-rose ring-1 ring-champagne/45">
                                ${Number(pkg.price || 0).toLocaleString()}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    {profile.availabilityNotes && (
                      <div
                        className={`rounded-[8px] p-4 ring-1 ${isBookedOut ? "bg-rose/10 text-rose ring-rose/15" : "bg-sage/10 text-charcoal ring-sage/15"}`}
                      >
                        <p className="text-sm leading-6">
                          {profile.availabilityNotes}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="rounded-[8px] border border-champagne/50 bg-white p-6 shadow-sm sm:p-7">
                <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-rose">
                      Gallery
                    </p>
                    <h2 className="mt-2 font-serif text-3xl font-semibold">
                      Visual storefront
                    </h2>
                  </div>
                  {isEditingProfile && (
                    <label className="inline-flex w-max cursor-pointer items-center gap-2 rounded-full bg-charcoal px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-black">
                      <ImagePlus size={16} />{" "}
                      {isUploadingImages ? "Uploading..." : "Upload"}
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        className="sr-only"
                        disabled={isUploadingImages || images.length >= 10}
                        onChange={(event) => {
                          uploadImages(event.target.files);
                          event.target.value = "";
                        }}
                      />
                    </label>
                  )}
                </div>
                <div className="grid min-h-72 gap-3 sm:grid-cols-3">
                  {images.length ? (
                    images.slice(0, 10).map((image, index) => (
                      <div
                        key={`${image}-${index}`}
                        className={`group relative overflow-hidden rounded-[8px] bg-ivory ${index === 0 ? "sm:col-span-2 sm:row-span-2" : ""}`}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={image}
                          alt=""
                          className="h-full min-h-36 w-full object-cover transition duration-500 group-hover:scale-[1.03]"
                        />
                        {isEditingProfile && (
                          <button
                            type="button"
                            className="bg-white/92 absolute right-2 top-2 grid h-9 w-9 place-items-center rounded-full text-rose opacity-0 shadow-sm ring-1 ring-champagne/45 transition group-hover:opacity-100"
                            onClick={() => removeImage(image)}
                            aria-label="Remove image"
                          >
                            <Trash2 size={15} />
                          </button>
                        )}
                      </div>
                    ))
                  ) : isEditingProfile ? (
                    <label className="col-span-full grid min-h-64 cursor-pointer place-items-center rounded-[8px] border border-dashed border-champagne bg-ivory p-8 text-center text-sm font-semibold text-charcoal/55 transition hover:bg-champagne/10">
                      <span>
                        <ImagePlus
                          className="mx-auto mb-3 text-gold"
                          size={28}
                        />
                        Upload business images to preview your public profile.
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        className="sr-only"
                        disabled={isUploadingImages}
                        onChange={(event) => {
                          uploadImages(event.target.files);
                          event.target.value = "";
                        }}
                      />
                    </label>
                  ) : (
                    <div className="col-span-full grid min-h-64 place-items-center rounded-[8px] border border-dashed border-champagne bg-ivory p-8 text-center text-sm font-semibold text-charcoal/55">
                      No gallery images yet.
                    </div>
                  )}
                </div>
                <p className="text-charcoal/48 mt-3 text-xs font-semibold">
                  {images.length}/10 images added
                </p>
                {imageUploadMessage && (
                  <p
                    className={`mt-2 text-xs font-semibold ${isImageUploadSuccess ? "text-sage" : "text-rose"}`}
                  >
                    {imageUploadMessage}
                  </p>
                )}
              </div>

              <div className="rounded-[8px] border border-champagne/50 bg-white p-6 shadow-sm sm:p-7">
                <h2 className="flex items-center gap-2 text-xl font-bold">
                  <Star className="fill-gold text-gold" size={20} /> Reviews
                </h2>
                <div className="mt-5 space-y-3">
                  {reviews.length ? (
                    reviews.map((review, index) => (
                      <blockquote
                        key={`${review.name}-${review.createdAt ?? index}`}
                        className="rounded-[8px] bg-ivory p-4 ring-1 ring-champagne/35"
                      >
                        <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
                          <p className="font-bold">{review.name}</p>
                          <span className="flex items-center gap-1 text-sm font-bold text-charcoal/70">
                            <Star className="fill-gold text-gold" size={15} />{" "}
                            {review.rating}.0
                          </span>
                        </div>
                        <p className="text-charcoal/68 mt-3 leading-7">
                          &ldquo;{review.text}&rdquo;
                        </p>
                      </blockquote>
                    ))
                  ) : (
                    <div className="rounded-[8px] bg-ivory p-5 ring-1 ring-champagne/35">
                      <p className="font-bold">No reviews yet</p>
                      <p className="text-charcoal/58 mt-1 text-sm">
                        Reviews left on your public vendor profile will appear
                        here.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-4 lg:sticky lg:top-24">
              <div className="rounded-[8px] border border-champagne/50 bg-white p-5 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CalendarDays className="text-gold" size={20} />
                    <h3 className="mt-3 font-bold">Availability calendar</h3>
                    <p className="text-charcoal/62 mt-1 text-sm">
                      Click dates to keep your public availability accurate.
                    </p>
                  </div>
                  <div className="flex rounded-full bg-ivory p-1">
                    <button
                      type="button"
                      onClick={() => shiftMonth(-1)}
                      className="grid h-8 w-8 place-items-center rounded-full transition hover:bg-white"
                      aria-label="Previous month"
                    >
                      <ChevronLeft size={17} />
                    </button>
                    <button
                      type="button"
                      onClick={() => shiftMonth(1)}
                      className="grid h-8 w-8 place-items-center rounded-full transition hover:bg-white"
                      aria-label="Next month"
                    >
                      <ChevronRight size={17} />
                    </button>
                  </div>
                </div>

                <div className="mt-5 rounded-[8px] border border-champagne/50 bg-ivory p-3">
                  <div className="mb-3 text-center font-bold">{monthLabel}</div>
                  <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-bold uppercase text-charcoal/45">
                    {weekdayLabels.map((day) => (
                      <span key={day}>{day}</span>
                    ))}
                  </div>
                  <div className="mt-2 grid grid-cols-7 gap-1">
                    {calendarDays.map((day) => {
                      const isBlocked = blockedDates.includes(day.date);
                      const isPending = pendingRequestDates.includes(day.date);
                      return (
                        <button
                          key={day.date}
                          type="button"
                          onClick={() => toggleBlockedDate(day.date)}
                          disabled={!day.inMonth || isPending}
                          title={
                            isPending
                              ? "This date has a pending request and cannot be blocked."
                              : undefined
                          }
                          className={`aspect-square rounded-[8px] border text-sm font-bold transition ${
                            !day.inMonth
                              ? "border-transparent text-charcoal/25"
                              : isBlocked
                                ? "bg-rose/12 border-rose/30 text-rose"
                                : isPending
                                  ? "cursor-not-allowed border-gold/40 bg-gold/15 text-charcoal"
                                  : "border-champagne bg-white text-charcoal hover:border-gold/60 hover:shadow-sm"
                          }`}
                        >
                          {day.day}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="text-charcoal/58 mt-4 flex flex-wrap gap-3 text-xs font-bold">
                  <span className="inline-flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full bg-white ring-1 ring-champagne" />{" "}
                    Available
                  </span>
                  <span className="inline-flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full bg-rose/20 ring-1 ring-rose/30" />{" "}
                    Blocked
                  </span>
                  <span className="inline-flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full bg-gold/20 ring-1 ring-gold/40" />{" "}
                    Pending request
                  </span>
                </div>

                {blockedDates.length > 0 && (
                  <div className="mt-4">
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-charcoal/45">
                      Blocked dates
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {blockedDates.map((date) => (
                        <button
                          key={date}
                          onClick={() => removeBlockedDate(date)}
                          className="rounded-full bg-rose/10 px-3 py-2 text-xs font-bold text-rose transition hover:bg-rose/15"
                        >
                          {dateLabel(date)} x
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {pendingRequestDates.length > 0 && (
                  <div className="mt-4">
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-charcoal/45">
                      Pending requests
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {pendingRequestDates.map((date) => (
                        <span
                          key={date}
                          className="rounded-full bg-gold/10 px-3 py-2 text-xs font-bold text-gold"
                        >
                          {dateLabel(date)}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
        {showDeleteConfirm && (
          <div className="fixed inset-0 z-50 grid place-items-center bg-charcoal/45 p-4 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-[8px] bg-white p-6 shadow-soft">
              <h2 className="font-serif text-2xl font-semibold">
                Delete business?
              </h2>
              <p className="mt-3 text-charcoal/70">
                This will permanently delete{" "}
                <span className="font-semibold">{profile?.businessName}</span>{" "}
                and all its data. This action cannot be undone.
              </p>
              <div className="mt-6 flex gap-3">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={isDeleting}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  className="bg-rose hover:bg-rose/90"
                  onClick={handleDeleteBusiness}
                  disabled={isDeleting}
                >
                  {isDeleting ? "Deleting..." : "Delete business"}
                </Button>
              </div>
            </div>
          </div>
        )}
      </Section>
    </main>
  );
}

function buildCalendarDays(month: Date) {
  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  const firstOfMonth = new Date(year, monthIndex, 1);
  const start = new Date(year, monthIndex, 1 - firstOfMonth.getDay());

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return {
      date: toDateInputValue(date),
      day: date.getDate(),
      inMonth: date.getMonth() === monthIndex,
    };
  });
}

function toDateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}
