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
      className="crumbs-add-moment pointer-events-auto fixed bottom-24 right-4 z-30 border-2 border-[var(--surface)] sm:absolute sm:bottom-6 sm:right-6"
    >
      <Plus aria-hidden className="h-5 w-5" />
      Add moment
    </Button>
  );
}
