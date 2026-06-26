"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import {
  Calendar,
  Clock,
  AlertTriangle,
  CheckCircle,
  Info,
  ChevronRight,
} from "lucide-react";
import { Section } from "@/components/ui";
import {
  bookingTimeline,
  getTimelineForWeddingDate,
  getTimelineStatus,
} from "@/lib/timeline";

const priorityConfig = {
  critical: { color: "bg-rose text-white", label: "Critical" },
  high: { color: "bg-amber text-white", label: "High priority" },
  medium: { color: "bg-blue text-white", label: "Medium priority" },
  low: { color: "bg-sage text-white", label: "Plan ahead" },
};

const statusConfig = {
  overdue: {
    color: "bg-rose/10 text-rose border-rose/30",
    icon: AlertTriangle,
    label: "Overdue",
  },
  urgent: {
    color: "bg-amber/10 text-amber border-amber/30",
    icon: Clock,
    label: "Book now",
  },
  "on-track": {
    color: "bg-sage/10 text-sage border-sage/30",
    icon: CheckCircle,
    label: "On track",
  },
  upcoming: {
    color: "bg-blue/10 text-blue border-blue/30",
    icon: Info,
    label: "Upcoming",
  },
};

function TimelineManager() {
  const [weddingDate, setWeddingDate] = useState("");
  const [timeline, setTimeline] = useState(bookingTimeline);

  useEffect(() => {
    const saved = localStorage.getItem("vowdiseWeddingDate");
    if (saved) {
      setWeddingDate(saved);
      const date = new Date(saved);
      setTimeline(getTimelineForWeddingDate(date));
    }
  }, []);

  function handleDateChange(date: string) {
    setWeddingDate(date);
    localStorage.setItem("vowdiseWeddingDate", date);
    if (date) {
      setTimeline(getTimelineForWeddingDate(new Date(date)));
    } else {
      setTimeline(bookingTimeline);
    }
  }

  const monthsUntil = weddingDate
    ? Math.max(
        0,
        (new Date(weddingDate).getTime() - new Date().getTime()) /
          (1000 * 60 * 60 * 24 * 30),
      )
    : 0;

  const sortedTimeline = useMemo(() => {
    return weddingDate
      ? timeline.sort((a, b) => {
          const statusA = getTimelineStatus(monthsUntil, a.monthsBefore);
          const statusB = getTimelineStatus(monthsUntil, b.monthsBefore);
          const priorityOrder = {
            overdue: 0,
            urgent: 1,
            "on-track": 2,
            upcoming: 3,
          };
          return priorityOrder[statusA] - priorityOrder[statusB];
        })
      : bookingTimeline.sort((a, b) => b.monthsBefore - a.monthsBefore);
  }, [timeline, weddingDate, monthsUntil]);

  return (
    <main className="min-h-screen bg-[#fbf7ef] text-charcoal">
      <Section className="space-y-8 pb-20 pt-8 sm:pt-10">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-rose">
            Booking timeline
          </p>
          <h1 className="mt-2 font-serif text-5xl font-semibold">
            Know when to book what
          </h1>
          <p className="text-charcoal/68 mt-4">
            A timeline of when to book each vendor type to stay on track and
            avoid stress.
          </p>
        </div>

        {/* Wedding Date Input */}
        <div className="rounded-xl border border-champagne/30 bg-white p-6 shadow-sm">
          <label className="block text-sm font-semibold text-charcoal/75">
            Your wedding date
          </label>
          <div className="mt-3 flex gap-4">
            <input
              type="date"
              value={weddingDate}
              onChange={(e) => handleDateChange(e.target.value)}
              className="rounded-lg border border-champagne/30 bg-white px-4 py-3 outline-none focus:border-gold/50 focus:ring-2 focus:ring-gold/20"
            />
            {weddingDate && (
              <div className="flex items-center gap-2 text-sm text-charcoal/60">
                <Calendar size={16} />
                <span>{monthsUntil.toFixed(0)} months away</span>
              </div>
            )}
          </div>
        </div>

        {/* Timeline Items */}
        <div className="space-y-4">
          {sortedTimeline.map((item) => {
            const priority = priorityConfig[item.priority];
            const status = weddingDate
              ? statusConfig[getTimelineStatus(monthsUntil, item.monthsBefore)]
              : null;

            return (
              <div
                key={item.category}
                className="rounded-xl border border-champagne/30 bg-white p-6 shadow-sm"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-3">
                      <h3 className="font-semibold text-charcoal">
                        {item.category}
                      </h3>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${priority.color}`}
                      >
                        {priority.label}
                      </span>
                      {status && (
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${status.color}`}
                        >
                          <status.icon size={14} />
                          {status.label}
                        </span>
                      )}
                    </div>
                    <p className="mt-2 text-sm text-charcoal/70">
                      {item.description}
                    </p>
                    <div className="mt-3 flex items-center gap-2 text-sm text-charcoal/60">
                      <Clock size={14} />
                      <span>
                        Book {item.monthsBefore} months before wedding
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-charcoal/40">
                    <ChevronRight size={20} />
                  </div>
                </div>

                {/* Tips */}
                <div className="mt-4 rounded-lg bg-ivory p-4">
                  <p className="text-sm font-semibold text-charcoal/70">
                    Pro tips:
                  </p>
                  <ul className="mt-2 space-y-1">
                    {item.tips.map((tip, index) => (
                      <li
                        key={index}
                        className="flex items-start gap-2 text-sm text-charcoal/60"
                      >
                        <span className="mt-1.5 h-1 w-1 rounded-full bg-charcoal/40" />
                        {tip}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            );
          })}
        </div>

        {!weddingDate && (
          <div className="rounded-xl border border-champagne/30 bg-white p-8 text-center">
            <Calendar size={48} className="mx-auto text-charcoal/20" />
            <p className="mt-4 font-semibold text-charcoal">
              Set your wedding date
            </p>
            <p className="mt-2 text-charcoal/60">
              Enter your wedding date above to see personalized booking
              deadlines.
            </p>
          </div>
        )}
      </Section>
    </main>
  );
}

export default function TimelinePage() {
  return (
    <Suspense>
      <TimelineManager />
    </Suspense>
  );
}
