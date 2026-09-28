import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface MissionHistoryEntry {
  id: string;
  missionId: string;
  completedAt: string;
  validRepetitions: number;
  invalidMovements: number;
  activeSeconds: number;
  estimatedCalories: number;
  bestCombo: number;
  firstCompletion: boolean;
}

interface MissionResult {
  missionId: string;
  validRepetitions: number;
  invalidMovements?: number;
  activeSeconds?: number;
  estimatedCalories?: number;
  bestCombo?: number;
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
  missionHistory: MissionHistoryEntry[];

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
  missionHistory: [] as MissionHistoryEntry[],

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

function createHistoryId(missionId: string): string {
  const suffix =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `${new Date().getTime()}-${Math.random().toString(36).slice(2, 8)}`;
  return `mission-${missionId}-${suffix}`;
}

export const usePlayerStore = create<PlayerState>()(
  persist(
    (set, get) => ({
      ...initialPlayerState,

      completeMission: ({
        missionId,
        validRepetitions,
        invalidMovements = 0,
        activeSeconds = 0,
        estimatedCalories = 0,
        bestCombo = 0,
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

          const historyEntry: MissionHistoryEntry = {
            id: createHistoryId(missionId),
            missionId,
            completedAt: new Date().toISOString(),
            validRepetitions,
            invalidMovements,
            activeSeconds,
            estimatedCalories,
            bestCombo,
            firstCompletion: isFirstCompletion,
          };

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
            missionHistory: [historyEntry, ...state.missionHistory],
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
      version: 2,
      migrate: (persistedState: unknown) => {
        const previous = (persistedState ?? {}) as Partial<PlayerState>;
        return {
          ...previous,
          missionHistory: Array.isArray(previous.missionHistory)
            ? previous.missionHistory
            : [],
        } as PlayerState;
      },
      partialize: (state) => ({
        experience: state.experience,
        coins: state.coins,
        currentStreak: state.currentStreak,
        totalWorkouts: state.totalWorkouts,
        totalMissions: state.totalMissions,
        totalRepetitions: state.totalRepetitions,
        completedMissionIds: state.completedMissionIds,
        unlockedMissionIds: state.unlockedMissionIds,
        missionHistory: state.missionHistory,
        lastWorkoutDate: state.lastWorkoutDate,
      }),
    },
  ),
);
