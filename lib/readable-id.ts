export function slugifyForId(value: string, fallback = "item") {
  return (
    value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48) || fallback
  );
}

export function readableId(name: string, fallback = "item") {
  const suffix = crypto.randomUUID().replace(/-/g, "").slice(0, 12);
  return `${slugifyForId(name, fallback)}-${suffix}`;
}
