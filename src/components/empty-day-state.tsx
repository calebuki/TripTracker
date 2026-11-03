import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";

interface EmptyDayStateProps {
  label: string;
  canAdd?: boolean;
  onAdd?: () => void;
}

export function EmptyDayState({ label, canAdd, onAdd }: EmptyDayStateProps) {
  return (
    <div className="pointer-events-auto mx-auto max-w-sm rounded-2xl border-2 border-[var(--ink)] bg-[var(--surface)] p-5 text-center">
      <div aria-hidden className="mx-auto mb-4 flex w-32 items-center">
        <span className="h-4 w-4 shrink-0 rounded-full border-4 border-[var(--ink)] bg-[var(--surface)]" />
        <span className="h-0 flex-1 border-t-4 border-dashed border-[var(--line)]" />
        <span className="h-4 w-4 shrink-0 rounded-full border-4 border-[var(--line)] bg-[var(--surface)]" />
      </div>
      <p className="text-lg font-bold text-[var(--ink)]">
        No moments for {label} yet.
      </p>
      {canAdd && onAdd ? (
        <Button className="pointer-events-auto mt-4" onClick={onAdd}>
          <Plus aria-hidden className="h-4 w-4" />
          Add the first moment
        </Button>
      ) : null}
    </div>
  );
}
