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
import { getTripThemeStyle } from "@/lib/trip-theme";
import type { Trip } from "@/types/crumbs";

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
  const themeStyle = getTripThemeStyle(trip.theme);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="bg-[var(--paper)] sm:max-w-3xl"
        data-trip-theme={trip.theme}
        overlayStyle={{
          ...themeStyle,
          backgroundColor: "var(--paper)",
          opacity: 0.82,
        }}
        style={{ ...themeStyle, backgroundColor: "var(--paper)" }}
      >
        <DialogHeader>
          <DialogTitle>{libraryOnly ? "Add a past moment" : "Add a moment"}</DialogTitle>
          <DialogDescription className="sr-only">
            Add media or a written moment to this trip.
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
              <TabsTrigger value="photo">Media</TabsTrigger>
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
