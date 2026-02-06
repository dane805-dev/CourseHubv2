"use client";

import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import type { MajorCode, CULoadPreference, WaiverConfig } from "@/types/user";

interface ProfileState {
  // Data
  userId: string | null;
  email: string | null;
  displayName: string | null;
  onboardingCompleted: boolean;
  majors: MajorCode[];
  waivers: WaiverConfig[];
  cuLoadPreference: CULoadPreference;

  // Actions
  setProfile: (profile: {
    userId: string;
    email: string;
    displayName?: string;
    onboardingCompleted: boolean;
    cuLoadPreference: CULoadPreference;
  }) => void;
  setMajors: (majors: MajorCode[]) => void;
  setWaivers: (waivers: WaiverConfig[]) => void;
  setCULoadPreference: (preference: CULoadPreference) => void;
  completeOnboarding: () => void;
  reset: () => void;

  // Derived
  hasMajor: (majorCode: MajorCode) => boolean;
  hasWaiver: (coreCode: string) => boolean;
  getWaiver: (coreCode: string) => WaiverConfig | undefined;
}

export const useProfileStore = create<ProfileState>()(
  immer((set, get) => ({
    userId: null,
    email: null,
    displayName: null,
    onboardingCompleted: false,
    majors: [],
    waivers: [],
    cuLoadPreference: "normal",

    setProfile: (profile) => {
      set((state) => {
        state.userId = profile.userId;
        state.email = profile.email;
        state.displayName = profile.displayName ?? null;
        state.onboardingCompleted = profile.onboardingCompleted;
        state.cuLoadPreference = profile.cuLoadPreference;
      });
    },

    setMajors: (majors) => set((state) => { state.majors = majors; }),
    setWaivers: (waivers) => set((state) => { state.waivers = waivers; }),
    setCULoadPreference: (preference) => set((state) => { state.cuLoadPreference = preference; }),

    completeOnboarding: () => set((state) => { state.onboardingCompleted = true; }),

    reset: () => {
      set((state) => {
        state.userId = null;
        state.email = null;
        state.displayName = null;
        state.onboardingCompleted = false;
        state.majors = [];
        state.waivers = [];
        state.cuLoadPreference = "normal";
      });
    },

    hasMajor: (majorCode) => get().majors.includes(majorCode),
    hasWaiver: (coreCode) => get().waivers.some((w) => w.coreCode === coreCode),
    getWaiver: (coreCode) => get().waivers.find((w) => w.coreCode === coreCode),
  }))
);
