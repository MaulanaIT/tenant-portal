"use client";

import dynamic from "next/dynamic";
import { LOADING_CHART } from "../members-copy";

export const chartCanvasClass =
  "relative h-[min(70dvh,720px)] min-h-[380px] overflow-hidden rounded-xl border bg-background shadow-elev-sm";

function OrgChartSkeleton() {
  return (
    <div role="status" aria-busy="true" className={chartCanvasClass}>
      <span className="sr-only">{LOADING_CHART}</span>
      <div
        aria-hidden="true"
        className="absolute inset-0 animate-pulse bg-muted motion-reduce:animate-none"
      />
    </div>
  );
}

export const OrgChartLazy = dynamic(() => import("./org-chart"), {
  ssr: false,
  loading: () => <OrgChartSkeleton />,
});
