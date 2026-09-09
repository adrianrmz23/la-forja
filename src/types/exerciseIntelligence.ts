import type { ExerciseDetector, ExerciseId } from "./routine.ts";

export type CompatibilityStatus = "approved" | "experimental" | "needs-test" | "blocked";
export type ExerciseSource = "builtin" | "repdb" | "ai" | "recipe";

export interface RepDbExerciseRecord {
  id: string;
  name_es: string;
  category: string;
  force_type: string | null;
  mechanic: "compound" | "isolation" | string | null;
  difficulty: "beginner" | "intermediate" | "advanced" | string;
  equipment: string | null;
  body_part: string;
  primary_muscles: string;
  secondary_muscles: string | null;
  goals: string;
  tags: string | null;
  met: number;
  is_unilateral: boolean;
  is_bodyweight: boolean;
  instructions_en: string;
}

export interface ExerciseCompatibility {
  score: number;
  status: CompatibilityStatus;
  reasons: string[];
  standing: boolean;
  cameraFriendly: boolean;
  equipmentFriendly: boolean;
  difficultyFriendly: boolean;
}

export interface IntelligentExerciseCandidate {
  id: ExerciseId;
  key: string;
  name: string;
  source: ExerciseSource;
  repdbId?: string;
  category: string;
  bodyPart: string;
  mechanic: string;
  difficulty: string;
  equipment: string;
  met: number;
  instructions: string;
  detector: ExerciseDetector;
  recipeId?: string;
  compatibility: ExerciseCompatibility;
}

export interface ExerciseReliabilityStats {
  exerciseKey: string;
  attempts: number;
  detected: number;
  invalid: number;
  replacements: number;
  labPassed: number;
  labFailed: number;
  approved: boolean;
  rejected: boolean;
  updatedAt: string;
}

export interface MovementLabResult {
  id: string;
  exerciseKey: string;
  createdAt: string;
  targetRepetitions: number;
  detectedRepetitions: number;
  duplicateCorrections: number;
  status: "approved" | "rejected" | "pending";
}
