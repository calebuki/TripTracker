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
            <Trash2 aria-hidden className="h-4 w-4" />
            Delete moment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  return { confirmDelete, confirmationDialog };
}
