import { cn } from "@/lib/utils";

export function CrumbsBrand({ className }: { className?: string }) {
  return (
    <span className={cn("crumbs-wordmark text-[2rem]", className)}>
      crumbs
      <span aria-hidden className="crumbs-wordmark-stop" />
    </span>
  );
}
