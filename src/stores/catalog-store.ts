"use client";

import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import type { ResolvedCourse } from "@/types/course";

type SortField = "name" | "department" | "credit_units";
type SortDirection = "asc" | "desc";

interface CatalogFilters {
  department: string | null;
  termAvailability: string | null;
  courseType: string | null; // 'core' | 'flex-core' | 'major' | 'elective' | null
}

interface CatalogState {
  // Data
  courses: ResolvedCourse[];
  searchQuery: string;
  filters: CatalogFilters;
  sortBy: SortField;
  sortDirection: SortDirection;
  isLoaded: boolean;

  // Actions
  setCourses: (courses: ResolvedCourse[]) => void;
  setSearchQuery: (query: string) => void;
  setFilter: (key: keyof CatalogFilters, value: string | null) => void;
  clearFilters: () => void;
  setSortBy: (field: SortField) => void;
  toggleSortDirection: () => void;

  // Derived
  getFilteredCourses: () => ResolvedCourse[];
}

export const useCatalogStore = create<CatalogState>()(
  immer((set, get) => ({
    courses: [],
    searchQuery: "",
    filters: {
      department: null,
      termAvailability: null,
      courseType: null,
    },
    sortBy: "name",
    sortDirection: "asc",
    isLoaded: false,

    setCourses: (courses) =>
      set((state) => {
        state.courses = courses;
        state.isLoaded = true;
      }),

    setSearchQuery: (query) => set((state) => { state.searchQuery = query; }),

    setFilter: (key, value) =>
      set((state) => {
        state.filters[key] = value;
      }),

    clearFilters: () =>
      set((state) => {
        state.filters = { department: null, termAvailability: null, courseType: null };
        state.searchQuery = "";
      }),

    setSortBy: (field) =>
      set((state) => {
        if (state.sortBy === field) {
          state.sortDirection = state.sortDirection === "asc" ? "desc" : "asc";
        } else {
          state.sortBy = field;
          state.sortDirection = "asc";
        }
      }),

    toggleSortDirection: () =>
      set((state) => {
        state.sortDirection = state.sortDirection === "asc" ? "desc" : "asc";
      }),

    getFilteredCourses: () => {
      const state = get();
      let results = [...state.courses];

      // Search filter
      if (state.searchQuery.trim()) {
        const query = state.searchQuery.toLowerCase();
        results = results.filter(
          (c) =>
            c.courseId.toLowerCase().includes(query) ||
            c.title.toLowerCase().includes(query) ||
            c.department.toLowerCase().includes(query)
        );
      }

      // Department filter
      if (state.filters.department) {
        results = results.filter(
          (c) => c.department === state.filters.department
        );
      }

      // Term availability filter
      if (state.filters.termAvailability) {
        results = results.filter(
          (c) => c.termAvailability === state.filters.termAvailability
        );
      }

      // Sort
      results.sort((a, b) => {
        let cmp = 0;
        switch (state.sortBy) {
          case "name":
            cmp = a.title.localeCompare(b.title);
            break;
          case "department":
            cmp = a.department.localeCompare(b.department) || a.courseId.localeCompare(b.courseId);
            break;
          case "credit_units":
            cmp = a.creditUnits - b.creditUnits;
            break;
        }
        return state.sortDirection === "asc" ? cmp : -cmp;
      });

      return results;
    },
  }))
);
