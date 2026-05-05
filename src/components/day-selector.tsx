"use client";

import { CalendarDays } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import type { DayFilter, DayOption } from "@/types/triptrace";

interface DaySelectorProps {
  options: DayOption[];
  value: DayFilter;
  onChange: (nextValue: DayFilter) => void;
}

export function DaySelector({ options, value, onChange }: DaySelectorProps) {
  const quickOptions = options.filter((option) =>
    option.kind === "today" ||
    option.kind === "yesterday" ||
    option.kind === "all",
  );
  const calendarOptions = options.filter((option) => option.kind === "date");

  return (
    <div className="flex items-center gap-2 rounded-full border border-black/5 bg-white/92 p-1 shadow-[0_16px_48px_rgba(15,23,42,0.12)] backdrop-blur-sm">
      {quickOptions.map((option) => {
        const active =
          value.kind === option.kind &&
          (option.kind === "all" || option.value === value.value);

        return (
          <Button
            key={`${option.kind}-${option.value ?? option.label}`}
            size="sm"
            variant={active ? "default" : "ghost"}
            className={cn(
              "rounded-full px-4",
              active && "shadow-none",
            )}
            onClick={() =>
              onChange({
                kind: option.kind,
                value: option.value,
              })
            }
          >
            {option.label}
          </Button>
        );
      })}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            size="icon"
            variant={value.kind === "date" ? "default" : "ghost"}
            className="h-10 w-10"
          >
            <CalendarDays className="h-4 w-4" />
            <span className="sr-only">Choose a day</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-56 p-2">
          <p className="px-3 py-2 text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
            Calendar
          </p>
          <div className="space-y-1">
            {calendarOptions.length > 0 ? (
              calendarOptions.map((option) => {
                const active = value.kind === "date" && value.value === option.value;

                return (
                  <button
                    key={option.value}
                    className={cn(
                      "flex w-full items-center justify-between rounded-2xl px-3 py-2 text-left text-sm transition",
                      active
                        ? "bg-[var(--accent-soft)] text-[var(--ink)]"
                        : "text-slate-600 hover:bg-[var(--paper)]",
                    )}
                    onClick={() =>
                      onChange({
                        kind: "date",
                        value: option.value,
                      })
                    }
                    type="button"
                  >
                    {option.label}
                  </button>
                );
              })
            ) : (
              <div className="rounded-2xl px-3 py-2 text-sm text-slate-500">
                No saved days yet.
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
