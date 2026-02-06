"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { usePlanStore } from "@/stores/plan-store";
import { resolveCourse } from "@/lib/data/course-resolver";
import { QUARTER_INFO } from "@/types/plan";
import type { QuarterId } from "@/types/plan";
import { QUARTER_IDS } from "@/types/plan";

export function ExportMenu() {
  const quarterOrder = usePlanStore((s) => s.quarterOrder);
  const placements = usePlanStore((s) => s.placements);

  function exportCSV() {
    const rows: string[][] = [
      ["Course_ID", "Course_Title", "Department", "Credit_Units", "Quarter", "Semester"],
    ];

    for (const qId of QUARTER_IDS) {
      const courses = quarterOrder[qId];
      const info = QUARTER_INFO[qId];

      for (const courseId of courses) {
        const course = resolveCourse(courseId);
        if (!course) continue;

        rows.push([
          course.courseId,
          `"${course.title}"`,
          course.department,
          course.creditUnits.toFixed(1),
          info.label,
          info.semester,
        ]);
      }
    }

    const csv = rows.map((r) => r.join(",")).join("\n");
    downloadFile(csv, "course-plan.csv", "text/csv");
  }

  function exportPlanText() {
    let text = "Course Hub - Plan Export\n";
    text += "========================\n\n";

    let totalCU = 0;

    for (const qId of QUARTER_IDS) {
      const courses = quarterOrder[qId];
      const info = QUARTER_INFO[qId];
      let quarterCU = 0;

      text += `${info.label}\n`;
      text += "-".repeat(info.label.length) + "\n";

      if (courses.length === 0) {
        text += "  (no courses)\n";
      } else {
        for (const courseId of courses) {
          const course = resolveCourse(courseId);
          if (!course) continue;
          text += `  ${course.courseId} - ${course.title} (${course.creditUnits.toFixed(1)} CU)\n`;
          quarterCU += course.creditUnits;
        }
      }

      text += `  Quarter Total: ${quarterCU.toFixed(1)} CU\n\n`;
      totalCU += quarterCU;
    }

    text += `\nTotal Credits: ${totalCU.toFixed(1)} CU\n`;

    downloadFile(text, "course-plan.txt", "text/plain");
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm">
          Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={exportCSV}>
          Export as CSV
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportPlanText}>
          Export as Text
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function downloadFile(content: string, filename: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
