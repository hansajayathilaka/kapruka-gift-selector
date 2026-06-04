"use client";

import { memo } from "react";
import { Streamdown } from "streamdown";

/** Markdown renderer for assistant messages (streaming-aware). */
export const ChatMarkdown = memo(function ChatMarkdown({ children }: { children: string }) {
  return (
    <Streamdown className="prose prose-sm dark:prose-invert max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 break-words">
      {children}
    </Streamdown>
  );
});
