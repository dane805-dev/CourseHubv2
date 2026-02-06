"use client";

import { QuarterColumn } from "./QuarterColumn";
import { usePlanStore } from "@/stores/plan-store";
import type { SemesterId } from "@/types/plan";
import { SEMESTER_INFO } from "@/types/plan";

interface SemesterTileProps {
  semesterId: SemesterId;
}

export function SemesterTile({ semesterId }: SemesterTileProps) {
  const info = SEMESTER_INFO[semesterId];
  const cu = usePlanStore((s) => s.getCUForSemester(semesterId));

  return (
    <div className="border rounded-xl p-4 bg-card">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold">{info.label}</h3>
        <span className="text-xs font-mono text-muted-foreground">
          {cu.toFixed(1)} CU
        </span>
      </div>
      <div className="flex gap-3">
        <QuarterColumn quarterId={info.quarters[0]} />
        <QuarterColumn quarterId={info.quarters[1]} />
      </div>
    </div>
  );
}
