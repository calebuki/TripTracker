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
}

export function AddMomentDialog({
  trip,
  open,
  onOpenChange,
  onSaved,
}: AddMomentDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Add a moment</DialogTitle>
          <DialogDescription>
            Keep it fast: drop in a photo or jot a quick thought, and TripTrace
            places it on the map.
          </DialogDescription>
        </DialogHeader>
        <Tabs defaultValue="photo">
          <TabsList>
            <TabsTrigger value="photo">Upload Photo</TabsTrigger>
            <TabsTrigger value="thought">Write Thought</TabsTrigger>
          </TabsList>
          <TabsContent value="photo">
            <PhotoUploader
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
      </DialogContent>
    </Dialog>
  );
}
