"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";

import { useTripSurfaceTheme } from "@/components/trip-theme-provider";
import { cn } from "@/lib/utils";

const Dialog = DialogPrimitive.Root;
const DialogTrigger = DialogPrimitive.Trigger;
const DialogPortal = DialogPrimitive.Portal;
const DialogClose = DialogPrimitive.Close;

const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      "crumbs-overlay fixed inset-0 z-50 bg-[rgb(10_11_15/0.5)]",
      className,
    )}
    {...props}
  />
));
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName;

const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & {
    overlayClassName?: string;
    overlayStyle?: React.CSSProperties;
  }
>(({ className, children, overlayClassName, overlayStyle, ...props }, ref) => {
  const theme = useTripSurfaceTheme();
  return (
    <DialogPortal>
      <DialogOverlay className={overlayClassName} style={overlayStyle} />
      <DialogPrimitive.Content
        {...theme}
        ref={ref}
        className={cn(
          "crumbs-dialog fixed inset-x-0 bottom-0 z-50 no-scrollbar max-h-[calc(100dvh-0.75rem)] overflow-y-auto overscroll-contain rounded-t-[20px] bg-[var(--surface)] px-6 pb-[calc(env(safe-area-inset-bottom)+1.5rem)] pt-6 scroll-pb-32 sm:left-1/2 sm:top-1/2 sm:bottom-auto sm:w-full sm:max-h-[min(90vh,760px)] sm:max-w-2xl sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-[20px] sm:px-6 sm:pb-6 sm:pt-6",
          className,
        )}
        {...props}
      >
        {children}
        <DialogPrimitive.Close className="crumbs-close absolute right-4 top-4 grid h-10 w-10 place-items-center rounded-full text-[var(--ink)]">
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPortal>
  );
});
DialogContent.displayName = DialogPrimitive.Content.displayName;

function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("crumbs-dialog-header space-y-2 pr-10", className)}
      {...props}
    />
  );
}

function DialogFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end",
        className,
      )}
      {...props}
    />
  );
}

const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn(
      "font-display text-3xl text-[var(--ink)]",
      className,
    )}
    {...props}
  />
));
DialogTitle.displayName = DialogPrimitive.Title.displayName;

const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn("text-[15px] leading-6 text-[var(--ink-soft)]", className)}
    {...props}
  />
));
DialogDescription.displayName = DialogPrimitive.Description.displayName;

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
};
