"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Info, ChevronRight } from "lucide-react";
import { useUIStore } from "@/stores/ui-store";
import { usePlanStore } from "@/stores/plan-store";
import { resolveCourse } from "@/lib/data/course-resolver";
import { findCoreRequirementsForCourse, findMajorsForCourse } from "@/lib/data/requirements";
import type { PcrReviews, PcrInstructorRow } from "@/types/course";

/** Convert "ACCT6110" → "ACCT-6110" for the PCR API */
function toPcrCode(courseId: string): string {
  return courseId.replace(/^([A-Za-z]+)(\d)/, "$1-$2");
}

export function CourseModal() {
  const courseId = useUIStore((s) => s.selectedCourseId);
  const isOpen = useUIStore((s) => s.isCourseModalOpen);
  const closeCourseModal = useUIStore((s) => s.closeCourseModal);
  const isInPlan = usePlanStore((s) => s.isInPlan);

  const [pcr, setPcr] = useState<PcrReviews | null>(null);
  const [pcrLoading, setPcrLoading] = useState(false);

  useEffect(() => {
    if (!isOpen || !courseId) {
      setPcr(null);
      return;
    }
    const pcrCode = toPcrCode(courseId);
    setPcrLoading(true);
    fetch(`/api/pcr/${pcrCode}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data) return;
        setPcr({
          rCourseQuality: data.course_quality ?? null,
          rDifficulty: data.difficulty ?? null,
          rWorkRequired: data.work_required ?? null,
          rSemesterCount: null,
          instructors: data.instructors ?? [],
        });
      })
      .catch(() => {})
      .finally(() => setPcrLoading(false));
  }, [isOpen, courseId]);

  if (!courseId) return null;

  const course = resolveCourse(courseId);
  if (!course) return null;

  const coreReqs = findCoreRequirementsForCourse(courseId);
  const majorCodes = findMajorsForCourse(courseId);
  const alreadyInPlan = isInPlan(courseId);
  const isPreTerm = courseId === "MGMT6100";

  return (
    <TooltipProvider>
    <Dialog open={isOpen} onOpenChange={(open) => !open && closeCourseModal()}>
      <DialogContent className="max-w-lg max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="font-mono">{course.courseId}</span>
            <span className="font-normal text-muted-foreground">
              {course.creditUnits.toFixed(1)} CU
            </span>
          </DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold text-lg">{course.title}</h3>
              <p className="text-sm text-muted-foreground">{course.department}</p>
            </div>

            {/* Requirement badges */}
            {(coreReqs.length > 0 || majorCodes.length > 0 || isPreTerm) && (
              <div className="flex flex-wrap gap-1.5">
                {isPreTerm && (
                  <Badge className="bg-blue-600 text-white border-transparent">
                    Pre-Term
                  </Badge>
                )}
                {coreReqs.map((r) => (
                  <Badge key={r.core_code} variant="secondary">
                    {r.core_type === "fixed" ? "Core" : "Flex"}: {r.core_name}
                  </Badge>
                ))}
                {majorCodes.map((code) => (
                  <Badge key={code} variant="outline">
                    {code} Major
                  </Badge>
                ))}
              </div>
            )}

            {course.description && (
              <>
                <Separator />
                <div>
                  <h4 className="text-sm font-medium mb-1">Description</h4>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {course.description}
                  </p>
                </div>
              </>
            )}

            {course.prerequisites && (
              <div>
                <h4 className="text-sm font-medium mb-1">Prerequisites</h4>
                <p className="text-sm text-muted-foreground">
                  {course.prerequisites}
                </p>
              </div>
            )}

            {(course.attendancePolicy || course.examPolicy) && (
              <>
                <Separator />
                <div>
                  <h4 className="text-sm font-medium mb-1">Course Policies</h4>
                  <div className="space-y-1 text-sm text-muted-foreground">
                    {course.attendancePolicy && (
                      <p>
                        <span className="font-medium text-foreground">Attendance: </span>
                        {course.attendancePolicy}
                      </p>
                    )}
                    {course.examPolicy && (
                      <p>
                        <span className="font-medium text-foreground">Exams: </span>
                        {course.examPolicy}
                      </p>
                    )}
                  </div>
                </div>
              </>
            )}

            {course.termAvailability && (
              <div>
                <h4 className="text-sm font-medium mb-1">Term Availability</h4>
                <Badge variant="outline">{course.termAvailability}</Badge>
              </div>
            )}

            {(course.instructorsFall || course.instructorsSpring) && (
              <div>
                <h4 className="text-sm font-medium mb-1">Instructors</h4>
                <div className="text-sm text-muted-foreground space-y-1">
                  {course.instructorsFall && (
                    <p>Fall: {course.instructorsFall}</p>
                  )}
                  {course.instructorsSpring && (
                    <p>Spring: {course.instructorsSpring}</p>
                  )}
                </div>
              </div>
            )}

            {(course.averageRatingFall != null || course.averageRatingSpring != null) && (
              <div>
                <h4 className="text-sm font-medium mb-1">Ratings</h4>
                <div className="flex gap-4 text-sm text-muted-foreground">
                  {course.averageRatingFall != null && (
                    <span>Fall: {course.averageRatingFall.toFixed(2)}/4.0</span>
                  )}
                  {course.averageRatingSpring != null && (
                    <span>Spring: {course.averageRatingSpring.toFixed(2)}/4.0</span>
                  )}
                </div>
              </div>
            )}

            {(pcrLoading || pcr) && (
              <>
                <Separator />
                <div>
                  <h4 className="text-sm font-medium mb-2">Penn Course Review</h4>
                  {pcrLoading ? (
                    <p className="text-sm text-muted-foreground">Loading ratings…</p>
                  ) : pcr ? (
                    <div className="space-y-2">
                      <div className="grid grid-cols-3 gap-2">
                        <PcrStat
                          label="Quality"
                          value={pcr.rCourseQuality}
                          tooltip="Overall course quality rated by students. Scale: 0 (poor) → 4 (excellent)."
                        />
                        <PcrStat
                          label="Difficulty"
                          value={pcr.rDifficulty}
                          tooltip="How challenging students find this course. Scale: 0 (very easy) → 4 (very hard)."
                        />
                        <PcrStat
                          label="Work"
                          value={pcr.rWorkRequired}
                          tooltip="Amount of work required outside class. Scale: 0 (very light) → 4 (very heavy)."
                        />
                      </div>
                      {pcr.instructors.length > 0 && (
                        <InstructorTable rows={pcr.instructors} />
                      )}
                    </div>
                  ) : null}
                </div>
              </>
            )}

            {course.syllabiUrl && (
              <div>
                <a
                  href={course.syllabiUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary hover:underline"
                >
                  View Syllabus
                </a>
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={closeCourseModal}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
    </TooltipProvider>
  );
}

function InstructorTable({ rows }: { rows: PcrInstructorRow[] }) {
  const fmt = (v: number | null) => (v != null ? v.toFixed(2) : "—");
  return (
    <Collapsible>
      <CollapsibleTrigger className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors group">
        <ChevronRight
          className="transition-transform group-data-[state=open]:rotate-90"
          style={{ width: 13, height: 13 }}
        />
        By instructor
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="mt-2 rounded-md border overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="text-left px-2 py-1.5 font-medium text-muted-foreground">Instructor</th>
                <th className="text-center px-2 py-1.5 font-medium text-muted-foreground">Quality</th>
                <th className="text-center px-2 py-1.5 font-medium text-muted-foreground">Instr.</th>
                <th className="text-center px-2 py-1.5 font-medium text-muted-foreground">Diff.</th>
                <th className="text-center px-2 py-1.5 font-medium text-muted-foreground">Work</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} className="border-b last:border-0">
                  <td className="px-2 py-1.5 text-left">{r.name}</td>
                  <td className="px-2 py-1.5 text-center tabular-nums">{fmt(r.courseQuality)}</td>
                  <td className="px-2 py-1.5 text-center tabular-nums">{fmt(r.instructorQuality)}</td>
                  <td className="px-2 py-1.5 text-center tabular-nums">{fmt(r.difficulty)}</td>
                  <td className="px-2 py-1.5 text-center tabular-nums">{fmt(r.workRequired)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

function PcrStat({
  label,
  value,
  tooltip,
}: {
  label: string;
  value: number | null;
  tooltip: string;
}) {
  return (
    <div className="flex flex-col items-center rounded-md border px-2 py-1.5 text-center">
      <div className="flex items-center gap-1">
        <span className="text-xs text-muted-foreground">{label}</span>
        <Tooltip>
          <TooltipTrigger asChild>
            <Info className="text-muted-foreground" style={{ width: 11, height: 11 }} />
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-[180px] text-center">
            {tooltip}
          </TooltipContent>
        </Tooltip>
      </div>
      <span className="text-sm font-semibold">
        {value != null ? value.toFixed(2) : "—"}
      </span>
      <span className="text-xs text-muted-foreground">/4.0</span>
    </div>
  );
}
