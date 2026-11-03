import { timeOfDayCssGradient } from "@/lib/time-of-day";
import { cn } from "@/lib/utils";

export function TimeOfDayLegend({ className }: { className?: string }) {
  return (
    <div className={cn("w-full max-w-60", className)}>
      <p className="text-sm font-bold text-[var(--ink)]">
        Line colour is the local time
      </p>
      <div
        aria-hidden
        className="mt-2 h-2.5 rounded-full border-2 border-[var(--ink)]"
        style={{ background: timeOfDayCssGradient }}
      />
      <div
        aria-hidden
        className="mt-1 flex justify-between text-xs font-bold text-[var(--ink-soft)]"
      >
        <span>12am</span>
        <span>6am</span>
        <span>12pm</span>
        <span>6pm</span>
        <span>12am</span>
      </div>
      <p className="sr-only">
        Blue for night, orange at sunrise, yellow through the day, red at sunset
        and purple at dusk.
      </p>
    </div>
  );
}
