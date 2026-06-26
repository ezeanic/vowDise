import type { VenueSubcategory } from "./venue-subcategories";

export type VendorCategory =
  | "Venues"
  | "Photographers"
  | "Caterers"
  | "DJs"
  | "Florists"
  | "Videographers"
  | "Wedding Planners"
  | "Makeup Artists"
  | "Cake Vendors";

export type VendorProfile = {
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
  blockedDates?: string[];
  pendingRequestDates?: string[];
};

export type Vendor = {
  id: string;
  name: string;
  category: VendorCategory;
  venueSubcategory?: VenueSubcategory | string;
  location: string;
  startingPrice: number;
  rating: number;
  reviewCount: number;
  availability: "High" | "Limited" | "Waitlist";
  blockedDates?: string[];
  pendingRequestDates?: string[];
  image: string;
  gallery: string[];
  description: string;
  packages: { name: string; price: number; includes: string }[];
  reviews: VendorReview[];
  budgetFit: "Great fit" | "Stretch" | "Premium";
  isRealVendor?: boolean;
  ownerUid?: string;
};

export type VendorReview = {
  name: string;
  rating: number;
  text: string;
  createdAt?: string;
};

export type BudgetCategory = {
  name: string;
  percent: number;
};

export type BudgetItem = {
  name: string;
  percent: number;
  amount: number;
};

export type BudgetData = {
  total: number;
  items: BudgetItem[];
};

export type BookingStatus = "saved" | "inquired" | "quoted" | "booked" | "contract_signed" | "paid";

export type VendorBooking = {
  id: string;
  ownerUid?: string;
  vendorId: string;
  vendorName: string;
  category: VendorCategory;
  budgetCategory: string;
  quotedPrice?: number;
  bookedPrice?: number;
  status: BookingStatus;
  weddingDate?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
};

export type ChatMessage = {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  senderRole: "couple" | "vendor";
  content: string;
  timestamp: string;
  read: boolean;
};

export type Conversation = {
  id: string;
  coupleId: string;
  coupleName: string;
  vendorId: string;
  vendorOwnerUid?: string;
  vendorName: string;
  vendorBusinessName?: string;
  lastMessage?: string;
  lastMessageTime?: string;
  unreadCount: number;
  createdAt: string;
  updatedAt: string;
};

export type UserProfile = {
  uid: string;
  name?: string;
  spouseName?: string;
  email?: string;
  weddingDate?: string;
  guestCount?: number;
  notes?: string;
  location?: string;
  updatedAt: string;
};
