import { NextRequest, NextResponse } from "next/server";

// The three most recent semesters with PCR rating data (no summer data exists).
// Format: YYYYx where x = A (Spring), B (Summer), C (Fall).
// Update when new semester reviews become available (typically ~2 months after finals).
const PCR_SEMESTERS = ["2025C", "2025A"];

type SemesterData = {
  course_quality: number | null;
  difficulty: number | null;
  work_required: number | null;
  sections: Array<{
    instructors: Array<{ id: number; name: string }>;
    course_quality: number | null;
    instructor_quality: number | null;
    difficulty: number | null;
    work_required: number | null;
  }>;
} | null;

async function fetchSemester(courseCode: string, semester: string): Promise<SemesterData> {
  const url = `https://penncoursereview.com/api/base/${semester}/courses/${courseCode}/`;
  try {
    const res = await fetch(url, { next: { revalidate: 60 * 60 * 24 } });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ courseCode: string }> }
) {
  const { courseCode } = await params;

  const results = await Promise.all(
    PCR_SEMESTERS.map((sem) => fetchSemester(courseCode, sem))
  );

  // Top-level ratings: use the first semester that has a non-null course_quality
  const topLevel = results.find((r) => r?.course_quality != null);

  // Aggregate per-instructor ratings across all semesters
  const byInstructor = new Map<number, {
    name: string;
    courseQuality: number[];
    instructorQuality: number[];
    difficulty: number[];
    workRequired: number[];
  }>();

  for (const semData of results) {
    for (const section of semData?.sections ?? []) {
      for (const inst of section.instructors ?? []) {
        if (!byInstructor.has(inst.id)) {
          byInstructor.set(inst.id, {
            name: inst.name,
            courseQuality: [],
            instructorQuality: [],
            difficulty: [],
            workRequired: [],
          });
        }
        const row = byInstructor.get(inst.id)!;
        if (section.course_quality != null) row.courseQuality.push(section.course_quality);
        if (section.instructor_quality != null) row.instructorQuality.push(section.instructor_quality);
        if (section.difficulty != null) row.difficulty.push(section.difficulty);
        if (section.work_required != null) row.workRequired.push(section.work_required);
      }
    }
  }

  const avg = (arr: number[]) =>
    arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null;

  const instructors = [...byInstructor.values()].map((r) => ({
    name: r.name,
    courseQuality: avg(r.courseQuality),
    instructorQuality: avg(r.instructorQuality),
    difficulty: avg(r.difficulty),
    workRequired: avg(r.workRequired),
  }));

  return NextResponse.json({
    course_quality: topLevel?.course_quality ?? null,
    difficulty: topLevel?.difficulty ?? null,
    work_required: topLevel?.work_required ?? null,
    instructors,
  });
}
