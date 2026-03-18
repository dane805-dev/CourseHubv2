"use client";

import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Header } from "./Header";

interface AppShellProps {
  planContent: ReactNode;
  rightPanel: ReactNode;
  rightPanelOpen: boolean;
}

export function AppShell({ planContent, rightPanel, rightPanelOpen }: AppShellProps) {
  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <main className="flex-1 overflow-y-auto p-4 bg-background">
          {planContent}
        </main>
        <aside
          className={cn(
            "border-l border-border bg-card relative z-10 transition-all duration-200 ease-in-out",
            "shadow-[-4px_0_12px_0_rgb(0_0_0/0.06)] dark:shadow-[-4px_0_12px_0_rgb(0_0_0/0.18)]",
            rightPanelOpen
              ? "w-[30%] min-w-[320px] max-w-[480px] overflow-y-auto"
              : "w-0 min-w-0 max-w-0 overflow-hidden border-l-0 shadow-none"
          )}
        >
          {rightPanel}
        </aside>
      </div>
    </div>
  );
}
