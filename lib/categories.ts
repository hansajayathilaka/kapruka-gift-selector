import type { KaprukaClient } from "./mcp";

// We can't predict Kapruka's catalog categories, and the model shouldn't guess
// them. So we pull the real top-level categories from the MCP and feed them into
// the system prompt, so the agent always filters searches by a valid category.

let cache: { names: string[]; at: number } | null = null;
const TTL_MS = 30 * 60 * 1000; // Kapruka caches reads ~30 min.

/** Parse top-level category names from the kapruka_list_categories markdown. */
function parseCategoryNames(md: string): string[] {
  const names: string[] = [];
  for (const line of md.split("\n")) {
    // Top-level entries look like: "- [Chocolates](https://...)"
    const m = line.match(/^-\s+\[([^\]]+)\]/);
    if (m) names.push(m[1].trim());
  }
  return names;
}

/** Fetch the list of valid top-level category names (cached). */
export async function getCategoryNames(client: KaprukaClient): Promise<string[]> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.names;
  try {
    const tools = await client.tools();
    const out = await tools.kapruka_list_categories?.execute?.(
      { params: { depth: 1 } },
      { toolCallId: "categories", messages: [] },
    );
    const text =
      (out as { structuredContent?: { result?: string } })?.structuredContent?.result ?? "";
    const names = parseCategoryNames(text);
    if (names.length > 0) cache = { names, at: Date.now() };
    return names;
  } catch {
    return cache?.names ?? [];
  }
}
