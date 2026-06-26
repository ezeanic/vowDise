"use client";

import { Quote } from "lucide-react";

const testimonials = [
  {
    quote:
      "We came in with a number scribbled in Notes and a dozen vendor tabs open. Vowdise helped us see what was realistic in one night, and our first venue calls were so much calmer.",
    couple: "Maya & Jordan",
    location: "San Jose, CA",
  },
  {
    quote:
      "The best part was not feeling judged for changing our minds. We adjusted the guest count, saw the budget shift, and made a version of the wedding that still felt like us.",
    couple: "Priya & Daniel",
    location: "Fremont, CA",
  },
  {
    quote:
      "Vendor comparison finally felt human. Instead of guessing from pretty photos, we could compare price, vibe, location, and reviews before sending messages.",
    couple: "Elena & Marcus",
    location: "Oakland, CA",
  },
  {
    quote:
      "We were both avoiding the budget conversation because it always turned tense. Vowdise gave us a shared plan, so it stopped feeling like one person was the bad cop.",
    couple: "Nia & Avery",
    location: "Santa Clara, CA",
  },
  {
    quote:
      "The warnings were honestly what saved us. We could see the overspend coming before signing anything, then move money from florals to food without a spiral.",
    couple: "Sofia & Cam",
    location: "Palo Alto, CA",
  },
];

const loopedTestimonials = [...testimonials, ...testimonials];

export function CoupleTestimonials() {
  return (
    <section className="overflow-hidden bg-white py-10">
      <style jsx>{`
        @keyframes testimonial-belt {
          from {
            transform: translateX(0);
          }
          to {
            transform: translateX(-50%);
          }
        }

        .testimonial-belt {
          animation: testimonial-belt 35s linear infinite;
        }

        .testimonial-belt:hover {
          animation-play-state: paused;
        }
      `}</style>

      <div className="w-full">
        <div className="px-4 pb-2 sm:px-6 lg:px-8">
          <h2 className="font-serif text-3xl font-semibold text-charcoal sm:text-4xl">
            What Vowdise couples are saying
          </h2>
        </div>

        <div className="relative overflow-hidden">
          <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-14 bg-gradient-to-r from-white to-transparent sm:w-24 lg:w-32" />
          <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-14 bg-gradient-to-l from-white to-transparent sm:w-24 lg:w-32" />

          <div className="testimonial-belt flex w-max gap-4 px-4 py-4 sm:gap-5 sm:px-6 lg:px-8">
            {loopedTestimonials.map((testimonial, index) => (
              <article
                key={`${testimonial.couple}-${index}`}
                className="w-[92vw] shrink-0 rounded-[8px] border border-champagne/55 bg-ivory/90 p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-soft sm:w-[62vw] sm:p-5 lg:w-[42vw] xl:w-[34vw]"
              >
                <div className="flex min-h-[10.5rem] flex-col justify-between">
                  <div>
                    <span className="grid h-7 w-7 place-items-center rounded-full bg-charcoal text-white">
                      <Quote size={14} />
                    </span>

                    <blockquote className="mt-3 font-serif text-lg font-semibold leading-snug text-charcoal sm:text-xl">
                      &quot;{testimonial.quote}&quot;
                    </blockquote>
                  </div>

                  <div className="mt-4 flex items-end justify-between gap-4 border-t border-champagne/65 pt-3">
                    <div>
                      <p className="font-bold">{testimonial.couple}</p>
                      <p className="text-charcoal/58 mt-1 text-sm">
                        {testimonial.location}
                      </p>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
