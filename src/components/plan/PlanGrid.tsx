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
  type DragOverEvent,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { useState } from "react";
import { SemesterTile } from "./SemesterTile";
import { StagingArea } from "./StagingArea";
import { CourseTile } from "./CourseTile";
import { usePlanStore } from "@/stores/plan-store";
import { SEMESTER_IDS, QUARTER_IDS } from "@/types/plan";
import type { QuarterId } from "@/types/plan";

export function PlanGrid() {
  const [activeId, setActiveId] = useState<string | null>(null);
  const planStore = usePlanStore();

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

    const activeContainer = findContainer(active.id as string);
    const overId = over.id as string;

    // Determine target container
    let targetContainer: string;
    if (overId === "staging" || QUARTER_IDS.includes(overId as QuarterId)) {
      targetContainer = overId;
    } else {
      // Over is another course tile — find its container
      const overContainer = findContainer(overId);
      if (!overContainer) return;
      targetContainer = overContainer;
    }

    if (activeContainer === targetContainer) {
      // Reorder within same container
      if (targetContainer === "staging") {
        const oldIdx = planStore.stagingOrder.indexOf(active.id as string);
        const newIdx = planStore.stagingOrder.indexOf(overId);
        if (oldIdx !== -1 && newIdx !== -1 && oldIdx !== newIdx) {
          planStore.reorderInStaging(oldIdx, newIdx);
        }
      } else {
        const qId = targetContainer as QuarterId;
        const order = planStore.quarterOrder[qId];
        const oldIdx = order.indexOf(active.id as string);
        const newIdx = order.indexOf(overId);
        if (oldIdx !== -1 && newIdx !== -1 && oldIdx !== newIdx) {
          planStore.reorderInQuarter(qId, oldIdx, newIdx);
        }
      }
    } else {
      // Move between containers
      if (targetContainer === "staging") {
        planStore.moveToStaging(active.id as string);
      } else {
        const qId = targetContainer as QuarterId;
        const order = planStore.quarterOrder[qId];
        const overIdx = order.indexOf(overId);
        const insertAt = overIdx !== -1 ? overIdx : order.length;
        planStore.moveToQuarter(active.id as string, qId, insertAt);
      }
    }
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="space-y-4">
        <StagingArea />
        <div className="grid grid-cols-2 gap-4">
          {SEMESTER_IDS.map((semId) => (
            <SemesterTile key={semId} semesterId={semId} />
          ))}
        </div>
      </div>

      <DragOverlay>
        {activeId ? <CourseTile courseId={activeId} /> : null}
      </DragOverlay>
    </DndContext>
  );
}
