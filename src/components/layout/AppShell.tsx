"use client";

import { ReactNode } from "react";
import { Header } from "./Header";
import { useUIStore } from "@/stores/ui-store";

interface AppShellProps {
  planContent: ReactNode;
  rightPanel: ReactNode;
}

export function AppShell({ planContent, rightPanel }: AppShellProps) {
  const rightPanelOpen = useUIStore((s) => s.rightPanelOpen);

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        {/* Plan View — 70% or 100% */}
        <main
          className={`flex-1 overflow-y-auto p-4 transition-all duration-200 ${
            rightPanelOpen ? "w-[70%]" : "w-full"
          }`}
        >
          {planContent}
        </main>

        {/* Right Panel — 30% */}
        {rightPanelOpen && (
          <aside className="w-[30%] min-w-[320px] max-w-[480px] border-l overflow-y-auto bg-card">
            {rightPanel}
          </aside>
        )}
      </div>
    </div>
  );
}
