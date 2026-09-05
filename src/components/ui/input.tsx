import * as React from "react";

import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "crumbs-input flex h-12 w-full rounded-2xl border border-black/8 bg-white px-4 text-sm text-[var(--ink)] outline-none transition placeholder:text-slate-400 focus:border-black/15 focus:ring-2 focus:ring-[var(--ring)]/60",
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };
