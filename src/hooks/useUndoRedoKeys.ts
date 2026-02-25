"use client";

import { useEffect } from "react";
import { usePlanStore } from "@/stores/plan-store";

export function useUndoRedoKeys() {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Don't intercept undo/redo inside text inputs
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        return;
      }

      const mod = e.metaKey || e.ctrlKey;
      if (!mod || e.key.toLowerCase() !== "z") return;

      e.preventDefault();

      const temporal = usePlanStore.temporal.getState();
      if (e.shiftKey) {
        if (temporal.futureStates.length > 0) {
          temporal.redo();
          usePlanStore.setState({ isDirty: true });
        }
      } else {
        if (temporal.pastStates.length > 0) {
          temporal.undo();
          usePlanStore.setState({ isDirty: true });
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);
}
