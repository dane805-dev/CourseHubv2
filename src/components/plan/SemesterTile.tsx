"use client";

import { useMemo } from "react";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { QuarterColumn } from "./QuarterColumn";
import { CourseTile } from "./CourseTile";
import { usePlanStore } from "@/stores/plan-store";
import { useValidation } from "@/hooks/useValidation";
import type { SemesterId } from "@/types/plan";
import { SEMESTER_INFO, isSemesterLong } from "@/types/plan";
import type { ValidationWarning } from "@/types/validation";

interface SemesterTileProps {
  semesterId: SemesterId;
}

function SemesterLongZone({ semesterId }: { semesterId: SemesterId }) {
  const info = SEMESTER_INFO[semesterId];
  const q1Id = info.quarters[0];

  const q1CourseIds = usePlanStore((s) => s.quarterOrder[q1Id]);
  const placements = usePlanStore((s) => s.placements);
  const semesterLongIds = q1CourseIds.filter(
    (id) => isSemesterLong(placements[id]?.creditUnits ?? 0)
  );
  const { warnings } = useValidation();

  const warningsByCourse = useMemo(() => {
    const map: Record<string, ValidationWarning[]> = {};
    for (const id of semesterLongIds) {
      const matched = warnings.filter(
        (w) => w.courseId === id || w.relatedCourseIds?.includes(id)
      );
      if (matched.length > 0) map[id] = matched;
    }
    return map;
  }, [warnings, semesterLongIds]);

  // This drop zone maps to a custom droppable ID; handleDragEnd resolves it to Q1
  const { setNodeRef, isOver } = useDroppable({ id: `semester-long:${q1Id}` });

  const isEmpty = semesterLongIds.length === 0;

  return (
    <div className="mt-3">
      {!isEmpty && (
        <div className="mb-1.5 px-1">
          <span className="text-xs font-medium text-muted-foreground">Full Semester</span>
        </div>
      )}
      <div
        ref={setNodeRef}
        className={`space-y-1.5 rounded-lg border-2 border-dashed transition-colors ${
          isOver
            ? "border-primary bg-primary/5 p-2"
            : isEmpty
              ? "border-transparent"
              : "border-border p-2"
        }`}
      >
        <SortableContext items={semesterLongIds} strategy={verticalListSortingStrategy}>
          {semesterLongIds.map((courseId) => (
            <CourseTile key={courseId} courseId={courseId} warnings={warningsByCourse[courseId]} />
          ))}
        </SortableContext>
        {isOver && isEmpty && (
          <div className="flex items-center justify-center h-8 text-xs text-muted-foreground">
            Drop semester-long courses here
          </div>
        )}
      </div>
    </div>
  );
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
      <SemesterLongZone semesterId={semesterId} />
    </div>
  );
}
