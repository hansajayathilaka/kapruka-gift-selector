// Search criteria are the heart of this app's differentiator: the agent's
// understanding of what the shopper wants is made explicit as removable "pills".
// The same object is also mapped to Kapruka MCP `kapruka_search_products` params.

export interface SearchCriteria {
  /** Free-text keywords the shopper mentioned (e.g. "red roses", "teddy bear"). */
  keywords?: string[];
  /** Kind of item: cake, flowers, gift_pack, chocolates, fruits, jewellery, etc. */
  productType?: string;
  /** Occasion: birthday, anniversary, wedding, new year, get well, etc. */
  occasion?: string;
  /** Who the gift is for: mother, friend, boss, kids... */
  recipient?: string;
  /** Delivery city/town in Sri Lanka (e.g. Colombo, Kandy, Galle). */
  deliveryCity?: string;
  /** Delivery date as ISO yyyy-mm-dd. */
  deliveryDate?: string;
  /** Minimum price in the active currency. */
  minPrice?: number;
  /** Maximum price (budget) in the active currency. */
  maxPrice?: number;
  /** Kapruka category slug if the shopper is browsing a category. */
  category?: string;
  /** Only show in-stock items. */
  inStockOnly?: boolean;
  /** Currency, defaults to LKR. */
  currency?: string;
}

export const EMPTY_CRITERIA: SearchCriteria = {};

/** Field-by-field merge; `null` explicitly clears a field, `undefined` leaves it. */
export function mergeCriteria(
  base: SearchCriteria,
  patch: Partial<Record<keyof SearchCriteria, unknown>>,
): SearchCriteria {
  const next: SearchCriteria = { ...base };
  for (const [key, value] of Object.entries(patch)) {
    const k = key as keyof SearchCriteria;
    if (value === null || value === "" ) {
      delete next[k];
    } else if (value !== undefined) {
      // @ts-expect-error - dynamic assignment across union of field types
      next[k] = value;
    }
  }
  return next;
}

/** Map criteria to Kapruka `kapruka_search_products` arguments. */
export function criteriaToSearchParams(c: SearchCriteria): Record<string, unknown> {
  const qParts = [
    ...(c.keywords ?? []),
    c.productType,
    c.occasion,
  ].filter(Boolean);

  const params: Record<string, unknown> = {
    currency: c.currency ?? "LKR",
  };
  const q = qParts.join(" ").trim();
  if (q) params.q = q;
  if (c.category) params.category = c.category;
  if (typeof c.minPrice === "number") params.min_price = c.minPrice;
  if (typeof c.maxPrice === "number") params.max_price = c.maxPrice;
  if (c.inStockOnly) params.in_stock_only = true;
  return params;
}

const TYPE_ICONS: Record<string, string> = {
  cake: "🎂",
  cakes: "🎂",
  flower: "💐",
  flowers: "💐",
  gift_pack: "🎁",
  "gift pack": "🎁",
  giftpack: "🎁",
  hamper: "🧺",
  chocolate: "🍫",
  chocolates: "🍫",
  fruit: "🍓",
  fruits: "🍓",
  jewellery: "💍",
  jewelry: "💍",
  toys: "🧸",
  toy: "🧸",
  electronics: "📱",
  watch: "⌚",
  perfume: "🌸",
};

export interface Pill {
  /** Stable id used for removal (maps back to a criteria field + optional value). */
  id: string;
  field: keyof SearchCriteria;
  /** For array fields (keywords) the specific value to remove. */
  value?: string;
  label: string;
  icon: string;
}

function money(c: SearchCriteria): string | null {
  const cur = c.currency ?? "Rs.";
  const sym = cur === "LKR" ? "Rs." : cur;
  const has = (v: unknown) => typeof v === "number";
  if (has(c.minPrice) && has(c.maxPrice)) return `${sym}${c.minPrice}–${c.maxPrice}`;
  if (has(c.maxPrice)) return `under ${sym}${c.maxPrice}`;
  if (has(c.minPrice)) return `over ${sym}${c.minPrice}`;
  return null;
}

function prettyDate(iso: string): string {
  const d = new Date(iso + (iso.length === 10 ? "T00:00:00" : ""));
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** Turn criteria into display pills, in a stable, readable order. */
export function criteriaToPills(c: SearchCriteria): Pill[] {
  const pills: Pill[] = [];

  if (c.productType) {
    const key = c.productType.toLowerCase();
    pills.push({
      id: "productType",
      field: "productType",
      label: cap(c.productType),
      icon: TYPE_ICONS[key] ?? "🛍️",
    });
  }
  if (c.occasion) {
    pills.push({ id: "occasion", field: "occasion", label: cap(c.occasion), icon: "🎉" });
  }
  if (c.recipient) {
    pills.push({ id: "recipient", field: "recipient", label: `For ${c.recipient}`, icon: "🎯" });
  }
  if (c.deliveryCity) {
    pills.push({ id: "deliveryCity", field: "deliveryCity", label: c.deliveryCity, icon: "📍" });
  }
  if (c.deliveryDate) {
    pills.push({
      id: "deliveryDate",
      field: "deliveryDate",
      label: prettyDate(c.deliveryDate),
      icon: "📅",
    });
  }
  const m = money(c);
  if (m) {
    pills.push({ id: "price", field: "maxPrice", label: m, icon: "💰" });
  }
  if (c.inStockOnly) {
    pills.push({ id: "inStockOnly", field: "inStockOnly", label: "In stock", icon: "✅" });
  }
  for (const kw of c.keywords ?? []) {
    pills.push({ id: `kw:${kw}`, field: "keywords", value: kw, label: kw, icon: "🔍" });
  }
  return pills;
}

/** Remove the criteria represented by a pill, returning a new object. */
export function removePill(c: SearchCriteria, pill: Pill): SearchCriteria {
  const next: SearchCriteria = { ...c };
  if (pill.field === "keywords" && pill.value) {
    next.keywords = (next.keywords ?? []).filter((k) => k !== pill.value);
    if (next.keywords.length === 0) delete next.keywords;
    return next;
  }
  if (pill.id === "price") {
    delete next.minPrice;
    delete next.maxPrice;
    return next;
  }
  delete next[pill.field];
  return next;
}

export function hasAnyCriteria(c: SearchCriteria): boolean {
  return criteriaToPills(c).length > 0;
}

/** Compact human summary used to keep the model in sync with current filters. */
export function criteriaSummary(c: SearchCriteria): string {
  const pills = criteriaToPills(c);
  if (pills.length === 0) return "none yet";
  return pills.map((p) => `${p.label}`).join(", ");
}
