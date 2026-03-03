"use client";

import { ReactNode } from "react";
import { Header } from "./Header";

interface AppShellProps {
  planContent: ReactNode;
  rightPanel: ReactNode;
}

export function AppShell({ planContent, rightPanel }: AppShellProps) {
  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <main className="flex-1 overflow-y-auto p-4 bg-background">
          {planContent}
        </main>
        <aside className="w-[30%] min-w-[320px] max-w-[480px] border-l border-border overflow-y-auto bg-card relative z-10 shadow-[-4px_0_12px_0_rgb(0_0_0/0.06)] dark:shadow-[-4px_0_12px_0_rgb(0_0_0/0.18)]">
          {rightPanel}
        </aside>
      </div>
    </div>
  );
}
