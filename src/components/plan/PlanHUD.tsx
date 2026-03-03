"use client";

import { useValidation } from "@/hooks/useValidation";
import { useUIStore } from "@/stores/ui-store";
import { ExportMenu } from "@/components/export/ExportMenu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { AlertCircle, AlertTriangle, CheckCircle2 } from "lucide-react";

function ProgressBar({
  label,
  satisfied,
  required,
  onClick,
  tab,
}: {
  label: string;
  satisfied: number;
  required: number;
  onClick: () => void;
  tab: string;
}) {
  const pct = required > 0 ? Math.min(100, (satisfied / required) * 100) : 0;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={onClick}
            className="flex items-center gap-2 shrink-0 hover:opacity-75 transition-opacity"
          >
            <span className="text-xs text-muted-foreground w-8 text-right shrink-0">{label}</span>
            <div className="w-20 h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-300"
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="text-xs text-muted-foreground font-mono shrink-0">
              {satisfied.toFixed(1)}/{required.toFixed(1)}
            </span>
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom">Click for more information</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export function PlanHUD() {
  const validation = useValidation();
  const setRightPanelView = useUIStore((s) => s.setRightPanelView);
  const setProgressTab = useUIStore((s) => s.setProgressTab);

  const errorCount = validation.errors.length;
  const totalIssues = errorCount + validation.warnings.length;

  const { totalCU, graduationProgress, coreProgress, majorProgress } = validation;

  // Sum core requirements
  const coreSatisfied = coreProgress.reduce((sum, cp) => sum + cp.creditsSatisfied, 0);
  const coreRequired = coreProgress.reduce((sum, cp) => sum + cp.creditsRequired, 0);

  // Sum all majors into one bar
  const majorSatisfied = majorProgress.reduce((sum, mp) => sum + mp.totalCreditsSatisfied, 0);
  const majorRequired = majorProgress.reduce((sum, mp) => sum + mp.totalCreditsRequired, 0);

  function openTab(tab: string) {
    setRightPanelView("progress");
    setProgressTab(tab);
  }

  return (
    <div className="border rounded-xl px-4 py-2.5 bg-card flex items-center gap-4">
      {/* Issues button */}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={() => openTab("issues")}
              className="flex items-center gap-1.5 shrink-0 hover:opacity-75 transition-opacity"
            >
              {totalIssues === 0 ? (
                <>
                  <CheckCircle2 className="size-4 text-success" />
                  <span className="text-xs font-semibold text-success">Valid</span>
                </>
              ) : (
                <>
                  {errorCount > 0 ? (
                    <AlertCircle className="size-4 text-destructive" />
                  ) : (
                    <AlertTriangle className="size-4 text-warning" />
                  )}
                  <span
                    className="text-xs font-semibold"
                    style={{ color: errorCount > 0 ? undefined : "#eab308" }}
                  >
                    {totalIssues} issue{totalIssues !== 1 ? "s" : ""}
                  </span>
                </>
              )}
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom">Click for more information</TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <div className="w-px h-5 bg-border shrink-0" />

      {/* Total CU */}
      <ProgressBar
        label="Total"
        satisfied={totalCU}
        required={graduationProgress.minimumCU}
        onClick={() => openTab("overall")}
        tab="overall"
      />

      <div className="w-px h-5 bg-border shrink-0" />

      {/* Core */}
      <ProgressBar
        label="Core"
        satisfied={coreSatisfied}
        required={coreRequired}
        onClick={() => openTab("core")}
        tab="core"
      />

      {/* Major(s) — only shown if at least one major is declared */}
      {majorRequired > 0 && (
        <>
          <div className="w-px h-5 bg-border shrink-0" />
          <ProgressBar
            label="Major"
            satisfied={majorSatisfied}
            required={majorRequired}
            onClick={() => openTab(validation.majorProgress[0]?.majorCode ?? "core")}
            tab="major"
          />
        </>
      )}

      {/* Export — pushed to the right */}
      <div className="ml-auto shrink-0">
        <ExportMenu />
      </div>
    </div>
  );
}
