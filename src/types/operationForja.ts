export type OperationTab = "today" | "calendar" | "progress" | "habits" | "plan";

export type OperationExerciseEquipment =
  | "bodyweight"
  | "dumbbells"
  | "bands"
  | "none";

export interface OperationExercise {
  id: string;
  name: string;
  sets?: number;
  reps?: string;
  durationMinutes?: number;
  equipment: OperationExerciseEquipment;
  met: number;
  repdbIds?: string[];
  instructions?: string;
}

export interface OperationCardioOption {
  id: string;
  name: string;
  description: string;
  durationMinutes: number;
  met: number;
  distanceKm?: number;
}

export interface OperationCardio extends OperationCardioOption {
  options?: OperationCardioOption[];
}

export interface OperationHabit {
  id: string;
  label: string;
  description: string;
}

export interface OperationDayPlan {
  date: string;
  dayNumber: number;
  weekNumber: number;
  cycleNumber: number;
  cycleWeek: 1 | 2 | 3 | 4;
  phase: "suit" | "fat-loss";
  phaseLabel: string;
  title: string;
  subtitle: string;
  cardio?: OperationCardio;
  exercises: OperationExercise[];
  stepsGoal: number;
  habits: OperationHabit[];
  recoveryDay: boolean;
}

export type SuitFitRating =
  | "very-tight"
  | "tight"
  | "better"
  | "almost-comfortable"
  | "comfortable";

export interface OperationDailyLog {
  date: string;
  steps: number;
  completedTaskIds: string[];
  completedHabitIds: string[];
  suitFit?: SuitFitRating;
  notes?: string;
  completedAt?: string;
}

export interface MealAnalysisItem {
  id: string;
  name: string;
  estimatedGrams: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  confidence: "low" | "medium" | "high";
  nutritionSource: "nutrition5k" | "vision-estimate" | "text-estimate";
  matchedIngredient?: string;
}

export type MealType = "breakfast" | "lunch" | "dinner" | "snack";
export type MealInputSource = "camera" | "upload" | "text";

export interface MealEntry {
  id: string;
  date: string;
  createdAt: string;
  mealType: MealType;
  source?: MealInputSource;
  inputDescription?: string;
  name: string;
  items: MealAnalysisItem[];
  calories: number;
  calorieRangeLow: number;
  calorieRangeHigh: number;
  protein: number;
  carbs: number;
  fat: number;
  portionMultiplier: number;
  notes: string[];
  datasetMatchedItems: number;
}

export interface MealVisionResult {
  mealName: string;
  items: MealAnalysisItem[];
  totalCalories: number;
  calorieRangeLow: number;
  calorieRangeHigh: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
  notes: string[];
  datasetMatchedItems: number;
}

export interface EnergyEstimate {
  baseCalories: number;
  stepsCalories: number;
  workoutCalories: number;
  totalBurnCalories: number;
  intakeCalories: number;
  intakeLow: number;
  intakeHigh: number;
  balanceCalories: number;
  balanceLow: number;
  balanceHigh: number;
}

export interface OperationInsight {
  id: string;
  tone: "good" | "attention" | "neutral";
  title: string;
  description: string;
}
