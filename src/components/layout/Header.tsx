"use client";

import { useTheme } from "next-themes";
import { Sun, Moon, Undo2, Redo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePlanStore } from "@/stores/plan-store";
import { useUIStore } from "@/stores/ui-store";
import { useTemporalStore } from "@/hooks/useTemporalStore";
import { useUndoRedoKeys } from "@/hooks/useUndoRedoKeys";

export function Header() {
  const isDirty = usePlanStore((s) => s.isDirty);
  const isSaving = usePlanStore((s) => s.isSaving);
  const rightPanelView = useUIStore((s) => s.rightPanelView);
  const setRightPanelView = useUIStore((s) => s.setRightPanelView);
  const canUndo = useTemporalStore((s) => s.pastStates.length > 0);
  const canRedo = useTemporalStore((s) => s.futureStates.length > 0);
  const { theme, setTheme } = useTheme();

  useUndoRedoKeys();

  function handleUndo() {
    usePlanStore.temporal.getState().undo();
    usePlanStore.setState({ isDirty: true });
  }

  function handleRedo() {
    usePlanStore.temporal.getState().redo();
    usePlanStore.setState({ isDirty: true });
  }

  return (
    <header className="h-14 border-b flex items-center justify-between px-4 bg-card shrink-0">
      <div className="flex items-center gap-4">
        <h1 className="text-lg font-bold tracking-tight">Course Hub</h1>
        <span className="text-xs text-muted-foreground">
          {isDirty ? (isSaving ? "Saving..." : "Unsaved changes") : "Saved"}
        </span>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleUndo}
          disabled={!canUndo}
          title="Undo (Ctrl+Z)"
          className="size-8"
        >
          <Undo2 className="size-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleRedo}
          disabled={!canRedo}
          title="Redo (Ctrl+Shift+Z)"
          className="size-8"
        >
          <Redo2 className="size-4" />
        </Button>
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setRightPanelView("chat")}
          className={rightPanelView === "chat" ? "" : "text-muted-foreground"}
        >
          Chat
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setRightPanelView("catalog")}
          className={rightPanelView === "catalog" ? "" : "text-muted-foreground"}
        >
          Catalog
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setRightPanelView("progress")}
          className={rightPanelView === "progress" ? "" : "text-muted-foreground"}
        >
          Progress
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setRightPanelView("profile")}
          className={rightPanelView === "profile" ? "" : "text-muted-foreground"}
        >
          Profile
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          aria-label="Toggle theme"
        >
          {theme === "dark" ? (
            <Sun className="size-4" />
          ) : (
            <Moon className="size-4" />
          )}
        </Button>
      </div>
    </header>
  );
}
