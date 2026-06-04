# 🎁 Kapri — Kapruka Gift Concierge

An AI gift-shopping agent for the **Kapruka Agent Challenge**. Chat (or talk) with
**Kapri** to find the perfect gift and have it delivered anywhere in Sri Lanka —
discovery → delivery quote → checkout, end to end.

Built on the free **[Kapruka MCP server](https://mcp.kapruka.com/)**.

## ✨ What makes it different

As you chat, Kapri turns your intent into **explicit, removable "criteria pills"**
— e.g. `🎂 Cake`, `📍 Colombo`, `📅 20 Jun 2026`, `💰 under Rs.5000`. The pills are
the live search criteria sent to the Kapruka MCP, so the agent's "memory" is always
visible and editable. Remove a pill and the search re-runs instantly.

Other highlights:

- **Full-screen chat** with a personality-driven concierge (English / Sinhala / Tanglish).
- **Rich product cards & carousels** parsed from live Kapruka results (with images).
- **Voice in & out** via the browser's Web Speech API (no API keys, free).
- **Multi-item cart + guest checkout** with gift messages → click-to-pay link.
- **Delivery quotes** with perishable warnings for cakes & flowers.

## 🧱 Tech stack

| Layer | Choice |
| --- | --- |
| Framework | Next.js 16 (App Router) + React 19 + TypeScript |
| Styling | Tailwind CSS 4 + shadcn/ui (Base UI primitives) |
| Agent | Vercel AI SDK 6 (`ai`, `@ai-sdk/react`) |
| MCP | `@ai-sdk/mcp` → `https://mcp.kapruka.com/mcp` (Streamable HTTP, no auth) |
| Model | Google **Gemini Flash** (`@ai-sdk/google`) |
| Voice | Web Speech API (`SpeechRecognition` + `speechSynthesis`) |
| Hosting | Vercel |

## 🚀 Getting started

```bash
pnpm install
cp .env.local.example .env.local   # then add your Gemini key
pnpm dev                           # http://localhost:3000
```

Get a free Gemini API key from [Google AI Studio](https://aistudio.google.com/apikey)
and set it in `.env.local`:

```
GOOGLE_GENERATIVE_AI_API_KEY=your_key_here
```

### Deploy to Vercel

1. Push this repo to GitHub and import it on [Vercel](https://vercel.com/new).
2. Add the `GOOGLE_GENERATIVE_AI_API_KEY` environment variable.
3. Deploy — you get a public URL that "just works".

## 🗂️ Project layout

```
app/
  api/chat/route.ts     # Gemini + Kapruka MCP wiring, criteria tool, streaming
  page.tsx              # full-screen chat UI, pills, cart, voice
components/
  criteria-bar.tsx      # the differentiator: removable criteria pills
  product-card.tsx      # rich product card
  product-carousel.tsx  # horizontal product strip
  cart-sheet.tsx        # multi-item cart + checkout
  chat-markdown.tsx     # streaming markdown renderer
hooks/use-speech.ts     # Web Speech API STT + TTS
lib/
  criteria.ts           # SearchCriteria, pill generation, MCP param mapping
  parse-products.ts     # parse Kapruka markdown → Product objects
  mcp.ts                # Kapruka MCP client
  persona.ts            # "Kapri" system prompt
```

## 🛠️ How it works

1. The client keeps the conversation as the single source of truth. As Kapri learns
   what you want, it calls the local **`update_criteria`** tool; the client replays
   those tool calls to render the criteria pills.
2. Each request sends the current criteria to `/api/chat`, which injects them into the
   system prompt so the model always knows the active filters.
3. Kapri calls the Kapruka MCP tools (`kapruka_search_products`, `kapruka_get_product`,
   `kapruka_check_delivery`, `kapruka_create_order`, …). Their markdown output is parsed
   into product cards; `get_product` results enrich search cards with images.
4. Removing a pill or checking out simply sends a message that drives the agent to
   re-search or place the order.

> Built for the [Kapruka Agent Challenge](https://www.kapruka.com/contactUs/agentChallenge.html).
