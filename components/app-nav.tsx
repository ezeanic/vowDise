"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  ChevronDown,
  LogOut,
  Menu,
  MessageSquare,
  Pencil,
  Store,
  UserRound,
  WalletCards,
  X,
} from "lucide-react";
import logoImage from "@/logoImage.png";
import {
  getStoredAccount,
  hasStoredVendorProfile,
  signOutAccount,
  updateAccountProfile,
  type AccountRecord,
} from "@/lib/account-service";
import {
  subscribeToConversationsForUser,
  updateCoupleNameForAccount,
} from "@/lib/chat";
import {
  formatCoupleName,
  getUserProfile,
  saveUserProfile,
} from "@/lib/user-profile";
import { categories } from "@/lib/vendors";
import type { Conversation, UserProfile } from "@/lib/types";
import { Button, LinkButton } from "./ui";

const links = [
  ["Wedding Plan", "/budget"],
  ["AI Planner", "/ai-planner"],
  ["Vendor Dashboard", "/for-vendors"],
];

const vendorMenuLinks = [
  ["All vendors", "/vendors"],
  ...categories.map((category) => [
    category,
    `/vendors?category=${encodeURIComponent(category)}`,
  ]),
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
  const [unreadMessageCount, setUnreadMessageCount] = useState(0);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  function unreadForAccount(conversation: Conversation, nextAccount: AccountRecord) {
    const role = nextAccount.roles.vendor ? "vendor" : "couple";
    return (
      conversation.unreadCount > 0 &&
      (!conversation.unreadFor || conversation.unreadFor === role)
    );
  }

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

      void hasStoredVendorProfile(nextAccount.uid).then(
        (nextHasVendorProfile) => {
          if (isMounted) setHasVendorProfile(nextHasVendorProfile);
        },
      );
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
    if (!account?.uid) {
      setUnreadMessageCount(0);
      return;
    }

    return subscribeToConversationsForUser(
      account.uid,
      account.roles.vendor ? "vendor" : "couple",
      (conversations) => {
        setUnreadMessageCount(
          conversations
            .filter((conversation) => unreadForAccount(conversation, account))
            .reduce((total, conversation) => total + conversation.unreadCount, 0),
        );
      },
    );
  }, [account]);

  useEffect(() => {
    if (!isProfileOpen && !isMobileMenuOpen) return;

    function handlePointerDown(event: PointerEvent) {
      if (
        isProfileOpen &&
        !profileMenuRef.current?.contains(event.target as Node)
      ) {
        setIsProfileOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsProfileOpen(false);
        setIsMobileMenuOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isProfileOpen, isMobileMenuOpen]);

  const displayName = formatCoupleName(
    profile?.name || account?.name,
    profile?.spouseName,
  );

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
    void updateCoupleNameForAccount(
      account.uid,
      formatCoupleName(name, spouseName),
    );
    setIsEditingProfile(false);
    setProfileMessage("Profile saved.");
    window.setTimeout(() => setProfileMessage(""), 2500);
  }

  return (
    <header className="bg-ivory/88 sticky top-0 z-40 border-b border-champagne/40 backdrop-blur-xl transition-shadow duration-300">
      <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2 text-lg font-bold">
          <Image
            src={logoImage}
            alt=""
            width={56}
            height={56}
            priority
            className="h-14 w-14 rounded-full object-contain"
          />
          Vowdise
        </Link>
        <div className="hidden items-center gap-1 lg:flex">
          <Link
            href="/"
            className="rounded-full px-4 py-2 text-sm font-medium text-charcoal/75 transition duration-200 hover:-translate-y-0.5 hover:bg-white/75 hover:text-charcoal"
          >
            Home
          </Link>
          <div className="group relative">
            <Link
              href="/vendors"
              className="inline-flex rounded-full px-4 py-2 text-sm font-medium text-charcoal/75 transition duration-200 hover:-translate-y-0.5 hover:bg-white/75 hover:text-charcoal"
            >
              Vendors
            </Link>
            <div className="invisible absolute left-0 top-full z-50 w-64 translate-y-1 pt-3 opacity-0 transition duration-150 group-hover:visible group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:visible group-focus-within:translate-y-0 group-focus-within:opacity-100">
              <div className="grid max-h-[calc(100vh-5rem)] gap-1 overflow-y-auto rounded-[8px] border border-champagne/50 bg-white/95 p-2 shadow-[0_18px_48px_-42px_rgba(45,42,39,0.55)] backdrop-blur-xl">
                {vendorMenuLinks.map(([label, href]) => (
                  <Link
                    key={href}
                    href={href}
                    className="rounded-[8px] px-3 py-2 text-sm font-semibold text-charcoal/68 transition duration-200 hover:bg-ivory hover:text-charcoal"
                  >
                    {label}
                  </Link>
                ))}
              </div>
            </div>
          </div>
          {links.map(([label, href]) => (
            <Link
              key={href}
              href={href}
              className="rounded-full px-4 py-2 text-sm font-medium text-charcoal/75 transition duration-200 hover:-translate-y-0.5 hover:bg-white/75 hover:text-charcoal"
            >
              {label}
            </Link>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="grid h-10 w-10 place-items-center rounded-full bg-white text-charcoal shadow-sm ring-1 ring-champagne/70 transition duration-200 hover:-translate-y-0.5 hover:bg-ivory active:scale-95 lg:hidden"
            onClick={() => {
              setIsProfileOpen(false);
              setIsMobileMenuOpen((current) => !current);
            }}
            aria-label="Open menu"
            aria-expanded={isMobileMenuOpen}
            aria-controls="mobile-navigation"
          >
            {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          {account ? (
            <div className="relative" ref={profileMenuRef}>
              <button
                type="button"
                className="flex items-center gap-2 rounded-full bg-white px-2 py-1.5 text-sm font-bold text-charcoal shadow-sm ring-1 ring-champagne/70 transition duration-200 hover:-translate-y-0.5 hover:bg-ivory active:scale-[0.98]"
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  setIsProfileOpen(!isProfileOpen);
                }}
                aria-expanded={isProfileOpen}
              >
                <span className="grid h-8 w-8 place-items-center rounded-full bg-charcoal text-xs text-white">
                  {initials}
                </span>
                <span className="hidden max-w-32 truncate sm:inline">
                  {displayName}
                </span>
                <ChevronDown
                  size={16}
                  className={`transition ${isProfileOpen ? "rotate-180" : ""}`}
                />
              </button>

              {isProfileOpen && (
                <div className="absolute right-0 mt-3 w-80 overflow-hidden rounded-[8px] border border-champagne/70 bg-white shadow-soft motion-safe:duration-200 motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-95 motion-safe:slide-in-from-top-2">
                  <div className="border-b border-champagne/55 bg-ivory p-4">
                    <div className="flex items-center gap-3">
                      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-charcoal text-sm font-bold text-white">
                        {initials}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate font-bold">{displayName}</p>
                        <p className="text-charcoal/58 truncate text-sm">
                          {account.email}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="grid p-2">
                    {isEditingProfile ? (
                      <form
                        className="grid gap-3 border-b border-champagne/45 p-2 pb-4"
                        onSubmit={handleProfileSave}
                      >
                        <label className="grid gap-1 text-sm font-semibold text-charcoal/75">
                          Your name
                          <input
                            required
                            value={profileForm.name}
                            onChange={(event) =>
                              setProfileForm((current) => ({
                                ...current,
                                name: event.target.value,
                              }))
                            }
                            className="rounded-[8px] border border-champagne bg-ivory px-3 py-2 font-normal outline-none focus:ring-2 focus:ring-gold/30"
                          />
                        </label>
                        <label className="grid gap-1 text-sm font-semibold text-charcoal/75">
                          Spouse name
                          <input
                            value={profileForm.spouseName}
                            onChange={(event) =>
                              setProfileForm((current) => ({
                                ...current,
                                spouseName: event.target.value,
                              }))
                            }
                            placeholder="Add spouse"
                            className="rounded-[8px] border border-champagne bg-ivory px-3 py-2 font-normal outline-none focus:ring-2 focus:ring-gold/30"
                          />
                        </label>
                        <div className="flex gap-2">
                          <Button
                            type="submit"
                            className="flex-1 px-3 py-2 text-sm"
                          >
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
                        className="flex items-center gap-3 rounded-[8px] px-3 py-2 text-left text-sm font-semibold text-charcoal/75 transition duration-200 hover:translate-x-0.5 hover:bg-ivory"
                        onClick={() => {
                          setProfileMessage("");
                          setIsEditingProfile(true);
                        }}
                      >
                        <UserRound size={17} /> Edit profile
                        <Pencil
                          size={14}
                          className="ml-auto text-charcoal/40"
                        />
                      </button>
                    )}
                    {profileMessage && (
                      <p className="mx-2 rounded-[8px] bg-sage/10 px-3 py-2 text-sm font-semibold text-sage motion-safe:duration-200 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-top-1">
                        {profileMessage}
                      </p>
                    )}
                    <Link
                      href="/budget"
                      className="flex items-center gap-3 rounded-[8px] px-3 py-2 text-sm font-semibold text-charcoal/75 transition duration-200 hover:translate-x-0.5 hover:bg-ivory"
                      onClick={() => setIsProfileOpen(false)}
                    >
                      <WalletCards size={17} /> Budget planner
                    </Link>
                    <Link
                      href="/messages"
                      className="relative flex items-center gap-3 rounded-[8px] px-3 py-2 text-sm font-semibold text-charcoal/75 transition duration-200 hover:translate-x-0.5 hover:bg-ivory"
                      onClick={() => setIsProfileOpen(false)}
                    >
                      <MessageSquare size={17} /> Messages
                      {unreadMessageCount > 0 && (
                        <span className="ml-auto h-2.5 w-2.5 rounded-full bg-rose" />
                      )}
                    </Link>
                    {account.roles.vendor && hasVendorProfile && (
                      <Link
                        href="/vendor-dashboard"
                        className="relative flex items-center gap-3 rounded-[8px] px-3 py-2 text-sm font-semibold text-charcoal/75 transition duration-200 hover:translate-x-0.5 hover:bg-ivory"
                        onClick={() => setIsProfileOpen(false)}
                      >
                        <Store size={17} /> Vendor dashboard
                        {unreadMessageCount > 0 && (
                          <span className="ml-auto h-2.5 w-2.5 rounded-full bg-rose" />
                        )}
                      </Link>
                    )}
                    {!hasVendorProfile && (
                      <Link
                        href="/for-vendors"
                        className="flex items-center gap-3 rounded-[8px] px-3 py-2 text-sm font-semibold text-charcoal/75 transition duration-200 hover:translate-x-0.5 hover:bg-ivory"
                        onClick={() => setIsProfileOpen(false)}
                      >
                        <Store size={17} /> Add business
                      </Link>
                    )}
                    <button
                      type="button"
                      className="flex items-center gap-3 rounded-[8px] px-3 py-2 text-left text-sm font-semibold text-rose transition duration-200 hover:translate-x-0.5 hover:bg-rose/10"
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
              <Link
                href="/sign-in"
                className="hidden rounded-full px-4 py-2 text-sm font-semibold text-charcoal/70 transition duration-200 hover:-translate-y-0.5 hover:bg-white/75 sm:inline-flex"
              >
                Sign in
              </Link>
              <LinkButton
                href="/budget"
                className="hidden px-4 py-2 lg:inline-flex"
              >
                Start Planning
              </LinkButton>
            </>
          )}
        </div>
      </nav>
      {isMobileMenuOpen && (
        <div
          id="mobile-navigation"
          className="bg-ivory/96 max-h-[calc(100vh-4rem)] overflow-y-auto overscroll-contain border-t border-champagne/45 px-4 py-3 shadow-soft motion-safe:duration-200 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-top-2 lg:hidden"
        >
          <div className="mx-auto grid max-w-7xl gap-1">
            <Link
              href="/"
              className="rounded-[8px] px-3 py-3 text-sm font-semibold text-charcoal/75 transition duration-200 hover:translate-x-0.5 hover:bg-white/80 hover:text-charcoal"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Home
            </Link>
            <Link
              href="/vendors"
              className="rounded-[8px] px-3 py-3 text-sm font-semibold text-charcoal/75 transition duration-200 hover:translate-x-0.5 hover:bg-white/80 hover:text-charcoal"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Vendors
            </Link>
            <div className="mx-3 grid gap-1 border-y border-white/80 bg-white/90 px-3 py-2 backdrop-blur-xl">
              {vendorMenuLinks.map(([label, href]) => (
                <Link
                  key={href}
                  href={href}
                  className="rounded-[8px] px-3 py-2 text-sm font-semibold text-charcoal/68 transition duration-200 hover:bg-ivory hover:text-charcoal"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  {label}
                </Link>
              ))}
            </div>
            {links.map(([label, href]) => (
              <Link
                key={href}
                href={href}
                className="rounded-[8px] px-3 py-3 text-sm font-semibold text-charcoal/75 transition duration-200 hover:translate-x-0.5 hover:bg-white/80 hover:text-charcoal"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                {!account && href === "/budget" ? "Start Planning" : label}
              </Link>
            ))}
            {!account && (
              <Link
                href="/sign-in"
                className="rounded-[8px] px-3 py-3 text-sm font-semibold text-charcoal/75 transition duration-200 hover:translate-x-0.5 hover:bg-white/80 hover:text-charcoal sm:hidden"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Sign in
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
