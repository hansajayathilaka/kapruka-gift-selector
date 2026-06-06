import { createKaprukaClient } from "@/lib/mcp";
import { extractProducts } from "@/lib/parse-products";

export const maxDuration = 30;

// Simple in-memory cache (id -> image url). Kapruka caches reads ~30 min, and
// warm serverless instances reuse this map, so repeat lookups are cheap.
const imageCache = new Map<string, string | null>();

/**
 * GET /api/product-image?ids=ID1,ID2
 * Returns { images: { [id]: imageUrl } }. Search results have no images, so the
 * UI calls this to enrich product cards with the image from kapruka_get_product.
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const ids = (searchParams.get("ids") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 12);

  if (ids.length === 0) {
    return Response.json({ images: {} });
  }

  const result: Record<string, string> = {};
  const missing = ids.filter((id) => !imageCache.has(id));

  if (missing.length > 0) {
    const client = await createKaprukaClient();
    try {
      const tools = await client.tools();
      await Promise.all(
        missing.map(async (id) => {
          try {
            const out = await tools.kapruka_get_product?.execute?.(
              { params: { product_id: id } },
              { toolCallId: id, messages: [] },
            );
            const [product] = extractProducts("kapruka_get_product", out);
            imageCache.set(id, product?.image ?? null);
          } catch {
            imageCache.set(id, null);
          }
        }),
      );
    } finally {
      await client.close().catch(() => {});
    }
  }

  for (const id of ids) {
    const img = imageCache.get(id);
    if (img) result[id] = img;
  }

  return Response.json(
    { images: result },
    { headers: { "Cache-Control": "public, max-age=1800, s-maxage=1800" } },
  );
}
