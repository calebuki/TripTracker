"use client";

import { Toaster } from "sonner";

export function AppProviders() {
  return (
    <Toaster
      position="top-center"
      toastOptions={{
        className:
          "border border-black/5 bg-white text-slate-900 shadow-[0_18px_50px_rgba(15,23,42,0.12)]",
      }}
    />
  );
}
