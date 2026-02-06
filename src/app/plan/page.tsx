"use client";

import { AppShell } from "@/components/layout/AppShell";
import { PlanGrid } from "@/components/plan/PlanGrid";
import { CatalogBrowser } from "@/components/catalog/CatalogBrowser";
import { ProgressDashboard } from "@/components/progress/ProgressDashboard";
import { CourseModal } from "@/components/course/CourseModal";
import { useUIStore } from "@/stores/ui-store";

export default function PlanPage() {
  const rightPanelView = useUIStore((s) => s.rightPanelView);

  const rightPanel =
    rightPanelView === "catalog" ? <CatalogBrowser /> : <ProgressDashboard />;

  return (
    <>
      <AppShell planContent={<PlanGrid />} rightPanel={rightPanel} />
      <CourseModal />
    </>
  );
}
