"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, Sparkles } from "lucide-react";
import { useAccountGate } from "@/components/account-gate";
import { VendorCard } from "@/components/vendor-card";
import { Button, Section } from "@/components/ui";
import {
  generatePlan,
  type AiPlannerContext,
  type VendorMatch,
} from "@/lib/ai-planner";
import {
  getStoredAccount,
  loadBudget,
  type AccountRecord,
} from "@/lib/account-service";
import { getBookingsForAccount } from "@/lib/bookings";
import { money } from "@/lib/budget";
import { getMarketplaceVendorsWithRemote } from "@/lib/vendor-profile";

const examples = [
  "Romantic outdoor wedding in San Jose with 100 guests and a $20,000 budget.",
  "Modern city wedding for 80 people, $35,000 budget, amazing food and photography.",
  "Classic indoor wedding for 150 guests with $28,000 total and low-stress planning.",
];

const cardBase = "rounded-[28px] bg-white shadow-soft ring-1 ring-champagne/20";

const storageKey = "vowdiseAiPlannerState";
type AiPlan = ReturnType<typeof generatePlan>;

type StoredAiPlannerState = {
  prompt?: string;
  generatedPrompt?: string;
  plan?: AiPlan | null;
};

export default function AiPlannerPage() {
  const [prompt, setPrompt] = useState(examples[0]);
  const [generatedPrompt, setGeneratedPrompt] = useState("");
  const [plan, setPlan] = useState<AiPlan | null>(null);
  const [hasLoadedSavedState, setHasLoadedSavedState] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState("");
  const { isLoading, requireAccount, AccountGate } = useAccountGate();

  useEffect(() => {
    const saved = window.localStorage.getItem(storageKey);

    if (saved) {
      try {
        const parsed = JSON.parse(saved) as StoredAiPlannerState;
        if (typeof parsed.prompt === "string") setPrompt(parsed.prompt);
        if (typeof parsed.generatedPrompt === "string")
          setGeneratedPrompt(parsed.generatedPrompt);
        if (parsed.plan && Array.isArray(parsed.plan.vendorMatches))
          setPlan(parsed.plan);
      } catch {
        window.localStorage.removeItem(storageKey);
      }
    }

    setHasLoadedSavedState(true);
  }, []);

  useEffect(() => {
    if (!hasLoadedSavedState) return;

    window.localStorage.setItem(
      storageKey,
      JSON.stringify({
        prompt,
        generatedPrompt,
        plan,
      }),
    );
  }, [generatedPrompt, hasLoadedSavedState, plan, prompt]);

  function handleGenerate(nextPrompt = prompt) {
    setPrompt(nextPrompt);
  }

  function handleGeneratePlan() {
    requireAccount((account) => {
      void generateSmartPlan(account);
    }, "generate a wedding plan");
  }

  async function generateSmartPlan(account: AccountRecord) {
    setIsGenerating(true);
    setGenerationError("");

    try {
      const plannerContext = await loadPlannerContext(account);
      setPlan(generatePlan(prompt, plannerContext));
      setGeneratedPrompt(prompt);
    } catch (error) {
      console.error("Failed to generate AI planner context:", error);
      const fallbackAccount = getStoredAccount();
      const fallbackContext = fallbackAccount
        ? ({ profile: readStoredProfile() } satisfies AiPlannerContext)
        : {};
      setPlan(generatePlan(prompt, fallbackContext));
      setGeneratedPrompt(prompt);
      setGenerationError(
        "Generated with saved local details only. Some live vendor or booking data could not be loaded.",
      );
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <main className="bg-ivory">
      <Section className="space-y-12">
        {/* HERO */}
        <div className="mx-auto max-w-6xl">
          <div className={`${cardBase} overflow-hidden`}>
            <div className="grid gap-6 p-5 sm:p-8 lg:p-10 xl:grid-cols-[1.1fr_0.9fr] xl:items-center">
              <div className="min-w-0 space-y-5 sm:space-y-6">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-rose">
                  AI Wedding Planner
                </p>

                <h1 className="font-serif text-3xl font-semibold leading-tight text-charcoal sm:text-5xl lg:text-6xl">
                  Turn your wedding vision into curated vendor recommendations.
                </h1>

                <p className="max-w-xl text-base leading-7 text-charcoal/70">
                  Describe your celebration and instantly receive a structured
                  plan with budget breakdowns, priorities, and handpicked
                  vendors.
                </p>
              </div>

              <div className="w-full min-w-0 rounded-[18px] bg-charcoal p-5 text-white shadow-soft sm:rounded-[24px] sm:p-8">
                <div className="flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-white/70">
                  <Sparkles size={16} />
                  AI Preview
                </div>

                <div className="mt-6 space-y-5">
                  {plan ? (
                    <>
                      <div>
                        <p className="text-sm text-white/60">
                          Recommended budget
                        </p>
                        <p className="mt-2 text-3xl font-semibold sm:text-4xl">
                          {money(plan.totalBudget)}
                        </p>
                      </div>

                      <div className="grid gap-2 text-sm text-white/75 md:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
                        <div className="rounded-xl bg-white/10 p-4">
                          {plan.guests} guests
                        </div>
                        <div className="rounded-xl bg-white/10 p-4">
                          {plan.style} · {plan.location}
                        </div>
                      </div>
                    </>
                  ) : isLoading || isGenerating ? (
                    <p className="text-sm leading-6 text-white/60">
                      Loading...
                    </p>
                  ) : (
                    <p className="text-sm leading-6 text-white/60">
                      Generate a plan to see your wedding breakdown.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* INPUT SECTION */}
        <div className={`${cardBase} p-8`}>
          <div className="grid gap-8 lg:grid-cols-[1fr_0.9fr]">
            <div className="space-y-4">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-charcoal/60">
                Describe your celebration
              </p>

              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={6}
                className="w-full rounded-2xl border border-champagne/30 bg-white px-5 py-4 text-charcoal outline-none transition focus:border-rose focus:ring-2 focus:ring-rose/10"
                placeholder="Romantic outdoor wedding in San Jose..."
              />
            </div>

            <div className="space-y-4">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-sage">
                Quick prompts
              </p>

              <div className="space-y-3">
                {examples.map((example) => (
                  <button
                    key={example}
                    onClick={() => handleGenerate(example)}
                    className="w-full rounded-xl border border-champagne/30 bg-ivory px-4 py-3 text-left text-sm text-charcoal transition hover:border-rose hover:bg-white"
                  >
                    {example}
                  </button>
                ))}
              </div>

              <Button
                onClick={handleGeneratePlan}
                className="w-full"
                disabled={isGenerating}
              >
                {isGenerating ? "Generating..." : "Generate plan"}
              </Button>
              {generationError ? (
                <p className="rounded-[8px] bg-gold/10 p-3 text-sm font-semibold text-charcoal/70">
                  {generationError}
                </p>
              ) : null}
            </div>
          </div>
        </div>

        {/* RESULTS */}
        {plan && (
          <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
            {/* LEFT */}
            <div className="space-y-6">
              {/* Budget */}
              <div className={`${cardBase} p-8`}>
                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.28em] text-sage">
                      Budget summary
                    </p>
                    <h2 className="mt-3 text-4xl font-semibold text-charcoal">
                      {money(plan.totalBudget)}
                    </h2>
                  </div>

                  <div className="text-right text-sm text-charcoal/60">
                    <p>{plan.guests} guests</p>
                    <p>{plan.style}</p>
                  </div>
                </div>

                <div className="mt-8 grid gap-3 sm:grid-cols-2">
                  {plan.budget.slice(0, 4).map((item) => (
                    <div key={item.name} className="rounded-2xl bg-ivory p-5">
                      <p className="text-sm font-semibold text-charcoal">
                        {item.name}
                      </p>
                      <p className="mt-3 text-lg font-semibold text-charcoal">
                        {money(item.amount)}
                      </p>
                    </div>
                  ))}
                </div>

                <p className="mt-8 rounded-xl bg-charcoal/5 px-4 py-3 text-sm text-charcoal/70">
                  Generated from: &quot;{generatedPrompt || prompt}&quot;
                </p>
              </div>

              {/* alerts */}
              {plan.alerts.length > 0 && (
                <div className="rounded-[28px] border border-rose/20 bg-rose/10 p-8 text-rose">
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <AlertTriangle size={18} />
                    Budget alerts
                  </div>

                  <div className="mt-4 space-y-2 text-sm text-rose/80">
                    {plan.alerts.map((a) => (
                      <p key={a}>{a}</p>
                    ))}
                  </div>
                </div>
              )}

              {plan.tradeoffs.length > 0 && (
                <div className={`${cardBase} p-8`}>
                  <p className="text-xs uppercase tracking-[0.28em] text-sage">
                    Tradeoffs
                  </p>
                  <div className="mt-4 space-y-3 text-sm leading-6 text-charcoal/70">
                    {plan.tradeoffs.map((tradeoff) => (
                      <p key={tradeoff}>{tradeoff}</p>
                    ))}
                  </div>
                </div>
              )}

              {plan.followUps.length > 0 && (
                <div className={`${cardBase} p-8`}>
                  <p className="text-xs uppercase tracking-[0.28em] text-sage">
                    Smart follow-ups
                  </p>
                  <div className="mt-4 space-y-3 text-sm leading-6 text-charcoal/70">
                    {plan.followUps.map((question) => (
                      <p key={question}>{question}</p>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* RIGHT */}
            <div className={`${cardBase} p-8`}>
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.28em] text-sage">
                    Vendor matches
                  </p>
                  <h2 className="mt-3 text-3xl font-semibold text-charcoal">
                    Curated for your plan
                  </h2>
                </div>

                <span className="text-sm text-charcoal/60">
                  {plan.vendorMatches.length} vendors
                </span>
              </div>

              <div className="mt-6 grid gap-5 sm:grid-cols-2">
                {plan.vendorMatches.map((match) => (
                  <PlannerVendorMatch key={match.vendor.id} match={match} />
                ))}
              </div>
            </div>
          </div>
        )}
      </Section>

      <AccountGate />
    </main>
  );
}

async function loadPlannerContext(
  account: AccountRecord,
): Promise<AiPlannerContext> {
  const [budget, bookings, marketplaceVendors] = await Promise.all([
    loadBudget(account.uid),
    getBookingsForAccount(account.uid),
    getMarketplaceVendorsWithRemote(),
  ]);

  return {
    profile: readStoredProfile(),
    budget,
    bookings,
    vendors: marketplaceVendors,
  };
}

function readStoredProfile() {
  try {
    const saved = window.localStorage.getItem("weddingPlan");
    return saved ? (JSON.parse(saved) as Record<string, string>) : null;
  } catch {
    window.localStorage.removeItem("weddingPlan");
    return null;
  }
}

function PlannerVendorMatch({ match }: { match: VendorMatch }) {
  return (
    <div className="space-y-3">
      <div className="rounded-[8px] border border-champagne/45 bg-ivory p-3">
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-sage">
            {match.score}% match
          </p>
          <p className="text-xs font-semibold text-charcoal/55">
            {match.budgetTarget > 0
              ? `${money(match.budgetTarget)} target`
              : match.budgetCategory}
          </p>
        </div>
        <div className="mt-3 space-y-2">
          {match.reasons.map((reason) => (
            <p
              key={reason}
              className="flex min-w-0 items-start gap-2 text-xs leading-5 text-charcoal/70"
            >
              <CheckCircle2 className="mt-0.5 shrink-0 text-sage" size={14} />
              <span>{reason}</span>
            </p>
          ))}
        </div>
      </div>
      <VendorCard vendor={match.vendor} />
    </div>
  );
}
