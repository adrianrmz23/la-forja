import { create } from "zustand";
import { persist } from "zustand/middleware";

export type FitnessLevel =
  | "beginner"
  | "intermediate"
  | "advanced";

export type PreferredImpact =
  | "low"
  | "standard"
  | "high";

export type BoxingStance =
  | "orthodox"
  | "southpaw";

export interface PlayerProfile {
  displayName: string;
  weightKg: number;
  heightCm: number;

  fitnessLevel: FitnessLevel;
  preferredImpact: PreferredImpact;
  boxingStance: BoxingStance;

  minimumCalorieGoal: number;
  plannedCalorieGoal: number;
}

export interface WeightHistoryEntry {
  id: string;
  date: string;
  weightKg: number;
  createdAt: string;
}

interface ProfileState {
  profile: PlayerProfile;
  isProfileComplete: boolean;
  weightHistory: WeightHistoryEntry[];

  saveProfile: (
    profile: PlayerProfile,
  ) => void;

  updateProfile: (
    changes: Partial<PlayerProfile>,
  ) => void;

  addWeightEntry: (weightKg: number, date?: string) => void;
  removeWeightEntry: (entryId: string) => void;
  resetProfile: () => void;
}

export const initialProfile: PlayerProfile = {
  displayName: "",
  weightKg: 80,
  heightCm: 170,

  fitnessLevel: "beginner",
  preferredImpact: "standard",
  boxingStance: "orthodox",

  minimumCalorieGoal: 180,
  plannedCalorieGoal: 210,
};

function getLocalDateKey(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function createWeightEntry(weightKg: number, date = getLocalDateKey()): WeightHistoryEntry {
  return {
    id: `weight-${date}`,
    date,
    weightKg: Math.round(weightKg * 10) / 10,
    createdAt: new Date().toISOString(),
  };
}

function upsertWeightEntry(
  history: WeightHistoryEntry[],
  weightKg: number,
  date = getLocalDateKey(),
): WeightHistoryEntry[] {
  const entry = createWeightEntry(weightKg, date);
  const withoutSameDate = history.filter((item) => item.date !== date);
  return [...withoutSameDate, entry].sort((a, b) => a.date.localeCompare(b.date));
}

export const useProfileStore =
  create<ProfileState>()(
    persist(
      (set, get) => ({
        profile: initialProfile,
        isProfileComplete: false,
        weightHistory: [],

        saveProfile: (profile) => {
          const current = get();
          const shouldRecordWeight =
            !current.isProfileComplete ||
            Math.abs(current.profile.weightKg - profile.weightKg) >= 0.05;

          set({
            profile,
            isProfileComplete: true,
            weightHistory: shouldRecordWeight
              ? upsertWeightEntry(current.weightHistory, profile.weightKg)
              : current.weightHistory,
          });
        },

        updateProfile: (changes) => {
          set((state) => {
            const nextProfile = {
              ...state.profile,
              ...changes,
            };
            const weightChanged =
              typeof changes.weightKg === "number" &&
              Math.abs(changes.weightKg - state.profile.weightKg) >= 0.05;

            return {
              profile: nextProfile,
              weightHistory:
                state.isProfileComplete && weightChanged
                  ? upsertWeightEntry(state.weightHistory, nextProfile.weightKg)
                  : state.weightHistory,
            };
          });
        },

        addWeightEntry: (weightKg, date) => {
          if (!Number.isFinite(weightKg) || weightKg < 35 || weightKg > 250) {
            return;
          }

          set((state) => ({
            profile: {
              ...state.profile,
              weightKg,
            },
            weightHistory: upsertWeightEntry(state.weightHistory, weightKg, date),
          }));
        },

        removeWeightEntry: (entryId) => {
          set((state) => ({
            weightHistory: state.weightHistory.filter((entry) => entry.id !== entryId),
          }));
        },

        resetProfile: () => {
          set({
            profile: initialProfile,
            isProfileComplete: false,
            weightHistory: [],
          });
        },
      }),
      {
        name: "la-forja-profile",
        version: 2,
        migrate: (persistedState: unknown) => {
          const previous = (persistedState ?? {}) as Partial<ProfileState>;
          const history = Array.isArray(previous.weightHistory)
            ? previous.weightHistory
            : [];

          if (
            history.length === 0 &&
            previous.isProfileComplete &&
            previous.profile?.weightKg
          ) {
            return {
              ...previous,
              weightHistory: [createWeightEntry(previous.profile.weightKg)],
            } as ProfileState;
          }

          return previous as ProfileState;
        },
        partialize: (state) => ({
          profile: state.profile,
          isProfileComplete: state.isProfileComplete,
          weightHistory: state.weightHistory,
        }),
      },
    ),
  );
