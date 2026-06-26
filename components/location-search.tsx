"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Search } from "lucide-react";
import {
  locationSelectionFromText,
  searchLocations,
  type LocationSelection,
} from "@/lib/location";

type LocationSearchProps = {
  value: string;
  onChange: (location: LocationSelection) => void;
  placeholder?: string;
  required?: boolean;
  autoFocus?: boolean;
  inputClassName?: string;
};

export function LocationSearch({
  value,
  onChange,
  placeholder = "Search city",
  required,
  autoFocus,
  inputClassName = "w-full rounded-[8px] border border-champagne bg-ivory px-4 py-3 outline-none focus:ring-2 focus:ring-gold/30",
}: LocationSearchProps) {
  const listId = useId();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [query, setQuery] = useState(value);
  const [suggestions, setSuggestions] = useState<LocationSelection[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    setQuery(value);
  }, [value]);

  useEffect(() => {
    if (!isOpen) return;
    const controller = new AbortController();
    const timeout = window.setTimeout(() => {
      void searchLocations(query, controller.signal)
        .then(setSuggestions)
        .catch((error) => {
          if (error instanceof DOMException && error.name === "AbortError")
            return;
          setSuggestions([]);
        });
    }, 180);

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [isOpen, query]);

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node))
        setIsOpen(false);
    }

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, []);

  const visibleSuggestions = useMemo(
    () => suggestions.slice(0, 6),
    [suggestions],
  );

  function chooseLocation(location: LocationSelection) {
    setQuery(location.formattedLocation);
    onChange(location);
    setIsOpen(false);
  }

  return (
    <div ref={containerRef} className="relative">
      <Search
        className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-charcoal/40"
        size={17}
      />
      <input
        autoFocus={autoFocus}
        required={required}
        value={query}
        onChange={(event) => {
          const nextValue = event.target.value;
          setQuery(nextValue);
          setIsOpen(true);
          onChange(locationSelectionFromText(nextValue));
        }}
        onFocus={() => setIsOpen(true)}
        onBlur={() => {
          if (query.trim()) onChange(locationSelectionFromText(query));
        }}
        placeholder={placeholder}
        aria-autocomplete="list"
        aria-controls={listId}
        className={`${inputClassName} pl-11`}
      />
      {isOpen && visibleSuggestions.length > 0 && (
        <div
          id={listId}
          role="listbox"
          className="absolute left-0 right-0 top-[calc(100%+0.35rem)] z-30 overflow-hidden rounded-[8px] border border-champagne/70 bg-white py-1 shadow-[0_18px_55px_-35px_rgba(45,42,39,0.55)]"
        >
          {visibleSuggestions.map((location) => (
            <button
              key={`${location.formattedLocation}-${location.lat ?? "text"}-${location.lng ?? "text"}`}
              type="button"
              role="option"
              aria-selected={false}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => chooseLocation(location)}
              className="block w-full px-4 py-3 text-left text-sm font-semibold text-charcoal transition hover:bg-ivory"
            >
              {location.formattedLocation}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
