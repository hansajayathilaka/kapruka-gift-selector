"use client";

import { ProductCard } from "@/components/product-card";
import type { Product } from "@/lib/parse-products";

interface ProductCarouselProps {
  products: Product[];
  onAdd?: (product: Product) => void;
  onDetails?: (product: Product) => void;
}

/** Horizontally scrollable strip of product cards shown under an agent message. */
export function ProductCarousel({ products, onAdd, onDetails }: ProductCarouselProps) {
  if (products.length === 0) return null;
  return (
    <div className="-mx-1 mt-3 flex gap-3 overflow-x-auto px-1 pb-2 [scrollbar-width:thin]">
      {products.map((product) => (
        <ProductCard
          key={product.id}
          product={product}
          onAdd={onAdd}
          onDetails={onDetails}
        />
      ))}
    </div>
  );
}
