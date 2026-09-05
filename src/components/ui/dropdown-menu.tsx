"use client";

import * as React from "react";
import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu";

import { useTripSurfaceTheme } from "@/components/trip-theme-provider";
import { cn } from "@/lib/utils";

const DropdownMenu = DropdownMenuPrimitive.Root;
const DropdownMenuTrigger = DropdownMenuPrimitive.Trigger;
const DropdownMenuPortal = DropdownMenuPrimitive.Portal;

const DropdownMenuContent = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Content>
>(({ className, sideOffset = 8, ...props }, ref) => {
  const theme = useTripSurfaceTheme();
  return (
    <DropdownMenuPortal>
      <DropdownMenuPrimitive.Content
        {...theme}
        ref={ref}
        sideOffset={sideOffset}
        className={cn(
          "crumbs-menu z-50 min-w-[220px] rounded-[20px] border border-black/5 bg-white p-1.5 shadow-[0_20px_60px_rgba(15,23,42,0.14)]",
          className,
        )}
        {...props}
      />
    </DropdownMenuPortal>
  );
});
DropdownMenuContent.displayName = DropdownMenuPrimitive.Content.displayName;

const DropdownMenuItem = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Item>
>(({ className, ...props }, ref) => (
  <DropdownMenuPrimitive.Item
    ref={ref}
    className={cn(
      "crumbs-menu-item flex cursor-pointer select-none items-center gap-2.5 rounded-2xl px-3 py-2 text-sm text-[var(--ink)] outline-none transition focus:bg-[var(--paper)] data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
      className,
    )}
    {...props}
  />
));
DropdownMenuItem.displayName = DropdownMenuPrimitive.Item.displayName;

export {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
};
