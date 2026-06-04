import { experimental_createMCPClient as createMCPClient } from "@ai-sdk/mcp";

const KAPRUKA_MCP_URL = process.env.KAPRUKA_MCP_URL ?? "https://mcp.kapruka.com/mcp";

export type KaprukaClient = Awaited<ReturnType<typeof createMCPClient>>;

/**
 * Connect to the public Kapruka MCP server (Streamable HTTP, no auth).
 * A fresh client is created per request and closed after the response streams,
 * which keeps things simple and serverless-friendly.
 */
export async function createKaprukaClient(): Promise<KaprukaClient> {
  return createMCPClient({
    transport: {
      type: "http",
      url: KAPRUKA_MCP_URL,
    },
    clientName: "kapruka-gift-selector",
  });
}
