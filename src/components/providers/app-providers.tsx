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
      />
    </CrumbsAuthProvider>
  );
}
