"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { useValidation } from "@/hooks/useValidation";
import { useProfileStore } from "@/stores/profile-store";
import { useUIStore } from "@/stores/ui-store";
import { MAJOR_OPTIONS } from "@/types/user";
import type { CoreProgress, MajorProgress } from "@/types/validation";
import { AlertCircle, AlertTriangle, CheckCircle2 } from "lucide-react";

const CREDITS_TYPE_LABELS: Record<string, string> = {
  minimum: "min",
  maximum: "max",
  combined_with_other_pillars: "total across pillars",
};

export function ProgressDashboard() {
  const validation = useValidation();
  const majors = useProfileStore((s) => s.majors);

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b">
        <h2 className="text-sm font-semibold">Degree Progress</h2>
        <div className="flex items-center gap-2 mt-2">
          <span className="text-xs text-muted-foreground">
            {validation.totalCU.toFixed(1)} / {validation.graduationProgress.minimumCU}-{validation.graduationProgress.maximumCU} CU
          </span>
          {validation.isValid ? (
            <Badge variant="outline" className="text-[10px] text-success">
              Valid
            </Badge>
          ) : (
            <Badge variant="outline" className="text-[10px] text-destructive">
              {validation.errors.length} issue{validation.errors.length !== 1 ? "s" : ""}
            </Badge>
          )}
        </div>
      </div>

      <Tabs defaultValue="core" className="flex-1 flex flex-col">
        <div className="px-4 pt-2">
          <TabsList className="w-full justify-start">
            <TabsTrigger value="core" className="text-xs">Core</TabsTrigger>
            {majors.map((code) => {
              const name = MAJOR_OPTIONS.find((m) => m.code === code)?.name ?? code;
              return (
                <TabsTrigger key={code} value={code} className="text-xs">
                  {code}
                </TabsTrigger>
              );
            })}
            <TabsTrigger value="issues" className="text-xs">
              Issues
              {(validation.errors.length + validation.warnings.length) > 0 && (
                <Badge
                  variant="outline"
                  className={`ml-1 text-[10px] ${validation.errors.length > 0 ? "text-destructive" : "text-warning"}`}
                >
                  {validation.errors.length + validation.warnings.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="overall" className="text-xs">Overall</TabsTrigger>
          </TabsList>
        </div>

        <ScrollArea className="flex-1">
          <TabsContent value="core" className="p-4 space-y-2 mt-0">
            <CoreProgressView progress={validation.coreProgress} />
          </TabsContent>

          {majors.map((code) => {
            const majorProgress = validation.majorProgress.find(
              (mp) => mp.majorCode === code
            );
            return (
              <TabsContent key={code} value={code} className="p-4 space-y-2 mt-0">
                {majorProgress && <MajorProgressView progress={majorProgress} />}
              </TabsContent>
            );
          })}

          <TabsContent value="issues" className="p-4 space-y-3 mt-0">
            <IssuesView validation={validation} />
          </TabsContent>

          <TabsContent value="overall" className="p-4 space-y-3 mt-0">
            <OverallView validation={validation} />
          </TabsContent>
        </ScrollArea>
      </Tabs>
    </div>
  );
}

function CoreProgressView({ progress }: { progress: CoreProgress[] }) {
  const setHighlightedCourses = useUIStore((s) => s.setHighlightedCourses);

  return (
    <div className="space-y-1.5">
      {progress.map((cp) => (
        <button
          key={cp.coreCode}
          className="w-full text-left p-2.5 rounded-md border hover:border-muted-foreground transition-colors"
          onClick={() => setHighlightedCourses(cp.satisfyingCourses)}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium">{cp.coreName}</span>
            <StatusBadge status={cp.status} />
          </div>
          <div className="flex items-center justify-between mt-1">
            <span className="text-[10px] text-muted-foreground">
              {cp.creditsSatisfied.toFixed(1)} / {cp.creditsRequired.toFixed(1)} CU
            </span>
            {cp.satisfyingCourses.length > 0 && (
              <span className="text-[10px] text-muted-foreground font-mono">
                {cp.satisfyingCourses.join(", ")}
              </span>
            )}
          </div>
        </button>
      ))}
    </div>
  );
}

function MajorProgressView({ progress }: { progress: MajorProgress }) {
  const setHighlightedCourses = useUIStore((s) => s.setHighlightedCourses);

  return (
    <div className="space-y-3">
      <div>
        <div className="text-sm font-medium">{progress.majorName}</div>
        <div className="flex items-center gap-2 mt-1">
          <div className="flex-1 h-2 rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${progress.percentComplete}%` }}
            />
          </div>
          <span className="text-xs text-muted-foreground">
            {progress.percentComplete}%
          </span>
        </div>
        <span className="text-xs text-muted-foreground">
          {progress.totalCreditsSatisfied.toFixed(1)} / {progress.totalCreditsRequired.toFixed(1)} CU
        </span>
      </div>

      {progress.requiredCoursesProgress && (
        <div className="space-y-1">
          <h4 className="text-xs font-medium">Required Courses</h4>
          <div
            className="p-2 rounded-md border cursor-pointer hover:border-muted-foreground"
            onClick={() =>
              setHighlightedCourses(progress.requiredCoursesProgress!.satisfyingCourses)
            }
          >
            <div className="text-[10px] text-muted-foreground">
              {progress.requiredCoursesProgress.creditsSatisfied.toFixed(1)} / {progress.requiredCoursesProgress.creditsRequired.toFixed(1)} CU
            </div>
            {progress.requiredCoursesProgress.creditsSatisfied < progress.requiredCoursesProgress.creditsRequired &&
              progress.requiredCoursesProgress.missingCourses.length > 0 && (
              progress.requiredCoursesProgress.selectionType === "choose" ? (
                <div className="text-[10px] mt-1" style={{ color: "#eab308" }}>
                  Options: {progress.requiredCoursesProgress.missingCourses.join(", ")}
                </div>
              ) : (
                <div className="text-[10px] text-destructive mt-1">
                  Missing: {progress.requiredCoursesProgress.missingCourses.join(", ")}
                </div>
              )
            )}
          </div>
        </div>
      )}

      {progress.electiveCoursesProgress && (
        <div className="space-y-1">
          <h4 className="text-xs font-medium">Electives</h4>
          <div
            className="p-2 rounded-md border cursor-pointer hover:border-muted-foreground"
            onClick={() =>
              setHighlightedCourses(progress.electiveCoursesProgress!.satisfyingCourses)
            }
          >
            <div className="text-[10px] text-muted-foreground">
              {progress.electiveCoursesProgress.creditsSatisfied.toFixed(1)} / {progress.electiveCoursesProgress.creditsRequired.toFixed(1)} CU
            </div>
            {progress.electiveCoursesProgress.satisfyingCourses.length > 0 && (
              <div className="text-[10px] text-muted-foreground mt-1 font-mono">
                {progress.electiveCoursesProgress.satisfyingCourses.join(", ")}
              </div>
            )}
          </div>
        </div>
      )}

      {progress.pillarProgress && progress.pillarProgress.map((pp) => (
        <div key={pp.pillarCode} className="space-y-1">
          <h4 className="text-xs font-medium">{pp.pillarName}</h4>
          <div
            className="p-2 rounded-md border cursor-pointer hover:border-muted-foreground"
            onClick={() => setHighlightedCourses(pp.satisfyingCourses)}
          >
            <div className="text-[10px] text-muted-foreground">
              {pp.creditsSatisfied.toFixed(1)} / {pp.creditsRequired.toFixed(1)} CU
              {pp.creditsType && ` (${CREDITS_TYPE_LABELS[pp.creditsType] ?? pp.creditsType})`}
            </div>
            {pp.creditsSatisfied < pp.creditsRequired &&
              pp.missingCourses && pp.missingCourses.length > 0 && pp.missingCourses.length <= 2 && (
              <div className="text-[10px] text-destructive mt-1">
                Missing: {pp.missingCourses.join(", ")}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function IssuesView({ validation }: { validation: ReturnType<typeof useValidation> }) {
  const setHighlightedCourses = useUIStore((s) => s.setHighlightedCourses);

  if (validation.errors.length === 0 && validation.warnings.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <CheckCircle2 className="w-8 h-8 mb-2 text-success" />
        <span className="text-sm">No Issues Found</span>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {validation.errors.length > 0 && (
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 text-destructive" />
            <h4 className="text-xs font-medium text-destructive">
              Errors ({validation.errors.length})
            </h4>
          </div>
          {validation.errors.map((err, i) => (
            <button
              key={i}
              className="w-full text-left p-2.5 rounded-md border border-destructive/30 bg-destructive/5 hover:border-destructive/60 transition-colors"
              onClick={() => setHighlightedCourses(err.courseIds ?? [])}
            >
              <div className="text-xs text-destructive">{err.message}</div>
              {err.courseIds && err.courseIds.length > 0 && (
                <div className="text-[10px] text-muted-foreground font-mono mt-1">
                  {err.courseIds.join(", ")}
                </div>
              )}
            </button>
          ))}
        </div>
      )}

      {validation.warnings.length > 0 && (
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-warning" />
            <h4 className="text-xs font-medium text-warning">
              Warnings ({validation.warnings.length})
            </h4>
          </div>
          {validation.warnings.map((warn, i) => {
            const relatedCourses = [
              ...(warn.courseId ? [warn.courseId] : []),
              ...(warn.relatedCourseIds ?? []),
            ];
            return (
              <button
                key={i}
                className="w-full text-left p-2.5 rounded-md border border-warning/30 bg-warning/5 hover:border-warning/60 transition-colors"
                onClick={() => setHighlightedCourses(relatedCourses)}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="text-xs" style={{ color: "#eab308" }}>{warn.message}</div>
                  {warn.severity && (
                    <Badge variant="outline" className="text-[10px] text-warning shrink-0">
                      {warn.severity}
                    </Badge>
                  )}
                </div>
                {relatedCourses.length > 0 && (
                  <div className="text-[10px] text-muted-foreground font-mono mt-1">
                    {relatedCourses.join(", ")}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function OverallView({ validation }: { validation: ReturnType<typeof useValidation> }) {
  return (
    <div className="space-y-3">
      <div className="p-3 rounded-md border">
        <div className="text-sm font-medium">Graduation Requirements</div>
        <div className="text-xs text-muted-foreground mt-1">
          Total: {validation.totalCU.toFixed(1)} CU ({validation.graduationProgress.minimumCU}-{validation.graduationProgress.maximumCU} required)
        </div>
        {!validation.graduationProgress.isInRange && validation.totalCU > 0 && (
          <div className="text-xs text-destructive mt-1">
            {validation.totalCU < validation.graduationProgress.minimumCU
              ? `Need ${(validation.graduationProgress.minimumCU - validation.totalCU).toFixed(1)} more CU`
              : `Exceeds maximum by ${(validation.totalCU - validation.graduationProgress.maximumCU).toFixed(1)} CU`}
          </div>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    satisfied: "text-success",
    waived: "text-primary",
    partial: "text-warning",
    missing: "text-destructive",
  };

  const labels: Record<string, string> = {
    satisfied: "Done",
    waived: "Waived",
    partial: "Partial",
    missing: "Missing",
  };

  return (
    <Badge variant="outline" className={`text-[10px] ${colors[status] ?? ""}`}>
      {labels[status] ?? status}
    </Badge>
  );
}
