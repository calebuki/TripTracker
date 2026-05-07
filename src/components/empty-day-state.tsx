import { CalendarX2 } from "lucide-react";

import { Button } from "@/components/ui/button";

interface EmptyDayStateProps {
  label: string;
  canAdd?: boolean;
  onAdd?: () => void;
}

export function EmptyDayState({ label, canAdd, onAdd }: EmptyDayStateProps) {
  return (
    <div className="pointer-events-auto mx-auto max-w-sm rounded-[28px] border border-black/5 bg-white/92 p-5 text-center shadow-[0_18px_48px_rgba(15,23,42,0.12)] backdrop-blur-sm">
      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--paper)] text-slate-500">
        <CalendarX2 className="h-5 w-5" />
      </div>
      <p className="text-base font-medium text-[var(--ink)]">
        No moments yet for {label}.
      </p>
      <p className="mt-2 text-sm leading-6 text-slate-600">
        The map stays simple until something is saved for this day.
      </p>
      {canAdd && onAdd ? (
        <Button className="pointer-events-auto mt-4" onClick={onAdd}>
          Add the first moment
        </Button>
      ) : null}
    </div>
  );
}
