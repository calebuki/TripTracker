"use client";

import { type ReactNode } from "react";
import { Toaster } from "sonner";

import { CrumbsAuthProvider } from "@/hooks/use-crumbs-auth";

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <CrumbsAuthProvider>
      {children}
      <Toaster
        position="top-center"
        toastOptions={{
          className:
            "border border-black/5 bg-white text-slate-900 shadow-[0_18px_50px_rgba(15,23,42,0.12)]",
        }}
      />
    </CrumbsAuthProvider>
  );
}
