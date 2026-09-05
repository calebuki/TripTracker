import * as React from "react";

import { cn } from "@/lib/utils";

const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.ComponentProps<"textarea">
>(({ className, ...props }, ref) => {
  return (
    <textarea
      className={cn(
        "crumbs-input flex min-h-[124px] w-full rounded-[24px] border border-black/8 bg-white px-4 py-3 text-sm text-[var(--ink)] outline-none transition placeholder:text-slate-400 focus:border-black/15 focus:ring-2 focus:ring-[var(--ring)]/60",
        className,
      )}
      ref={ref}
      {...props}
    />
  );
});
Textarea.displayName = "Textarea";

export { Textarea };
