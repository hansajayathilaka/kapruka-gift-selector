"use client";

import { ChevronLeft, MessageSquarePlus, MessageSquare, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { type StoredConversation } from "@/lib/storage";
import { cn } from "@/lib/utils";

interface SidebarProps {
  conversations: StoredConversation[];
  activeId: string;
  open: boolean;
  onToggle: () => void;
  onNewChat: () => void;
  onSelect: (id: string) => void;
  onClearAll: () => void;
}

function relativeDate(ts: number): string {
  const diff = Date.now() - ts;
  if (diff < 86_400_000) return "Today";
  if (diff < 172_800_000) return "Yesterday";
  return new Date(ts).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function Sidebar({
  conversations,
  activeId,
  open,
  onToggle,
  onNewChat,
  onSelect,
  onClearAll,
}: SidebarProps) {
  return (
    <aside
      className={cn(
        "flex h-dvh flex-col border-r bg-card/60 transition-[width] duration-200 ease-in-out",
        open ? "w-60 min-w-60" : "w-0 min-w-0 overflow-hidden border-r-0",
      )}
    >
      {/* Header row */}
      <div className="flex h-12 shrink-0 items-center justify-between px-3">
        <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
          History
        </span>
        <Button size="icon" variant="ghost" className="size-7" onClick={onToggle}>
          <ChevronLeft className="size-4" />
        </Button>
      </div>

      {/* New Chat */}
      <div className="px-2 pb-2">
        <Button
          onClick={onNewChat}
          variant="outline"
          size="sm"
          className="w-full justify-start gap-2"
        >
          <MessageSquarePlus className="size-4 shrink-0" />
          New chat
        </Button>
      </div>

      {/* List */}
      <div className="flex-1 space-y-0.5 overflow-y-auto px-2 [scrollbar-width:thin]">
        {conversations.length === 0 ? (
          <p className="px-2 py-8 text-center text-xs text-muted-foreground">
            No saved chats yet
          </p>
        ) : (
          conversations.map((conv) => (
            <button
              key={conv.id}
              type="button"
              onClick={() => onSelect(conv.id)}
              className={cn(
                "w-full rounded-lg px-3 py-2 text-left transition-colors",
                conv.id === activeId
                  ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300"
                  : "text-foreground hover:bg-muted",
              )}
            >
              <p className="truncate text-sm font-medium leading-snug">{conv.title}</p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                {relativeDate(conv.updatedAt)}
              </p>
            </button>
          ))
        )}
      </div>

      {/* Footer */}
      {conversations.length > 0 && (
        <div className="border-t px-2 py-2">
          <Button
            onClick={onClearAll}
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-2 text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="size-4" />
            Clear history
          </Button>
        </div>
      )}
    </aside>
  );
}

export function SidebarToggle({ onClick }: { onClick: () => void }) {
  return (
    <Button
      size="icon"
      variant="ghost"
      className="size-8 shrink-0"
      onClick={onClick}
      title="Open history"
    >
      <MessageSquare className="size-4" />
    </Button>
  );
}
