import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  ExternalActivityEntry,
  MealEntry,
  OperationDailyLog,
  SuitFitRating,
} from "../types/operationForja.ts";

interface OperationForjaState {
  logs: Record<string, OperationDailyLog>;
  meals: MealEntry[];
  externalActivities: ExternalActivityEntry[];
  setSteps: (date: string, steps: number) => void;
  toggleTask: (date: string, taskId: string) => void;
  selectCardioTask: (date: string, cardioTaskIds: string[], taskId: string) => void;
  toggleHabit: (date: string, habitId: string) => void;
  setSuitFit: (date: string, value: SuitFitRating) => void;
  setNotes: (date: string, notes: string) => void;
  markDayComplete: (date: string, completed: boolean) => void;
  addMeal: (meal: MealEntry) => void;
  removeMeal: (mealId: string) => void;
  setMealPortion: (mealId: string, multiplier: number) => void;
  addExternalActivity: (activity: ExternalActivityEntry) => void;
  removeExternalActivity: (activityId: string) => void;
}

function createLog(date: string): OperationDailyLog {
  return {
    date,
    steps: 0,
    completedTaskIds: [],
    completedHabitIds: [],
  };
}

function toggleItem(items: string[], id: string): string[] {
  return items.includes(id) ? items.filter((item) => item !== id) : [...items, id];
}

export const useOperationForjaStore = create<OperationForjaState>()(
  persist(
    (set) => ({
      logs: {},
      meals: [],
      externalActivities: [],

      setSteps: (date, steps) => {
        set((state) => {
          const log = state.logs[date] ?? createLog(date);
          return {
            logs: {
              ...state.logs,
              [date]: { ...log, steps: Math.max(0, Math.round(steps || 0)) },
            },
          };
        });
      },

      toggleTask: (date, taskId) => {
        set((state) => {
          const log = state.logs[date] ?? createLog(date);
          return {
            logs: {
              ...state.logs,
              [date]: {
                ...log,
                completedTaskIds: toggleItem(log.completedTaskIds, taskId),
              },
            },
          };
        });
      },

      selectCardioTask: (date, cardioTaskIds, taskId) => {
        set((state) => {
          const log = state.logs[date] ?? createLog(date);
          const wasSelected = log.completedTaskIds.includes(taskId);
          const withoutCardioChoices = log.completedTaskIds.filter(
            (item) => !cardioTaskIds.includes(item),
          );

          return {
            logs: {
              ...state.logs,
              [date]: {
                ...log,
                completedTaskIds: wasSelected
                  ? withoutCardioChoices
                  : [...withoutCardioChoices, taskId],
              },
            },
          };
        });
      },

      toggleHabit: (date, habitId) => {
        set((state) => {
          const log = state.logs[date] ?? createLog(date);
          return {
            logs: {
              ...state.logs,
              [date]: {
                ...log,
                completedHabitIds: toggleItem(log.completedHabitIds, habitId),
              },
            },
          };
        });
      },

      setSuitFit: (date, value) => {
        set((state) => {
          const log = state.logs[date] ?? createLog(date);
          return {
            logs: {
              ...state.logs,
              [date]: { ...log, suitFit: value },
            },
          };
        });
      },

      setNotes: (date, notes) => {
        set((state) => {
          const log = state.logs[date] ?? createLog(date);
          return {
            logs: {
              ...state.logs,
              [date]: { ...log, notes },
            },
          };
        });
      },

      markDayComplete: (date, completed) => {
        set((state) => {
          const log = state.logs[date] ?? createLog(date);
          return {
            logs: {
              ...state.logs,
              [date]: {
                ...log,
                completedAt: completed ? new Date().toISOString() : undefined,
              },
            },
          };
        });
      },

      addMeal: (meal) => {
        set((state) => ({
          meals: [meal, ...state.meals],
        }));
      },

      removeMeal: (mealId) => {
        set((state) => ({
          meals: state.meals.filter((meal) => meal.id !== mealId),
        }));
      },

      setMealPortion: (mealId, multiplier) => {
        const safeMultiplier = Math.min(1.75, Math.max(0.5, multiplier));
        set((state) => ({
          meals: state.meals.map((meal) =>
            meal.id === mealId ? { ...meal, portionMultiplier: safeMultiplier } : meal,
          ),
        }));
      },

      addExternalActivity: (activity) => {
        set((state) => ({
          externalActivities: [activity, ...state.externalActivities],
        }));
      },

      removeExternalActivity: (activityId) => {
        set((state) => ({
          externalActivities: state.externalActivities.filter((activity) => activity.id !== activityId),
        }));
      },
    }),
    {
      name: "la-forja-operation-365-v1",
      version: 1,
    },
  ),
);
