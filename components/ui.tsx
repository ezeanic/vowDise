import { clsx } from "clsx";
import Link from "next/link";
import type {
  AnchorHTMLAttributes,
  ButtonHTMLAttributes,
  ReactNode,
} from "react";

export function Button({
  className,
  variant = "primary",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost";
}) {
  return (
    <button
      className={clsx(
        "inline-flex items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-semibold transition duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-gold/35 active:scale-[0.98]",
        variant === "primary" &&
          "bg-charcoal text-white shadow-soft hover:-translate-y-0.5 hover:bg-black",
        variant === "secondary" &&
          "bg-white text-charcoal ring-1 ring-champagne hover:-translate-y-0.5 hover:bg-ivory",
        variant === "ghost" && "text-charcoal hover:bg-white/70",
        className,
      )}
      {...props}
    />
  );
}

export function LinkButton({
  className,
  variant = "primary",
  ...props
}: AnchorHTMLAttributes<HTMLAnchorElement> & {
  href: string;
  variant?: "primary" | "secondary" | "ghost";
}) {
  return (
    <Link
      className={clsx(
        "inline-flex items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-semibold transition duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-gold/35 active:scale-[0.98]",
        variant === "primary" &&
          "bg-charcoal text-white shadow-soft hover:-translate-y-0.5 hover:bg-black",
        variant === "secondary" &&
          "bg-white text-charcoal ring-1 ring-champagne hover:-translate-y-0.5 hover:bg-ivory",
        variant === "ghost" && "text-charcoal hover:bg-white/70",
        className,
      )}
      {...props}
    />
  );
}

export function Section({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={clsx(
        "mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 lg:px-8",
        className,
      )}
    >
      {children}
    </section>
  );
}

export function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: string;
}) {
  return (
    <div className="rounded-[8px] border border-champagne/50 bg-white/75 p-5 shadow-sm transition duration-300 hover:-translate-y-0.5 hover:shadow-ring motion-safe:duration-500 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-charcoal/55">
        {label}
      </p>
      <p className={clsx("mt-2 text-2xl font-bold", tone || "text-charcoal")}>
        {value}
      </p>
    </div>
  );
}
