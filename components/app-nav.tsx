"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, LogOut, MessageSquare, Pencil, Store, UserRound, WalletCards, X } from "lucide-react";
import logoImage from "@/logoImage.png";
import { getStoredAccount, hasStoredVendorProfile, signOutAccount, updateAccountProfile, type AccountRecord } from "@/lib/account-service";
import { updateCoupleNameForAccount } from "@/lib/chat";
import { formatCoupleName, getUserProfile, saveUserProfile } from "@/lib/user-profile";
import type { UserProfile } from "@/lib/types";
import { Button, LinkButton } from "./ui";

const links = [
  ["Home", "/"],
  ["Vendors", "/vendors"],
  ["Plan", "/budget"],
  ["AI Planner", "/ai-planner"],
  ["Vendor Dashboard", "/for-vendors"],
];

export function AppNav() {
  const router = useRouter();
  const [account, setAccount] = useState<AccountRecord | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [hasVendorProfile, setHasVendorProfile] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({ name: "", spouseName: "" });
  const [profileMessage, setProfileMessage] = useState("");
  const profileMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let isMounted = true;

    function syncAccount() {
      const nextAccount = getStoredAccount();
      setAccount(nextAccount);
      if (!nextAccount?.uid) {
        setProfile(null);
        setHasVendorProfile(false);
        return;
      }

      setProfileForm({
        name: nextAccount.name || "",
        spouseName: "",
      });

      void getUserProfile(nextAccount.uid).then((nextProfile) => {
        if (!isMounted) return;
        setProfile(nextProfile);
        setProfileForm({
          name: nextProfile?.name || nextAccount.name || "",
          spouseName: nextProfile?.spouseName || "",
        });
      });

      void hasStoredVendorProfile(nextAccount.uid).then((nextHasVendorProfile) => {
        if (isMounted) setHasVendorProfile(nextHasVendorProfile);
      });
    }

    syncAccount();
    window.addEventListener("storage", syncAccount);
    window.addEventListener("vowdise-account-changed", syncAccount);
    window.addEventListener("vowdise-user-profile-changed", syncAccount);
    window.addEventListener("vowdise-vendor-profile-changed", syncAccount);

    return () => {
      isMounted = false;
      window.removeEventListener("storage", syncAccount);
      window.removeEventListener("vowdise-account-changed", syncAccount);
      window.removeEventListener("vowdise-user-profile-changed", syncAccount);
      window.removeEventListener("vowdise-vendor-profile-changed", syncAccount);
    };
  }, []);

  useEffect(() => {
    if (!isProfileOpen) return;

    function handlePointerDown(event: PointerEvent) {
      if (!profileMenuRef.current?.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setIsProfileOpen(false);
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isProfileOpen]);

  const displayName = formatCoupleName(profile?.name || account?.name, profile?.spouseName);

  const initials = useMemo(() => {
    if (!displayName) return "V";
    return displayName
      .split(" ")
      .filter((part) => part !== "&")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("");
  }, [displayName]);

  async function handleSignOut() {
    await signOutAccount();
    setIsProfileOpen(false);
    setAccount(null);
    router.push("/");
  }

  async function handleProfileSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!account) return;

    const name = profileForm.name.trim();
    const spouseName = profileForm.spouseName.trim();
    if (!name) {
      setProfileMessage("Add your name before saving.");
      return;
    }

    const [nextProfile, nextAccount] = await Promise.all([
      saveUserProfile({
        uid: account.uid,
        name,
        spouseName: spouseName || undefined,
        email: account.email,
      }),
      updateAccountProfile(account, { name }),
    ]);

    setProfile(nextProfile);
    setAccount(nextAccount);
    void updateCoupleNameForAccount(account.uid, formatCoupleName(name, spouseName));
    setIsEditingProfile(false);
    setProfileMessage("Profile saved.");
    window.setTimeout(() => setProfileMessage(""), 2500);
  }

  return (
    <header className="sticky top-0 z-40 border-b border-champagne/40 bg-ivory/88 backdrop-blur-xl">
      <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2 text-lg font-bold">
          <Image src={logoImage} alt="" width={56} height={56} priority className="h-14 w-14 rounded-full object-contain" />
          Vowdise
        </Link>
        <div className="hidden items-center gap-1 md:flex">
          {links.map(([label, href]) => (
            <Link key={href} href={href} className="rounded-full px-4 py-2 text-sm font-medium text-charcoal/75 hover:bg-white/75 hover:text-charcoal">
              {label}
            </Link>
          ))}
        </div>
        <div className="flex items-center gap-2">
          {account ? (
            <div className="relative" ref={profileMenuRef}>
              <button
                type="button"
                className="flex items-center gap-2 rounded-full bg-white px-2 py-1.5 text-sm font-bold text-charcoal shadow-sm ring-1 ring-champagne/70 transition hover:bg-ivory"
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                aria-expanded={isProfileOpen}
              >
                <span className="grid h-8 w-8 place-items-center rounded-full bg-charcoal text-xs text-white">
                  {initials}
                </span>
                <span className="hidden max-w-32 truncate sm:inline">{displayName}</span>
                <ChevronDown size={16} className={`transition ${isProfileOpen ? "rotate-180" : ""}`} />
              </button>

              {isProfileOpen && (
                <div className="absolute right-0 mt-3 w-80 overflow-hidden rounded-[8px] border border-champagne/70 bg-white shadow-soft">
                  <div className="border-b border-champagne/55 bg-ivory p-4">
                    <div className="flex items-center gap-3">
                      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-charcoal text-sm font-bold text-white">
                        {initials}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate font-bold">{displayName}</p>
                        <p className="truncate text-sm text-charcoal/58">{account.email}</p>
                      </div>
                    </div>
                  </div>

                  <div className="grid p-2">
                    {isEditingProfile ? (
                      <form className="grid gap-3 border-b border-champagne/45 p-2 pb-4" onSubmit={handleProfileSave}>
                        <label className="grid gap-1 text-sm font-semibold text-charcoal/75">
                          Your name
                          <input
                            required
                            value={profileForm.name}
                            onChange={(event) => setProfileForm((current) => ({ ...current, name: event.target.value }))}
                            className="rounded-[8px] border border-champagne bg-ivory px-3 py-2 font-normal outline-none focus:ring-2 focus:ring-gold/30"
                          />
                        </label>
                        <label className="grid gap-1 text-sm font-semibold text-charcoal/75">
                          Spouse name
                          <input
                            value={profileForm.spouseName}
                            onChange={(event) => setProfileForm((current) => ({ ...current, spouseName: event.target.value }))}
                            placeholder="Add spouse"
                            className="rounded-[8px] border border-champagne bg-ivory px-3 py-2 font-normal outline-none focus:ring-2 focus:ring-gold/30"
                          />
                        </label>
                        <div className="flex gap-2">
                          <Button type="submit" className="flex-1 px-3 py-2 text-sm">
                            <Check size={16} /> Save
                          </Button>
                          <Button
                            type="button"
                            variant="secondary"
                            className="px-3 py-2 text-sm"
                            onClick={() => {
                              setIsEditingProfile(false);
                              setProfileForm({
                                name: profile?.name || account.name || "",
                                spouseName: profile?.spouseName || "",
                              });
                            }}
                            aria-label="Cancel profile edit"
                          >
                            <X size={16} />
                          </Button>
                        </div>
                      </form>
                    ) : (
                      <button
                        type="button"
                        className="flex items-center gap-3 rounded-[8px] px-3 py-2 text-left text-sm font-semibold text-charcoal/75 hover:bg-ivory"
                        onClick={() => {
                          setProfileMessage("");
                          setIsEditingProfile(true);
                        }}
                      >
                        <UserRound size={17} /> Edit profile
                        <Pencil size={14} className="ml-auto text-charcoal/40" />
                      </button>
                    )}
                    {profileMessage && (
                      <p className="mx-2 rounded-[8px] bg-sage/10 px-3 py-2 text-sm font-semibold text-sage">{profileMessage}</p>
                    )}
                    <Link
                      href="/budget"
                      className="flex items-center gap-3 rounded-[8px] px-3 py-2 text-sm font-semibold text-charcoal/75 hover:bg-ivory"
                      onClick={() => setIsProfileOpen(false)}
                    >
                      <WalletCards size={17} /> Budget planner
                    </Link>
                    <Link
                      href="/messages"
                      className="flex items-center gap-3 rounded-[8px] px-3 py-2 text-sm font-semibold text-charcoal/75 hover:bg-ivory"
                      onClick={() => setIsProfileOpen(false)}
                    >
                      <MessageSquare size={17} /> Messages
                    </Link>
                    {account.roles.vendor && hasVendorProfile && (
                      <Link
                        href="/vendor-dashboard"
                        className="flex items-center gap-3 rounded-[8px] px-3 py-2 text-sm font-semibold text-charcoal/75 hover:bg-ivory"
                        onClick={() => setIsProfileOpen(false)}
                      >
                        <Store size={17} /> Vendor dashboard
                      </Link>
                    )}
                    {!hasVendorProfile && (
                      <Link
                        href="/for-vendors"
                        className="flex items-center gap-3 rounded-[8px] px-3 py-2 text-sm font-semibold text-charcoal/75 hover:bg-ivory"
                        onClick={() => setIsProfileOpen(false)}
                      >
                        <Store size={17} /> Add business
                      </Link>
                    )}
                    <button
                      type="button"
                      className="flex items-center gap-3 rounded-[8px] px-3 py-2 text-left text-sm font-semibold text-rose hover:bg-rose/10"
                      onClick={handleSignOut}
                    >
                      <LogOut size={17} /> Sign out
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <>
              <Link href="/sign-in" className="hidden rounded-full px-4 py-2 text-sm font-semibold text-charcoal/70 hover:bg-white/75 sm:inline-flex">
                Sign in
              </Link>
              <LinkButton href="/budget" className="px-4 py-2">
                Start Planning
              </LinkButton>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
