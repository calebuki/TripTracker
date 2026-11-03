"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "crumbs-button inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-[15px] font-bold disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "bg-[var(--ink)] px-5 text-[var(--surface)] hover:bg-[color-mix(in_srgb,var(--ink)_82%,var(--surface))]",
        secondary:
          "bg-[var(--paper-strong)] px-5 text-[var(--ink)] hover:bg-[color-mix(in_srgb,var(--paper-strong)_88%,var(--ink))]",
        ghost: "px-3 text-[var(--ink)] hover:bg-[var(--paper-strong)]",
        outline:
          "border-2 border-[var(--ink)] bg-transparent px-5 text-[var(--ink)] hover:bg-[var(--paper-strong)]",
        soft:
          "bg-[var(--accent-soft)] px-5 text-[var(--ink)] hover:bg-[color-mix(in_srgb,var(--accent-soft)_70%,var(--accent))]",
        danger:
          "bg-[var(--danger)] px-5 text-white hover:bg-[color-mix(in_srgb,var(--danger)_85%,black)]",
      },
      size: {
        default: "h-11",
        sm: "h-9 px-3.5 text-sm",
        lg: "h-13 px-6 text-base",
        icon: "h-11 w-11 px-0",
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
