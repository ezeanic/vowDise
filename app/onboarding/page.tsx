"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";
import { LocationSearch } from "@/components/location-search";
import { Button, Section } from "@/components/ui";
import { buildBudget } from "@/lib/budget";
import {
  getStoredAccount,
  saveBudget,
  saveCoupleProfile,
} from "@/lib/account-service";
import type { LocationSelection } from "@/lib/location";

const steps = [
  {
    key: "location",
    label: "Wedding location",
    type: "text",
    placeholder: "San Jose, CA",
  },
  {
    key: "date",
    label: "Wedding date (optional)",
    type: "date",
    optional: true,
  },
  {
    key: "budget",
    label: "Total budget",
    type: "number",
    placeholder: "25000",
  },
  { key: "guests", label: "Guest count", type: "number", placeholder: "100" },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [values, setValues] = useState<Record<string, string>>({});
  const [account, setAccount] =
    useState<ReturnType<typeof getStoredAccount>>(null);
  const current = steps[step];

  useEffect(() => {
    const savedAccount = getStoredAccount();
    setAccount(savedAccount);
    if (!savedAccount) {
      router.push("/create-account");
    }
  }, [router]);

  if (!account) {
    return null;
  }

  function updateLocation(location: LocationSelection) {
    setValues({
      ...values,
      location: location.formattedLocation,
      formattedLocation: location.formattedLocation,
      city: location.city,
      state: location.state,
      locationCity: location.city,
      locationState: location.state,
      lat: location.lat?.toString() || "",
      lng: location.lng?.toString() || "",
    });
  }

  return (
    <main>
      <Section className="min-h-[calc(100vh-4rem)] content-center">
        <div className="mx-auto max-w-2xl rounded-[8px] border border-champagne/55 bg-white p-6 shadow-soft sm:p-8">
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-rose">
            Step {step + 1} of {steps.length}
          </p>
          <h1 className="mt-3 font-serif text-4xl font-semibold">
            Build your wedding plan
          </h1>
          <div className="mt-6 h-2 overflow-hidden rounded-full bg-champagne/30">
            <div
              className="h-full rounded-full bg-gold transition-all"
              style={{ width: `${((step + 1) / steps.length) * 100}%` }}
            />
          </div>
          <form
            className="mt-8"
            onSubmit={async (event) => {
              event.preventDefault();
              if (step < steps.length - 1) setStep(step + 1);
              else {
                await saveCoupleProfile(account.uid, values);
                const budgetValue = Number(values.budget || 0);
                if (budgetValue > 0) {
                  await saveBudget(account.uid, {
                    total: budgetValue,
                    items: buildBudget(budgetValue),
                  });
                }
                router.push("/budget");
              }
            }}
          >
            <label className="text-lg font-bold">{current.label}</label>
            {current.key === "location" ? (
              <div className="mt-3">
                <LocationSearch
                  autoFocus
                  required
                  value={values.formattedLocation || values.location || ""}
                  onChange={updateLocation}
                  placeholder="San Jose, CA"
                  inputClassName="w-full rounded-[8px] border border-champagne bg-ivory px-4 py-4 text-lg outline-none focus:ring-2 focus:ring-gold/30"
                />
              </div>
            ) : (
              <input
                autoFocus
                required={!current.optional}
                type={current.type}
                placeholder={current.placeholder}
                minLength={current.type === "password" ? 6 : undefined}
                value={values[current.key] || ""}
                onChange={(event) =>
                  setValues({ ...values, [current.key]: event.target.value })
                }
                className="mt-3 w-full rounded-[8px] border border-champagne bg-ivory px-4 py-4 text-lg outline-none focus:ring-2 focus:ring-gold/30"
              />
            )}
            <div className="mt-6 flex justify-between">
              <Button
                type="button"
                variant="ghost"
                disabled={step === 0}
                onClick={() => setStep(step - 1)}
              >
                Back
              </Button>
              <Button type="submit">
                {step === steps.length - 1 ? "Create Plan" : "Continue"}{" "}
                <ArrowRight size={18} />
              </Button>
            </div>
          </form>
        </div>
      </Section>
    </main>
  );
}
