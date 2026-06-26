"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { ArrowRight, LockKeyhole } from "lucide-react";
import { Button, Section } from "@/components/ui";
import {
  friendlyAuthError,
  getStoredAccount,
  signInWithGoogle,
  signInWithPassword,
  type AccountRecord,
  type UserCapability,
} from "@/lib/account-service";
import { auth, isFirebaseConfigured } from "@/lib/firebase";

export default function SignInPage() {
  const router = useRouter();
  const capability: UserCapability = useMemo(() => {
    if (typeof window === "undefined") return "couple";
    return new URLSearchParams(window.location.search).get("capability") ===
      "vendor"
      ? "vendor"
      : "couple";
  }, []);
  const [error, setError] = useState("");

  const destination = useMemo(() => {
    if (typeof window === "undefined")
      return capability === "vendor" ? "/vendor-onboarding" : "/budget";
    const next = new URLSearchParams(window.location.search).get("next");
    if (next?.startsWith("/") && !next.startsWith("//")) return next;
    return capability === "vendor" ? "/vendor-onboarding" : "/budget";
  }, [capability]);

  useEffect(() => {
    const storedAccount = getStoredAccount();
    if (storedAccount?.uid) {
      router.replace(destination);
      return;
    }

    if (!isFirebaseConfigured || !auth) return;

    return onAuthStateChanged(auth, (user) => {
      if (!user) return;

      const account: AccountRecord = {
        uid: user.uid,
        name: user.displayName || user.email?.split("@")[0] || "Vowdise user",
        email: user.email || "",
        roles: {
          couple: true,
          vendor: capability === "vendor",
          admin: false,
        },
      };

      localStorage.setItem("vowdiseAccount", JSON.stringify(account));
      window.dispatchEvent(new Event("vowdise-account-changed"));
      router.replace(destination);
    });
  }, [capability, destination, router]);

  async function handlePasswordSignIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const formData = new FormData(event.currentTarget);

    try {
      await signInWithPassword({
        name: String(formData.get("name") || ""),
        email: String(formData.get("email") || ""),
        password: String(formData.get("password") || ""),
        capability,
      });
      router.push(destination);
    } catch (nextError) {
      setError(friendlyAuthError(nextError));
    }
  }

  async function handleGoogleSignIn() {
    setError("");
    try {
      await signInWithGoogle(capability);
      router.push(destination);
    } catch (nextError) {
      setError(friendlyAuthError(nextError));
    }
  }

  return (
    <main>
      <Section className="min-h-[calc(100vh-4rem)] content-center">
        <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[0.85fr_1.15fr]">
          <div className="rounded-[8px] bg-charcoal p-8 text-white shadow-soft">
            <span className="grid h-11 w-11 place-items-center rounded-full bg-white/10 text-champagne">
              <LockKeyhole size={20} />
            </span>
            <h1 className="mt-5 font-serif text-5xl font-semibold">
              Sign in to Vowdise
            </h1>
            <p className="text-white/68 mt-4 leading-7">
              Access your saved vendors, budget, quote requests, and planning
              tools before starting another setup flow.
            </p>
          </div>

          <div className="rounded-[8px] border border-champagne/55 bg-white p-6 shadow-soft sm:p-8">
            <form className="grid gap-4" onSubmit={handlePasswordSignIn}>
              <h2 className="text-xl font-bold">Sign in</h2>
              <input
                required
                name="email"
                type="email"
                placeholder="Email address"
                className="rounded-[8px] border border-champagne bg-ivory px-4 py-3 outline-none focus:ring-2 focus:ring-gold/30"
              />
              <input
                required
                name="password"
                type="password"
                placeholder="Password"
                className="rounded-[8px] border border-champagne bg-ivory px-4 py-3 outline-none focus:ring-2 focus:ring-gold/30"
              />
              <Button type="submit">
                Sign in <ArrowRight size={18} />
              </Button>
            </form>

            <div className="my-6 flex items-center gap-3 text-xs font-bold uppercase tracking-[0.16em] text-charcoal/40">
              <span className="h-px flex-1 bg-champagne" />
              Or
              <span className="h-px flex-1 bg-champagne" />
            </div>

            <Button
              className="w-full"
              type="button"
              variant="secondary"
              onClick={handleGoogleSignIn}
            >
              Continue with Google
            </Button>

            {error && (
              <p className="mt-4 rounded-[8px] bg-rose/10 p-3 text-sm font-semibold text-rose">
                {error}
              </p>
            )}

            <p className="mt-5 text-center text-sm text-charcoal/55">
              New here?{" "}
              <Link
                href={`/create-account?capability=${capability}`}
                className="font-bold text-rose"
              >
                Create an account
              </Link>
            </p>
          </div>
        </div>
      </Section>
    </main>
  );
}
