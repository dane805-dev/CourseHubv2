import type { SerializedPlanContext } from "@/types/chat";
import type { QuarterId } from "@/types/plan";
import type { ValidationError, ValidationWarning, CoreProgress, MajorProgress } from "@/types/validation";

const QUARTER_LABELS: Record<QuarterId, string> = {
  Y1F_Q1: "Year 1 Fall Q1",
  Y1F_Q2: "Year 1 Fall Q2",
  Y1S_Q3: "Year 1 Spring Q3",
  Y1S_Q4: "Year 1 Spring Q4",
  Y2F_Q5: "Year 2 Fall Q5",
  Y2F_Q6: "Year 2 Fall Q6",
  Y2S_Q7: "Year 2 Spring Q7",
  Y2S_Q8: "Year 2 Spring Q8",
};

const QUARTER_IDS: QuarterId[] = [
  "Y1F_Q1", "Y1F_Q2", "Y1S_Q3", "Y1S_Q4",
  "Y2F_Q5", "Y2F_Q6", "Y2S_Q7", "Y2S_Q8",
];

export function buildSystemPrompt(ctx: SerializedPlanContext): string {
  const sections: string[] = [];

  // ─── Preamble ───
  sections.push(`You are an AI academic advisor for a Wharton MBA student using CourseHub, a course planning application.
You have full knowledge of the student's current plan, declared majors, active waivers, and validation status.

Your responsibilities:
1. Answer questions about courses, requirements, and the student's plan
2. Suggest courses with clear reasoning tied to requirements and graduation progress
3. When the student asks for plan changes, propose them as structured actions
4. Explain validation errors and warnings in plain, actionable language

When you recommend plan changes:
- Explain your reasoning FIRST in plain text
- Then, if suggesting changes, end your response with an ACTIONS_JSON block
- Only suggest courses that exist in the catalog provided below
- Only use valid location IDs: "staging", "Y1F_Q1", "Y1F_Q2", "Y1S_Q3", "Y1S_Q4", "Y2F_Q5", "Y2F_Q6", "Y2S_Q7", "Y2S_Q8"
- For add_course: only suggest courses NOT already in the plan
- For move_course: only suggest courses ALREADY in the plan
- For remove_course: only suggest courses ALREADY in the plan
- If no plan changes are needed, omit the ACTIONS_JSON block entirely

RESPONSE FORMATTING RULES:
Your responses are rendered as markdown. Follow these rules exactly:
- Use # for a top-level heading that introduces the entire response topic (use sparingly, one per response max)
- Use ## for subheadings that introduce a new section within your response
- Use ### for a finer section label or category within a ## section
- Use **text** to bold key terms, course IDs, requirement names, or critical callouts — not for decoration
- Use --- on its own line to insert a visible horizontal divider between major sections
- Use bullet lists (- item) for enumerations, options, or multi-item explanations
- Use numbered lists (1. item) only when order or sequence matters
- Always leave a blank line between paragraphs, between a heading and its content, and before/after a --- divider
- Keep responses concise — avoid walls of text; prefer short paragraphs and lists
- Never output raw markdown syntax as literal characters (e.g. do not write \*\*bold\*\* — just use **bold**)

ACTIONS_JSON format (append at the very end of your response if suggesting changes):
ACTIONS_JSON: [
  {"type":"add_course","courseId":"LGST6110","location":"Y1S_Q3","reason":"Satisfies LGST core requirement"},
  {"type":"move_course","courseId":"FNCE7210","fromLocation":"Y1F_Q1","toLocation":"Y2F_Q5","reason":"FNCE7210 requires FNCE6110 as a prerequisite"}
]`);

  // ─── Student Profile ───
  const waiverSummary = ctx.waivers.map((w: any) =>
    `${w.coreCode} (${w.waiverType}${w.substitutionCourseId ? ` → ${w.substitutionCourseId}` : ""})`
  ).join(", ") || "None";

  sections.push(`--- STUDENT PROFILE ---
Majors: ${ctx.majors.join(", ") || "None declared"}
Waivers: ${waiverSummary}
CU Load Preference: ${ctx.cuLoadPreference}`);

  // ─── Current Plan ───
  const placementMap = new Map(ctx.placements.map((p) => [p.courseId, p]));
  const stagedCourses = ctx.placements
    .filter((p) => p.location === "staging")
    .map((p) => `${p.courseId} (${p.creditUnits.toFixed(1)} CU)`);

  const quarterLines: string[] = [];
  for (const qId of QUARTER_IDS) {
    const courses = (ctx.quarterOrder[qId] || []);
    if (courses.length === 0) {
      quarterLines.push(`${QUARTER_LABELS[qId]}: (empty)`);
    } else {
      const courseSummaries = courses.map((id) => {
        const p = placementMap.get(id);
        return `${id} (${p?.creditUnits.toFixed(1) ?? "?"} CU)`;
      });
      const quarterCU = courses.reduce((sum, id) => sum + (placementMap.get(id)?.creditUnits ?? 0), 0);
      quarterLines.push(`${QUARTER_LABELS[qId]}: ${courseSummaries.join(", ")} [${quarterCU.toFixed(1)} CU]`);
    }
  }

  sections.push(`--- CURRENT PLAN ---
${quarterLines.join("\n")}
Staging (unscheduled): ${stagedCourses.length > 0 ? stagedCourses.join(", ") : "None"}
Total CU placed in quarters: ${ctx.totalCU.toFixed(1)} / 19.0–21.0 required`);

  // ─── Validation Status ───
  const vr = ctx.validationResult as any;
  const errors: ValidationError[] = vr?.errors ?? [];
  const warnings: ValidationWarning[] = vr?.warnings ?? [];
  const coreProgress: CoreProgress[] = vr?.coreProgress ?? [];
  const majorProgress: MajorProgress[] = vr?.majorProgress ?? [];

  const errorLines = errors.map((e) => `  - [${e.type}] ${e.message}`).join("\n") || "  None";
  const warningLines = warnings.map((w) => `  - [${w.type}] ${w.message ?? w.type}`).join("\n") || "  None";

  const coreLines = coreProgress.map((cp) =>
    `  - ${cp.coreCode}: ${cp.status} (${cp.creditsSatisfied}/${cp.creditsRequired} CU)${
      cp.satisfyingCourses?.length ? ` — via ${cp.satisfyingCourses.join(", ")}` : ""
    }`
  ).join("\n") || "  (none)";

  const majorLines = majorProgress.map((mp) =>
    `  - ${mp.majorCode}: ${mp.totalCreditsSatisfied.toFixed(1)}/${mp.totalCreditsRequired.toFixed(1)} CU (${mp.percentComplete.toFixed(0)}%)`
  ).join("\n") || "  (none)";

  sections.push(`--- VALIDATION STATUS ---
Valid: ${vr?.isValid ?? "unknown"}
Errors:
${errorLines}
Warnings:
${warningLines}
Core Requirements Progress:
${coreLines}
Major Requirements Progress:
${majorLines}`);

  // ─── Course Catalog ───
  const catalogJSON = JSON.stringify(
    ctx.catalog.map((c) => ({
      id: c.id,
      title: c.title,
      dept: c.dept,
      cu: c.cu,
      term: c.term,
      prereqs: c.prereqs,
      desc: c.desc ? c.desc.slice(0, 200) : null,
    }))
  );

  sections.push(`--- COURSE CATALOG ---
${catalogJSON}`);

  return sections.join("\n\n");
}
