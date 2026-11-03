"use client";

import * as React from "react";
import * as PopoverPrimitive from "@radix-ui/react-popover";

import { useTripSurfaceTheme } from "@/components/trip-theme-provider";
import { cn } from "@/lib/utils";

const Popover = PopoverPrimitive.Root;
const PopoverTrigger = PopoverPrimitive.Trigger;

const PopoverContent = React.forwardRef<
  React.ElementRef<typeof PopoverPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Content>
>(({ className, align = "center", sideOffset = 8, ...props }, ref) => {
  const theme = useTripSurfaceTheme();
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content
        {...theme}
        ref={ref}
        align={align}
        sideOffset={sideOffset}
        className={cn(
          "crumbs-popover z-50 w-64 rounded-2xl p-3 outline-none",
          className,
        )}
        {...props}
      />
    </PopoverPrimitive.Portal>
  );
});
PopoverContent.displayName = PopoverPrimitive.Content.displayName;

export { Popover, PopoverContent, PopoverTrigger };
