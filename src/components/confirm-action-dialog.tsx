"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function useConfirmDelete() {
  const [title, setTitle] = useState<string | null>(null);
  const resolver = useRef<((confirmed: boolean) => void) | null>(null);
  const cancelButton = useRef<HTMLButtonElement>(null);

  useEffect(
    () => () => {
      resolver.current?.(false);
    },
    [],
  );

  const confirmDelete = useCallback((message: string) => {
    resolver.current?.(false);
    setTitle(message);
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  function finish(confirmed: boolean) {
    resolver.current?.(confirmed);
    resolver.current = null;
    setTitle(null);
  }

  const confirmationDialog = (
    <Dialog
      open={title !== null}
      onOpenChange={(open) => {
        if (!open) finish(false);
      }}
    >
      <DialogContent
        className="sm:max-w-md"
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          cancelButton.current?.focus();
        }}
      >
        <DialogHeader>
          <span
            aria-hidden
            className="mb-3 inline-flex rounded-2xl bg-red-50 p-3 text-red-800"
          >
            <Trash2 className="h-5 w-5" />
          </span>
          <DialogTitle>{title ?? "Delete moment?"}</DialogTitle>
          <DialogDescription>
            This removes the moment from the trip. This cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            ref={cancelButton}
            variant="secondary"
            onClick={() => finish(false)}
          >
            Keep moment
          </Button>
          <Button variant="danger" onClick={() => finish(true)}>
            Delete moment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  return { confirmDelete, confirmationDialog };
}
