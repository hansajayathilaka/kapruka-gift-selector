import { createKaprukaClient } from "@/lib/mcp";
import { getCategoryNames } from "@/lib/categories";

export const maxDuration = 30;

/**
 * GET /api/categories — returns the valid Kapruka category names.
 * The client loads this once on startup so categories are known before any
 * category-filtered product search.
 */
export async function GET() {
  const client = await createKaprukaClient();
  try {
    const categories = await getCategoryNames(client);
    return Response.json(
      { categories },
      { headers: { "Cache-Control": "public, max-age=1800, s-maxage=1800" } },
    );
  } finally {
    await client.close().catch(() => {});
  }
}
