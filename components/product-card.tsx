"use client";

import Image from "next/image";
import { ExternalLink, ImageIcon, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { stockTone, type Product } from "@/lib/parse-products";
import { cn } from "@/lib/utils";

interface ProductCardProps {
  product: Product;
  loadingImage?: boolean;
  onAdd?: (product: Product) => void;
  onDetails?: (product: Product) => void;
}

const toneStyles: Record<string, string> = {
  in: "bg-emerald-500/90 text-white",
  low: "bg-amber-500/90 text-white",
  out: "bg-rose-500/90 text-white",
  unknown: "bg-muted text-muted-foreground",
};

export function ProductCard({ product, loadingImage, onAdd, onDetails }: ProductCardProps) {
  const tone = stockTone(product.stock);
  const soldOut = tone === "out";

  return (
    <div className="group flex w-52 shrink-0 flex-col overflow-hidden rounded-2xl border bg-card shadow-sm ring-1 ring-transparent transition-all hover:-translate-y-0.5 hover:shadow-xl hover:ring-indigo-300/40 dark:hover:ring-indigo-600/30">
      <button
        type="button"
        onClick={() => onDetails?.(product)}
        className="relative aspect-square w-full overflow-hidden bg-gradient-to-br from-indigo-50 via-slate-50 to-violet-50/60 dark:from-indigo-950/40 dark:via-slate-900/30 dark:to-violet-950/30"
      >
        {product.image ? (
          <Image
            src={product.image}
            alt={product.name}
            fill
            sizes="240px"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            unoptimized
          />
        ) : loadingImage ? (
          <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-indigo-100/60 to-violet-100/60 dark:from-indigo-900/30 dark:to-violet-900/30" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-indigo-200 dark:text-indigo-800">
            <ImageIcon className="size-10" />
          </div>
        )}
        {product.stock && (
          <span
            className={cn(
              "absolute left-2 top-2 rounded-full px-2 py-0.5 text-[11px] font-semibold shadow-sm backdrop-blur",
              toneStyles[tone],
            )}
          >
            {product.stock}
          </span>
        )}
      </button>

      <div className="flex flex-1 flex-col gap-1 p-3">
        <h3 className="line-clamp-2 text-sm font-semibold leading-snug" title={product.name}>
          {product.name}
        </h3>
        {product.category && (
          <p className="text-xs text-muted-foreground">{product.category}</p>
        )}
        {product.price && (
          <p className="mt-0.5 text-base font-extrabold text-indigo-700 dark:text-indigo-400">
            {product.price}
          </p>
        )}

        <div className="mt-auto flex items-center gap-2 pt-2">
          <Button
            size="sm"
            className="flex-1 bg-gradient-to-r from-indigo-600 to-violet-600 text-white hover:opacity-90"
            disabled={soldOut}
            onClick={() => onAdd?.(product)}
          >
            <Plus className="size-4" />
            Add
          </Button>
          {product.url && (
            <Button
              size="icon-sm"
              variant="outline"
              title="View on Kapruka"
              render={
                <a href={product.url} target="_blank" rel="noopener noreferrer" />
              }
            >
              <ExternalLink className="size-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
