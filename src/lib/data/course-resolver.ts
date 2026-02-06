import type { CatalogCourse, RegistryCourse, ResolvedCourse } from "@/types/course";

// Import data at build time for initial local development.
// Once Supabase is running, course data will be served from the DB.
import catalogData from "../../../scripts/cleaned_courses.json";
import registryData from "../../../data/course_registry.json";

const catalog = catalogData as CatalogCourse[];
const registry = registryData as RegistryCourse[];

// Build lookup maps once at module load
const catalogMap = new Map<string, CatalogCourse>();
for (const course of catalog) {
  catalogMap.set(course.Course_ID, course);
}

const registryMap = new Map<string, RegistryCourse>();
for (const course of registry) {
  registryMap.set(course.course_id, course);
}

/**
 * Resolve a single course by ID.
 * Priority: catalog (full data) > registry (minimal data) > null.
 */
export function resolveCourse(courseId: string): ResolvedCourse | null {
  const catalogEntry = catalogMap.get(courseId);
  const registryEntry = registryMap.get(courseId);

  if (catalogEntry) {
    return catalogCourseToResolved(catalogEntry);
  }

  if (registryEntry) {
    return registryCourseToResolved(registryEntry);
  }

  return null;
}

/**
 * Resolve multiple courses by IDs.
 * Returns only courses that were found.
 */
export function resolveCourses(courseIds: string[]): ResolvedCourse[] {
  const results: ResolvedCourse[] = [];
  for (const id of courseIds) {
    const resolved = resolveCourse(id);
    if (resolved) {
      results.push(resolved);
    }
  }
  return results;
}

/**
 * Get all courses (catalog + registry merged).
 * Catalog entries take priority for courses that appear in both.
 */
export function getAllCourses(): ResolvedCourse[] {
  const result = new Map<string, ResolvedCourse>();

  // Add all registry entries first (minimal data)
  for (const entry of registry) {
    result.set(entry.course_id, registryCourseToResolved(entry));
  }

  // Override with catalog entries (full data)
  for (const entry of catalog) {
    result.set(entry.Course_ID, catalogCourseToResolved(entry));
  }

  return Array.from(result.values());
}

/**
 * Get only currently offered courses (from catalog).
 */
export function getOfferedCourses(): ResolvedCourse[] {
  return catalog.map(catalogCourseToResolved);
}

/**
 * Get credit units for a course by ID.
 * Returns null if course not found.
 */
export function getCreditUnits(courseId: string): number | null {
  const catalogEntry = catalogMap.get(courseId);
  if (catalogEntry) return catalogEntry.Credit_Units;

  const registryEntry = registryMap.get(courseId);
  if (registryEntry) return registryEntry.credit_units;

  return null;
}

/**
 * Check if a course is currently offered.
 */
export function isCurrentlyOffered(courseId: string): boolean {
  return catalogMap.has(courseId);
}

// ─── Conversion Helpers ───

function catalogCourseToResolved(c: CatalogCourse): ResolvedCourse {
  return {
    courseId: c.Course_ID,
    title: c.Course_Title,
    department: c.Department,
    creditUnits: c.Credit_Units,
    isWharton: true,
    currentlyOffered: true,
    catalogSource: "catalog",
    description: c.Description,
    prerequisites: c.Prerequisites,
    corequisites: c.Corequisites,
    termAvailability: c.Term_Availability,
    instructorsFall: c.Instructors_Fall,
    instructorsSpring: c.Instructors_Spring,
    sectionCountFall: c.Section_Count_Fall,
    sectionCountSpring: c.Section_Count_Spring,
    totalCapacity: c.Total_Capacity,
    meetingTimesFall: c.Meeting_Times_Fall,
    meetingTimesSpring: c.Meeting_Times_Spring,
    locationsFall: c.Locations_Fall,
    locationsSpring: c.Locations_Spring,
    averageRatingFall: c.Average_Rating_Fall,
    averageRatingSpring: c.Average_Rating_Spring,
    isCrosslisted: c.Is_Crosslisted,
    crosslistWith: c.Crosslist_With,
    canvasUrl: c.Canvas_URL,
    syllabiUrl: c.Syllabi_URL,
    courseLevel: c.Course_Level,
  };
}

function registryCourseToResolved(r: RegistryCourse): ResolvedCourse {
  return {
    courseId: r.course_id,
    title: r.course_title,
    department: r.department,
    creditUnits: r.credit_units,
    isWharton: r.is_wharton,
    currentlyOffered: r.currently_offered,
    catalogSource: r.catalog_source,
  };
}
