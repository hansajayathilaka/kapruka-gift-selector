"use client";

import { useEffect, useMemo, useState } from "react";
import { ProductCard } from "@/components/product-card";
import type { Product } from "@/lib/parse-products";

interface ProductCarouselProps {
  products: Product[];
  onAdd?: (product: Product) => void;
  onDetails?: (product: Product) => void;
}

/** Horizontally scrollable strip of product cards shown under an agent message. */
export function ProductCarousel({ products, onAdd, onDetails }: ProductCarouselProps) {
  const [images, setImages] = useState<Record<string, string>>({});

  // Search results carry no images — fetch them from kapruka_get_product.
  const missingIds = useMemo(
    () => products.filter((p) => !p.image).map((p) => p.id),
    [products],
  );
  const missingKey = missingIds.join(",");

  useEffect(() => {
    const ids = missingKey ? missingKey.split(",") : [];
    const need = ids.filter((id) => !(id in images));
    if (need.length === 0) return;
    let cancelled = false;
    fetch(`/api/product-image?ids=${encodeURIComponent(need.join(","))}`)
      .then((r) => r.json())
      .then((data: { images?: Record<string, string> }) => {
        if (!cancelled && data.images) setImages((prev) => ({ ...prev, ...data.images }));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [missingKey, images]);

  if (products.length === 0) return null;

  return (
    <div className="-mx-1 mt-3 flex gap-3 overflow-x-auto px-1 pb-2 [scrollbar-width:thin]">
      {products.map((product) => {
        const loadingImage = !product.image && !(product.id in images);
        return (
          <ProductCard
            key={product.id}
            product={{ ...product, image: product.image ?? images[product.id] }}
            loadingImage={loadingImage}
            onAdd={onAdd}
            onDetails={onDetails}
          />
        );
      })}
    </div>
  );
}
