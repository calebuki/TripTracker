import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "crumbs-badge inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium",
  {
    variants: {
      variant: {
        default: "bg-[var(--paper)] text-slate-700",
        accent: "bg-[var(--accent-soft)] text-[var(--ink)]",
        subtle: "bg-white/75 text-slate-600 shadow-[inset_0_0_0_1px_rgba(15,23,42,0.08)]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export function Badge({
  className,
  variant,
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof badgeVariants>) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}
