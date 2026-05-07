"use client";

import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";

interface AddMomentButtonProps {
  onClick: () => void;
}

export function AddMomentButton({ onClick }: AddMomentButtonProps) {
  return (
    <Button
      onClick={onClick}
      size="lg"
      className="pointer-events-auto fixed bottom-24 right-4 z-30 rounded-full px-5 shadow-[0_20px_55px_rgba(15,23,42,0.2)] sm:absolute sm:bottom-6 sm:right-6"
    >
      <Plus className="h-4 w-4" />
      Add Moment
    </Button>
  );
}
