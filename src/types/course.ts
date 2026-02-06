/** Full course data from the catalog (cleaned_courses.json) */
export interface CatalogCourse {
  Course_ID: string;
  Course_Title: string;
  Department: string;
  Credit_Units: number;
  Description: string | null;
  Prerequisites: string | null;
  Corequisites: string | null;
  Term_Availability: "Fall" | "Spring" | "Both" | null;
  Instructors_Fall: string | null;
  Instructors_Spring: string | null;
  Section_Count_Fall: number;
  Section_Count_Spring: number;
  Total_Capacity: number;
  Meeting_Times_Fall: string | null;
  Meeting_Times_Spring: string | null;
  Locations_Fall: string | null;
  Locations_Spring: string | null;
  Average_Rating_Fall: number | null;
  Average_Rating_Spring: number | null;
  Is_Crosslisted: boolean;
  Crosslist_With: string | null;
  Canvas_URL: string | null;
  Syllabi_URL: string | null;
  Course_Level: number;
}

/** Lightweight course data from the registry (course_registry.json) */
export interface RegistryCourse {
  course_id: string;
  course_title: string;
  department: string;
  credit_units: number;
  is_wharton: boolean;
  currently_offered: boolean;
  catalog_source: "catalog" | "manual" | "non_wharton";
}

/**
 * Resolved course combining catalog + registry data.
 * Guaranteed fields always present; scheduling fields optional
 * (only available for currently-offered catalog courses).
 */
export interface ResolvedCourse {
  // Guaranteed fields (from registry or catalog)
  courseId: string;
  title: string;
  department: string;
  creditUnits: number;
  isWharton: boolean;
  currentlyOffered: boolean;
  catalogSource: "catalog" | "manual" | "non_wharton";

  // Scheduling fields (only from catalog)
  description?: string | null;
  prerequisites?: string | null;
  corequisites?: string | null;
  termAvailability?: "Fall" | "Spring" | "Both" | null;
  instructorsFall?: string | null;
  instructorsSpring?: string | null;
  sectionCountFall?: number;
  sectionCountSpring?: number;
  totalCapacity?: number;
  meetingTimesFall?: string | null;
  meetingTimesSpring?: string | null;
  locationsFall?: string | null;
  locationsSpring?: string | null;
  averageRatingFall?: number | null;
  averageRatingSpring?: number | null;
  isCrosslisted?: boolean;
  crosslistWith?: string | null;
  canvasUrl?: string | null;
  syllabiUrl?: string | null;
  courseLevel?: number;
}
