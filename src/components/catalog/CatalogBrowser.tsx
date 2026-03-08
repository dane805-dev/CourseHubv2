"use client";

import { useEffect } from "react";
import { ChevronDown } from "lucide-react";
import { useDraggable } from "@dnd-kit/core";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useCatalogStore } from "@/stores/catalog-store";
import { useUIStore } from "@/stores/ui-store";
import { usePlanStore } from "@/stores/plan-store";
import { useProfileStore } from "@/stores/profile-store";
import { getOfferedCourses } from "@/lib/data/course-resolver";
import { DEPARTMENTS } from "@/lib/data/constants";
import { findCoreRequirementsForCourse, findMajorsForCourse } from "@/lib/data/requirements";
import {
  QUARTER_IDS,
  QUARTER_INFO,
  SEMESTER_IDS,
  SEMESTER_INFO,
  isSemesterLong,
} from "@/types/plan";

function CatalogRow({
  courseId,
  title,
  creditUnits,
  inPlan,
  termAvailability,
}: {
  courseId: string;
  title: string;
  creditUnits: number;
  inPlan: boolean;
  termAvailability: "Fall" | "Spring" | "Both" | null;
}) {
  const openCourseModal = useUIStore((s) => s.openCourseModal);
  const addToQuarter = usePlanStore((s) => s.addToQuarter);
  const declaredMajors = useProfileStore((s) => s.majors);
  const coreReqs = findCoreRequirementsForCourse(courseId);
  const courseMajors = findMajorsForCourse(courseId);
  const isForMajor = courseMajors.some((m) => declaredMajors.includes(m as any));

  const semesterLong = isSemesterLong(creditUnits);

  function isTermDisabled(term: "Fall" | "Spring"): boolean {
    if (termAvailability === "Fall" && term === "Spring") return true;
    if (termAvailability === "Spring" && term === "Fall") return true;
    return false;
  }

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
          : "border-border hover:bg-accent/50 cursor-grab active:cursor-grabbing"
      }`}
      style={{ opacity: isDragging ? 0.5 : 1 }}
    >
      <div
        className="flex-1 min-w-0"
        onClick={() => openCourseModal(courseId)}
      >
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-mono font-semibold">
            {courseId}
          </span>
          {coreReqs.length > 0 && (
            <Badge
              variant="secondary"
              className="text-[10px] px-1 py-0 h-4"
            >
              {coreReqs[0].core_type === "fixed" ? "Fixed" : "Flex"}
            </Badge>
          )}
          {isForMajor && (
            <Badge
              variant="secondary"
              className="text-[10px] px-1 py-0 h-4"
            >
              Major
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
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button variant="ghost" size="sm" className="h-6 text-xs px-2 gap-1">
                + Add <ChevronDown className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuLabel className="text-xs font-medium text-muted-foreground py-1">
                {semesterLong ? "Add to Semester" : "Add to Quarter"}
              </DropdownMenuLabel>
              {semesterLong
                ? SEMESTER_IDS.map((semId) => {
                    const semInfo = SEMESTER_INFO[semId];
                    const term = QUARTER_INFO[semInfo.quarters[0]].term;
                    const disabled = isTermDisabled(term);
                    return (
                      <DropdownMenuItem
                        key={semId}
                        disabled={disabled}
                        onSelect={() => addToQuarter(courseId, semInfo.quarters[0], creditUnits)}
                      >
                        {semInfo.label}
                        {disabled && (
                          <DropdownMenuShortcut>{termAvailability} only</DropdownMenuShortcut>
                        )}
                      </DropdownMenuItem>
                    );
                  })
                : QUARTER_IDS.map((qId) => {
                    const qInfo = QUARTER_INFO[qId];
                    const disabled = isTermDisabled(qInfo.term);
                    return (
                      <DropdownMenuItem
                        key={qId}
                        disabled={disabled}
                        onSelect={() => addToQuarter(courseId, qId, creditUnits)}
                      >
                        {qInfo.label}
                        {disabled && (
                          <DropdownMenuShortcut>{termAvailability} only</DropdownMenuShortcut>
                        )}
                      </DropdownMenuItem>
                    );
                  })}
            </DropdownMenuContent>
          </DropdownMenu>
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

      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="p-2 space-y-1">
          {filtered.map((course) => (
            <CatalogRow
              key={course.courseId}
              courseId={course.courseId}
              title={course.title}
              creditUnits={course.creditUnits}
              inPlan={isInPlan(course.courseId)}
              termAvailability={course.termAvailability ?? null}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
