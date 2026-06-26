import { ArrowRight, Sparkles } from "lucide-react";
import Image from "next/image";
import { CoupleTestimonials } from "@/components/couple-testimonials";
import { LinkButton, Section } from "@/components/ui";
import { categories, vendors } from "@/lib/vendors";
import { money } from "@/lib/budget";

export default function Home() {
  return (
    <main>
      <section className="relative overflow-hidden">
        <div className="absolute inset-0">
          <Image
            src="https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1800&q=80"
            alt="Elegant outdoor wedding table"
            fill
            priority
            sizes="100vw"
            className="object-cover"
          />
          <div className="via-ivory/82 absolute inset-0 bg-gradient-to-r from-ivory to-ivory/30" />
        </div>
        <div className="relative mx-auto grid min-h-[calc(100vh-4rem)] max-w-7xl content-center px-4 py-16 sm:px-6 lg:px-8">
          <div className="max-w-3xl fade-in">
            <h1 className="font-serif text-5xl font-semibold leading-[0.95] sm:text-7xl">
              Plan your dream wedding
            </h1>
            <p className="text-charcoal/72 mt-6 max-w-2xl text-lg leading-8">
              Vowdise helps you turn one total budget into a realistic plan,
              compare vendors fast, and catch overspending before it becomes
              stressful.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <LinkButton href="/budget">
                Start Planning <ArrowRight size={18} />
              </LinkButton>
              <LinkButton href="/vendors" variant="secondary">
                Explore Vendors
              </LinkButton>
            </div>
          </div>
        </div>
      </section>

      <Section className="pt-16">
        <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-rose">
              Vendor discovery
            </p>
            <h2 className="mt-2 font-serif text-4xl font-semibold">
              Browse trusted vendors by category
            </h2>
            <p className="mt-3 max-w-2xl text-charcoal/65">
              Start with the services couples book first, then compare realistic
              pricing, ratings, location, and budget fit.
            </p>
          </div>
          <LinkButton href="/vendors" variant="secondary">
            Browse marketplace
          </LinkButton>
        </div>
        <div className="relative -mx-4 overflow-hidden px-4 pb-5">
          <div className="pointer-events-none absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-white to-transparent" />
          <div className="pointer-events-none absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-white to-transparent" />
          <div className="scrollbar-hidden overflow-x-auto">
            <div className="flex w-max gap-4">
              {categories.map((category) => {
                const sample =
                  vendors.find((vendor) => vendor.category === category) ??
                  vendors[0];

                return (
                  <a
                    key={category}
                    href={`/vendors?category=${encodeURIComponent(category)}`}
                    className="group w-[19rem] overflow-hidden rounded-[12px] border border-champagne/50 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-soft sm:w-[22rem]"
                  >
                    <div className="relative h-48 overflow-hidden bg-blush/30">
                      <Image
                        src={sample.image}
                        alt={category}
                        fill
                        sizes="352px"
                        className="object-cover transition duration-500 group-hover:scale-105"
                      />
                      <div className="from-charcoal/78 via-charcoal/12 absolute inset-0 bg-gradient-to-t to-transparent" />
                      <div className="absolute bottom-0 left-0 right-0 p-5">
                        <h3 className="font-serif text-3xl font-semibold leading-none text-white">
                          {category}
                        </h3>
                      </div>
                    </div>
                    <div className="p-5">
                      <p className="text-xs font-bold uppercase tracking-[0.16em] text-rose">
                        Featured vendor
                      </p>
                      <p className="mt-2 text-lg font-bold">{sample.name}</p>
                      <p className="text-charcoal/62 mt-2 text-sm">
                        {sample.location} · From {money(sample.startingPrice)}
                      </p>
                      <div className="mt-4 flex items-center justify-between text-sm">
                        <span className="font-semibold text-charcoal/75">
                          {sample.rating} rating · {sample.reviewCount} reviews
                        </span>
                        <span className="rounded-full bg-sage/10 px-3 py-1 font-bold text-sage">
                          {sample.budgetFit}
                        </span>
                      </div>
                    </div>
                  </a>
                );
              })}
            </div>
          </div>
        </div>
      </Section>

      <Section className="grid gap-6 pt-0 lg:grid-cols-[0.85fr_1.15fr] lg:items-center">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-rose">
            AI-style guidance
          </p>
          <h2 className="mt-2 font-serif text-4xl font-semibold">
            Describe the wedding. Get a practical plan.
          </h2>
          <p className="text-charcoal/68 mt-4">
            The mock planner uses rules and sample data now, with a clean
            boundary for a real AI API later.
          </p>
          <LinkButton href="/ai-planner" className="mt-6">
            Try AI Planner <Sparkles size={18} />
          </LinkButton>
        </div>
        <div className="rounded-[12px] border border-champagne/50 bg-charcoal p-6 text-white shadow-soft">
          <p className="text-white/65">Sample match</p>
          <h3 className="mt-2 text-2xl font-bold">
            Romantic outdoor San Jose wedding
          </h3>
          <div className="mt-5 grid gap-3">
            {vendors.slice(0, 3).map((vendor) => (
              <div
                key={vendor.id}
                className="bg-white/8 flex items-center justify-between rounded-[8px] p-3"
              >
                <span>{vendor.name}</span>
                <span className="text-champagne">
                  {money(vendor.startingPrice)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </Section>

      <CoupleTestimonials />

      <Section className="bg-charcoal py-32 text-white">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid gap-20 lg:grid-cols-[1.4fr_0.8fr]">
            {/* Left */}
            <div>
              <p className="mb-6 text-xs uppercase tracking-[0.35em] text-rose/70">
                Contact
              </p>

              <h2 className="font-serif text-5xl leading-[0.95] sm:text-7xl">
                We&apos;d love to hear
                <br />
                from you.
              </h2>

              <p className="mt-8 max-w-lg text-lg leading-relaxed text-white/60">
                Whether you&apos;re planning your wedding, exploring venues, or
                looking for inspiration, we&apos;re here to help bring your
                vision to life.
              </p>
            </div>

            {/* Right */}
            <div className="flex flex-col justify-center space-y-12">
              <div>
                <p className="mb-2 text-xs uppercase tracking-[0.25em] text-white/40">
                  Instagram
                </p>

                <a
                  href="https://instagram.com/vowdise"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-2xl transition-colors hover:text-rose"
                >
                  @vowdise
                </a>
              </div>

              <div>
                <p className="mb-2 text-xs uppercase tracking-[0.25em] text-white/40">
                  Email
                </p>

                <a
                  href="mailto:vowdise@gmail.com"
                  className="text-2xl transition-colors hover:text-rose"
                >
                  vowdise@gmail.com
                </a>
              </div>

              <div>
                <p className="mb-2 text-xs uppercase tracking-[0.25em] text-white/40">
                  Phone
                </p>

                <a
                  href="tel:+14083867386"
                  className="text-2xl transition-colors hover:text-rose"
                >
                  (408) 386-7386
                </a>
              </div>
            </div>
          </div>
        </div>
      </Section>
    </main>
  );
}
