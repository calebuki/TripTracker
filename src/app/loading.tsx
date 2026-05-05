export default function Loading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--paper)] px-6">
      <div className="w-full max-w-sm rounded-[28px] border border-black/5 bg-white px-6 py-8 text-center shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
        <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-[var(--ink)]/15 border-t-[var(--ink)]" />
        <p className="text-sm text-slate-600">Loading the trip map…</p>
      </div>
    </div>
  );
}
