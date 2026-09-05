import { CrumbsBrand } from "@/components/crumbs-brand";

interface LoadingShellProps {
  label?: string;
}

export function LoadingShell({
  label = "Loading the trip map…",
}: LoadingShellProps) {
  return (
    <div className="crumbs-page flex min-h-screen items-center justify-center bg-[var(--paper)] px-6">
      <div className="w-full max-w-sm rounded-[28px] border border-black/5 bg-white px-6 py-8 text-center shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
        <CrumbsBrand className="mb-6" />
        <div aria-hidden className="crumbs-loading-dots mb-5"><span /><span /><span /></div>
        <p role="status" className="text-sm text-slate-600">{label}</p>
      </div>
    </div>
  );
}
