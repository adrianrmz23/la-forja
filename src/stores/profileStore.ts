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

interface ProfileState {
  profile: PlayerProfile;
  isProfileComplete: boolean;

  saveProfile: (
    profile: PlayerProfile,
  ) => void;

  updateProfile: (
    changes: Partial<PlayerProfile>,
  ) => void;

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

export const useProfileStore =
  create<ProfileState>()(
    persist(
      (set) => ({
        profile: initialProfile,
        isProfileComplete: false,

        saveProfile: (profile) => {
          set({
            profile,
            isProfileComplete: true,
          });
        },

        updateProfile: (changes) => {
          set((state) => ({
            profile: {
              ...state.profile,
              ...changes,
            },
          }));
        },

        resetProfile: () => {
          set({
            profile: initialProfile,
            isProfileComplete: false,
          });
        },
      }),
      {
        name: "la-forja-profile",
      },
    ),
  );