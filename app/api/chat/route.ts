import { google } from "@ai-sdk/google";
import {
  convertToModelMessages,
  stepCountIs,
  streamText,
  tool,
  type UIMessage,
} from "ai";
import { z } from "zod";
import { createKaprukaClient } from "@/lib/mcp";
import { buildKaprukaTools } from "@/lib/kapruka-tools";
import { buildSystemPrompt } from "@/lib/persona";
import type { SearchCriteria } from "@/lib/criteria";

export const maxDuration = 60;

const MODEL = process.env.GEMINI_MODEL ?? "gemini-2.5-flash";

// Tool the model uses to keep the on-screen criteria pills in sync. The client
// reads these tool calls from the message stream and updates the pill state.
// Pass an empty string to clear a field.
const updateCriteria = tool({
  description:
    "Record or update what the shopper is looking for so it shows as criteria pills. " +
    "Call this whenever you learn a product type, occasion, recipient, budget, " +
    "delivery city or date. Pass an empty string for a field to clear it.",
  inputSchema: z.object({
    keywords: z.array(z.string()).optional().describe("Specific keywords mentioned"),
    productType: z
      .string()
      .optional()
      .describe("cake, flowers, gift_pack, chocolates, fruits, jewellery, toys, etc."),
    occasion: z.string().optional().describe("birthday, anniversary, wedding, new year..."),
    recipient: z.string().optional().describe("mother, friend, boss, kids..."),
    deliveryCity: z.string().optional().describe("Delivery city/town in Sri Lanka"),
    deliveryDate: z.string().optional().describe("Delivery date as ISO yyyy-mm-dd"),
    minPrice: z.number().optional(),
    maxPrice: z.number().optional().describe("Budget / max price in LKR"),
    inStockOnly: z.boolean().optional(),
  }),
  // Echo the patch so the step completes; the UI does the actual state merge.
  execute: async (patch) => ({ ok: true, applied: patch }),
});

export async function POST(req: Request) {
  const {
    messages,
    criteria,
  }: { messages: UIMessage[]; criteria?: SearchCriteria } = await req.json();

  const mcpClient = await createKaprukaClient();

  try {
    const kaprukaTools = await buildKaprukaTools(mcpClient);

    const result = streamText({
      model: google(MODEL),
      system: buildSystemPrompt(
        criteria ?? {},
        // Surface server-provided usage instructions to the model when present.
        (mcpClient as { instructions?: string }).instructions,
      ),
      messages: await convertToModelMessages(messages),
      tools: {
        ...kaprukaTools,
        update_criteria: updateCriteria,
      },
      stopWhen: stepCountIs(10),
      onFinish: async () => {
        await mcpClient.close().catch(() => {});
      },
      onError: async () => {
        await mcpClient.close().catch(() => {});
      },
    });

    return result.toUIMessageStreamResponse();
  } catch (err) {
    await mcpClient.close().catch(() => {});
    throw err;
  }
}
