"use client";

import { Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import type { Product } from "@/lib/parse-products";

export interface CartItem {
  product: Product;
  qty: number;
}

interface CartSheetProps {
  items: CartItem[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChangeQty: (id: string, delta: number) => void;
  onRemove: (id: string) => void;
  onCheckout: () => void;
}

function priceToNumber(price?: string): number | null {
  if (!price) return null;
  const m = price.replace(/,/g, "").match(/([\d.]+)/);
  return m ? Number(m[1]) : null;
}

export function CartSheet({
  items,
  open,
  onOpenChange,
  onChangeQty,
  onRemove,
  onCheckout,
}: CartSheetProps) {
  const total = items.reduce((sum, it) => {
    const n = priceToNumber(it.product.price);
    return n === null ? sum : sum + n * it.qty;
  }, 0);
  const allLkr = items.every((it) => (it.product.price ?? "").toUpperCase().includes("LKR"));

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <ShoppingBag className="size-5" /> Your gift cart
          </SheetTitle>
          <SheetDescription>
            Review your items, then let Kapri arrange delivery and checkout.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 space-y-3 overflow-y-auto px-4">
          {items.length === 0 && (
            <p className="py-10 text-center text-sm text-muted-foreground">
              Your cart is empty. Ask Kapri for gift ideas and add a few!
            </p>
          )}
          {items.map(({ product, qty }) => (
            <div key={product.id} className="flex items-center gap-3 rounded-xl border p-2.5">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{product.name}</p>
                {product.price && (
                  <p className="text-xs text-muted-foreground">{product.price}</p>
                )}
              </div>
              <div className="flex items-center gap-1">
                <Button
                  size="icon-sm"
                  variant="outline"
                  onClick={() => onChangeQty(product.id, -1)}
                >
                  <Minus className="size-3.5" />
                </Button>
                <span className="w-6 text-center text-sm font-medium">{qty}</span>
                <Button
                  size="icon-sm"
                  variant="outline"
                  onClick={() => onChangeQty(product.id, 1)}
                >
                  <Plus className="size-3.5" />
                </Button>
              </div>
              <Button
                size="icon-sm"
                variant="ghost"
                className="text-muted-foreground hover:text-destructive"
                onClick={() => onRemove(product.id)}
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          ))}
        </div>

        <SheetFooter>
          {items.length > 0 && total > 0 && (
            <div className="flex items-center justify-between px-1 text-sm">
              <span className="text-muted-foreground">Estimated total</span>
              <span className="font-semibold">
                {allLkr ? "LKR " : ""}
                {total.toLocaleString()}
              </span>
            </div>
          )}
          <Button onClick={onCheckout} disabled={items.length === 0} className="w-full" size="lg">
            Checkout with Kapri
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
