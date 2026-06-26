"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, CalendarDays, ChevronLeft, ChevronRight, DollarSign, Edit3, ImagePlus, Inbox, MapPin, Save, Star, Trash2, X } from "lucide-react";
import { Button, LinkButton, Section, Stat } from "@/components/ui";
import { dateLabel } from "@/lib/availability";
import { deleteVendorProfile, getStoredAccount, saveVendorProfile, uploadVendorImageFiles } from "@/lib/account-service";
import { getBookingsForVendor } from "@/lib/bookings";
import { citiesForState, formatLocation, locationStates } from "@/lib/location";
import { venueSubcategories } from "@/lib/venue-subcategories";
import { getReviewsForVendor, getVendorProfile, getVendorProfilesForAccount } from "@/lib/vendor-profile";
import { categories } from "@/lib/vendors";
import type { VendorProfile, VendorReview } from "@/lib/types";

type DashboardVendorProfile = VendorProfile & { id?: string };

type QuoteRequest = {
  vendor: string;
  eventDate?: string;
  createdAt?: string;
};

const weekdayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function VendorDashboardPage() {
  const router = useRouter();
  const searchParams = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
  const vendorIdParam = searchParams?.get("vendor");
  const [profile, setProfile] = useState<DashboardVendorProfile | null>(null);
  const [editValues, setEditValues] = useState<VendorProfile>({});
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [isUploadingImages, setIsUploadingImages] = useState(false);
  const [quoteRequests, setQuoteRequests] = useState<QuoteRequest[]>([]);
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

      const accountProfiles = vendorIdParam ? [] : await getVendorProfilesForAccount(account.uid);
      const targetVendorId = vendorIdParam || accountProfiles[0]?.id || account.uid;
      const nextProfile = accountProfiles[0] ?? await getVendorProfile(targetVendorId);
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

    return () => window.removeEventListener("vowdise-vendor-review-changed", syncReviews);
  }, [profile?.id]);

  const images = profile?.images?.filter(Boolean) ?? [];
  const blockedDates = profile?.blockedDates ?? [];
  const visibleQuoteRequests = quoteRequests;
  const pendingRequestDates = [
    ...(profile?.pendingRequestDates ?? []),
    ...visibleQuoteRequests.map((request) => request.eventDate).filter((date): date is string => Boolean(date)),
  ];
  const availabilityStatus = blockedDates.length >= 8 ? "Limited availability" : "Available";
  const isBookedOut = blockedDates.length >= 12;
  const calendarDays = buildCalendarDays(calendarMonth);
  const monthLabel = new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(calendarMonth);
  const cityOptions = citiesForState(editValues.locationState || "");
  const isEditingVenue = editValues.category === "Venues";

  function persistProfile(nextProfile: DashboardVendorProfile) {
    const account = getStoredAccount();
    if (!account?.uid) return Promise.resolve();

    setProfile(nextProfile);
    return saveVendorProfile(account.uid, {
      ...nextProfile,
      images: nextProfile.images ?? [],
    }, nextProfile.id).catch((error) => {
      console.error("Vendor profile save failed:", error);
      throw error;
    });
  }

  function updateEditValue(key: keyof VendorProfile, value: string) {
    setSaveMessage("");
    setEditValues((current) => ({ ...current, [key]: value }));
  }

  function updateEditCategory(value: string) {
    setSaveMessage("");
    setEditValues((current) => ({
      ...current,
      category: value,
      venueSubcategory: value === "Venues" ? current.venueSubcategory : "",
    }));
  }

  function updateEditLocation(nextValues: Partial<Pick<VendorProfile, "locationState" | "locationCity">>) {
    setSaveMessage("");
    setEditValues((current) => {
      const nextState = nextValues.locationState ?? current.locationState ?? "";
      const nextCity = nextValues.locationCity ?? current.locationCity ?? "";
      return {
        ...current,
        ...nextValues,
        location: formatLocation(nextCity, nextState),
      };
    });
  }

  async function saveProfileEdits() {
    if (!profile) return;

    const nextProfile = {
      ...profile,
      ...editValues,
      venueSubcategory: editValues.category === "Venues" ? editValues.venueSubcategory : "",
      images,
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
  }

  function removeBlockedDate(date: string) {
    persistProfile({
      ...(profile || {}),
      blockedDates: blockedDates.filter((item) => item !== date),
      pendingRequestDates,
    });
  }

  function toggleBlockedDate(date: string) {
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
    setCalendarMonth((current) => new Date(current.getFullYear(), current.getMonth() + direction, 1));
  }

  async function uploadImages(files: FileList | null) {
    if (!files || !profile) return;

    const remainingSlots = 10 - images.length;
    const selectedFiles = Array.from(files)
      .filter((file) => file.type.startsWith("image/"))
      .slice(0, remainingSlots);
    if (!selectedFiles.length) return;

      setIsUploadingImages(true);
    try {
      const account = getStoredAccount();
      const uploadedUrls = account ? await uploadVendorImageFiles(account.uid, selectedFiles, profile.id) : [];
      const previewUrls = uploadedUrls.length
        ? uploadedUrls
        : await Promise.all(selectedFiles.map(readFileAsDataUrl));

      await persistProfile({
        ...profile,
        images: [...images, ...previewUrls].slice(0, 10),
      });
    } catch (error) {
      console.error("Vendor image upload failed:", error);
    } finally {
      setIsUploadingImages(false);
    }
  }

  function removeImage(image: string) {
    if (!profile) return;
    persistProfile({
      ...profile,
      images: images.filter((item) => item !== image),
    });
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

  return (
    <main>
      <Section>
        <LinkButton href="/for-vendors" variant="ghost" className="mb-6 px-0">
          <ArrowLeft size={18} /> Back to vendor home
        </LinkButton>
        <div className="mb-8 flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-rose">Vendor dashboard</p>
            <h1 className="mt-2 font-serif text-5xl font-semibold">{profile?.businessName || "Manage your wedding business"}</h1>
            <p className="mt-3 text-charcoal/65">
              {profile?.description || "Set up your profile, manage quote requests, and keep your availability current."}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {profile?.id && (
              <LinkButton href={`/messages?vendorProfile=${encodeURIComponent(profile.id)}`} variant="secondary" className="px-4 py-3">
                Messages
              </LinkButton>
            )}
            <div className={`rounded-full px-5 py-3 text-sm font-bold ${isBookedOut ? "bg-rose/10 text-rose" : "bg-sage/12 text-sage"}`}>
              {availabilityStatus}
            </div>
          </div>
        </div>

        {profile && (
          <div className="mb-8 overflow-hidden rounded-[8px] border border-champagne/50 bg-white shadow-soft">
            <div className="grid gap-0 lg:grid-cols-[0.95fr_1.05fr]">
              <div className="p-6 sm:p-8">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-rose">
                  {[profile.category || "Vendor profile", profile.category === "Venues" ? profile.venueSubcategory : null].filter(Boolean).join(" / ")}
                </p>
                <div className="mt-2 flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                  <h2 className="font-serif text-4xl font-semibold">{profile.businessName}</h2>
                  {isEditingProfile ? (
                    <div className="flex gap-2">
                      <Button type="button" className="px-4 py-2" onClick={saveProfileEdits} disabled={isSavingProfile}>
                        <Save size={16} /> {isSavingProfile ? "Saving" : "Save"}
                      </Button>
                      <Button type="button" variant="secondary" className="px-4 py-2" onClick={cancelProfileEdits}>
                        <X size={16} /> Cancel
                      </Button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <Button type="button" variant="secondary" className="px-4 py-2" onClick={() => setIsEditingProfile(true)}>
                        <Edit3 size={16} /> Edit
                      </Button>
                      <Button type="button" variant="secondary" className="px-4 py-2 text-rose hover:bg-rose/10" onClick={() => setShowDeleteConfirm(true)}>
                        <Trash2 size={16} /> Delete
                      </Button>
                    </div>
                  )}
                </div>

                {isEditingProfile ? (
                  <form
                    className="mt-5 grid gap-4"
                    onSubmit={(event) => {
                      event.preventDefault();
                      void saveProfileEdits();
                    }}
                  >
                    <label className="grid gap-2">
                      <span className="font-bold">Business name</span>
                      <input required value={editValues.businessName || ""} onChange={(event) => updateEditValue("businessName", event.target.value)} className="rounded-[8px] border border-champagne bg-ivory px-4 py-3 outline-none focus:ring-2 focus:ring-gold/30" />
                    </label>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <label className="grid gap-2">
                        <span className="font-bold">Category</span>
                        <select required value={editValues.category || ""} onChange={(event) => updateEditCategory(event.target.value)} className="rounded-[8px] border border-champagne bg-ivory px-4 py-3 outline-none focus:ring-2 focus:ring-gold/30">
                          <option value="">Choose a category</option>
                          {categories.map((category) => <option key={category}>{category}</option>)}
                        </select>
                      </label>
                      <label className="grid gap-2">
                        <span className="font-bold">Starting price</span>
                        <input required type="number" min={0} value={editValues.startingPrice || ""} onChange={(event) => updateEditValue("startingPrice", event.target.value)} className="rounded-[8px] border border-champagne bg-ivory px-4 py-3 outline-none focus:ring-2 focus:ring-gold/30" />
                      </label>
                    </div>
                    {isEditingVenue && (
                      <label className="grid gap-2">
                        <span className="font-bold">Venue type</span>
                        <select required value={editValues.venueSubcategory || ""} onChange={(event) => updateEditValue("venueSubcategory", event.target.value)} className="rounded-[8px] border border-champagne bg-ivory px-4 py-3 outline-none focus:ring-2 focus:ring-gold/30">
                          <option value="">Choose a venue type</option>
                          {venueSubcategories.map((subcategory) => <option key={subcategory}>{subcategory}</option>)}
                        </select>
                      </label>
                    )}
                    <label className="grid gap-2">
                      <span className="font-bold">Location</span>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <select required value={editValues.locationState || ""} onChange={(event) => updateEditLocation({ locationState: event.target.value, locationCity: "" })} className="rounded-[8px] border border-champagne bg-ivory px-4 py-3 outline-none focus:ring-2 focus:ring-gold/30">
                          <option value="">State</option>
                          {locationStates.map((state) => <option key={state}>{state}</option>)}
                        </select>
                        <div>
                          <input
                            required
                            value={editValues.locationCity || ""}
                            onChange={(event) => updateEditLocation({ locationCity: event.target.value })}
                            placeholder={editValues.locationState ? "Search city" : "Choose state first"}
                            list="vendor-dashboard-city-options"
                            disabled={!editValues.locationState}
                            className="w-full rounded-[8px] border border-champagne bg-ivory px-4 py-3 outline-none focus:ring-2 focus:ring-gold/30 disabled:cursor-not-allowed disabled:opacity-60"
                          />
                          <datalist id="vendor-dashboard-city-options">
                            {cityOptions.map((city) => <option key={city} value={city} />)}
                          </datalist>
                        </div>
                      </div>
                    </label>
                    <label className="grid gap-2">
                      <span className="font-bold">Description</span>
                      <textarea value={editValues.description || ""} onChange={(event) => updateEditValue("description", event.target.value)} rows={5} className="resize-none rounded-[8px] border border-champagne bg-ivory px-4 py-3 outline-none focus:ring-2 focus:ring-gold/30" />
                    </label>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <label className="grid gap-2">
                        <span className="font-bold">Service radius</span>
                        <input type="number" min={0} value={editValues.serviceRadius || ""} onChange={(event) => updateEditValue("serviceRadius", event.target.value)} placeholder="25" className="rounded-[8px] border border-champagne bg-ivory px-4 py-3 outline-none focus:ring-2 focus:ring-gold/30" />
                      </label>
                      <label className="grid gap-2">
                        <span className="font-bold">Lead time</span>
                        <input value={editValues.bookingLeadTime || ""} onChange={(event) => updateEditValue("bookingLeadTime", event.target.value)} placeholder="6 months" className="rounded-[8px] border border-champagne bg-ivory px-4 py-3 outline-none focus:ring-2 focus:ring-gold/30" />
                      </label>
                    </div>
                    <label className="grid gap-2">
                      <span className="font-bold">Availability notes</span>
                      <textarea value={editValues.availabilityNotes || ""} onChange={(event) => updateEditValue("availabilityNotes", event.target.value)} rows={3} className="resize-none rounded-[8px] border border-champagne bg-ivory px-4 py-3 outline-none focus:ring-2 focus:ring-gold/30" />
                    </label>
                  </form>
                ) : (
                  <>
                    <div className="mt-4 flex flex-wrap gap-3 text-sm font-semibold text-charcoal/62">
                      <span className="flex items-center gap-1"><MapPin size={16} /> {profile.location}</span>
                      <span className="flex items-center gap-1"><DollarSign size={16} /> From ${Number(profile.startingPrice || 0).toLocaleString()}</span>
                      <span className="flex items-center gap-1"><CalendarDays size={16} /> {availabilityStatus}</span>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-3 text-sm font-semibold text-charcoal/62">
                      <span className="rounded-full bg-ivory px-3 py-1">{reviews.length} review{reviews.length === 1 ? "" : "s"}</span>
                      <span className="rounded-full bg-ivory px-3 py-1">{profile.serviceRadius || 25} mile service radius</span>
                    </div>
                    <p className="mt-5 leading-7 text-charcoal/68">{profile.description || "Add a description so couples can understand your style, services, and best-fit events."}</p>
                    <div className="mt-5 grid gap-3 sm:grid-cols-2">
                      <div className="rounded-[8px] bg-ivory p-4">
                        <p className="text-xs font-bold uppercase tracking-[0.16em] text-charcoal/45">Service area</p>
                        <p className="mt-1 font-bold">{profile.serviceRadius || 25} miles</p>
                      </div>
                      <div className="rounded-[8px] bg-ivory p-4">
                        <p className="text-xs font-bold uppercase tracking-[0.16em] text-charcoal/45">Lead time</p>
                        <p className="mt-1 font-bold">{profile.bookingLeadTime || "6 months"}</p>
                      </div>
                    </div>
                    {profile.availabilityNotes && (
                      <div className={`mt-4 rounded-[8px] p-4 ${isBookedOut ? "bg-rose/10 text-rose" : "bg-sage/10 text-charcoal"}`}>
                        <p className="text-sm">{profile.availabilityNotes}</p>
                      </div>
                    )}
                  </>
                )}
                {saveMessage && (
                  <div className="mt-4 rounded-[8px] bg-sage/10 p-3 text-sm font-bold text-sage">
                    {saveMessage}
                  </div>
                )}
              </div>
              <div className="bg-ivory p-3">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <p className="text-sm font-bold text-charcoal/70">Gallery images</p>
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-charcoal px-4 py-2 text-sm font-bold text-white transition hover:bg-black">
                    <ImagePlus size={16} /> {isUploadingImages ? "Uploading..." : "Upload"}
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
                </div>
                <div className="grid min-h-72 grid-cols-2 gap-2">
                {images.length ? (
                  images.slice(0, 10).map((image, index) => (
                    <div key={`${image}-${index}`} className="group relative min-h-32 overflow-hidden rounded-[8px]">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={image} alt="" className="h-full min-h-32 w-full object-cover" />
                      <button
                        type="button"
                        className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full bg-white/90 text-rose opacity-0 shadow-sm transition group-hover:opacity-100"
                        onClick={() => removeImage(image)}
                        aria-label="Remove image"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  ))
                ) : (
                  <label className="col-span-2 grid min-h-56 cursor-pointer place-items-center rounded-[8px] border border-dashed border-champagne bg-white p-6 text-center text-sm font-semibold text-charcoal/55 transition hover:bg-champagne/10">
                    <span>
                      <ImagePlus className="mx-auto mb-3 text-gold" size={26} />
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
                )}
                </div>
                <p className="mt-3 text-xs font-semibold text-charcoal/48">{images.length}/10 images added</p>
              </div>
            </div>
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-4">
          <Stat label="New leads" value={String(visibleQuoteRequests.length)} />
          <Stat label="Quote requests" value={String(visibleQuoteRequests.length)} />
          <Stat label="Reviews" value={String(reviews.length)} />
          <Stat label="Blocked dates" value={String(blockedDates.length)} tone={isBookedOut ? "text-rose" : "text-sage"} />
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="space-y-6">
            <div className="rounded-[8px] border border-champagne/50 bg-white p-6 shadow-sm">
              <h2 className="flex items-center gap-2 text-xl font-bold"><Inbox size={20} /> Quote requests</h2>
              <div className="mt-5 space-y-3">
                {visibleQuoteRequests.length ? (
                  visibleQuoteRequests.map((request) => (
                    <div key={`${request.vendor}-${request.createdAt}`} className="grid gap-2 rounded-[8px] bg-ivory p-4 sm:grid-cols-[1fr_auto] sm:items-center">
                      <div>
                        <p className="font-bold">{request.vendor}</p>
                        <p className="text-sm text-charcoal/58">
                          Event date: {request.eventDate ? dateLabel(request.eventDate) : "Not provided"}
                        </p>
                      </div>
                      <button className="rounded-full bg-charcoal px-4 py-2 text-sm font-bold text-white">Reply</button>
                    </div>
                  ))
                ) : (
                  <div className="rounded-[8px] bg-ivory p-5">
                    <p className="font-bold">No quote requests yet</p>
                    <p className="mt-1 text-sm text-charcoal/58">Requests from couples will appear here once they contact your business.</p>
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-[8px] border border-champagne/50 bg-white p-6 shadow-sm">
              <h2 className="flex items-center gap-2 text-xl font-bold"><Star className="fill-gold text-gold" size={20} /> Reviews</h2>
              <div className="mt-5 space-y-3">
                {reviews.length ? (
                  reviews.map((review, index) => (
                    <blockquote key={`${review.name}-${review.createdAt ?? index}`} className="rounded-[8px] bg-ivory p-4">
                      <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
                        <p className="font-bold">{review.name}</p>
                        <span className="flex items-center gap-1 text-sm font-bold text-charcoal/70">
                          <Star className="fill-gold text-gold" size={15} /> {review.rating}.0
                        </span>
                      </div>
                      <p className="mt-3 leading-7 text-charcoal/68">“{review.text}”</p>
                    </blockquote>
                  ))
                ) : (
                  <div className="rounded-[8px] bg-ivory p-5">
                    <p className="font-bold">No reviews yet</p>
                    <p className="mt-1 text-sm text-charcoal/58">Reviews left on your public vendor profile will appear here.</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-[8px] border border-champagne/50 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <CalendarDays className="text-gold" size={20} />
                  <h3 className="mt-3 font-bold">Availability calendar</h3>
                  <p className="mt-1 text-sm text-charcoal/62">Click a date to block or unblock it. Pending quote dates are highlighted.</p>
                </div>
                <div className="flex rounded-full bg-ivory p-1">
                  <button type="button" onClick={() => shiftMonth(-1)} className="grid h-8 w-8 place-items-center rounded-full hover:bg-white" aria-label="Previous month">
                    <ChevronLeft size={17} />
                  </button>
                  <button type="button" onClick={() => shiftMonth(1)} className="grid h-8 w-8 place-items-center rounded-full hover:bg-white" aria-label="Next month">
                    <ChevronRight size={17} />
                  </button>
                </div>
              </div>

              <div className="mt-5 rounded-[8px] border border-champagne/50 bg-ivory p-3">
                <div className="mb-3 text-center font-bold">{monthLabel}</div>
                <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-bold uppercase text-charcoal/45">
                  {weekdayLabels.map((day) => <span key={day}>{day}</span>)}
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
                        className={`aspect-square rounded-[8px] border text-sm font-bold transition ${
                          !day.inMonth
                            ? "border-transparent text-charcoal/25"
                            : isBlocked
                              ? "border-rose/30 bg-rose/12 text-rose"
                              : isPending
                                ? "border-gold/40 bg-gold/15 text-charcoal"
                                : "border-champagne bg-white text-charcoal hover:border-gold/60"
                        }`}
                      >
                        {day.day}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-3 text-xs font-bold text-charcoal/58">
                <span className="inline-flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-white ring-1 ring-champagne" /> Available</span>
                <span className="inline-flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-rose/20 ring-1 ring-rose/30" /> Blocked</span>
                <span className="inline-flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-gold/20 ring-1 ring-gold/40" /> Pending request</span>
              </div>

              {blockedDates.length > 0 && (
                <div className="mt-4">
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-charcoal/45">Blocked dates</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {blockedDates.map((date) => (
                      <button key={date} onClick={() => removeBlockedDate(date)} className="rounded-full bg-rose/10 px-3 py-2 text-xs font-bold text-rose">
                        {dateLabel(date)} x
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {pendingRequestDates.length > 0 && (
                <div className="mt-4">
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-charcoal/45">Pending requests</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {pendingRequestDates.map((date) => (
                      <span key={date} className="rounded-full bg-gold/10 px-3 py-2 text-xs font-bold text-gold">
                        {dateLabel(date)}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>

        {showDeleteConfirm && (
          <div className="fixed inset-0 z-50 grid place-items-center bg-charcoal/45 p-4 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-[8px] bg-white p-6 shadow-soft">
              <h2 className="font-serif text-2xl font-semibold">Delete business?</h2>
              <p className="mt-3 text-charcoal/70">
                This will permanently delete <span className="font-semibold">{profile?.businessName}</span> and all its data. This action cannot be undone.
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
