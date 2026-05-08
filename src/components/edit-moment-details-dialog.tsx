"use client";

import { type FocusEvent, useRef, useState } from "react";
import { LoaderCircle } from "lucide-react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { getTripRepository } from "@/lib/repositories";
import type { Moment } from "@/types/triptrace";

interface EditMomentDetailsDialogProps {
  moment: Moment | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => Promise<void> | void;
}

export function EditMomentDetailsDialog({
  moment,
  open,
  onOpenChange,
  onSaved,
}: EditMomentDetailsDialogProps) {
  const [title, setTitle] = useState(() => moment?.caption ?? "");
  const [description, setDescription] = useState(() => moment?.thoughtText ?? "");
  const [saving, setSaving] = useState(false);
  const contentRef = useRef<HTMLDivElement | null>(null);

  if (!moment) {
    return null;
  }

  async function handleSave() {
    if (!moment) {
      return;
    }

    setSaving(true);

    const trimmedTitle = title.trim();
    const trimmedDescription = description.trim();

    try {
      await getTripRepository().updateMoment(moment.id, {
        caption:
          trimmedTitle ||
          (moment.type === "thought" && trimmedDescription
            ? trimmedDescription.slice(0, 72)
            : null),
        thoughtText: trimmedDescription || null,
      });
      toast.success(moment.type === "photo" ? "Photo details updated." : "Moment updated.");
      await onSaved();
      onOpenChange(false);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "TripTrace could not save these changes.",
      );
    } finally {
      setSaving(false);
    }
  }

  function handleFieldFocus(event: FocusEvent<HTMLElement>) {
    const target = event.target;

    window.setTimeout(() => {
      target.scrollIntoView({
        block: "center",
        inline: "nearest",
        behavior: "smooth",
      });
    }, 180);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        ref={contentRef}
        className="sm:max-w-xl"
      >
        <DialogHeader>
          <DialogTitle>
            {moment?.type === "photo" ? "Edit photo details" : "Edit moment"}
          </DialogTitle>
          <DialogDescription>
            Keep the posting flow quick now, then clean up the title and notes here
            whenever you have a second.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pb-2" onFocusCapture={handleFieldFocus}>
          <div className="space-y-2">
            <Label htmlFor="moment-title">Title</Label>
            <Input
              id="moment-title"
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Optional title"
              value={title}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="moment-description">
              {moment?.type === "photo" ? "Description" : "Notes"}
            </Label>
            <Textarea
              id="moment-description"
              onChange={(event) => setDescription(event.target.value)}
              placeholder={
                moment?.type === "photo"
                  ? "Add a few words about this moment later."
                  : "Refine the note if you want."
              }
              rows={5}
              value={description}
            />
          </div>

          <div className="sticky bottom-[-1rem] -mx-6 border-t border-black/5 bg-white/96 px-6 pb-[calc(env(safe-area-inset-bottom)+0.25rem)] pt-4 backdrop-blur-sm">
            <div className="flex justify-end">
              <Button disabled={saving} onClick={() => void handleSave()} type="button">
                {saving ? (
                  <>
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save details"
                )}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
