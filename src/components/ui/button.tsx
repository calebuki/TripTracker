"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "crumbs-button inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-transparent",
  {
    variants: {
      variant: {
        default:
          "bg-[var(--terracotta)] px-4 py-2.5 text-white shadow-[0_5px_0_var(--terracotta-shadow),0_10px_24px_rgba(170,70,30,0.15)] hover:bg-[var(--terracotta-hover)]",
        secondary:
          "bg-[var(--sea-soft)] px-4 py-2.5 text-[var(--sea-ink)] shadow-[inset_0_0_0_1px_rgba(15,23,42,0.08)] hover:bg-[var(--paper)]",
        ghost:
          "px-3 py-2 text-[var(--ink)] hover:bg-white/70",
        outline:
          "bg-transparent px-4 py-2.5 text-[var(--ink)] shadow-[inset_0_0_0_1px_rgba(15,23,42,0.12)] hover:bg-white/70",
        soft:
          "bg-[var(--accent-soft)] px-4 py-2.5 text-[var(--ink)] hover:bg-[var(--accent)]/70",
        danger:
          "bg-[#7f1d1d] px-4 py-2.5 text-white hover:bg-[#6b1a1a]",
      },
      size: {
        default: "h-11",
        sm: "h-9 px-3 text-sm",
        lg: "h-12 px-5 text-base",
        icon: "h-11 w-11 rounded-full",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";

    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
