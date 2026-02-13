"use client";

import { useEffect } from "react";
import { useDraggable } from "@dnd-kit/core";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useCatalogStore } from "@/stores/catalog-store";
import { useUIStore } from "@/stores/ui-store";
import { usePlanStore } from "@/stores/plan-store";
import { getOfferedCourses } from "@/lib/data/course-resolver";
import { DEPARTMENTS } from "@/lib/data/constants";
import { findCoreRequirementsForCourse } from "@/lib/data/requirements";

function CatalogRow({
  courseId,
  title,
  creditUnits,
  inPlan,
}: {
  courseId: string;
  title: string;
  creditUnits: number;
  inPlan: boolean;
}) {
  const openCourseModal = useUIStore((s) => s.openCourseModal);
  const addToStaging = usePlanStore((s) => s.addToStaging);
  const coreReqs = findCoreRequirementsForCourse(courseId);

  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `catalog:${courseId}`,
    data: { courseId, creditUnits, source: "catalog" },
    disabled: inPlan,
  });

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className={`flex items-center gap-2 p-2 rounded-md border transition-colors ${
        inPlan
          ? "border-primary/30 bg-primary/5 cursor-default"
          : "border-transparent hover:border-border hover:bg-accent/50 cursor-grab active:cursor-grabbing"
      }`}
      style={{ opacity: isDragging ? 0.5 : 1 }}
      onClick={() => openCourseModal(courseId)}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-mono font-semibold">
            {courseId}
          </span>
          {coreReqs.length > 0 && (
            <Badge
              variant="secondary"
              className="text-[10px] px-1 py-0 h-4"
            >
              {coreReqs[0].core_type === "fixed" ? "Core" : "Flex"}
            </Badge>
          )}
          {inPlan && (
            <Badge
              variant="outline"
              className="text-[10px] px-1 py-0 h-4 text-primary"
            >
              In Plan
            </Badge>
          )}
        </div>
        <div className="text-xs text-muted-foreground truncate">
          {title}
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span className="text-xs font-mono text-muted-foreground">
          {creditUnits.toFixed(1)}
        </span>
        {!inPlan && (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 text-xs px-2"
            onClick={(e) => {
              e.stopPropagation();
              addToStaging(courseId, creditUnits);
            }}
          >
            + Add
          </Button>
        )}
      </div>
    </div>
  );
}

export function CatalogBrowser() {
  const catalogStore = useCatalogStore();
  const isInPlan = usePlanStore((s) => s.isInPlan);

  // Load courses on mount
  useEffect(() => {
    if (!catalogStore.isLoaded) {
      catalogStore.setCourses(getOfferedCourses());
    }
  }, [catalogStore.isLoaded]); // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = catalogStore.getFilteredCourses();

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 space-y-3 border-b">
        <h2 className="text-sm font-semibold">Course Catalog</h2>
        <Input
          placeholder="Search courses..."
          value={catalogStore.searchQuery}
          onChange={(e) => catalogStore.setSearchQuery(e.target.value)}
          className="h-8"
        />
        <div className="flex gap-2">
          <Select
            value={catalogStore.filters.department ?? "all"}
            onValueChange={(v) =>
              catalogStore.setFilter("department", v === "all" ? null : v)
            }
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="Department" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Depts</SelectItem>
              {DEPARTMENTS.map((d) => (
                <SelectItem key={d} value={d}>
                  {d}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={catalogStore.filters.termAvailability ?? "all"}
            onValueChange={(v) =>
              catalogStore.setFilter("termAvailability", v === "all" ? null : v)
            }
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="Term" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Terms</SelectItem>
              <SelectItem value="Fall">Fall</SelectItem>
              <SelectItem value="Spring">Spring</SelectItem>
              <SelectItem value="Both">Both</SelectItem>
            </SelectContent>
          </Select>
          {(catalogStore.searchQuery || catalogStore.filters.department || catalogStore.filters.termAvailability) && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-xs"
              onClick={() => catalogStore.clearFilters()}
            >
              Clear
            </Button>
          )}
        </div>
        <div className="text-xs text-muted-foreground">
          {filtered.length} course{filtered.length !== 1 ? "s" : ""}
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {filtered.map((course) => (
            <CatalogRow
              key={course.courseId}
              courseId={course.courseId}
              title={course.title}
              creditUnits={course.creditUnits}
              inPlan={isInPlan(course.courseId)}
            />
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
