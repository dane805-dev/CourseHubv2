"use client";

import { create } from "zustand";
import { immer } from "zustand/middleware/immer";

type RightPanelView = "catalog" | "progress" | "profile" | "chat";

interface UIState {
  // Modal
  selectedCourseId: string | null;
  isCourseModalOpen: boolean;

  // Right panel
  rightPanelOpen: boolean;
  rightPanelView: RightPanelView;

  // Highlighted courses (from progress dashboard clicking)
  highlightedCourseIds: string[];

  // Confirmation dialog
  confirmDialog: {
    open: boolean;
    title: string;
    message: string;
    onConfirm: (() => void) | null;
  };

  // Actions
  openCourseModal: (courseId: string) => void;
  closeCourseModal: () => void;
  toggleRightPanel: () => void;
  setRightPanelView: (view: RightPanelView) => void;
  setHighlightedCourses: (courseIds: string[]) => void;
  clearHighlights: () => void;
  showConfirmDialog: (title: string, message: string, onConfirm: () => void) => void;
  closeConfirmDialog: () => void;
}

export const useUIStore = create<UIState>()(
  immer((set) => ({
    selectedCourseId: null,
    isCourseModalOpen: false,
    rightPanelOpen: true,
    rightPanelView: "catalog",
    highlightedCourseIds: [],
    confirmDialog: {
      open: false,
      title: "",
      message: "",
      onConfirm: null,
    },

    openCourseModal: (courseId) =>
      set((state) => {
        state.selectedCourseId = courseId;
        state.isCourseModalOpen = true;
      }),

    closeCourseModal: () =>
      set((state) => {
        state.isCourseModalOpen = false;
        state.selectedCourseId = null;
      }),

    toggleRightPanel: () =>
      set((state) => {
        state.rightPanelOpen = !state.rightPanelOpen;
      }),

    setRightPanelView: (view) =>
      set((state) => {
        state.rightPanelView = view;
        state.rightPanelOpen = true;
      }),

    setHighlightedCourses: (courseIds) =>
      set((state) => {
        state.highlightedCourseIds = courseIds;
      }),

    clearHighlights: () =>
      set((state) => {
        state.highlightedCourseIds = [];
      }),

    showConfirmDialog: (title, message, onConfirm) =>
      set((state) => {
        state.confirmDialog = { open: true, title, message, onConfirm };
      }),

    closeConfirmDialog: () =>
      set((state) => {
        state.confirmDialog = { open: false, title: "", message: "", onConfirm: null };
      }),
  }))
);
