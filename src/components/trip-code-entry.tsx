"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowRight, LoaderCircle } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getTripRepository } from "@/lib/repositories";
import {
  TRIP_CODE_LENGTH,
  isValidShareCode,
  normalizeShareCode,
} from "@/lib/share-code";

interface TripCodeEntryProps {
  compact?: boolean;
}

export function TripCodeEntry({ compact = false }: TripCodeEntryProps) {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [opening, setOpening] = useState(false);

  async function handleOpenTrip() {
    const normalized = normalizeShareCode(code);

    if (!isValidShareCode(normalized)) {
      toast.error(`Enter the ${TRIP_CODE_LENGTH}-character crumb code.`);
      return;
    }

    setOpening(true);

    try {
      const slugPromise = getTripRepository().getShareSlugByCode(normalized);
      const shareSlug = await Promise.race([
        slugPromise,
        new Promise<null>((resolve) => {
          window.setTimeout(() => resolve(null), 5_000);
        }),
      ]);

      if (!shareSlug) {
        toast.error("No crumbs match that code.");
        return;
      }

      router.push(`/t/${shareSlug}`);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Crumbs could not open the trip.",
      );
    } finally {
      setOpening(false);
    }
  }

  return (
    <div className={compact ? "space-y-3" : "space-y-4"}>
      <div className="space-y-2">
        <label
          className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500"
          htmlFor="trip-code"
        >
          Crumb code
        </label>
        <Input
          autoComplete="off"
          autoFocus={!compact}
          className={
            compact
              ? "h-12 text-center font-mono text-xl tracking-[0.42em] uppercase"
              : "h-14 text-center font-mono text-2xl tracking-[0.5em] uppercase"
          }
          id="trip-code"
          inputMode="text"
          maxLength={TRIP_CODE_LENGTH}
          onChange={(event) => setCode(normalizeShareCode(event.target.value))}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              void handleOpenTrip();
            }
          }}
          placeholder="....."
          spellCheck={false}
          value={code}
        />
      </div>
      <Button
        className={compact ? "w-full sm:w-auto" : "w-full"}
        disabled={opening}
        onClick={() => void handleOpenTrip()}
        size={compact ? "default" : "lg"}
        type="button"
      >
        {opening ? (
          <>
            <LoaderCircle className="h-4 w-4 animate-spin" />
            Opening trip...
          </>
        ) : (
          <>
            Follow crumbs
            <ArrowRight className="h-4 w-4" />
          </>
        )}
      </Button>
    </div>
  );
}
