"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Store } from "lucide-react";
import { Button, Section } from "@/components/ui";
import {
  addAccountCapability,
  createAccount,
  friendlyAuthError,
  saveVendorProfile,
  signInWithPassword,
  type AccountRecord,
} from "@/lib/account-service";
import { citiesForState, formatLocation, locationStates } from "@/lib/location";
import { venueSubcategories } from "@/lib/venue-subcategories";
import { categories } from "@/lib/vendors";

export default function VendorOnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [account, setAccount] = useState<AccountRecord | null>(null);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [values, setValues] = useState({
    businessName: "",
    category: "",
    venueSubcategory: "",
    location: "",
    locationState: "",
    locationCity: "",
    startingPrice: "",
    name: "",
    email: "",
    password: "",
  });

  const steps = useMemo(() => (account ? ["Business"] : ["Business", "Account"]), [account]);
  const cityOptions = citiesForState(values.locationState);

  useEffect(() => {
    const saved = localStorage.getItem("vowdiseAccount");
    if (!saved) return;
    try {
      const parsed = JSON.parse(saved) as Partial<AccountRecord> & { role?: "couple" | "vendor" };
      const account = {
        uid: parsed.uid || "local-couple",
        name: parsed.name || "Vowdise user",
        email: parsed.email || "",
        roles: parsed.roles || {
          couple: true,
          vendor: parsed.role === "vendor",
          admin: false,
        },
      };
      setAccount(account);
    } catch {
      localStorage.removeItem("vowdiseAccount");
    }
  }, [router]);

  function updateValue(key: keyof typeof values, value: string) {
    setValues({ ...values, [key]: value });
  }

  function updateLocation(nextValues: Partial<Pick<typeof values, "locationState" | "locationCity">>) {
    const nextState = nextValues.locationState ?? values.locationState;
    const nextCity = nextValues.locationCity ?? values.locationCity;
    setValues({
      ...values,
      ...nextValues,
      location: formatLocation(nextCity, nextState),
    });
  }

  async function saveProfileForAccount(uid: string, vendorId?: string) {
    return await saveVendorProfile(uid, {
      businessName: values.businessName,
      category: values.category,
      venueSubcategory: values.category === "Venues" ? values.venueSubcategory : "",
      location: values.location,
      locationState: values.locationState,
      locationCity: values.locationCity,
      startingPrice: values.startingPrice,
      description: "",
      availabilityStatus: "Available",
      serviceRadius: "",
      bookingLeadTime: "",
      availabilityNotes: "",
      images: [],
      blockedDates: [],
      pendingRequestDates: [],
    }, vendorId);
  }

  async function submit() {
    if (account) {
      const nextAccount = await addAccountCapability(account, "vendor");
      setAccount(nextAccount);
      await saveProfileForAccount(nextAccount.uid);
      router.push("/for-vendors");
      return;
    }

    const newAccount = await createAccount({
      name: values.name,
      email: values.email,
      password: values.password,
      capability: "vendor",
    });
    await saveProfileForAccount(newAccount.uid);
    router.push("/for-vendors");
  }

  const isVenueProfile = values.category === "Venues";

  return (
    <main>
      <Section className="min-h-[calc(100vh-4rem)] content-center">
        <div className="mx-auto max-w-2xl rounded-[8px] border border-champagne/55 bg-white p-6 shadow-soft sm:p-8">
          <span className="grid h-11 w-11 place-items-center rounded-full bg-charcoal text-white">
            <Store size={19} />
          </span>
          <p className="mt-5 text-sm font-bold uppercase tracking-[0.18em] text-rose">Add business · Step {step + 1} of {steps.length}</p>
          <h1 className="mt-3 font-serif text-4xl font-semibold">Create your business profile</h1>
          <p className="mt-3 text-charcoal/62">Start with the basics. You can add photos, availability, packages, and richer details from your vendor dashboard later.</p>
          <div className="mt-6 h-2 overflow-hidden rounded-full bg-champagne/30">
            <div className="h-full rounded-full bg-gold transition-all" style={{ width: `${((step + 1) / steps.length) * 100}%` }} />
          </div>

          <form
            className="mt-8"
            onSubmit={async (event) => {
              event.preventDefault();
              setError("");
              if (step < steps.length - 1) {
                setStep(step + 1);
                return;
              }
              try {
                setIsSubmitting(true);
                await submit();
              } catch (nextError) {
                setError(friendlyAuthError(nextError));
              } finally {
                setIsSubmitting(false);
              }
            }}
          >
            {step === 0 && (
              <div className="grid gap-4">
                <label className="grid gap-2">
                  <span className="font-bold">Business name</span>
                  <input required value={values.businessName} onChange={(event) => updateValue("businessName", event.target.value)} placeholder="Golden Hour Events" className="rounded-[8px] border border-champagne bg-ivory px-4 py-3 outline-none focus:ring-2 focus:ring-gold/30" />
                </label>
                <label className="grid gap-2">
                  <span className="font-bold">Category</span>
                  <select
                    required
                    value={values.category}
                    onChange={(event) => {
                      const nextCategory = event.target.value;
                      setValues((current) => ({
                        ...current,
                        category: nextCategory,
                        venueSubcategory: nextCategory === "Venues" ? current.venueSubcategory : "",
                      }));
                    }}
                    className="rounded-[8px] border border-champagne bg-ivory px-4 py-3 outline-none focus:ring-2 focus:ring-gold/30"
                  >
                    <option value="">Choose a category</option>
                    {categories.map((category) => (
                      <option key={category}>{category}</option>
                    ))}
                  </select>
                </label>
                {isVenueProfile && (
                  <label className="grid gap-2">
                    <span className="font-bold">Venue type</span>
                    <select required value={values.venueSubcategory} onChange={(event) => updateValue("venueSubcategory", event.target.value)} className="rounded-[8px] border border-champagne bg-ivory px-4 py-3 outline-none focus:ring-2 focus:ring-gold/30">
                      <option value="">Choose a venue type</option>
                      {venueSubcategories.map((subcategory) => (
                        <option key={subcategory}>{subcategory}</option>
                      ))}
                    </select>
                  </label>
                )}
                <label className="grid gap-2">
                  <span className="font-bold">Location</span>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <select
                      required
                      value={values.locationState}
                      onChange={(event) => updateLocation({ locationState: event.target.value, locationCity: "" })}
                      className="rounded-[8px] border border-champagne bg-ivory px-4 py-3 outline-none focus:ring-2 focus:ring-gold/30"
                    >
                      <option value="">State</option>
                      {locationStates.map((state) => <option key={state}>{state}</option>)}
                    </select>
                    <div>
                      <input
                        required
                        value={values.locationCity}
                        onChange={(event) => updateLocation({ locationCity: event.target.value })}
                        placeholder={values.locationState ? "Search city" : "Choose state first"}
                        list="vendor-onboarding-city-options"
                        disabled={!values.locationState}
                        className="w-full rounded-[8px] border border-champagne bg-ivory px-4 py-3 outline-none focus:ring-2 focus:ring-gold/30 disabled:cursor-not-allowed disabled:opacity-60"
                      />
                      <datalist id="vendor-onboarding-city-options">
                        {cityOptions.map((city) => <option key={city} value={city} />)}
                      </datalist>
                    </div>
                  </div>
                </label>
                <label className="grid gap-2">
                  <span className="font-bold">Starting price</span>
                  <input required type="number" value={values.startingPrice} onChange={(event) => updateValue("startingPrice", event.target.value)} placeholder="2500" className="rounded-[8px] border border-champagne bg-ivory px-4 py-3 outline-none focus:ring-2 focus:ring-gold/30" />
                </label>
              </div>
            )}

            {step === 1 && (
              <div className="grid gap-4">
                <label className="grid gap-2">
                  <span className="font-bold">Your name</span>
                  <input required value={values.name} onChange={(event) => updateValue("name", event.target.value)} placeholder="Taylor Lee" className="rounded-[8px] border border-champagne bg-ivory px-4 py-3 outline-none focus:ring-2 focus:ring-gold/30" />
                </label>
                <label className="grid gap-2">
                  <span className="font-bold">Business email</span>
                  <input required type="email" value={values.email} onChange={(event) => updateValue("email", event.target.value)} placeholder="hello@example.com" className="rounded-[8px] border border-champagne bg-ivory px-4 py-3 outline-none focus:ring-2 focus:ring-gold/30" />
                </label>
                <label className="grid gap-2">
                  <span className="font-bold">Create password</span>
                  <input required type="password" minLength={6} value={values.password} onChange={(event) => updateValue("password", event.target.value)} placeholder="At least 6 characters" className="rounded-[8px] border border-champagne bg-ivory px-4 py-3 outline-none focus:ring-2 focus:ring-gold/30" />
                </label>
              </div>
            )}

            <div className="mt-6 flex justify-between">
              <Button type="button" variant="ghost" disabled={step === 0} onClick={() => setStep(step - 1)}>Back</Button>
              <Button type="submit" disabled={isSubmitting}>
                {step === steps.length - 1 ? (isSubmitting ? "Saving..." : "Create Business Profile") : "Continue"} <ArrowRight size={18} />
              </Button>
            </div>
            {error && (
              <div className="mt-5 rounded-[8px] bg-rose/10 p-4 text-sm font-semibold text-rose">
                {error}
                {error.includes("already has an account") && (
                  <button
                    type="button"
                    className="mt-3 block rounded-full bg-charcoal px-4 py-2 text-white"
                    onClick={async () => {
                      try {
                        setIsSubmitting(true);
                        const existingAccount = await signInWithPassword({
                          name: values.name,
                          email: values.email,
                          password: values.password,
                          capability: "vendor",
                        });
                        await saveProfileForAccount(existingAccount.uid);
                        router.push("/for-vendors");
                      } catch (nextError) {
                        setError(friendlyAuthError(nextError));
                      } finally {
                        setIsSubmitting(false);
                      }
                    }}
                  >
                    Sign in and continue
                  </button>
                )}
              </div>
            )}
          </form>
        </div>
      </Section>
    </main>
  );
}
