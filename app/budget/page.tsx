import { BudgetEditor } from "@/components/budget-editor";
import { Section } from "@/components/ui";

export default function BudgetPage() {
  return (
    <main className="bg-ivory">
      <Section className="space-y-8">
        <div className="mx-auto max-w-6xl">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-rose">
            Wedding plan
          </p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight text-charcoal sm:text-5xl">
            Plan vendors around your budget
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-charcoal/70">
            Start with a realistic split, then add vendors directly inside each category so every decision stays tied to the plan.
          </p>
        </div>

        <BudgetEditor />
      </Section>
    </main>
  );
}
