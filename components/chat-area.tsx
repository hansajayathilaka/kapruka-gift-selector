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
  ShoppingBag,
  Sparkles,
  Square,
  Volume2,
  VolumeX,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { CriteriaBar } from "@/components/criteria-bar";
import { ProductCarousel } from "@/components/product-carousel";
import { CartSheet, type CartItem } from "@/components/cart-sheet";
import { ChatMarkdown } from "@/components/chat-markdown";
import { DebugDrawer, type ToolEvent } from "@/components/debug-drawer";
import { PaymentSheet } from "@/components/payment-sheet";

import { mergeCriteria, type Pill, type SearchCriteria } from "@/lib/criteria";
import { extractProducts, mergeProduct, type Product } from "@/lib/parse-products";
import {
  type UserPreferences,
  generateSuggestions,
  mergePreferencesFromCriteria,
} from "@/lib/storage";
import { useSpeech } from "@/hooks/use-speech";
import { cn } from "@/lib/utils";

/* ── Types ── */

type AnyPart = {
  type: string;
  text?: string;
  state?: string;
  input?: unknown;
  output?: unknown;
  toolName?: string;
};

/* ── Helpers ── */

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
      const isLocal = part.type.startsWith("tool-");
      if (!isDynamic && !isLocal) return;
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

function extractPaymentUrl(output: unknown): string | null {
  if (!output) return null;
  const text = typeof output === "string" ? output : JSON.stringify(output);
  const matches = text.match(/https?:\/\/[^\s"'<>,)\]]+/g);
  if (!matches) return null;
  for (const url of matches) {
    if (/kapruka/i.test(url)) return url.replace(/['"]+$/, "");
  }
  return null;
}

function latestPaymentUrl(messages: UIMessage[]): string | null {
  for (let i = messages.length - 1; i >= 0; i--) {
    for (const part of (messages[i].parts as AnyPart[])) {
      if (
        part.type === "dynamic-tool" &&
        part.toolName === "kapruka_create_order" &&
        part.state === "output-available"
      ) {
        const url = extractPaymentUrl(part.output);
        if (url) return url;
      }
    }
  }
  return null;
}

function conversationTitle(messages: UIMessage[]): string {
  for (const m of messages) {
    if (m.role === "user") {
      const text = messageText(m).trim().slice(0, 48);
      return text || "New chat";
    }
  }
  return "New chat";
}

/* ── Component ── */

interface ChatAreaProps {
  conversationId: string;
  initialMessages?: UIMessage[];
  preferences: UserPreferences;
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
  onSave: (messages: UIMessage[], title: string) => void;
  onPreferencesUpdate: (updated: UserPreferences) => void;
}

export function ChatArea({
  conversationId,
  initialMessages,
  preferences,
  sidebarOpen,
  onToggleSidebar,
  onSave,
  onPreferencesUpdate,
}: ChatAreaProps) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [debugOpen, setDebugOpen] = useState(false);
  const [ttsOn, setTtsOn] = useState(false);
  const [input, setInput] = useState("");
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null);

  const ttsOnRef = useRef(ttsOn);
  ttsOnRef.current = ttsOn;
  const speakRef = useRef<(text: string) => void>(() => {});

  const criteriaRef = useRef<SearchCriteria>({});
  const categoriesRef = useRef<string[]>([]);
  const shownPaymentRef = useRef<string | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  // Load categories once on startup
  useEffect(() => {
    fetch("/api/categories")
      .then((r) => r.json())
      .then((d: { categories?: string[] }) => {
        if (Array.isArray(d.categories)) categoriesRef.current = d.categories;
      })
      .catch(() => {});
  }, []);

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        prepareSendMessagesRequest: ({ messages, body }) => ({
          body: {
            messages,
            criteria: criteriaRef.current,
            categories: categoriesRef.current,
            ...body,
          },
        }),
      }),
    [],
  );

  const { messages, sendMessage, status, stop, error } = useChat({
    transport,
    messages: initialMessages,
    onFinish: ({ message }) => {
      if (ttsOnRef.current) {
        const text = messageText(message).replace(/[#*_`>[\]()]/g, "").trim();
        if (text) speakRef.current(text);
      }
      const updated = mergePreferencesFromCriteria(preferences, criteriaRef.current);
      onPreferencesUpdate(updated);
    },
  });

  const { listening, interim, sttSupported, toggle, speak } = useSpeech({
    onResult: (text) => sendMessage({ text }),
  });
  speakRef.current = speak;

  // Sync criteria ref
  const criteria = useMemo(() => replayCriteria(messages), [messages]);
  criteriaRef.current = criteria;

  // Product index
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

  // Tool events for debug drawer
  const toolEvents = useMemo(() => collectToolEvents(messages), [messages]);
  const errorCount = toolEvents.filter((e) => e.isError).length;

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  // Save conversation whenever messages change
  useEffect(() => {
    if (messages.length === 0) return;
    onSave(messages, conversationTitle(messages));
  }, [messages, conversationId, onSave]);

  // Detect payment URL from order creation
  useEffect(() => {
    const url = latestPaymentUrl(messages);
    if (url && url !== shownPaymentRef.current) {
      shownPaymentRef.current = url;
      setPaymentUrl(url);
    }
  }, [messages]);

  const isBusy = status === "submitted" || status === "streaming";

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
      if (found) return prev.map((it) => it.product.id === product.id ? { ...it, qty: it.qty + 1 } : it);
      return [...prev, { product, qty: 1 }];
    });
    toast.success(`Added "${product.name}" to cart`);
  }, []);

  const changeQty = useCallback((id: string, delta: number) => {
    setCart((prev) =>
      prev.map((it) => (it.product.id === id ? { ...it, qty: it.qty + delta } : it)).filter((it) => it.qty > 0),
    );
  }, []);

  const removeFromCart = useCallback((id: string) => {
    setCart((prev) => prev.filter((it) => it.product.id !== id));
  }, []);

  const checkout = useCallback(() => {
    if (cart.length === 0) return;
    const lines = cart.map((it) => `- ${it.qty}× ${it.product.name} (${it.product.id})`).join("\n");
    setCartOpen(false);
    send(`I'd like to check out these items:\n${lines}\n\nPlease help me complete the order — ask me for the delivery details and a gift message, then create the order.`);
  }, [cart, send]);

  const removePillAndResearch = useCallback(
    (pill: Pill) => send(`Please remove the "${pill.label}" filter and show me updated gift options.`),
    [send],
  );

  const clearCriteria = useCallback(() => send("Let's start fresh — clear all my search filters."), [send]);

  const showDetails = useCallback(
    (product: Product) => send(`Tell me more about "${product.name}" (${product.id}).`),
    [send],
  );

  const cartCount = cart.reduce((n, it) => n + it.qty, 0);
  const suggestions = useMemo(() => generateSuggestions(preferences), [preferences]);

  return (
    <div className="flex min-w-0 flex-1 flex-col">
      <div className="mx-auto flex h-dvh w-full max-w-3xl flex-col px-4">

        {/* Header */}
        <header className="flex h-12 shrink-0 items-center justify-between">
          <div className="flex items-center gap-2">
            {!sidebarOpen && (
              <Button size="icon" variant="ghost" className="size-8" onClick={onToggleSidebar} title="Chat history">
                <Gift className="size-4" />
              </Button>
            )}
            <div className="flex items-center gap-2">
              {sidebarOpen && (
                <div className="flex size-7 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-600 to-violet-600 text-white">
                  <Gift className="size-4" />
                </div>
              )}
              <div>
                <span className="text-sm font-semibold text-indigo-700 dark:text-indigo-400">Kapri</span>
                <span className="ml-1.5 hidden text-xs text-muted-foreground sm:inline">Gift Concierge</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <Button
              size="icon"
              variant="ghost"
              className="relative size-8"
              onClick={() => setDebugOpen(true)}
              title="Tool activity"
            >
              <Bug className="size-4" />
              {errorCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex size-3.5 items-center justify-center rounded-full bg-rose-500 text-[9px] font-bold text-white">
                  {errorCount}
                </span>
              )}
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="size-8"
              onClick={() => setTtsOn((v) => !v)}
              title={ttsOn ? "Voice on" : "Voice off"}
              aria-pressed={ttsOn}
            >
              {ttsOn ? <Volume2 className="size-4" /> : <VolumeX className="size-4" />}
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="relative size-8"
              onClick={() => setCartOpen(true)}
              title="Cart"
            >
              <ShoppingBag className="size-4" />
              {cartCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex size-3.5 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground">
                  {cartCount}
                </span>
              )}
            </Button>
          </div>
        </header>

        {/* Cart */}
        <CartSheet
          items={cart}
          open={cartOpen}
          onOpenChange={setCartOpen}
          onChangeQty={changeQty}
          onRemove={removeFromCart}
          onCheckout={checkout}
        />

        {/* Messages */}
        <div className="flex-1 overflow-y-auto py-4 [scrollbar-width:thin]">
          {messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-5 px-4 text-center">
              <div className="flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-500/20">
                <Gift className="size-7" />
              </div>
              <div className="space-y-1">
                <h2 className="text-lg font-semibold tracking-tight">What&apos;s the occasion?</h2>
                <p className="mx-auto max-w-sm text-sm text-muted-foreground">
                  Tell me who it&apos;s for, the vibe, your budget and delivery location — I&apos;ll
                  find the perfect gift anywhere in Sri Lanka.
                </p>
              </div>
              <div className="flex flex-wrap justify-center gap-2">
                {suggestions.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => send(s)}
                    className="inline-flex items-center gap-1.5 rounded-full border bg-card px-4 py-2 text-sm transition-all hover:-translate-y-0.5 hover:border-indigo-200 hover:bg-indigo-50/60 hover:shadow-sm dark:hover:bg-indigo-950/30"
                  >
                    <Sparkles className="size-3.5 shrink-0 text-indigo-400" />
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((m) => {
                const products = productsForMessage(m, productIndex);
                const text = messageText(m);
                const working = m.role === "assistant" ? activeToolLabel(m) : null;
                const isUser = m.role === "user";
                return (
                  <div
                    key={m.id}
                    className={cn("flex flex-col gap-1.5", isUser ? "items-end" : "items-start")}
                  >
                    {text && (
                      <div
                        className={cn(
                          "max-w-[85%] text-sm",
                          isUser
                            ? "rounded-2xl rounded-br-sm bg-gradient-to-br from-indigo-600 to-violet-600 px-4 py-2.5 whitespace-pre-wrap text-white shadow-sm shadow-indigo-500/15"
                            : "w-full",
                        )}
                      >
                        {isUser ? text : <ChatMarkdown>{text}</ChatMarkdown>}
                      </div>
                    )}
                    {working && (
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Loader2 className="size-3 animate-spin" />
                        {working}
                      </div>
                    )}
                    {!isUser && products.length > 0 && (
                      <ProductCarousel products={products} onAdd={addToCart} onDetails={showDetails} />
                    )}
                  </div>
                );
              })}

              {status === "submitted" && (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Loader2 className="size-3 animate-spin" />
                  Kapri is thinking…
                </div>
              )}
              {error && (
                <p className="text-xs text-destructive">Something went wrong. Please try again.</p>
              )}
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Criteria pills */}
        <CriteriaBar criteria={criteria} onRemove={removePillAndResearch} onClear={clearCriteria} className="mb-2" />

        {/* Composer */}
        <form
          onSubmit={(e) => { e.preventDefault(); send(input); }}
          className="mb-3 flex items-end gap-2 rounded-2xl border bg-card/80 p-2 backdrop-blur transition-shadow focus-within:border-indigo-200 focus-within:shadow-lg focus-within:shadow-indigo-500/8 focus-within:ring-1 focus-within:ring-indigo-300/50"
        >
          {sttSupported && (
            <Button
              type="button"
              size="icon"
              variant={listening ? "default" : "ghost"}
              onClick={toggle}
              title={listening ? "Stop listening" : "Speak"}
              className={cn("size-8 shrink-0", listening && "animate-pulse")}
            >
              {listening ? <Mic className="size-4" /> : <MicOff className="size-4" />}
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
            placeholder={listening ? "Listening…" : "Ask for a gift, budget, delivery date…"}
            className="max-h-40 min-h-9 flex-1 resize-none bg-transparent px-2 py-1.5 text-sm outline-none placeholder:text-muted-foreground"
          />
          {isBusy ? (
            <Button type="button" size="icon" variant="secondary" className="size-8 shrink-0" onClick={stop}>
              <Square className="size-3.5" />
            </Button>
          ) : (
            <Button
              type="submit"
              size="icon"
              disabled={!input.trim()}
              className="size-8 shrink-0 bg-gradient-to-br from-indigo-600 to-violet-600 text-white hover:opacity-90"
            >
              <ArrowUp className="size-4" />
            </Button>
          )}
        </form>
      </div>

      <DebugDrawer open={debugOpen} onOpenChange={setDebugOpen} events={toolEvents} />
      <PaymentSheet url={paymentUrl} onClose={() => setPaymentUrl(null)} />
    </div>
  );
}
