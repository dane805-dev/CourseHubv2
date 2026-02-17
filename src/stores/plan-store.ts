"use client";

import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import type { Placement, PlanLocation, QuarterId } from "@/types/plan";
import { QUARTER_IDS, normalizeQuarterForCourse } from "@/types/plan";
import { getCreditUnits } from "@/lib/data/course-resolver";

interface PlanState {
  // Data
  planId: string | null;
  placements: Record<string, Placement>; // courseId -> Placement
  stagingOrder: string[]; // ordered courseIds in staging
  quarterOrder: Record<QuarterId, string[]>; // ordered courseIds per quarter

  // Save status
  isDirty: boolean;
  isSaving: boolean;
  lastSavedAt: string | null;

  // Actions
  loadPlan: (planId: string, placements: Placement[]) => void;
  addToStaging: (courseId: string, creditUnits?: number) => void;
  addToQuarter: (courseId: string, quarterId: QuarterId, creditUnits?: number, index?: number) => void;
  moveToQuarter: (courseId: string, quarterId: QuarterId, index?: number) => void;
  moveToStaging: (courseId: string) => void;
  removeCourse: (courseId: string) => void;
  reorderInQuarter: (quarterId: QuarterId, oldIndex: number, newIndex: number) => void;
  reorderInStaging: (oldIndex: number, newIndex: number) => void;
  markSaving: () => void;
  markSaved: () => void;
  markDirty: () => void;

  // Derived
  isInPlan: (courseId: string) => boolean;
  getCUForQuarter: (quarterId: QuarterId) => number;
  getCUForSemester: (semesterId: string) => number;
  getTotalCU: () => number;
  getPlacedCourseIds: () => string[];
  getPlacementsArray: () => Placement[];
}

export const usePlanStore = create<PlanState>()(
  immer((set, get) => ({
    planId: null,
    placements: {},
    stagingOrder: [],
    quarterOrder: QUARTER_IDS.reduce(
      (acc, qId) => ({ ...acc, [qId]: [] }),
      {} as Record<QuarterId, string[]>
    ),
    isDirty: false,
    isSaving: false,
    lastSavedAt: null,

    loadPlan: (planId, placements) => {
      set((state) => {
        state.planId = planId;
        state.placements = {};
        state.stagingOrder = [];
        state.quarterOrder = QUARTER_IDS.reduce(
          (acc, qId) => ({ ...acc, [qId]: [] }),
          {} as Record<QuarterId, string[]>
        );

        for (const p of placements) {
          state.placements[p.courseId] = p;
          if (p.location === "staging") {
            state.stagingOrder.push(p.courseId);
          } else {
            state.quarterOrder[p.location as QuarterId].push(p.courseId);
          }
        }

        // Sort by sortOrder within each container
        state.stagingOrder.sort(
          (a, b) => (state.placements[a]?.sortOrder ?? 0) - (state.placements[b]?.sortOrder ?? 0)
        );
        for (const qId of QUARTER_IDS) {
          state.quarterOrder[qId].sort(
            (a, b) => (state.placements[a]?.sortOrder ?? 0) - (state.placements[b]?.sortOrder ?? 0)
          );
        }

        state.isDirty = false;
      });
    },

    addToStaging: (courseId, creditUnits) => {
      set((state) => {
        if (state.placements[courseId]) return; // Already in plan

        const cu = creditUnits ?? getCreditUnits(courseId) ?? 1.0;
        state.placements[courseId] = {
          courseId,
          location: "staging",
          sortOrder: state.stagingOrder.length,
          creditUnits: cu,
        };
        state.stagingOrder.push(courseId);
        state.isDirty = true;
      });
    },

    addToQuarter: (courseId, quarterId, creditUnits, index) => {
      set((state) => {
        if (state.placements[courseId]) return; // Already in plan

        const cu = creditUnits ?? getCreditUnits(courseId) ?? 1.0;
        const normalizedQuarterId = normalizeQuarterForCourse(quarterId, cu);
        const targetOrder = state.quarterOrder[normalizedQuarterId];
        const insertAt = index !== undefined ? index : targetOrder.length;

        state.placements[courseId] = {
          courseId,
          location: normalizedQuarterId,
          sortOrder: insertAt,
          creditUnits: cu,
        };
        targetOrder.splice(insertAt, 0, courseId);

        // Reindex sort orders
        targetOrder.forEach((id, i) => {
          if (state.placements[id]) {
            state.placements[id].sortOrder = i;
          }
        });

        state.isDirty = true;
      });
    },

    moveToQuarter: (courseId, quarterId, index) => {
      set((state) => {
        const existing = state.placements[courseId];
        if (!existing) return;

        const normalizedQuarterId = normalizeQuarterForCourse(quarterId, existing.creditUnits);

        // Remove from current location
        if (existing.location === "staging") {
          state.stagingOrder = state.stagingOrder.filter((id) => id !== courseId);
        } else {
          const oldQuarter = existing.location as QuarterId;
          state.quarterOrder[oldQuarter] = state.quarterOrder[oldQuarter].filter(
            (id) => id !== courseId
          );
        }

        // Add to new quarter
        const targetOrder = state.quarterOrder[normalizedQuarterId];
        const insertAt = index !== undefined ? index : targetOrder.length;
        targetOrder.splice(insertAt, 0, courseId);

        // Update placement
        existing.location = normalizedQuarterId;
        existing.sortOrder = insertAt;

        // Reindex sort orders
        targetOrder.forEach((id, i) => {
          if (state.placements[id]) {
            state.placements[id].sortOrder = i;
          }
        });

        state.isDirty = true;
      });
    },

    moveToStaging: (courseId) => {
      set((state) => {
        const existing = state.placements[courseId];
        if (!existing) return;

        // Remove from current location
        if (existing.location !== "staging") {
          const oldQuarter = existing.location as QuarterId;
          state.quarterOrder[oldQuarter] = state.quarterOrder[oldQuarter].filter(
            (id) => id !== courseId
          );
        }

        // Add to staging
        if (!state.stagingOrder.includes(courseId)) {
          state.stagingOrder.push(courseId);
        }

        existing.location = "staging";
        existing.sortOrder = state.stagingOrder.length - 1;
        state.isDirty = true;
      });
    },

    removeCourse: (courseId) => {
      set((state) => {
        const existing = state.placements[courseId];
        if (!existing) return;

        if (existing.location === "staging") {
          state.stagingOrder = state.stagingOrder.filter((id) => id !== courseId);
        } else {
          const quarter = existing.location as QuarterId;
          state.quarterOrder[quarter] = state.quarterOrder[quarter].filter(
            (id) => id !== courseId
          );
        }

        delete state.placements[courseId];
        state.isDirty = true;
      });
    },

    reorderInQuarter: (quarterId, oldIndex, newIndex) => {
      set((state) => {
        const order = state.quarterOrder[quarterId];
        const [moved] = order.splice(oldIndex, 1);
        order.splice(newIndex, 0, moved);

        order.forEach((id, i) => {
          if (state.placements[id]) {
            state.placements[id].sortOrder = i;
          }
        });

        state.isDirty = true;
      });
    },

    reorderInStaging: (oldIndex, newIndex) => {
      set((state) => {
        const [moved] = state.stagingOrder.splice(oldIndex, 1);
        state.stagingOrder.splice(newIndex, 0, moved);

        state.stagingOrder.forEach((id, i) => {
          if (state.placements[id]) {
            state.placements[id].sortOrder = i;
          }
        });

        state.isDirty = true;
      });
    },

    markSaving: () => set((state) => { state.isSaving = true; }),
    markSaved: () =>
      set((state) => {
        state.isSaving = false;
        state.isDirty = false;
        state.lastSavedAt = new Date().toISOString();
      }),
    markDirty: () => set((state) => { state.isDirty = true; }),

    // Derived getters
    isInPlan: (courseId) => !!get().placements[courseId],

    getCUForQuarter: (quarterId) => {
      const state = get();
      return state.quarterOrder[quarterId].reduce((sum, courseId) => {
        const p = state.placements[courseId];
        return sum + (p?.creditUnits ?? 0);
      }, 0);
    },

    getCUForSemester: (semesterId) => {
      const state = get();
      const quarters = QUARTER_IDS.filter((q) => q.startsWith(semesterId));
      return quarters.reduce((sum, q) => sum + state.getCUForQuarter(q), 0);
    },

    getTotalCU: () => {
      const state = get();
      return QUARTER_IDS.reduce(
        (sum, q) => sum + state.getCUForQuarter(q),
        0
      );
    },

    getPlacedCourseIds: () => {
      const state = get();
      return Object.keys(state.placements).filter(
        (id) => state.placements[id]?.location !== "staging"
      );
    },

    getPlacementsArray: () => Object.values(get().placements),
  }))
);
