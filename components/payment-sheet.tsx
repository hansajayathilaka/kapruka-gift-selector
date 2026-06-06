"use client";

import { useState } from "react";
import { Check, Copy, CreditCard, ExternalLink } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

interface PaymentSheetProps {
  url: string | null;
  onClose: () => void;
}

export function PaymentSheet({ url, onClose }: PaymentSheetProps) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    if (!url) return;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Sheet open={url !== null} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="bottom" className="rounded-t-2xl pb-safe-area-inset-bottom">
        <SheetHeader className="items-center text-center">
          <div className="mb-1 flex size-12 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-950/60">
            <CreditCard className="size-5 text-indigo-600 dark:text-indigo-400" />
          </div>
          <SheetTitle>Complete your payment</SheetTitle>
          <SheetDescription>
            Your order is confirmed. Click below to pay securely on Kapruka — opens in a new tab.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-5 flex flex-col gap-2.5 px-4 pb-2">
          <Button
            render={<a href={url ?? "#"} target="_blank" rel="noopener noreferrer" />}
            size="lg"
            className="w-full gap-2 bg-gradient-to-r from-indigo-600 to-violet-600 text-white hover:opacity-90"
          >
            <ExternalLink className="size-4" />
            Pay Now on Kapruka
          </Button>

          <Button variant="outline" size="sm" onClick={copy} className="w-full gap-2">
            {copied ? (
              <Check className="size-4 text-emerald-500" />
            ) : (
              <Copy className="size-4" />
            )}
            {copied ? "Copied!" : "Copy payment link"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
