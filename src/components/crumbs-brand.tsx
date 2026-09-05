import { Compass, Cookie, MapPin, Plane } from "lucide-react";

import { cn } from "@/lib/utils";

export function CrumbsBrand({ className }: { className?: string }) {
  return (
    <span
      className={cn("crumbs-brand inline-flex items-center gap-2.5", className)}
    >
      <span className="crumbs-brand-mark">
        <Cookie aria-hidden className="h-6 w-6" />
      </span>
      <span className="font-serif text-3xl tracking-tight">
        crumbs<span className="text-[var(--terracotta)]">.</span>
      </span>
    </span>
  );
}

export function TravelTrail({ className }: { className?: string }) {
  return (
    <div aria-hidden className={cn("travel-trail", className)}>
      <svg viewBox="0 0 480 120" fill="none" preserveAspectRatio="none">
        <path
          d="M20 82C90 130 95 12 180 40S270 130 318 66 410 20 465 42"
          stroke="currentColor"
          strokeWidth="2"
          strokeDasharray="2 9"
          strokeLinecap="round"
        />
      </svg>
      <span className="trail-stop trail-stop-cookie">
        <Cookie />
      </span>
      <span className="trail-stop trail-stop-pin">
        <MapPin />
      </span>
      <span className="trail-stop trail-stop-plane">
        <Plane />
      </span>
    </div>
  );
}

export function TravelStamp({ className }: { className?: string }) {
  return (
    <span aria-hidden className={cn("travel-stamp", className)}>
      <span>THE SCENIC ROUTE</span>
      <Compass className="h-8 w-8" strokeWidth={1.4} />
      <span>ONE CRUMB AT A TIME</span>
    </span>
  );
}
