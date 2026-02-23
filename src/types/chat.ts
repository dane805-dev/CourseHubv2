import type { QuarterId } from "@/types/plan";
import type { MajorCode, WaiverConfig, CULoadPreference } from "@/types/user";
import type { ValidationResult } from "@/types/validation";

// ─── Message Types ───────────────────────────────────────────────────────────

export type ChatMessageRole = "user" | "assistant";
export type ChatMessageStatus = "pending" | "streaming" | "complete" | "error";

export interface ChatMessage {
  id: string;
  role: ChatMessageRole;
  content: string;
  status: ChatMessageStatus;
  timestamp: number;
  suggestedActions?: SuggestedAction[];
}

// ─── Suggested Action Types ───────────────────────────────────────────────────

export interface AddCourseAction {
  type: "add_course";
  courseId: string;
  location: "staging" | QuarterId;
  reason: string;
}

export interface MoveCourseAction {
  type: "move_course";
  courseId: string;
  fromLocation: "staging" | QuarterId;
  toLocation: "staging" | QuarterId;
  reason: string;
}

export interface RemoveCourseAction {
  type: "remove_course";
  courseId: string;
  reason: string;
}

export type SuggestedAction = AddCourseAction | MoveCourseAction | RemoveCourseAction;

// ─── API Request / Response ───────────────────────────────────────────────────

export interface ChatHistoryMessage {
  role: "user" | "assistant";
  content: string;
}

export interface CatalogEntry {
  id: string;
  title: string;
  dept: string;
  cu: number;
  term: string | null;
  prereqs: string | null;
  desc: string | null;
}

export interface SerializedPlanContext {
  placements: Array<{ courseId: string; location: string; creditUnits: number }>;
  quarterOrder: Record<QuarterId, string[]>;
  totalCU: number;
  majors: MajorCode[];
  waivers: WaiverConfig[];
  cuLoadPreference: CULoadPreference;
  validationResult: ValidationResult;
  catalog: CatalogEntry[];
}

export interface ChatRequest {
  messages: ChatHistoryMessage[];
  planContext: SerializedPlanContext;
}

export type StreamChunk =
  | { type: "text_delta"; delta: string }
  | { type: "actions"; actions: SuggestedAction[] }
  | { type: "done" }
  | { type: "error"; error: string };
