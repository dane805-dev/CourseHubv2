"use client";

import { SemesterTile } from "./SemesterTile";
import { StagingArea } from "./StagingArea";
import { SEMESTER_IDS } from "@/types/plan";

export function PlanGrid() {
  return (
    <div className="space-y-4">
      <StagingArea />
      <div className="grid grid-cols-2 gap-4">
        {SEMESTER_IDS.map((semId) => (
          <SemesterTile key={semId} semesterId={semId} />
        ))}
      </div>
    </div>
  );
}
