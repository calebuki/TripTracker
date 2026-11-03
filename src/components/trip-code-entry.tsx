"use client";

import { useRouter } from "next/navigation";
import { Fragment, useId, useRef, useState, type CSSProperties } from "react";
import { ArrowRight, LoaderCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { getTripRepository } from "@/lib/repositories";
import {
  TRIP_CODE_LENGTH,
  isValidShareCode,
  normalizeShareCode,
} from "@/lib/share-code";
import { cn } from "@/lib/utils";

type CodeStatus = "idle" | "checking" | "error" | "departing";

interface TripCodeEntryProps {
  compact?: boolean;
  autoFocus?: boolean;
  label?: string;
  hideLabel?: boolean;
}

const shakeKeyframes: Keyframe[] = [
  { translate: "0 0" },
  { translate: "-8px 0" },
  { translate: "7px 0" },
  { translate: "-5px 0" },
  { translate: "3px 0" },
  { translate: "0 0" },
];

export function TripCodeEntry({
  compact = false,
  autoFocus = false,
  label = "Crumb code",
  hideLabel = false,
}: TripCodeEntryProps) {
  const router = useRouter();
  const inputId = useId();
  const messageId = useId();
  const lineRef = useRef<HTMLDivElement>(null);
  const [code, setCode] = useState("");
  const [status, setStatus] = useState<CodeStatus>("idle");
  const [message, setMessage] = useState<string | null>(null);
  const busy = status === "checking" || status === "departing";

  function fail(text: string) {
    setStatus("error");
    setMessage(text);

    if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      lineRef.current?.animate(shakeKeyframes, {
        duration: 360,
        easing: "cubic-bezier(0.23, 1, 0.32, 1)",
      });
    }
  }

  async function openTrip(value: string) {
    if (!isValidShareCode(value)) {
      fail(`Enter all ${TRIP_CODE_LENGTH} characters.`);
      return;
    }

    setStatus("checking");
    setMessage(null);

    try {
      const shareSlug = await Promise.race([
        getTripRepository().getShareSlugByCode(value),
        new Promise<null>((resolve) => {
          window.setTimeout(() => resolve(null), 5_000);
        }),
      ]);

      if (!shareSlug) {
        fail("No trip uses that code. Check it with your traveler.");
        return;
      }

      setStatus("departing");
      router.push(`/t/${shareSlug}`);
    } catch (error) {
      fail(
        error instanceof Error ? error.message : "Crumbs couldn't open that trip.",
      );
    }
  }

  function handleChange(rawValue: string) {
    const next = normalizeShareCode(rawValue).slice(0, TRIP_CODE_LENGTH);
    const completed = next.length === TRIP_CODE_LENGTH && code.length < TRIP_CODE_LENGTH;

    setCode(next);

    if (status === "error") {
      setStatus("idle");
      setMessage(null);
    }

    if (completed) {
      void openTrip(next);
    }
  }

  return (
    <div className={compact ? "space-y-3" : "space-y-5"}>
      <label
        className={cn(
          "block text-sm font-bold text-[var(--ink)]",
          hideLabel && "sr-only",
        )}
        htmlFor={inputId}
      >
        {label}
      </label>
      <div
        className="code-line"
        data-status={status}
        ref={lineRef}
        style={
          {
            "--stop-size": compact ? "48px" : "clamp(46px, 13vw, 64px)",
          } as CSSProperties
        }
      >
        <input
          aria-describedby={messageId}
          aria-invalid={status === "error"}
          autoCapitalize="characters"
          autoComplete="off"
          autoCorrect="off"
          autoFocus={autoFocus}
          className="code-line-input"
          disabled={busy}
          id={inputId}
          inputMode="text"
          maxLength={TRIP_CODE_LENGTH}
          onChange={(event) => handleChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              void openTrip(code);
            }
          }}
          spellCheck={false}
          value={code}
        />
        {Array.from({ length: TRIP_CODE_LENGTH }, (_, index) => (
          <Fragment key={index}>
            {index > 0 ? (
              <span
                aria-hidden
                className="code-track"
                data-filled={code.length > index}
              />
            ) : null}
            <span
              aria-hidden
              className="code-stop"
              data-current={index === code.length}
              data-filled={index < code.length}
            >
              {code[index] ? <span key={code[index]}>{code[index]}</span> : null}
            </span>
          </Fragment>
        ))}
        <span aria-hidden className="code-train" />
      </div>
      <div
        className={cn(
          "flex flex-wrap items-center gap-x-4 gap-y-3",
          compact && "justify-between",
        )}
      >
        <Button
          className={compact ? undefined : "w-full sm:w-auto"}
          disabled={busy}
          onClick={() => void openTrip(code)}
          size={compact ? "default" : "lg"}
          type="button"
        >
          {busy ? (
            <>
              <LoaderCircle aria-hidden className="h-4 w-4 animate-spin" />
              Opening trip…
            </>
          ) : (
            <>
              Follow trip
              <ArrowRight aria-hidden className="h-4 w-4" />
            </>
          )}
        </Button>
        <p
          aria-live="polite"
          className={cn(
            "text-sm font-semibold",
            status === "error" ? "text-[var(--danger)]" : "text-[var(--ink-soft)]",
          )}
          id={messageId}
        >
          {message ?? (
            <span aria-hidden className="tabular">
              {code.length} of {TRIP_CODE_LENGTH}
            </span>
          )}
        </p>
      </div>
    </div>
  );
}
