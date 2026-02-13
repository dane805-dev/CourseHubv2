"use client";

import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { PlanGrid } from "@/components/plan/PlanGrid";
import { CatalogBrowser } from "@/components/catalog/CatalogBrowser";
import { ProgressDashboard } from "@/components/progress/ProgressDashboard";
import { ProfilePanel } from "@/components/profile/ProfilePanel";
import { CourseModal } from "@/components/course/CourseModal";
import { useUIStore } from "@/stores/ui-store";
import { usePlanStore } from "@/stores/plan-store";
import { useProfileStore } from "@/stores/profile-store";
import { QUARTER_IDS } from "@/types/plan";
import type { QuarterId } from "@/types/plan";
import { Badge } from "@/components/ui/badge";
import { resolveCourse } from "@/lib/data/course-resolver";
import { findCoreRequirementsForCourse, findMajorsForCourse } from "@/lib/data/requirements";

export default function PlanPage() {
  const rightPanelView = useUIStore((s) => s.rightPanelView);
  const [activeId, setActiveId] = useState<string | null>(null);
  const planStore = usePlanStore();
  const declaredMajors = useProfileStore((s) => s.majors);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  function findContainer(id: string): string | null {
    if (planStore.stagingOrder.includes(id)) return "staging";
    for (const qId of QUARTER_IDS) {
      if (planStore.quarterOrder[qId].includes(id)) return qId;
    }
    return null;
  }

  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id as string);
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;

    const activeIdStr = active.id as string;
    const overId = over.id as string;

    // Branch A: Catalog drag (new course from catalog)
    if (activeIdStr.startsWith("catalog:")) {
      const courseId = activeIdStr.replace("catalog:", "");
      const data = active.data.current as
        | { courseId: string; creditUnits: number; source: string }
        | undefined;
      const creditUnits = data?.creditUnits;

      // Determine target container
      let targetContainer: string | null = null;
      if (overId === "staging" || QUARTER_IDS.includes(overId as QuarterId)) {
        targetContainer = overId;
      } else {
        targetContainer = findContainer(overId);
      }
      if (!targetContainer) return;

      if (targetContainer === "staging") {
        planStore.addToStaging(courseId, creditUnits);
      } else {
        const qId = targetContainer as QuarterId;
        const order = planStore.quarterOrder[qId];
        const overIdx = order.indexOf(overId);
        const insertAt = overIdx !== -1 ? overIdx : order.length;
        planStore.addToQuarter(courseId, qId, creditUnits, insertAt);
      }
      return;
    }

    // Branch B: Existing plan-internal drag logic
    const activeContainer = findContainer(activeIdStr);

    // Determine target container
    let targetContainer: string;
    if (overId === "staging" || QUARTER_IDS.includes(overId as QuarterId)) {
      targetContainer = overId;
    } else {
      const overContainer = findContainer(overId);
      if (!overContainer) return;
      targetContainer = overContainer;
    }

    if (activeContainer === targetContainer) {
      // Reorder within same container
      if (targetContainer === "staging") {
        const oldIdx = planStore.stagingOrder.indexOf(activeIdStr);
        const newIdx = planStore.stagingOrder.indexOf(overId);
        if (oldIdx !== -1 && newIdx !== -1 && oldIdx !== newIdx) {
          planStore.reorderInStaging(oldIdx, newIdx);
        }
      } else {
        const qId = targetContainer as QuarterId;
        const order = planStore.quarterOrder[qId];
        const oldIdx = order.indexOf(activeIdStr);
        const newIdx = order.indexOf(overId);
        if (oldIdx !== -1 && newIdx !== -1 && oldIdx !== newIdx) {
          planStore.reorderInQuarter(qId, oldIdx, newIdx);
        }
      }
    } else {
      // Move between containers
      if (targetContainer === "staging") {
        planStore.moveToStaging(activeIdStr);
      } else {
        const qId = targetContainer as QuarterId;
        const order = planStore.quarterOrder[qId];
        const overIdx = order.indexOf(overId);
        const insertAt = overIdx !== -1 ? overIdx : order.length;
        planStore.moveToQuarter(activeIdStr, qId, insertAt);
      }
    }
  }

  // Render the drag overlay ghost
  function renderOverlay() {
    if (!activeId) return null;

    const courseId = activeId.startsWith("catalog:")
      ? activeId.replace("catalog:", "")
      : activeId;

    const course = resolveCourse(courseId);
    if (!course) return null;

    const coreReqs = findCoreRequirementsForCourse(courseId);
    const isCore = coreReqs.length > 0;
    const isFlex = coreReqs.some((r) => r.core_type === "flex");
    const courseMajors = findMajorsForCourse(courseId);
    const isForMajor = courseMajors.some((m) => declaredMajors.includes(m as any));

    return (
      <div className="flex items-center gap-2 p-2 rounded-md border border-border bg-card shadow-lg cursor-grabbing w-64">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-mono font-semibold truncate">
              {courseId}
            </span>
            {isCore && (
              <Badge variant="secondary" className="text-[10px] px-1 py-0 h-4">
                {isFlex ? "Flex" : "Fixed"}
              </Badge>
            )}
            {isForMajor && (
              <Badge variant="secondary" className="text-[10px] px-1 py-0 h-4">
                Major
              </Badge>
            )}
          </div>
          <div className="text-xs text-muted-foreground truncate">
            {course.title}
          </div>
        </div>
        <span className="text-xs font-mono text-muted-foreground shrink-0">
          {course.creditUnits.toFixed(1)}
        </span>
      </div>
    );
  }

  const rightPanel =
    rightPanelView === "catalog" ? (
      <CatalogBrowser />
    ) : rightPanelView === "profile" ? (
      <ProfilePanel />
    ) : (
      <ProgressDashboard />
    );

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <AppShell planContent={<PlanGrid />} rightPanel={rightPanel} />
      <CourseModal />
      <DragOverlay>{renderOverlay()}</DragOverlay>
    </DndContext>
  );
}
