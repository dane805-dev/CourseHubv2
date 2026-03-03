"use client";

import { useMemo } from "react";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { usePlanStore } from "@/stores/plan-store";
import { useValidation } from "@/hooks/useValidation";
import { CourseTile } from "./CourseTile";
import type { QuarterId } from "@/types/plan";
import { QUARTER_INFO, isSemesterLong } from "@/types/plan";
import type { ValidationWarning } from "@/types/validation";

interface QuarterColumnProps {
  quarterId: QuarterId;
}

export function QuarterColumn({ quarterId }: QuarterColumnProps) {
  const allCourseIds = usePlanStore((s) => s.quarterOrder[quarterId]);
  const placements = usePlanStore((s) => s.placements);
  // Only show quarter-long courses (semester-long ones are shown in the spanning row above)
  const courseIds = allCourseIds.filter(
    (id) => !isSemesterLong(placements[id]?.creditUnits ?? 0)
  );
  const info = QUARTER_INFO[quarterId];
  const { warnings } = useValidation();

  const warningsByCourse = useMemo(() => {
    const map: Record<string, ValidationWarning[]> = {};
    for (const id of courseIds) {
      const matched = warnings.filter(
        (w) => w.courseId === id || w.relatedCourseIds?.includes(id)
      );
      if (matched.length > 0) map[id] = matched;
    }
    return map;
  }, [warnings, courseIds]);

  const { setNodeRef, isOver } = useDroppable({ id: quarterId });

  return (
    <div className="flex-1 min-w-0">
      <div className="mb-2 px-1">
        <span className="text-xs font-medium text-muted-foreground">
          Q{info.term === "Spring" ? info.quarterNumber + 2 : info.quarterNumber}
        </span>
      </div>
      <div
        ref={setNodeRef}
        className={`min-h-[80px] space-y-1.5 p-2 rounded-lg border-2 border-dashed transition-colors ${
          isOver
            ? "border-primary bg-primary/5"
            : courseIds.length === 0
              ? "border-border"
              : "border-transparent"
        }`}
      >
        <SortableContext items={courseIds} strategy={verticalListSortingStrategy}>
          {courseIds.map((courseId) => (
            <CourseTile key={courseId} courseId={courseId} warnings={warningsByCourse[courseId]} />
          ))}
        </SortableContext>
        {courseIds.length === 0 && (
          <div className="flex items-center justify-center h-16 text-xs text-muted-foreground">
            Drop courses here
          </div>
        )}
      </div>
    </div>
  );
}
