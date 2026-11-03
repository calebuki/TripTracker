import { CrumbsBrand } from "@/components/crumbs-brand";

interface LoadingShellProps {
  label?: string;
}

export function LoadingShell({
  label = "Loading the trip map…",
}: LoadingShellProps) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-[var(--paper)] px-6 text-center">
      <CrumbsBrand />
      <div aria-hidden className="crumbs-loading-line">
        <span />
        <i />
        <span />
      </div>
      <p role="status" className="text-[15px] font-semibold text-[var(--ink-soft)]">
        {label}
      </p>
    </div>
  );
}
