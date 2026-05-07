"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PhotoUploader } from "@/components/photo-uploader";
import { ThoughtComposer } from "@/components/thought-composer";
import type { Trip } from "@/types/triptrace";

interface AddMomentDialogProps {
  trip: Trip;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => Promise<void> | void;
  cameraFirst?: boolean;
}

export function AddMomentDialog({
  trip,
  open,
  onOpenChange,
  onSaved,
  cameraFirst = false,
}: AddMomentDialogProps) {
  const libraryOnly = Boolean(trip.endDate);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{libraryOnly ? "Add a past moment" : "Add a moment"}</DialogTitle>
          <DialogDescription>
            {libraryOnly
              ? "Past trips stay editable, but new additions come through the camera roll so the timeline stays grounded in real photos."
              : "Keep it fast: drop in a photo or jot a quick thought, and TripTrace places it on the map."}
          </DialogDescription>
        </DialogHeader>
        {libraryOnly ? (
          <PhotoUploader
            active={open}
            cameraFirst={false}
            libraryOnly
            trip={trip}
            onSaved={onSaved}
            onClose={() => onOpenChange(false)}
          />
        ) : (
          <Tabs defaultValue="photo" key={open ? "open" : "closed"}>
            <TabsList>
              <TabsTrigger value="photo">Camera</TabsTrigger>
              <TabsTrigger value="thought">Write Thought</TabsTrigger>
            </TabsList>
            <TabsContent value="photo">
              <PhotoUploader
                active={open}
                cameraFirst={cameraFirst}
                trip={trip}
                onSaved={onSaved}
                onClose={() => onOpenChange(false)}
              />
            </TabsContent>
            <TabsContent value="thought">
              <ThoughtComposer
                trip={trip}
                onSaved={onSaved}
                onClose={() => onOpenChange(false)}
              />
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}
