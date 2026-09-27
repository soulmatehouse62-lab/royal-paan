"use client";

import dynamic from "next/dynamic";
import type { ChartsProps } from "./charts-impl";

// Recharts is the heaviest dependency; load it after the numbers are on screen.
const ChartsImpl = dynamic(() => import("./charts-impl"), {
  ssr: false,
  loading: () => (
    <div className="grid gap-5 lg:grid-cols-2">
      {Array.from({ length: 4 }, (_, i) => (
        <div key={i} className="card h-72 p-4">
          <div className="skeleton mb-4 h-5 w-40" />
          <div className="skeleton h-52 w-full" />
        </div>
      ))}
    </div>
  ),
});

export function Charts(props: ChartsProps) {
  return <ChartsImpl {...props} />;
}
