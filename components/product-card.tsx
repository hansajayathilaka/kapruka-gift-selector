"use client";

import Image from "next/image";
import { ExternalLink, ImageIcon, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { stockTone, type Product } from "@/lib/parse-products";
import { cn } from "@/lib/utils";

interface ProductCardProps {
  product: Product;
  onAdd?: (product: Product) => void;
  onDetails?: (product: Product) => void;
}

const toneStyles: Record<string, string> = {
  in: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  low: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  out: "bg-rose-500/15 text-rose-600 dark:text-rose-400",
  unknown: "bg-muted text-muted-foreground",
};

export function ProductCard({ product, onAdd, onDetails }: ProductCardProps) {
  const tone = stockTone(product.stock);
  const soldOut = tone === "out";

  return (
    <div className="group flex w-60 shrink-0 flex-col overflow-hidden rounded-2xl border bg-card shadow-sm transition-shadow hover:shadow-md">
      <button
        type="button"
        onClick={() => onDetails?.(product)}
        className="relative aspect-square w-full overflow-hidden bg-muted"
      >
        {product.image ? (
          <Image
            src={product.image}
            alt={product.name}
            fill
            sizes="240px"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            unoptimized
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-muted-foreground">
            <ImageIcon className="size-10 opacity-40" />
          </div>
        )}
        {product.stock && (
          <span
            className={cn(
              "absolute left-2 top-2 rounded-full px-2 py-0.5 text-[11px] font-semibold backdrop-blur",
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
          <p className="mt-0.5 text-base font-bold text-primary">{product.price}</p>
        )}

        <div className="mt-auto flex items-center gap-2 pt-2">
          <Button
            size="sm"
            className="flex-1"
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
