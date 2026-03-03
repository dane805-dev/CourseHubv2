"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useState } from "react";
import { AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { resolveCourse } from "@/lib/data/course-resolver";
import { useUIStore } from "@/stores/ui-store";
import { usePlanStore } from "@/stores/plan-store";
import { useProfileStore } from "@/stores/profile-store";
import { findCoreRequirementsForCourse, findMajorsForCourse } from "@/lib/data/requirements";
import { isSemesterLong } from "@/types/plan";
import type { ValidationWarning } from "@/types/validation";

interface CourseTileProps {
  courseId: string;
  isStaging?: boolean;
  warnings?: ValidationWarning[];
}

export function CourseTile({ courseId, isStaging, warnings }: CourseTileProps) {
  const course = resolveCourse(courseId);
  const openCourseModal = useUIStore((s) => s.openCourseModal);
  const removeCourse = usePlanStore((s) => s.removeCourse);
  const highlightedCourseIds = useUIStore((s) => s.highlightedCourseIds);
  const isHighlighted = highlightedCourseIds.includes(courseId);
  const declaredMajors = useProfileStore((s) => s.majors);
  const [hovered, setHovered] = useState(false);

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

  // Determine course type badges
  const coreReqs = findCoreRequirementsForCourse(courseId);
  const isCore = coreReqs.length > 0;
  const isFlex = coreReqs.some((r) => r.core_type === "flex");
  const courseMajors = findMajorsForCourse(courseId);
  const isForMajor = courseMajors.some((m) => declaredMajors.includes(m as any));
  const isSemester = isSemesterLong(course.creditUnits);
  const isPreTerm = courseId === "MGMT6100";

  const hasWarnings = warnings && warnings.length > 0;
  const highSeverity = hasWarnings && warnings.some((w) => w.severity === "high");
  const warningColor = highSeverity ? "#ef4444" : "#f59e0b";

  return (
    <div
      ref={setNodeRef}
      style={{
        ...style,
        ...(hasWarnings ? { borderLeftWidth: 3, borderLeftColor: warningColor } : {}),
      }}
      {...attributes}
      {...listeners}
      className={`relative flex items-center gap-2 p-2 rounded-md border cursor-grab active:cursor-grabbing transition-colors ${
        isHighlighted
          ? "border-primary bg-primary/10 ring-1 ring-primary"
          : "border-border bg-card hover:border-muted-foreground"
      } ${isDragging ? "shadow-lg z-50" : ""}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {hasWarnings && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span
                onPointerDown={(e) => e.stopPropagation()}
                style={{ flexShrink: 0, display: "flex", cursor: "default" }}
              >
                <AlertTriangle size={14} style={{ color: warningColor }} />
              </span>
            </TooltipTrigger>
            <TooltipContent side="top">
              {warnings.map((w, i) => (
                <div key={i}>{w.message}</div>
              ))}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
      <button
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();
          removeCourse(courseId);
        }}
        className="absolute top-1 right-1 flex items-center justify-center transition-opacity"
        style={{
          width: 18,
          height: 18,
          borderRadius: "50%",
          backgroundColor: "#3f3f46",
          color: "#d4d4d8",
          fontSize: 10,
          lineHeight: 1,
          opacity: hovered ? 1 : 0,
        }}
        title="Remove"
      >
        ✕
      </button>
      <div className="flex-1 min-w-0" onClick={() => openCourseModal(courseId)}>
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-mono font-semibold truncate">
            {courseId}
          </span>
          {isSemester && (
            <Badge variant="secondary" className="text-[10px] px-1 py-0 h-4">
              Semester
            </Badge>
          )}
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
          {isPreTerm && (
            <Badge className="text-[10px] px-1 py-0 h-4 bg-blue-600 text-white border-transparent">
              Pre-Term
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
