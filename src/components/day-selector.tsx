"use client";

import { useMemo, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { DateTime } from "luxon";

import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { getMomentTimestamp, getTripDayKey } from "@/lib/time";
import { cn } from "@/lib/utils";
import type { DayFilter, DayOption, Moment } from "@/types/crumbs";

interface DaySelectorProps {
  options: DayOption[];
  moments: Moment[];
  timezone: string;
  value: DayFilter;
  onChange: (nextValue: DayFilter) => void;
}

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function getMonthForDay(dayKey: string | undefined, timezone: string) {
  if (!dayKey) {
    return null;
  }

  const day = DateTime.fromISO(dayKey, { zone: timezone });
  return day.isValid ? day.startOf("month") : null;
}

export function DaySelector({
  options,
  moments,
  timezone,
  value,
  onChange,
}: DaySelectorProps) {
  const [calendarOpen, setCalendarOpen] = useState(false);
  const activityByDay = useMemo(() => {
    const nextActivity = new Map<string, number>();

    for (const moment of moments) {
      const dayKey = getTripDayKey(getMomentTimestamp(moment), timezone);

      if (dayKey) {
        nextActivity.set(dayKey, (nextActivity.get(dayKey) ?? 0) + 1);
      }
    }

    return nextActivity;
  }, [moments, timezone]);
  const latestActivityDay = useMemo(
    () => [...activityByDay.keys()].sort().at(-1),
    [activityByDay],
  );
  const [displayMonth, setDisplayMonth] = useState(() =>
    getMonthForDay(value.value, timezone) ??
    getMonthForDay(latestActivityDay, timezone) ??
    DateTime.now().setZone(timezone).startOf("month"),
  );
  const quickOptions = options.filter((option) =>
    option.kind === "today" ||
    option.kind === "yesterday" ||
    option.kind === "all",
  );
  const mostActiveDayCount = Math.max(1, ...activityByDay.values());
  const monthStart = displayMonth.startOf("month");
  const calendarStart = monthStart.minus({ days: monthStart.weekday % 7 });
  const calendarDays = Array.from({ length: 42 }, (_, index) =>
    calendarStart.plus({ days: index }),
  );

  function handleCalendarOpenChange(open: boolean) {
    setCalendarOpen(open);

    if (open) {
      setDisplayMonth(
        getMonthForDay(value.value, timezone) ??
          getMonthForDay(latestActivityDay, timezone) ??
          DateTime.now().setZone(timezone).startOf("month"),
      );
    }
  }

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
      <Popover onOpenChange={handleCalendarOpenChange} open={calendarOpen}>
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
        <PopoverContent
          align="end"
          className="w-[min(23rem,calc(100vw-1.5rem))] p-4"
          side="top"
        >
          <div className="flex items-center justify-between gap-2">
            <Button
              aria-label={`Show ${displayMonth.minus({ months: 1 }).toFormat("LLLL yyyy")}`}
              className="h-9 w-9"
              onClick={() =>
                setDisplayMonth((currentMonth) =>
                  currentMonth.minus({ months: 1 }).startOf("month"),
                )
              }
              size="icon"
              type="button"
              variant="ghost"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <p aria-live="polite" className="font-serif text-xl text-[var(--ink)]">
              {displayMonth.toFormat("LLLL yyyy")}
            </p>
            <Button
              aria-label={`Show ${displayMonth.plus({ months: 1 }).toFormat("LLLL yyyy")}`}
              className="h-9 w-9"
              onClick={() =>
                setDisplayMonth((currentMonth) =>
                  currentMonth.plus({ months: 1 }).startOf("month"),
                )
              }
              size="icon"
              type="button"
              variant="ghost"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          <div className="mt-4 grid grid-cols-7 gap-1 text-center">
            {WEEKDAY_LABELS.map((weekday) => (
              <span
                className="pb-1 text-[0.68rem] font-medium uppercase tracking-[0.1em] text-slate-400"
                key={weekday}
              >
                {weekday}
              </span>
            ))}
            {calendarDays.map((day) => {
              const dayKey = day.toISODate();
              const activityCount = dayKey ? activityByDay.get(dayKey) ?? 0 : 0;
              const hasActivity = activityCount > 0;
              const isSelected = value.kind === "date" && value.value === dayKey;
              const isCurrentMonth = day.month === displayMonth.month;
              const intensity = hasActivity
                ? 0.13 + 0.67 * Math.sqrt(activityCount / mostActiveDayCount)
                : 0;

              return (
                <button
                  aria-label={
                    hasActivity
                      ? `${day.toFormat("LLLL d")}: ${activityCount} ${activityCount === 1 ? "moment" : "moments"}`
                      : `${day.toFormat("LLLL d")}: no moments`
                  }
                  aria-pressed={isSelected}
                  className={cn(
                    "relative flex aspect-square items-center justify-center rounded-xl text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2",
                    isCurrentMonth ? "text-[var(--ink)]" : "text-slate-300",
                    hasActivity
                      ? "hover:scale-105 hover:shadow-sm"
                      : "cursor-default",
                    isSelected && "ring-2 ring-[var(--ink)] ring-offset-2",
                  )}
                  disabled={!hasActivity}
                  key={dayKey}
                  onClick={() => {
                    if (!dayKey) {
                      return;
                    }

                    onChange({ kind: "date", value: dayKey });
                    setCalendarOpen(false);
                  }}
                  style={
                    hasActivity
                      ? { backgroundColor: `rgba(22, 163, 74, ${intensity})` }
                      : undefined
                  }
                  title={
                    hasActivity
                      ? `${activityCount} ${activityCount === 1 ? "moment" : "moments"}`
                      : undefined
                  }
                  type="button"
                >
                  {day.day}
                </button>
              );
            })}
          </div>
          <p className="mt-4 text-center text-xs text-slate-500">
            Darker green means more moments that day.
          </p>
        </PopoverContent>
      </Popover>
    </div>
  );
}
