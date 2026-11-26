import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { DumbbellLoad } from "../data/dumbbellWorkout.ts";

export interface DumbbellSettings {
  sets: number;
  restSeconds: number;
  load: DumbbellLoad;
}

export interface DumbbellHistoryEntry {
  id: string;
  completedAt: string;
  minutes: number;
  estimatedCalories: number;
  setsDone: number;
  totalSets: number;
  restSeconds: number;
  load: DumbbellLoad;
}

interface DumbbellWorkoutState {
  settings: DumbbellSettings;
  history: DumbbellHistoryEntry[];
  setSettings: (changes: Partial<DumbbellSettings>) => void;
  addEntry: (entry: Omit<DumbbellHistoryEntry, "id" | "completedAt">) => void;
  clearHistory: () => void;
}

export const DEFAULT_DUMBBELL_SETTINGS: DumbbellSettings = {
  sets: 3,
  restSeconds: 45,
  load: "medium",
};

function createId(): string {
  return typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? `dumbbell-${crypto.randomUUID()}`
    : `dumbbell-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export const useDumbbellWorkoutStore = create<DumbbellWorkoutState>()(
  persist(
    (set) => ({
      settings: DEFAULT_DUMBBELL_SETTINGS,
      history: [],

      setSettings: (changes) =>
        set((state) => ({ settings: { ...state.settings, ...changes } })),

      addEntry: (entry) =>
        set((state) => ({
          history: [
            { ...entry, id: createId(), completedAt: new Date().toISOString() },
            ...state.history,
          ].slice(0, 200),
        })),

      clearHistory: () => set({ history: [] }),
    }),
    { name: "la-forja-dumbbell-workouts", version: 1 },
  ),
);
