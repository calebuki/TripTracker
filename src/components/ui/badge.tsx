import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "crumbs-badge inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold",
  {
    variants: {
      variant: {
        default: "bg-[var(--paper-strong)] text-[var(--ink)]",
        accent: "bg-[var(--accent)] text-[#15161c]",
        subtle: "border-2 border-[var(--line)] text-[var(--ink-soft)]",
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
