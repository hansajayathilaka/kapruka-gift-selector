import type { UIMessage } from "ai";
import type { SearchCriteria } from "./criteria";

const CONVERSATIONS_KEY = "kapri_conversations";
const PREFERENCES_KEY = "kapri_preferences";
const MAX_CONVERSATIONS = 25;

export interface StoredConversation {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messages: UIMessage[];
}

export interface UserPreferences {
  preferredCity?: string;
  recentOccasions: string[];
  recentRecipients: string[];
  recentProductTypes: string[];
}

const DEFAULT_PREFS: UserPreferences = {
  recentOccasions: [],
  recentRecipients: [],
  recentProductTypes: [],
};

function ok() {
  return typeof window !== "undefined";
}

export function loadConversations(): StoredConversation[] {
  if (!ok()) return [];
  try {
    const raw = localStorage.getItem(CONVERSATIONS_KEY);
    return raw ? (JSON.parse(raw) as StoredConversation[]) : [];
  } catch {
    return [];
  }
}

export function saveConversation(conv: StoredConversation): void {
  if (!ok()) return;
  try {
    const rest = loadConversations().filter((c) => c.id !== conv.id);
    localStorage.setItem(
      CONVERSATIONS_KEY,
      JSON.stringify([conv, ...rest].slice(0, MAX_CONVERSATIONS)),
    );
  } catch {}
}

export function clearAllConversations(): void {
  if (!ok()) return;
  try {
    localStorage.removeItem(CONVERSATIONS_KEY);
  } catch {}
}

export function loadPreferences(): UserPreferences {
  if (!ok()) return { ...DEFAULT_PREFS };
  try {
    const raw = localStorage.getItem(PREFERENCES_KEY);
    return raw ? { ...DEFAULT_PREFS, ...(JSON.parse(raw) as UserPreferences) } : { ...DEFAULT_PREFS };
  } catch {
    return { ...DEFAULT_PREFS };
  }
}

export function savePreferences(patch: Partial<UserPreferences>): void {
  if (!ok()) return;
  try {
    localStorage.setItem(
      PREFERENCES_KEY,
      JSON.stringify({ ...loadPreferences(), ...patch }),
    );
  } catch {}
}

export function mergePreferencesFromCriteria(
  prefs: UserPreferences,
  criteria: SearchCriteria,
): UserPreferences {
  const push = <T>(arr: T[], val: T | undefined, max = 5): T[] => {
    if (!val) return arr;
    return [val, ...arr.filter((v) => v !== val)].slice(0, max);
  };
  return {
    ...prefs,
    preferredCity: (criteria.deliveryCity as string | undefined) ?? prefs.preferredCity,
    recentOccasions: push(prefs.recentOccasions, criteria.occasion as string | undefined),
    recentRecipients: push(prefs.recentRecipients, criteria.recipient as string | undefined),
    recentProductTypes: push(prefs.recentProductTypes, criteria.productType as string | undefined),
  };
}

const DEFAULTS = [
  "Birthday cake to Colombo tomorrow under Rs.5000",
  "Anniversary flowers for my wife 💐",
  "A chocolate gift hamper for my boss",
  "මට අම්මට තෑග්ගක් ඕน",
];

export function generateSuggestions(prefs: UserPreferences): string[] {
  const p: string[] = [];
  const city = prefs.preferredCity;
  if (city && prefs.recentOccasions[0])
    p.push(`${prefs.recentOccasions[0]} gift delivered to ${city}`);
  if (prefs.recentProductTypes[0])
    p.push(`Find ${prefs.recentProductTypes[0]} gifts under Rs.3000`);
  if (city && p.length < 2)
    p.push(`What can I send to ${city} this weekend?`);
  return p.length ? [...p, ...DEFAULTS].slice(0, 4) : DEFAULTS;
}
