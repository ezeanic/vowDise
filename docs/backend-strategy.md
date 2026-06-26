# Vowdise Backend Strategy

## Decision

Use Firebase as the production backend for the first real launch.

Firebase project:

```txt
vowdise-aa3d5
```

This keeps the stack simple, uses tools the team is already familiar with, and gives the app a clear path from MVP to production without introducing a separate auth/database/storage provider.

## Recommended Stack

- Firebase Auth for couple and vendor accounts
- Firestore for app data
- Cloud Storage for vendor images
- Firebase App Hosting for the Next.js app
- Cloud Functions for backend-only workflows
- App Check and Firebase Security Rules for abuse protection and access control

## Account Model

Use one auth system with multi-role profiles. A user can plan a wedding and later become a vendor with the same login.

```ts
type UserRoles = {
  couple: boolean;
  vendor: boolean;
  admin: boolean;
};
```

Couples create accounts from `Start Planning`.

Vendors use `Become a Vendor` to add vendor tools to the same account.

Existing users sign in from `/sign-in` before starting a new onboarding flow.

Dashboards, permissions, and data access should be capability-specific.

## Suggested Firestore Shape

```txt
users/{uid}
couples/{coupleId}
couples/{coupleId}/savedVendors/{vendorId}
couples/{coupleId}/budgetItems/{itemId}
couples/{coupleId}/quoteRequests/{requestId}

vendors/{vendorId}
vendors/{vendorId}/availability/{availabilityId}
vendors/{vendorId}/packages/{packageId}
vendors/{vendorId}/reviews/{reviewId}

quoteRequests/{requestId}
```

## Vendor Profile Fields

```txt
businessName
category
description
location
serviceRadius
startingPrice
availabilityStatus
bookingLeadTime
blockedDates
pendingRequestDates
availabilityNotes
imageUrls
ownerUid
createdAt
updatedAt
published
```

Store image files in Cloud Storage. Store only image URLs and metadata in Firestore.

Current MVP behavior: vendors can upload images from their device during onboarding. After the vendor account is created, local files upload to Cloud Storage under `vendors/{uid}/gallery`, and Firestore stores only the resulting download URLs. If Firebase is not configured locally, the app falls back to browser-only previews for development.

Availability should be stored as date-based records or arrays, not only free-text status. Vendors can block dates, couples request a specific event date, and quote requests should be rejected or flagged when the requested date is blocked.

## Cost Rules

- Do not store images directly in Firestore.
- Paginate vendor listings.
- Avoid loading every vendor on initial page load.
- Avoid real-time listeners for public marketplace browsing unless truly needed.
- Use cached/static pages for public marketing content where possible.
- Keep AI planner rule-based until there is a clear reason to pay for AI calls.
- Set Google Cloud budget alerts before launch.
- Use Cloud Functions only for workflows that need server trust.

## Firebase Services To Enable First

1. Authentication
2. Firestore Database
3. Cloud Storage
4. App Check
5. App Hosting
6. Cloud Functions

## Authentication Providers

Enable these Firebase Auth sign-in providers:

- Email/password
- Google

For Google sign-in, configure the public-facing project support email in Firebase Console.

## Local Environment

Create `.env.local` from `.env.example` and paste the Firebase Web App config values:

```txt
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=vowdise-aa3d5.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=vowdise-aa3d5
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=vowdise-aa3d5.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=
```

The app currently falls back to localStorage when these values are missing, so development can continue before Firebase is fully configured.

## First Backend Milestone

Replace localStorage with Firebase for:

- Account creation and login
- Couple onboarding profile
- Vendor onboarding profile
- Vendor image upload
- Saved vendors
- Quote requests

## Later Additions

- Email notifications for quote requests
- Admin dashboard for vendor approval/moderation
- Search service such as Algolia or Typesense if Firestore queries are not enough
- Payment provider for featured vendor listings
- BigQuery or analytics export for marketplace reporting
