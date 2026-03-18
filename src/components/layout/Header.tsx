"use client";

import { useTheme } from "next-themes";
import { Sun, Moon, Undo2, Redo2, MessageCircle, BookOpen, BarChart2, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePlanStore } from "@/stores/plan-store";
import { useUIStore } from "@/stores/ui-store";
import { useTemporalStore } from "@/hooks/useTemporalStore";
import { useUndoRedoKeys } from "@/hooks/useUndoRedoKeys";

export function Header() {
  const isDirty = usePlanStore((s) => s.isDirty);
  const isSaving = usePlanStore((s) => s.isSaving);
  const rightPanelView = useUIStore((s) => s.rightPanelView);
  const rightPanelOpen = useUIStore((s) => s.rightPanelOpen);
  const setRightPanelView = useUIStore((s) => s.setRightPanelView);
  const setRightPanelOpen = useUIStore((s) => s.setRightPanelOpen);

  function handlePanelNav(view: "chat" | "catalog" | "progress" | "profile") {
    if (rightPanelView === view && rightPanelOpen) {
      setRightPanelOpen(false);
    } else {
      setRightPanelView(view);
    }
  }
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
          onClick={() => handlePanelNav("chat")}
          className={rightPanelView === "chat" && rightPanelOpen ? "bg-primary/10 text-primary" : "text-muted-foreground"}
        >
          <MessageCircle size={14} /> Chat
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handlePanelNav("catalog")}
          className={rightPanelView === "catalog" && rightPanelOpen ? "bg-primary/10 text-primary" : "text-muted-foreground"}
        >
          <BookOpen size={14} /> Catalog
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handlePanelNav("progress")}
          className={rightPanelView === "progress" && rightPanelOpen ? "bg-primary/10 text-primary" : "text-muted-foreground"}
        >
          <BarChart2 size={14} /> Progress
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handlePanelNav("profile")}
          className={rightPanelView === "profile" && rightPanelOpen ? "bg-primary/10 text-primary" : "text-muted-foreground"}
        >
          <User size={14} /> Profile
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
