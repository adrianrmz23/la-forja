import { create } from "zustand";
import { persist } from "zustand/middleware";

interface MissionResult {
  missionId: string;
  validRepetitions: number;
  experienceReward: number;
  coinReward: number;
  unlockMissionId?: string;
}

interface PlayerState {
  experience: number;
  coins: number;
  currentStreak: number;
  totalWorkouts: number;
  totalMissions: number;
  totalRepetitions: number;

  completedMissionIds: string[];
  unlockedMissionIds: string[];

  lastWorkoutDate: string | null;

  completeMission: (result: MissionResult) => boolean;
  resetProgress: () => void;
}

const initialPlayerState = {
  experience: 0,
  coins: 0,
  currentStreak: 0,
  totalWorkouts: 0,
  totalMissions: 0,
  totalRepetitions: 0,

  completedMissionIds: [] as string[],
  unlockedMissionIds: ["awakening"],

  lastWorkoutDate: null as string | null,
};

function getLocalDateKey(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getYesterdayDateKey(): string {
  const yesterday = new Date();

  yesterday.setDate(yesterday.getDate() - 1);

  return getLocalDateKey(yesterday);
}

function calculateNextStreak(
  lastWorkoutDate: string | null,
  currentStreak: number,
): number {
  const today = getLocalDateKey();

  if (lastWorkoutDate === today) {
    return Math.max(currentStreak, 1);
  }

  if (lastWorkoutDate === getYesterdayDateKey()) {
    return currentStreak + 1;
  }

  return 1;
}

export const usePlayerStore = create<PlayerState>()(
  persist(
    (set, get) => ({
      ...initialPlayerState,

      completeMission: ({
        missionId,
        validRepetitions,
        experienceReward,
        coinReward,
        unlockMissionId,
      }) => {
        const wasAlreadyCompleted =
          get().completedMissionIds.includes(missionId);

        set((state) => {
          const isFirstCompletion =
            !state.completedMissionIds.includes(missionId);

          const completedMissionIds = isFirstCompletion
            ? [...state.completedMissionIds, missionId]
            : state.completedMissionIds;

          const shouldUnlockMission =
            unlockMissionId &&
            !state.unlockedMissionIds.includes(unlockMissionId);

          const unlockedMissionIds = shouldUnlockMission
            ? [...state.unlockedMissionIds, unlockMissionId]
            : state.unlockedMissionIds;

          return {
            experience:
              state.experience +
              (isFirstCompletion ? experienceReward : 0),

            coins:
              state.coins +
              (isFirstCompletion ? coinReward : 0),

            currentStreak: calculateNextStreak(
              state.lastWorkoutDate,
              state.currentStreak,
            ),

            lastWorkoutDate: getLocalDateKey(),

            totalWorkouts: state.totalWorkouts + 1,

            totalMissions:
              state.totalMissions +
              (isFirstCompletion ? 1 : 0),

            totalRepetitions:
              state.totalRepetitions + validRepetitions,

            completedMissionIds,
            unlockedMissionIds,
          };
        });

        return !wasAlreadyCompleted;
      },

      resetProgress: () => {
        set(initialPlayerState);
      },
    }),
    {
      name: "la-forja-player",

      partialize: (state) => ({
        experience: state.experience,
        coins: state.coins,
        currentStreak: state.currentStreak,
        totalWorkouts: state.totalWorkouts,
        totalMissions: state.totalMissions,
        totalRepetitions: state.totalRepetitions,
        completedMissionIds: state.completedMissionIds,
        unlockedMissionIds: state.unlockedMissionIds,
        lastWorkoutDate: state.lastWorkoutDate,
      }),
    },
  ),
);