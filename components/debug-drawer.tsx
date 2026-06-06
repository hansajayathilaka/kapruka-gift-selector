"use client";

import { AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

export interface ToolEvent {
  id: string;
  name: string;
  input?: unknown;
  output?: unknown;
  isError: boolean;
  pending: boolean;
}

interface DebugDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  events: ToolEvent[];
}

/** Pull the human-readable text out of an MCP tool output for display. */
function outputText(output: unknown): string {
  if (output == null) return "";
  if (typeof output === "string") return output;
  const o = output as {
    structuredContent?: { result?: unknown };
    content?: Array<{ text?: string }>;
    applied?: unknown;
  };
  if (o.structuredContent && typeof o.structuredContent.result === "string") {
    return o.structuredContent.result;
  }
  if (Array.isArray(o.content)) {
    return o.content.map((c) => c.text ?? "").join("\n");
  }
  return JSON.stringify(output, null, 2);
}

export function DebugDrawer({ open, onOpenChange, events }: DebugDrawerProps) {
  const errorCount = events.filter((e) => e.isError).length;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col gap-0 sm:max-w-lg">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            🛠️ Tool activity
            {errorCount > 0 && (
              <span className="rounded-full bg-rose-500/15 px-2 py-0.5 text-xs font-semibold text-rose-600">
                {errorCount} error{errorCount > 1 ? "s" : ""}
              </span>
            )}
          </SheetTitle>
          <SheetDescription>
            Every MCP tool call Kapri made, with inputs and outputs — for debugging.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 space-y-3 overflow-y-auto px-4 pb-6">
          {events.length === 0 && (
            <p className="py-10 text-center text-sm text-muted-foreground">
              No tool calls yet. Ask Kapri for a gift to see activity here.
            </p>
          )}
          {events.map((e) => (
            <div
              key={e.id}
              className={cn(
                "rounded-xl border p-3 text-sm",
                e.isError ? "border-rose-300 bg-rose-50/60 dark:bg-rose-950/20" : "bg-card",
              )}
            >
              <div className="flex items-center gap-2 font-mono text-xs font-semibold">
                {e.pending ? (
                  <Loader2 className="size-3.5 animate-spin text-muted-foreground" />
                ) : e.isError ? (
                  <AlertTriangle className="size-3.5 text-rose-500" />
                ) : (
                  <CheckCircle2 className="size-3.5 text-emerald-500" />
                )}
                {e.name}
              </div>
              {e.input != null && (
                <pre className="mt-2 overflow-x-auto rounded-lg bg-muted/60 p-2 text-[11px] leading-relaxed">
                  {JSON.stringify(e.input, null, 2)}
                </pre>
              )}
              {!e.pending && (
                <pre
                  className={cn(
                    "mt-1.5 max-h-48 overflow-auto whitespace-pre-wrap rounded-lg p-2 text-[11px] leading-relaxed",
                    e.isError
                      ? "bg-rose-100/70 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300"
                      : "bg-muted/40",
                  )}
                >
                  {outputText(e.output) || "(no output)"}
                </pre>
              )}
            </div>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}
