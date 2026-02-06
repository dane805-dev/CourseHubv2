"use client";

import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { usePlanStore } from "@/stores/plan-store";
import { CourseTile } from "./CourseTile";
import type { QuarterId } from "@/types/plan";
import { QUARTER_INFO } from "@/types/plan";

interface QuarterColumnProps {
  quarterId: QuarterId;
}

export function QuarterColumn({ quarterId }: QuarterColumnProps) {
  const courseIds = usePlanStore((s) => s.quarterOrder[quarterId]);
  const cu = usePlanStore((s) => s.getCUForQuarter(quarterId));
  const info = QUARTER_INFO[quarterId];

  const { setNodeRef, isOver } = useDroppable({ id: quarterId });

  return (
    <div className="flex-1 min-w-0">
      <div className="flex items-center justify-between mb-2 px-1">
        <span className="text-xs font-medium text-muted-foreground">
          {info.label}
        </span>
        <span className="text-xs font-mono text-muted-foreground">
          {cu.toFixed(1)} CU
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
            <CourseTile key={courseId} courseId={courseId} />
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
