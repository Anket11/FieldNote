import type { ReactNode } from "react";

export default function SplitView({ children, detail, detailId, detailLabel = "Details" }: {
  children: ReactNode; detail: ReactNode; detailId: string; detailLabel?: string;
}) {
  return <div className="grid min-w-0 gap-6 md:grid-cols-2">
    <div className="min-w-0">{children}</div>
    <section id={detailId} aria-label={detailLabel} className="min-w-0 space-y-3">{detail}</section>
  </div>;
}
