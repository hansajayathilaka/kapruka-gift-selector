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
        "flex flex-wrap items-center gap-2 rounded-2xl border border-fuchsia-200/60 bg-gradient-to-r from-fuchsia-50/80 to-amber-50/80 px-3 py-2.5 shadow-sm backdrop-blur dark:border-fuchsia-900/40 dark:from-fuchsia-950/30 dark:to-amber-950/20",
        className,
      )}
    >
      <span className="flex items-center gap-1.5 text-xs font-semibold text-fuchsia-600 dark:text-fuchsia-400">
        <SlidersHorizontal className="size-3.5" />
        Searching for
      </span>
      {pills.map((pill) => (
        <button
          key={pill.id}
          type="button"
          onClick={() => onRemove(pill)}
          className="group inline-flex items-center gap-1.5 rounded-full border border-fuchsia-200 bg-white py-1 pl-2.5 pr-1.5 text-sm font-medium text-fuchsia-900 shadow-sm transition-colors hover:border-destructive/40 hover:bg-destructive/5 dark:border-fuchsia-900/50 dark:bg-fuchsia-950/40 dark:text-fuchsia-100"
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
