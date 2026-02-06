"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Badge } from "@/components/ui/badge";
import { resolveCourse } from "@/lib/data/course-resolver";
import { useUIStore } from "@/stores/ui-store";
import { usePlanStore } from "@/stores/plan-store";
import { findCoreRequirementsForCourse } from "@/lib/data/requirements";

interface CourseTileProps {
  courseId: string;
  isStaging?: boolean;
}

export function CourseTile({ courseId, isStaging }: CourseTileProps) {
  const course = resolveCourse(courseId);
  const openCourseModal = useUIStore((s) => s.openCourseModal);
  const removeCourse = usePlanStore((s) => s.removeCourse);
  const highlightedCourseIds = useUIStore((s) => s.highlightedCourseIds);
  const isHighlighted = highlightedCourseIds.includes(courseId);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: courseId });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  if (!course) return null;

  // Determine course type badge
  const coreReqs = findCoreRequirementsForCourse(courseId);
  const isCore = coreReqs.length > 0;
  const isFlex = coreReqs.some((r) => r.core_type === "flex");

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`group flex items-center gap-2 p-2 rounded-md border cursor-grab active:cursor-grabbing transition-colors ${
        isHighlighted
          ? "border-primary bg-primary/10 ring-1 ring-primary"
          : "border-border bg-card hover:border-muted-foreground"
      } ${isDragging ? "shadow-lg z-50" : ""}`}
    >
      <div className="flex-1 min-w-0" onClick={() => openCourseModal(courseId)}>
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-mono font-semibold truncate">
            {courseId}
          </span>
          {isCore && (
            <Badge variant="secondary" className="text-[10px] px-1 py-0 h-4">
              {isFlex ? "Flex" : "Core"}
            </Badge>
          )}
        </div>
        <div className="text-xs text-muted-foreground truncate">
          {course.title}
        </div>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <span className="text-xs font-mono text-muted-foreground">
          {course.creditUnits.toFixed(1)}
        </span>
        <button
          onClick={(e) => {
            e.stopPropagation();
            removeCourse(courseId);
          }}
          className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity text-xs p-0.5"
          title="Remove"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
