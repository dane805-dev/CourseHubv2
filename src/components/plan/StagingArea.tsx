"use client";

import { useDroppable } from "@dnd-kit/core";
import { SortableContext, horizontalListSortingStrategy } from "@dnd-kit/sortable";
import { usePlanStore } from "@/stores/plan-store";
import { CourseTile } from "./CourseTile";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

export function StagingArea() {
  const stagingOrder = usePlanStore((s) => s.stagingOrder);
  const { setNodeRef, isOver } = useDroppable({ id: "staging" });

  return (
    <div className="border rounded-xl p-4 bg-card">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold">Staging Area</h3>
        <span className="text-xs text-muted-foreground">
          {stagingOrder.length} course{stagingOrder.length !== 1 ? "s" : ""}
        </span>
      </div>
      <div
        ref={setNodeRef}
        className={`min-h-[60px] rounded-lg border-2 border-dashed transition-colors p-2 ${
          isOver
            ? "border-primary bg-primary/5"
            : stagingOrder.length === 0
              ? "border-border"
              : "border-transparent"
        }`}
      >
        <SortableContext items={stagingOrder} strategy={horizontalListSortingStrategy}>
          <div className="flex flex-wrap gap-2">
            {stagingOrder.map((courseId) => (
              <div key={courseId} className="w-[200px]">
                <CourseTile courseId={courseId} isStaging />
              </div>
            ))}
          </div>
        </SortableContext>
        {stagingOrder.length === 0 && (
          <div className="flex items-center justify-center h-10 text-xs text-muted-foreground">
            Add courses from the catalog to stage them here
          </div>
        )}
      </div>
    </div>
  );
}
