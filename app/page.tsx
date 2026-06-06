"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { toast } from "sonner";
import {
  ArrowUp,
  Bug,
  Gift,
  Loader2,
  Mic,
  MicOff,
  Sparkles,
  Square,
  ShoppingBag,
  Volume2,
  VolumeX,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { CriteriaBar } from "@/components/criteria-bar";
import { ProductCarousel } from "@/components/product-carousel";
import { CartSheet, type CartItem } from "@/components/cart-sheet";
import { ChatMarkdown } from "@/components/chat-markdown";
import { DebugDrawer, type ToolEvent } from "@/components/debug-drawer";

import { mergeCriteria, type Pill, type SearchCriteria } from "@/lib/criteria";
import { extractProducts, mergeProduct, type Product } from "@/lib/parse-products";
import { useSpeech } from "@/hooks/use-speech";
import { cn } from "@/lib/utils";

const SUGGESTIONS = [
  "Birthday cake to Colombo tomorrow under Rs.5000",
  "Anniversary flowers for my wife 💐",
  "A chocolate gift hamper for my boss",
  "මට අම්මට තෑග්ගක් ඕන", // "I need a gift for my mother"
];

type AnyPart = {
  type: string;
  text?: string;
  state?: string;
  input?: unknown;
  output?: unknown;
  toolName?: string;
};

function replayCriteria(messages: UIMessage[]): SearchCriteria {
  let c: SearchCriteria = {};
  for (const m of messages) {
    for (const part of m.parts as AnyPart[]) {
      if (
        part.type === "tool-update_criteria" &&
        part.input &&
        part.state !== "input-streaming"
      ) {
        c = mergeCriteria(c, part.input as Record<string, unknown>);
      }
    }
  }
  return c;
}

function messageText(m: UIMessage): string {
  return (m.parts as AnyPart[])
    .filter((p) => p.type === "text")
    .map((p) => p.text ?? "")
    .join("");
}

function productsForMessage(m: UIMessage, index: Map<string, Product>): Product[] {
  const ids: string[] = [];
  for (const part of m.parts as AnyPart[]) {
    if (part.type === "dynamic-tool" && part.state === "output-available") {
      for (const p of extractProducts(part.toolName ?? "", part.output)) {
        if (!ids.includes(p.id)) ids.push(p.id);
      }
    }
  }
  return ids.map((id) => index.get(id)).filter((p): p is Product => Boolean(p));
}

function collectToolEvents(messages: UIMessage[]): ToolEvent[] {
  const events: ToolEvent[] = [];
  messages.forEach((m, mi) => {
    (m.parts as AnyPart[]).forEach((part, pi) => {
      const isDynamic = part.type === "dynamic-tool";
      const isLocalTool = part.type.startsWith("tool-");
      if (!isDynamic && !isLocalTool) return;
      const name = isDynamic ? part.toolName ?? "tool" : part.type.replace(/^tool-/, "");
      const out = part.output as { isError?: boolean } | undefined;
      const pending = part.state !== "output-available" && part.state !== "output-error";
      events.push({
        id: `${m.id}-${mi}-${pi}`,
        name,
        input: part.input,
        output: part.output,
        isError: part.state === "output-error" || out?.isError === true,
        pending,
      });
    });
  });
  return events;
}

/** Tool names that are running but have no output yet → show a working indicator. */
function activeToolLabel(m: UIMessage): string | null {
  const labels: Record<string, string> = {
    kapruka_search_products: "Searching the catalog…",
    kapruka_get_product: "Fetching product details…",
    kapruka_check_delivery: "Checking delivery…",
    kapruka_list_delivery_cities: "Looking up delivery areas…",
    kapruka_list_categories: "Browsing categories…",
    kapruka_create_order: "Creating your order…",
    kapruka_track_order: "Tracking your order…",
  };
  for (const part of m.parts as AnyPart[]) {
    if (
      part.type === "dynamic-tool" &&
      part.state !== "output-available" &&
      part.state !== "output-error"
    ) {
      return labels[part.toolName ?? ""] ?? "Working…";
    }
  }
  return null;
}

export default function Home() {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [debugOpen, setDebugOpen] = useState(false);
  const [ttsOn, setTtsOn] = useState(false);
  const [input, setInput] = useState("");
  const ttsOnRef = useRef(ttsOn);
  ttsOnRef.current = ttsOn;

  const criteriaRef = useRef<SearchCriteria>({});
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        prepareSendMessagesRequest: ({ messages, body }) => ({
          body: { messages, criteria: criteriaRef.current, ...body },
        }),
      }),
    [],
  );

  const { messages, sendMessage, status, stop, error } = useChat({
    transport,
    onFinish: ({ message }) => {
      if (!ttsOnRef.current) return;
      const text = messageText(message)
        .replace(/[#*_`>[\]()]/g, "")
        .trim();
      if (text) speak(text);
    },
  });

  const { listening, interim, sttSupported, toggle, speak } = useSpeech({
    onResult: (text) => sendMessage({ text }),
  });

  const criteria = useMemo(() => replayCriteria(messages), [messages]);
  criteriaRef.current = criteria;

  const productIndex = useMemo(() => {
    const index = new Map<string, Product>();
    for (const m of messages) {
      for (const part of m.parts as AnyPart[]) {
        if (part.type === "dynamic-tool" && part.state === "output-available") {
          for (const p of extractProducts(part.toolName ?? "", part.output)) {
            const existing = index.get(p.id);
            index.set(p.id, existing ? mergeProduct(existing, p) : p);
          }
        }
      }
    }
    return index;
  }, [messages]);

  const toolEvents = useMemo(() => collectToolEvents(messages), [messages]);
  const errorCount = toolEvents.filter((e) => e.isError).length;

  const isBusy = status === "submitted" || status === "streaming";

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  const send = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || isBusy) return;
      sendMessage({ text: trimmed });
      setInput("");
    },
    [isBusy, sendMessage],
  );

  const addToCart = useCallback((product: Product) => {
    setCart((prev) => {
      const found = prev.find((it) => it.product.id === product.id);
      if (found) {
        return prev.map((it) =>
          it.product.id === product.id ? { ...it, qty: it.qty + 1 } : it,
        );
      }
      return [...prev, { product, qty: 1 }];
    });
    toast.success(`Added "${product.name}" to cart`);
  }, []);

  const changeQty = useCallback((id: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((it) => (it.product.id === id ? { ...it, qty: it.qty + delta } : it))
        .filter((it) => it.qty > 0),
    );
  }, []);

  const removeFromCart = useCallback((id: string) => {
    setCart((prev) => prev.filter((it) => it.product.id !== id));
  }, []);

  const checkout = useCallback(() => {
    if (cart.length === 0) return;
    const lines = cart
      .map((it) => `- ${it.qty}× ${it.product.name} (${it.product.id})`)
      .join("\n");
    setCartOpen(false);
    send(
      `I'd like to check out these items:\n${lines}\n\nPlease help me complete the order — ask me for the delivery details and a gift message, then create the order.`,
    );
  }, [cart, send]);

  const removePillAndResearch = useCallback(
    (pill: Pill) => {
      send(`Please remove the "${pill.label}" filter and show me updated gift options.`);
    },
    [send],
  );

  const clearCriteria = useCallback(() => {
    send("Let's start fresh — clear all my search filters.");
  }, [send]);

  const showDetails = useCallback(
    (product: Product) => {
      send(`Tell me more about "${product.name}" (${product.id}).`);
    },
    [send],
  );

  const cartCount = cart.reduce((n, it) => n + it.qty, 0);

  return (
    <div className="relative flex h-dvh w-full flex-col">
      {/* Vibrant ambient background */}
      <div className="pointer-events-none fixed inset-0 -z-10 bg-gradient-to-br from-fuchsia-50 via-white to-amber-50 dark:from-fuchsia-950/30 dark:via-background dark:to-amber-950/20" />
      <div className="pointer-events-none fixed -left-24 top-10 -z-10 size-72 rounded-full bg-fuchsia-300/30 blur-3xl dark:bg-fuchsia-700/20" />
      <div className="pointer-events-none fixed -right-24 bottom-10 -z-10 size-72 rounded-full bg-amber-300/30 blur-3xl dark:bg-amber-700/20" />

      <div className="mx-auto flex h-full w-full max-w-3xl flex-col px-3 sm:px-4">
      {/* Header */}
      <header className="flex items-center justify-between py-3">
        <div className="flex items-center gap-2.5">
          <div className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-fuchsia-600 to-rose-500 text-white shadow-md shadow-fuchsia-500/20">
            <Gift className="size-5" />
          </div>
          <div>
            <h1 className="text-sm font-bold leading-tight text-fuchsia-600 dark:text-fuchsia-400">
              Kapri
            </h1>
            <p className="text-xs text-muted-foreground">Kapruka Gift Concierge</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <Button
            size="icon"
            variant="ghost"
            className="relative"
            onClick={() => setDebugOpen(true)}
            title="Tool activity / debug"
          >
            <Bug className="size-5" />
            {errorCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex size-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
                {errorCount}
              </span>
            )}
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={() => setTtsOn((v) => !v)}
            title={ttsOn ? "Voice replies on" : "Voice replies off"}
            aria-pressed={ttsOn}
          >
            {ttsOn ? <Volume2 className="size-5" /> : <VolumeX className="size-5" />}
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="relative"
            title="Cart"
            onClick={() => setCartOpen(true)}
          >
            <ShoppingBag className="size-5" />
            {cartCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex size-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                {cartCount}
              </span>
            )}
          </Button>
        </div>
      </header>

      <CartSheet
        items={cart}
        open={cartOpen}
        onOpenChange={setCartOpen}
        onChangeQty={changeQty}
        onRemove={removeFromCart}
        onCheckout={checkout}
      />

      {/* Conversation */}
      <div className="flex-1 space-y-5 overflow-y-auto py-2 [scrollbar-width:thin]">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-4 px-6 text-center">
            <div className="flex size-16 items-center justify-center rounded-2xl bg-gradient-to-br from-fuchsia-600 to-rose-500 text-white shadow-lg shadow-fuchsia-500/25">
              <Gift className="size-8" />
            </div>
            <div className="space-y-1.5">
              <h2 className="text-xl font-bold">What&apos;s the occasion? 🎁</h2>
              <p className="mx-auto max-w-md text-sm text-muted-foreground">
                Tell me who it&apos;s for, the vibe, your budget and where to deliver — I&apos;ll
                find the perfect gift and arrange delivery anywhere in Sri Lanka.
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => send(s)}
                  className="inline-flex items-center gap-1.5 rounded-full border bg-card px-3.5 py-2 text-sm shadow-sm transition-all hover:-translate-y-0.5 hover:border-fuchsia-300 hover:bg-fuchsia-50 hover:shadow-md dark:hover:bg-fuchsia-950/30"
                >
                  <Sparkles className="size-3.5 text-fuchsia-500" />
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((m) => {
            const products = productsForMessage(m, productIndex);
            const text = messageText(m);
            const working = m.role === "assistant" ? activeToolLabel(m) : null;
            const isUser = m.role === "user";
            return (
              <div
                key={m.id}
                className={cn("flex flex-col gap-2", isUser ? "items-end" : "items-start")}
              >
                {text && (
                  <div
                    className={cn(
                      "max-w-[88%] text-sm",
                      isUser
                        ? "rounded-2xl rounded-br-sm bg-gradient-to-br from-fuchsia-600 to-rose-500 px-4 py-2.5 whitespace-pre-wrap text-white shadow-sm shadow-fuchsia-500/20"
                        : "w-full",
                    )}
                  >
                    {isUser ? text : <ChatMarkdown>{text}</ChatMarkdown>}
                  </div>
                )}
                {working && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="size-3.5 animate-spin" />
                    {working}
                  </div>
                )}
                {!isUser && products.length > 0 && (
                  <ProductCarousel
                    products={products}
                    onAdd={addToCart}
                    onDetails={showDetails}
                  />
                )}
              </div>
            );
          })
        )}
        {status === "submitted" && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-3.5 animate-spin" />
            Kapri is thinking…
          </div>
        )}
        {error && (
          <p className="text-sm text-destructive">
            Something went wrong. Please try again.
          </p>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Criteria pills */}
      <CriteriaBar
        criteria={criteria}
        onRemove={removePillAndResearch}
        onClear={clearCriteria}
        className="mb-2"
      />

      {/* Composer */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="mb-3 flex items-end gap-2 rounded-2xl border bg-card/80 p-2 shadow-sm backdrop-blur transition-shadow focus-within:border-fuchsia-300 focus-within:shadow-lg focus-within:shadow-fuchsia-500/10 focus-within:ring-2 focus-within:ring-fuchsia-400/40"
      >
        {sttSupported && (
          <Button
            type="button"
            size="icon"
            variant={listening ? "default" : "ghost"}
            onClick={toggle}
            title={listening ? "Stop listening" : "Speak"}
            className={cn("shrink-0", listening && "animate-pulse")}
          >
            {listening ? <Mic className="size-5" /> : <MicOff className="size-5" />}
          </Button>
        )}
        <textarea
          value={listening && interim ? interim : input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send(input);
            }
          }}
          rows={1}
          placeholder={listening ? "Listening…" : "Ask for a gift, a budget, a delivery date…"}
          className="max-h-40 min-h-9 flex-1 resize-none bg-transparent px-2 py-1.5 text-sm outline-none placeholder:text-muted-foreground"
        />
        {isBusy ? (
          <Button type="button" size="icon" variant="secondary" onClick={stop} title="Stop">
            <Square className="size-4" />
          </Button>
        ) : (
          <Button
            type="submit"
            size="icon"
            disabled={!input.trim()}
            title="Send"
            className="bg-gradient-to-br from-fuchsia-600 to-rose-500 text-white hover:opacity-90"
          >
            <ArrowUp className="size-5" />
          </Button>
        )}
      </form>

      <DebugDrawer open={debugOpen} onOpenChange={setDebugOpen} events={toolEvents} />
      </div>
    </div>
  );
}
