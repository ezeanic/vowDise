"use client";

import { FormEvent, useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { LockKeyhole, X } from "lucide-react";
import {
  createAccount,
  friendlyAuthError,
  normalizeAccount,
  signInWithGoogle,
  signInWithPassword,
  type AccountRecord,
  type UserCapability,
} from "@/lib/account-service";
import { auth, isFirebaseConfigured } from "@/lib/firebase";
import { Button } from "./ui";

type AccountAction = {
  label: string;
  run: (account: AccountRecord) => void;
  capability: UserCapability;
};

export function useAccountGate() {
  const [account, setAccount] = useState<AccountRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [pendingAction, setPendingAction] = useState<AccountAction | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!isFirebaseConfigured || !auth) {
      localStorage.removeItem("vowdiseAccount");
      setAccount(null);
      setIsLoading(false);
      return;
    }

    return onAuthStateChanged(auth, (user) => {
      if (!user) {
        localStorage.removeItem("vowdiseAccount");
        setAccount(null);
        setIsLoading(false);
        return;
      }

      const saved = localStorage.getItem("vowdiseAccount");
      if (saved) {
        try {
          const savedAccount = normalizeAccount(JSON.parse(saved));
          if (savedAccount.uid === user.uid) {
            setAccount(savedAccount);
            setIsLoading(false);
            return;
          }
        } catch {
          localStorage.removeItem("vowdiseAccount");
        }
      }

      setAccount({
        uid: user.uid,
        name: user.displayName || user.email?.split("@")[0] || "Vowdise user",
        email: user.email || "",
        roles: {
          couple: true,
          vendor: false,
          admin: false,
        },
      });
      setIsLoading(false);
    });
  }, []);

  function requireAccount(action: (account: AccountRecord) => void, label: string, capability: UserCapability = "couple") {
    if (account?.roles[capability]) {
      action(account);
      return;
    }

    setPendingAction({ label, run: action, capability });
  }

  function closeGate() {
    setPendingAction(null);
  }

  function AccountGate() {
    const [isSignIn, setIsSignIn] = useState(true);

    if (!pendingAction) return null;
    const currentAction = pendingAction;

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
      event.preventDefault();
      setMessage("");
      const formData = new FormData(event.currentTarget);
      const input = {
        name: String(formData.get("name") || ""),
        email: String(formData.get("email") || ""),
        password: String(formData.get("password") || ""),
        capability: currentAction.capability,
      };

      try {
        const nextAccount = await createAccount(input);
        setAccount(nextAccount);
        const action = currentAction.run;
        setPendingAction(null);
        action(nextAccount);
      } catch (error) {
        setMessage(friendlyAuthError(error));
      }
    }

    async function handleGoogle() {
      setMessage("");
      try {
        const nextAccount = await signInWithGoogle(currentAction.capability);
        setAccount(nextAccount);
        const action = currentAction.run;
        setPendingAction(null);
        action(nextAccount);
      } catch (error) {
        setMessage(friendlyAuthError(error));
      }
    }

    async function handleSignIn(event: FormEvent<HTMLFormElement>) {
      event.preventDefault();
      setMessage("");
      const formData = new FormData(event.currentTarget);

      try {
        const nextAccount = await signInWithPassword({
          name: "",
          email: String(formData.get("email") || ""),
          password: String(formData.get("password") || ""),
          capability: currentAction.capability,
        });
        setAccount(nextAccount);
        const action = currentAction.run;
        setPendingAction(null);
        action(nextAccount);
      } catch (error) {
        setMessage(friendlyAuthError(error));
      }
    }

    return (
      <div className="fixed inset-0 z-50 grid place-items-center bg-charcoal/45 p-4 backdrop-blur-sm">
        <div className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-[8px] bg-ivory p-6 shadow-soft">
          <div className="flex items-start justify-between gap-4">
            <div>
              <span className="grid h-11 w-11 place-items-center rounded-full bg-charcoal text-white">
                <LockKeyhole size={19} />
              </span>
              <p className="mt-5 text-xs font-bold uppercase tracking-[0.18em] text-rose">Account required</p>
              <h2 className="mt-1 font-serif text-3xl font-semibold">
                {isSignIn ? "Sign in to your account" : (currentAction.capability === "vendor" ? "Add vendor tools to your account" : "Create your free wedding account")}
              </h2>
              <p className="mt-3 text-sm leading-6 text-charcoal/68">
                Use one Vowdise account to {currentAction.label}.{" "}
                {currentAction.capability === "vendor"
                  ? "This keeps leads, availability, packages, and profile updates attached to your business."
                  : "This keeps vendor quotes, saved picks, and budget decisions attached to your wedding plan."}
              </p>
            </div>
            <button className="rounded-full p-2 hover:bg-white" onClick={closeGate} aria-label="Close account form">
              <X size={20} />
            </button>
          </div>

          {isSignIn ? (
            <>
              <form className="mt-6 grid gap-4" onSubmit={handleSignIn}>
                <input
                  required
                  name="email"
                  type="email"
                  placeholder="Email address"
                  className="rounded-[8px] border border-champagne bg-white px-4 py-3 outline-none focus:ring-2 focus:ring-gold/30"
                />
                <input
                  required
                  name="password"
                  type="password"
                  placeholder="Password"
                  className="rounded-[8px] border border-champagne bg-white px-4 py-3 outline-none focus:ring-2 focus:ring-gold/30"
                />
                <Button type="submit">Sign in and continue</Button>
                {message && <p className="rounded-[8px] bg-rose/10 p-3 text-sm font-semibold text-rose">{message}</p>}
              </form>

              <div className="my-5 flex items-center gap-3 text-xs font-bold uppercase tracking-[0.16em] text-charcoal/40">
                <span className="h-px flex-1 bg-champagne" />
                Or
                <span className="h-px flex-1 bg-champagne" />
              </div>

              <Button className="w-full" type="button" variant="secondary" onClick={handleGoogle}>
                Continue with Google
              </Button>

              <p className="mt-5 text-center text-sm">
                Don&apos;t have an account?{" "}
                <button type="button" className="font-semibold text-rose hover:underline" onClick={() => setIsSignIn(false)}>
                  Create account
                </button>
              </p>
            </>
          ) : (
            <>
              <form className="mt-6 grid gap-4" onSubmit={handleSubmit}>
                <input
                  required
                  name="name"
                  placeholder="Your name"
                  className="rounded-[8px] border border-champagne bg-white px-4 py-3 outline-none focus:ring-2 focus:ring-gold/30"
                />
                <input
                  required
                  name="email"
                  type="email"
                  placeholder="Email address"
                  className="rounded-[8px] border border-champagne bg-white px-4 py-3 outline-none focus:ring-2 focus:ring-gold/30"
                />
                <input
                  required
                  name="password"
                  type="password"
                  placeholder="Create password"
                  minLength={6}
                  className="rounded-[8px] border border-champagne bg-white px-4 py-3 outline-none focus:ring-2 focus:ring-gold/30"
                />
                <Button type="submit">Create account and continue</Button>
                {message && <p className="rounded-[8px] bg-rose/10 p-3 text-sm font-semibold text-rose">{message}</p>}
              </form>

              <div className="my-5 flex items-center gap-3 text-xs font-bold uppercase tracking-[0.16em] text-charcoal/40">
                <span className="h-px flex-1 bg-champagne" />
                Or
                <span className="h-px flex-1 bg-champagne" />
              </div>

              <Button className="w-full" type="button" variant="secondary" onClick={handleGoogle}>
                Continue with Google
              </Button>

              <p className="mt-5 text-center text-sm">
                Already have an account?{" "}
                <button type="button" className="font-semibold text-rose hover:underline" onClick={() => setIsSignIn(true)}>
                  Sign in
                </button>
              </p>
            </>
          )}

        </div>
      </div>
    );
  }

  return { account, isLoading, requireAccount, AccountGate };
}
