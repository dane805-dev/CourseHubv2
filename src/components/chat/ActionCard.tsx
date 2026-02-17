"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { usePlanStore } from "@/stores/plan-store";
import { QUARTER_INFO, QUARTER_IDS } from "@/types/plan";
import type { SuggestedAction } from "@/types/chat";
import type { QuarterId } from "@/types/plan";

function isQuarterId(val: string): val is QuarterId {
  return QUARTER_IDS.includes(val as QuarterId);
}

function describeAction(action: SuggestedAction): string {
  const locationLabel = (loc: string) =>
    loc === "staging"
      ? "Staging"
      : isQuarterId(loc)
      ? QUARTER_INFO[loc].label
      : loc;

  switch (action.type) {
    case "add_course":
      return `+ Add ${action.courseId} → ${locationLabel(action.location)}`;
    case "move_course":
      return `→ Move ${action.courseId} to ${locationLabel(action.toLocation)}`;
    case "remove_course":
      return `− Remove ${action.courseId}`;
  }
}

interface ActionCardProps {
  action: SuggestedAction;
}

export function ActionCard({ action }: ActionCardProps) {
  const [applied, setApplied] = useState(false);
  const planStore = usePlanStore();

  function handleApply() {
    switch (action.type) {
      case "add_course":
        if (action.location === "staging") {
          planStore.addToStaging(action.courseId);
        } else if (isQuarterId(action.location)) {
          planStore.addToQuarter(action.courseId, action.location);
        }
        break;
      case "move_course":
        if (action.toLocation === "staging") {
          planStore.moveToStaging(action.courseId);
        } else if (isQuarterId(action.toLocation)) {
          planStore.moveToQuarter(action.courseId, action.toLocation);
        }
        break;
      case "remove_course":
        planStore.removeCourse(action.courseId);
        break;
    }
    setApplied(true);
  }

  return (
    <div className="rounded-md border border-border bg-background/50 p-2 mt-1.5">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="text-[10px] font-semibold font-mono text-foreground leading-tight">
            {describeAction(action)}
          </div>
          <div className="text-[10px] text-muted-foreground mt-0.5 leading-tight">
            {action.reason}
          </div>
        </div>
        <Button
          size="sm"
          variant={applied ? "outline" : "default"}
          className="h-6 text-[10px] px-2 shrink-0 self-start"
          onClick={handleApply}
          disabled={applied}
        >
          {applied ? "Applied" : "Apply"}
        </Button>
      </div>
    </div>
  );
}
