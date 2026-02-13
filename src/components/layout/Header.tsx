"use client";

import { Button } from "@/components/ui/button";
import { usePlanStore } from "@/stores/plan-store";
import { useUIStore } from "@/stores/ui-store";
import { ExportMenu } from "@/components/export/ExportMenu";

export function Header() {
  const totalCU = usePlanStore((s) => s.getTotalCU());
  const isDirty = usePlanStore((s) => s.isDirty);
  const isSaving = usePlanStore((s) => s.isSaving);
  const toggleRightPanel = useUIStore((s) => s.toggleRightPanel);
  const rightPanelOpen = useUIStore((s) => s.rightPanelOpen);
  const setRightPanelView = useUIStore((s) => s.setRightPanelView);

  return (
    <header className="h-14 border-b flex items-center justify-between px-4 bg-card shrink-0">
      <div className="flex items-center gap-4">
        <h1 className="text-lg font-bold tracking-tight">Course Hub</h1>
        <span className="text-sm text-muted-foreground font-mono">
          {totalCU.toFixed(1)} CU
        </span>
        <span className="text-xs text-muted-foreground">
          {isDirty ? (isSaving ? "Saving..." : "Unsaved changes") : "Saved"}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setRightPanelView("catalog")}
          className={rightPanelOpen ? "" : "text-muted-foreground"}
        >
          Catalog
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setRightPanelView("progress")}
          className={rightPanelOpen ? "" : "text-muted-foreground"}
        >
          Progress
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setRightPanelView("profile")}
          className={rightPanelOpen ? "" : "text-muted-foreground"}
        >
          Profile
        </Button>
        <ExportMenu />
        <Button variant="ghost" size="sm" onClick={toggleRightPanel}>
          {rightPanelOpen ? "Close Panel" : "Open Panel"}
        </Button>
      </div>
    </header>
  );
}
