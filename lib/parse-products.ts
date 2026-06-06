// Kapruka MCP tools return human-readable markdown (in `structuredContent.result`
// or `content[].text`). We parse that markdown into structured Product objects so
// the UI can render rich product cards/carousels — search results have no images,
// but `kapruka_get_product` includes an Image URL, so we merge details by id.

export interface Product {
  id: string;
  name: string;
  price?: string; // formatted, e.g. "LKR 3,500"
  stock?: string;
  url?: string;
  image?: string;
  category?: string;
  vendor?: string;
  description?: string;
}

/** Pull the markdown text out of an MCP tool output, whatever the shape. */
export function toolOutputText(output: unknown): string {
  if (!output) return "";
  if (typeof output === "string") return output;
  const o = output as {
    structuredContent?: { result?: unknown };
    content?: Array<{ type?: string; text?: string }>;
  };
  if (o.structuredContent && typeof o.structuredContent.result === "string") {
    return o.structuredContent.result;
  }
  if (Array.isArray(o.content)) {
    return o.content
      .filter((c) => c?.type === "text" && typeof c.text === "string")
      .map((c) => c.text as string)
      .join("\n");
  }
  return "";
}

/** Parse the multi-item search listing format. */
function parseSearchListing(md: string): Product[] {
  const products: Product[] = [];
  // Split into blocks that each start with "**<n>. <name>**"
  const blocks = md.split(/\n(?=\*\*\d+\.\s)/g);
  for (const block of blocks) {
    const nameMatch = block.match(/\*\*\d+\.\s+(.+?)\*\*/);
    const idMatch = block.match(/ID:\s*`([^`]+)`/i);
    if (!nameMatch || !idMatch) continue;
    const priceMatch = block.match(/(LKR|USD|Rs\.?)\s*[\d.,]+/i);
    const urlMatch = block.match(/\[View product\]\(([^)]+)\)/i);
    // Stock sits between price and the next "·" separator.
    const stockMatch = block.match(/·\s*((?:In stock|Out of stock|Low stock)[^·\n]*)/i);
    products.push({
      id: idMatch[1].trim(),
      name: nameMatch[1].trim(),
      price: priceMatch?.[0].trim(),
      stock: stockMatch?.[1].trim(),
      url: urlMatch?.[1].trim(),
    });
  }
  return products;
}

/** Parse the single-product detail format from kapruka_get_product. */
function parseProductDetail(md: string): Product[] {
  const nameMatch = md.match(/^##\s+(.+)$/m);
  const idMatch = md.match(/\*\*ID\*\*:\s*`([^`]+)`/i);
  if (!nameMatch || !idMatch) return [];
  const field = (label: string) =>
    md.match(new RegExp(`\\*\\*${label}\\*\\*:\\s*(.+)`, "i"))?.[1]?.trim();
  const image = md.match(/\*\*Image\*\*:\s*(\S+)/i)?.[1]?.trim();
  const url = md.match(/\[View on Kapruka\]\(([^)]+)\)/i)?.[1]?.trim();
  // Description: first non-bold, non-heading paragraph.
  const description = md
    .split("\n")
    .find(
      (l) =>
        l.trim().length > 40 &&
        !l.startsWith("#") &&
        !l.startsWith("**") &&
        !l.startsWith("["),
    )
    ?.trim();
  return [
    {
      id: idMatch[1].trim(),
      name: nameMatch[1].trim(),
      price: field("Price"),
      stock: field("Stock"),
      category: field("Category"),
      vendor: field("Vendor"),
      image,
      url,
      description,
    },
  ];
}

/** Extract products from a single MCP tool result, by tool name. */
export function extractProducts(toolName: string, output: unknown): Product[] {
  const md = toolOutputText(output);
  if (!md) return [];
  if (toolName === "kapruka_get_product") return parseProductDetail(md);
  if (toolName === "kapruka_search_products") return parseSearchListing(md);
  return [];
}

/** Merge two product records, preferring richer (image/description) fields. */
export function mergeProduct(a: Product, b: Product): Product {
  return {
    ...a,
    ...b,
    image: b.image ?? a.image,
    description: b.description ?? a.description,
    price: b.price ?? a.price,
    stock: b.stock ?? a.stock,
    category: b.category ?? a.category,
    vendor: b.vendor ?? a.vendor,
    url: b.url ?? a.url,
  };
}

export function stockTone(stock?: string): "in" | "low" | "out" | "unknown" {
  if (!stock) return "unknown";
  const s = stock.toLowerCase();
  if (s.includes("out")) return "out";
  if (s.includes("low")) return "low";
  if (s.includes("in stock")) return "in";
  return "unknown";
}
