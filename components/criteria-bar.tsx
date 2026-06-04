"use client";

import { X, SlidersHorizontal } from "lucide-react";
import { criteriaToPills, type Pill, type SearchCriteria } from "@/lib/criteria";
import { cn } from "@/lib/utils";

interface CriteriaBarProps {
  criteria: SearchCriteria;
  onRemove: (pill: Pill) => void;
  onClear: () => void;
  className?: string;
}

/**
 * The differentiator: an explicit, always-visible row of "criteria pills" that
 * shows exactly what the agent has understood and is searching on. Each pill is
 * removable, which re-runs the search with the updated filters.
 */
export function CriteriaBar({ criteria, onRemove, onClear, className }: CriteriaBarProps) {
  const pills = criteriaToPills(criteria);
  if (pills.length === 0) return null;

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-2 rounded-2xl border bg-card/60 px-3 py-2.5 shadow-sm backdrop-blur",
        className,
      )}
    >
      <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <SlidersHorizontal className="size-3.5" />
        Searching for
      </span>
      {pills.map((pill) => (
        <button
          key={pill.id}
          type="button"
          onClick={() => onRemove(pill)}
          className="group inline-flex items-center gap-1.5 rounded-full border bg-background py-1 pl-2.5 pr-1.5 text-sm font-medium shadow-sm transition-colors hover:border-destructive/40 hover:bg-destructive/5"
          title={`Remove "${pill.label}"`}
        >
          <span aria-hidden>{pill.icon}</span>
          <span>{pill.label}</span>
          <span className="flex size-4 items-center justify-center rounded-full text-muted-foreground transition-colors group-hover:bg-destructive group-hover:text-destructive-foreground">
            <X className="size-3" />
          </span>
        </button>
      ))}
      <button
        type="button"
        onClick={onClear}
        className="ml-auto text-xs font-medium text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
      >
        Clear all
      </button>
    </div>
  );
}
