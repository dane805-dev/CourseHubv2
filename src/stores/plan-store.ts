"use client";

import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import { temporal } from "zundo";
import type { Placement, QuarterId } from "@/types/plan";
import { QUARTER_IDS, normalizeQuarterForCourse } from "@/types/plan";
import { getCreditUnits } from "@/lib/data/course-resolver";

interface PlanState {
  // Data
  planId: string | null;
  placements: Record<string, Placement>; // courseId -> Placement
  quarterOrder: Record<QuarterId, string[]>; // ordered courseIds per quarter

  // Save status
  isDirty: boolean;
  isSaving: boolean;
  lastSavedAt: string | null;

  // Actions
  loadPlan: (planId: string, placements: Placement[]) => void;
  addToQuarter: (courseId: string, quarterId: QuarterId, creditUnits?: number, index?: number) => void;
  moveToQuarter: (courseId: string, quarterId: QuarterId, index?: number) => void;
  removeCourse: (courseId: string) => void;
  reorderInQuarter: (quarterId: QuarterId, oldIndex: number, newIndex: number) => void;
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
  temporal(
  immer((set, get) => ({
    planId: null,
    placements: {},
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
        state.quarterOrder = QUARTER_IDS.reduce(
          (acc, qId) => ({ ...acc, [qId]: [] }),
          {} as Record<QuarterId, string[]>
        );

        for (const p of placements) {
          // Skip any legacy staging placements
          if (p.location === "staging" as string) continue;

          const normalized = normalizeQuarterForCourse(p.location as QuarterId, p.creditUnits);
          p.location = normalized;
          state.placements[p.courseId] = p;
          state.quarterOrder[p.location as QuarterId].push(p.courseId);
        }

        for (const qId of QUARTER_IDS) {
          state.quarterOrder[qId].sort(
            (a, b) => (state.placements[a]?.sortOrder ?? 0) - (state.placements[b]?.sortOrder ?? 0)
          );
        }

        state.isDirty = false;
      });
      usePlanStore.temporal.getState().clear();
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

        // Remove from current quarter
        const oldQuarter = existing.location as QuarterId;
        state.quarterOrder[oldQuarter] = state.quarterOrder[oldQuarter].filter(
          (id) => id !== courseId
        );

        // Add to new quarter
        const targetOrder = state.quarterOrder[normalizedQuarterId];
        const insertAt = index !== undefined ? index : targetOrder.length;
        targetOrder.splice(insertAt, 0, courseId);

        existing.location = normalizedQuarterId;
        existing.sortOrder = insertAt;

        targetOrder.forEach((id, i) => {
          if (state.placements[id]) {
            state.placements[id].sortOrder = i;
          }
        });

        state.isDirty = true;
      });
    },

    removeCourse: (courseId) => {
      set((state) => {
        const existing = state.placements[courseId];
        if (!existing) return;

        const quarter = existing.location as QuarterId;
        state.quarterOrder[quarter] = state.quarterOrder[quarter].filter(
          (id) => id !== courseId
        );

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
        return sum + (Number(p?.creditUnits) || 0);
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

    getPlacedCourseIds: () => Object.keys(get().placements),

    getPlacementsArray: () => Object.values(get().placements),
  })),
  {
    partialize: (state) => ({
      planId: state.planId,
      placements: state.placements,
      quarterOrder: state.quarterOrder,
    }),
    equality: (pastState, currentState) =>
      pastState.placements === currentState.placements &&
      pastState.quarterOrder === currentState.quarterOrder,
    limit: 50,
  },
  )
);
