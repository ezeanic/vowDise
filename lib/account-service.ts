import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
} from "firebase/auth";
import { FirebaseError } from "firebase/app";
import { deleteDoc, doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { auth, db, isFirebaseConfigured, storage } from "./firebase";
import { hasVendorProfile } from "./vendor-profile";
import type { VendorProfile, BudgetData } from "./types";
import { readableId } from "./readable-id";

export type UserCapability = "couple" | "vendor";

export type UserRoles = {
  couple: boolean;
  vendor: boolean;
  admin: boolean;
};

export type AccountInput = {
  name?: string;
  email: string;
  password?: string;
  capability: UserCapability;
};

export type AccountRecord = {
  uid: string;
  name: string;
  email: string;
  roles: UserRoles;
};

function rolesForCapability(capability: UserCapability): UserRoles {
  return {
    couple: true,
    vendor: capability === "vendor",
    admin: false,
  };
}

function notifyAccountChanged() {
  window.dispatchEvent(new Event("vowdise-account-changed"));
}

async function saveUserAccount(account: AccountRecord) {
  localStorage.setItem("vowdiseAccount", JSON.stringify(account));
  notifyAccountChanged();

  if (!isFirebaseConfigured || !db || account.uid.startsWith("local-")) return;

  const roles = {
    couple: true,
    ...(account.roles.vendor ? { vendor: true } : {}),
    ...(account.roles.admin ? { admin: true } : {}),
  };

  await setDoc(
    doc(db, "users", account.uid),
    {
      ...account,
      roles,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
}

export async function updateAccountProfile(account: AccountRecord, values: { name?: string }) {
  const nextAccount: AccountRecord = {
    ...account,
    name: values.name?.trim() || account.name,
  };

  await saveUserAccount(nextAccount);
  return nextAccount;
}

async function rolesForSignedInUser(uid: string, capability: UserCapability) {
  const fallbackRoles = rolesForCapability(capability);
  if (!isFirebaseConfigured || !db) return fallbackRoles;

  const snapshot = await getDoc(doc(db, "users", uid));
  const storedRoles = snapshot.exists() ? (snapshot.data().roles as Partial<UserRoles> | undefined) : undefined;

  return {
    couple: true,
    vendor: Boolean(storedRoles?.vendor || capability === "vendor"),
    admin: Boolean(storedRoles?.admin),
  };
}

export function normalizeAccount(value: unknown): AccountRecord {
  const account = value as Partial<AccountRecord> & { role?: UserCapability };
  return {
    uid: account.uid || "local-couple",
    name: account.name || "Vowdise user",
    email: account.email || "",
    roles: account.roles || {
      couple: true,
      vendor: account.role === "vendor",
      admin: false,
    },
  };
}

export function getStoredAccount() {
  const saved = localStorage.getItem("vowdiseAccount");
  if (!saved) return null;

  try {
    return normalizeAccount(JSON.parse(saved));
  } catch {
    localStorage.removeItem("vowdiseAccount");
    return null;
  }
}

export async function signOutAccount() {
  if (isFirebaseConfigured && auth) {
    await signOut(auth);
  }

  localStorage.removeItem("vowdiseAccount");
  notifyAccountChanged();
}

export async function createAccount(input: AccountInput) {
  if (!isFirebaseConfigured || !auth || !db) {
    throw new Error("Firebase is required to create accounts.");
  }

  const credential = await createUserWithEmailAndPassword(auth, input.email, input.password || "");
  const account: AccountRecord = {
    uid: credential.user.uid,
    name: input.name?.trim() || credential.user.displayName || credential.user.email?.split("@")[0] || "Vowdise user",
    email: input.email,
    roles: rolesForCapability(input.capability),
  };

  await saveUserAccount(account);
  return account;
}

export async function addAccountCapability(account: AccountRecord, capability: UserCapability) {
  const nextAccount = {
    ...account,
    roles: {
      ...account.roles,
      couple: true,
      vendor: account.roles.vendor || capability === "vendor",
    },
  };

  await saveUserAccount(nextAccount);
  return nextAccount;
}

export async function signInWithPassword(input: AccountInput) {
  if (!isFirebaseConfigured || !auth) {
    throw new Error("Firebase is required to sign in.");
  }

  const credential = await signInWithEmailAndPassword(auth, input.email, input.password || "");
  
  // Try to get the stored account name first
  const stored = getStoredAccount();
  const storedName = stored?.uid === credential.user.uid ? stored.name : null;
  
  const account = {
    uid: credential.user.uid,
    name: storedName || input.name || credential.user.displayName || credential.user.email?.split("@")[0] || "Vowdise user",
    email: credential.user.email || input.email,
    roles: await rolesForSignedInUser(credential.user.uid, input.capability),
  };

  await saveUserAccount(account);
  return account;
}

export function friendlyAuthError(error: unknown) {
  if (!(error instanceof FirebaseError)) {
    return error instanceof Error ? error.message : "Something went wrong. Please try again.";
  }

  const messages: Record<string, string> = {
    "auth/email-already-in-use": "That email already has an account. Sign in with the existing password or use Google.",
    "auth/invalid-credential": "That email or password does not match an existing account.",
    "auth/wrong-password": "That password is not correct.",
    "auth/user-not-found": "No account exists for that email yet.",
    "auth/weak-password": "Use a password with at least 6 characters.",
    "auth/invalid-email": "Enter a valid email address.",
    "auth/popup-closed-by-user": "Google sign-in was closed before it finished.",
    "auth/unauthorized-domain": "This domain is not authorized in Firebase Authentication settings.",
    "storage/unauthorized": "Image upload is blocked by Firebase Storage rules. Check that Storage is enabled and rules are deployed.",
    "storage/quota-exceeded": "Firebase Storage quota was exceeded. Try smaller images or check the Firebase billing/quota settings.",
    "storage/retry-limit-exceeded": "Image upload timed out. Try again with fewer or smaller images.",
  };

  return messages[error.code] || error.message;
}

export async function signInWithGoogle(capability: UserCapability) {
  if (!isFirebaseConfigured || !auth) {
    throw new Error("Firebase is required to sign in with Google.");
  }

  const provider = new GoogleAuthProvider();
  const credential = await signInWithPopup(auth, provider);
  const account = {
    uid: credential.user.uid,
    name: credential.user.displayName || credential.user.email?.split("@")[0] || "Vowdise user",
    email: credential.user.email || "",
    roles: await rolesForSignedInUser(credential.user.uid, capability),
  };

  await saveUserAccount(account);
  return account;
}

export async function saveCoupleProfile(uid: string, values: Record<string, string>) {
  localStorage.setItem("weddingPlan", JSON.stringify(values));

  if (!isFirebaseConfigured || !db || uid.startsWith("local-")) return;

  await setDoc(doc(db, "couples", uid), {
    ...values,
    ownerUid: uid,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function saveBudget(uid: string, budgetData: BudgetData) {
  localStorage.setItem("weddingBudget", JSON.stringify(budgetData));

  if (!isFirebaseConfigured || !db || uid.startsWith("local-")) return;

  await setDoc(doc(db, "budgets", uid), {
    ...budgetData,
    ownerUid: uid,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function loadBudget(uid: string): Promise<BudgetData | null> {
  // Try localStorage first
  const local = localStorage.getItem("weddingBudget");
  if (local) {
    try {
      return JSON.parse(local) as BudgetData;
    } catch {
      localStorage.removeItem("weddingBudget");
    }
  }

  // Try Firebase if configured
  if (!isFirebaseConfigured || !db || uid.startsWith("local-")) return null;

  const snapshot = await getDoc(doc(db, "budgets", uid));
  if (!snapshot.exists()) return null;

  const data = snapshot.data();
  const budgetData: BudgetData = {
    total: data.total || 0,
    items: data.items || [],
  };

  // Cache in localStorage
  localStorage.setItem("weddingBudget", JSON.stringify(budgetData));
  return budgetData;
}

export async function uploadVendorImageFiles(uid: string, files: File[], vendorId?: string) {
  if (!files.length) return [];
  if (!isFirebaseConfigured || !storage || uid.startsWith("local-")) return [];

  const activeStorage = storage;
  const targetVendorId = vendorId || uid;
  const uploadedUrls = await Promise.all(
    files.map(async (file) => {
      const safeName = file.name.toLowerCase().replace(/[^a-z0-9.]+/g, "-");
      const readableFileId = readableId(safeName.replace(/\.[^.]+$/, ""), "image");
      const imageRef = ref(activeStorage, `vendors/${targetVendorId}/gallery/${readableFileId}-${safeName}`);
      const snapshot = await uploadBytes(imageRef, file, { contentType: file.type });
      return getDownloadURL(snapshot.ref);
    }),
  );

  return uploadedUrls;
}

export async function saveVendorProfile(uid: string, values: VendorProfile & { images: string[] }, vendorId?: string) {
  const isRemoteSave = Boolean(isFirebaseConfigured && db && !uid.startsWith("local-"));
  const profileId = vendorId || (isRemoteSave ? readableId(values.businessName || "business", "business") : uid);
  const profileValues = { ...values };
  delete (profileValues as VendorProfile & { images: string[]; id?: string }).id;
  const localValues = {
    id: profileId,
    ...profileValues,
    images: profileValues.images ?? [],
    imageUrls: profileValues.images ?? [],
    ownerUid: uid,
    published: true,
  };

  localStorage.setItem(`vowdiseVendorProfile:${localValues.id}`, JSON.stringify(localValues));
  window.dispatchEvent(new Event("vowdise-vendor-profile-changed"));

  if (!isFirebaseConfigured || !db || uid.startsWith("local-")) {
    return localValues.id;
  }

  const remoteImageUrls = profileValues.images.filter((image) => image.startsWith("http://") || image.startsWith("https://"));

  await setDoc(doc(db, "vendors", profileId), {
    ...profileValues,
    images: remoteImageUrls,
    imageUrls: remoteImageUrls,
    localImageCount: profileValues.images.length - remoteImageUrls.length,
    ownerUid: uid,
    published: true,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return profileId;
}

export async function deleteVendorProfile(vendorId: string) {
  localStorage.removeItem(`vowdiseVendorProfile:${vendorId}`);
  window.dispatchEvent(new Event("vowdise-vendor-profile-changed"));

  if (!isFirebaseConfigured || !db || vendorId.startsWith("local-")) return;

  await deleteDoc(doc(db, "vendors", vendorId));
}

export async function hasStoredVendorProfile(uid?: string) {
  if (!uid) return false;
  return hasVendorProfile(uid);
}
