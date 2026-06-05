import { dynamicTool, jsonSchema, type ToolSet } from "ai";
import type { KaprukaClient } from "./mcp";

// The Kapruka MCP wraps every tool's arguments in a single `params` object
// (e.g. `{ params: { q, category, ... } }`). Models — especially Gemini — tend
// to call such tools with flat arguments, which the server rejects with
// "params Field required". To fix this structurally, we expose each tool to the
// model with its *inner* (flat) schema and re-wrap the arguments into `{ params }`
// before forwarding to the real MCP tool.

interface JsonSchemaObject {
  $ref?: string;
  $defs?: Record<string, unknown>;
  properties?: Record<string, { $ref?: string }>;
  [key: string]: unknown;
}

/** Resolve the inner schema referenced by the tool's `params` property. */
function innerSchemaFor(inputSchema: JsonSchemaObject): JsonSchemaObject | null {
  const paramsProp = inputSchema?.properties?.params;
  if (!paramsProp) return null;
  const defs = inputSchema.$defs ?? {};
  let inner: JsonSchemaObject | undefined;
  if (paramsProp.$ref) {
    const name = paramsProp.$ref.replace("#/$defs/", "");
    inner = defs[name] as JsonSchemaObject | undefined;
  } else {
    inner = paramsProp as JsonSchemaObject;
  }
  if (!inner) return null;
  // Keep the original $defs so nested $refs (e.g. order cart/recipient) resolve.
  return { ...inner, ...(inputSchema.$defs ? { $defs: inputSchema.$defs } : {}) };
}

/**
 * Build a ToolSet of Kapruka MCP tools with flattened schemas. Falls back to the
 * raw wrapped tool for any tool whose schema we can't unwrap.
 */
export async function buildKaprukaTools(client: KaprukaClient): Promise<ToolSet> {
  const [defs, rawTools] = await Promise.all([client.listTools(), client.tools()]);
  const tools: ToolSet = {};

  for (const def of defs.tools) {
    const raw = rawTools[def.name];
    if (!raw) continue;

    const inner = innerSchemaFor(def.inputSchema as JsonSchemaObject);
    if (!inner) {
      // Unknown shape — pass through unchanged.
      tools[def.name] = raw;
      continue;
    }

    tools[def.name] = dynamicTool({
      description: def.description ?? "",
      inputSchema: jsonSchema(inner as Parameters<typeof jsonSchema>[0]),
      execute: async (args, options) =>
        // Re-wrap the flat args into the `{ params }` envelope the server expects.
        raw.execute?.({ params: args }, options),
    });
  }

  return tools;
}
