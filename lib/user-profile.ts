import type { UserProfile } from "./types";
import { db, isFirebaseConfigured } from "./firebase";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";

const PROFILE_KEY = "vowdiseUserProfile";
const PROFILE_CHANGED_EVENT = "vowdise-user-profile-changed";

export function formatCoupleName(name?: string, spouseName?: string) {
  const primary = name?.trim();
  const spouse = spouseName?.trim();
  if (primary && spouse) return `${primary} & ${spouse}`;
  return primary || spouse || "Vowdise user";
}

export function notifyUserProfileChanged() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(PROFILE_CHANGED_EVENT));
}

function getLocalProfile(uid: string): UserProfile | null {
  if (typeof window === "undefined") return null;
  try {
    const saved = localStorage.getItem(PROFILE_KEY);
    if (!saved) return null;
    const profile = JSON.parse(saved) as UserProfile;
    return profile.uid === uid ? profile : null;
  } catch {
    localStorage.removeItem(PROFILE_KEY);
    return null;
  }
}

function setLocalProfile(profile: UserProfile) {
  if (typeof window === "undefined") return;
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  notifyUserProfileChanged();
}

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  if (!isFirebaseConfigured || !db || uid.startsWith("local-")) {
    return getLocalProfile(uid);
  }

  try {
    const snapshot = await getDoc(doc(db, "userProfiles", uid));
    if (!snapshot.exists()) return getLocalProfile(uid);
    return snapshot.data() as UserProfile;
  } catch {
    return getLocalProfile(uid);
  }
}

export async function saveUserProfile(
  profile: Partial<UserProfile> & { uid: string },
): Promise<UserProfile> {
  const now = new Date().toISOString();
  const existing = await getUserProfile(profile.uid);
  const updatedProfile: UserProfile = {
    uid: profile.uid,
    name: profile.name ?? existing?.name,
    spouseName: profile.spouseName ?? existing?.spouseName,
    email: profile.email ?? existing?.email,
    weddingDate: profile.weddingDate ?? existing?.weddingDate,
    guestCount: profile.guestCount ?? existing?.guestCount,
    notes: profile.notes ?? existing?.notes,
    location: profile.location ?? existing?.location,
    updatedAt: now,
  };

  setLocalProfile(updatedProfile);

  if (!isFirebaseConfigured || !db || profile.uid.startsWith("local-")) {
    return updatedProfile;
  }

  const firestoreData: Record<string, unknown> = {
    ...updatedProfile,
    updatedAt: serverTimestamp(),
  };

  Object.keys(firestoreData).forEach((key) => {
    if (firestoreData[key] === undefined) {
      delete firestoreData[key];
    }
  });

  try {
    await setDoc(doc(db, "userProfiles", profile.uid), firestoreData);
    notifyUserProfileChanged();
    return updatedProfile;
  } catch (error) {
    console.error("Failed to save user profile:", error);
    return updatedProfile;
  }
}
