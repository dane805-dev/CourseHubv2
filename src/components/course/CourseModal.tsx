"use client";

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
import { useUIStore } from "@/stores/ui-store";
import { usePlanStore } from "@/stores/plan-store";
import { resolveCourse } from "@/lib/data/course-resolver";
import { findCoreRequirementsForCourse, findMajorsForCourse } from "@/lib/data/requirements";

export function CourseModal() {
  const courseId = useUIStore((s) => s.selectedCourseId);
  const isOpen = useUIStore((s) => s.isCourseModalOpen);
  const closeCourseModal = useUIStore((s) => s.closeCourseModal);
  const addToStaging = usePlanStore((s) => s.addToStaging);
  const isInPlan = usePlanStore((s) => s.isInPlan);

  if (!courseId) return null;

  const course = resolveCourse(courseId);
  if (!course) return null;

  const coreReqs = findCoreRequirementsForCourse(courseId);
  const majorCodes = findMajorsForCourse(courseId);
  const alreadyInPlan = isInPlan(courseId);

  function handleAddToStaging() {
    addToStaging(courseId!, course!.creditUnits);
    closeCourseModal();
  }

  return (
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
            {(coreReqs.length > 0 || majorCodes.length > 0) && (
              <div className="flex flex-wrap gap-1.5">
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
          <Button
            onClick={handleAddToStaging}
            disabled={alreadyInPlan}
          >
            {alreadyInPlan ? "Already in Plan" : "Add to Staging"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
