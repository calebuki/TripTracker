import Link from "next/link";
import type { ReactNode } from "react";

import { CrumbsBrand } from "@/components/crumbs-brand";

// Wordmark at the top, one narrow column in the middle. Used for sign-in,
// passcode, and "couldn't load this" screens.
export function CenteredPage({ children }: { children: ReactNode }) {
  return (
    <main className="landscape-backdrop flex min-h-dvh flex-col px-4 pt-5 sm:px-8">
      <nav aria-label="Main navigation" className="mx-auto w-full max-w-6xl">
        <Link aria-label="Crumbs home" className="inline-flex" href="/">
          <CrumbsBrand />
        </Link>
      </nav>
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center pt-12">
        {children}
      </div>
    </main>
  );
}
