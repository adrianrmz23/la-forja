import { repDbFallback } from "../data/repdbFallback.ts";
import {
  getRecipeCandidates,
  repDbToCandidate,
} from "../intelligence/exerciseCompatibility.ts";
import type {
  IntelligentExerciseCandidate,
  RepDbExerciseRecord,
} from "../types/exerciseIntelligence.ts";

interface DirectRepDbExercise {
  id?: string;
  name_es?: string;
  category?: string;
  force_type?: string | null;
  mechanic?: string | null;
  difficulty?: string;
  equipment?: string | null;
  body_part?: string;
  primary_muscles?: string[] | string;
  secondary_muscles?: string[] | string | null;
  goals?: string[] | string;
  tags?: string[] | string | null;
  met?: number;
  is_unilateral?: boolean;
  is_bodyweight?: boolean;
  instructions_en?: string[] | string;
  instructions_es?: string[] | string;
}

interface DirectRepDbPayload {
  count?: number;
  exercises?: DirectRepDbExercise[];
}

const REPDB_JSON_URL = "https://exercise-dataset.com/exercises.json";

function joinList(value: string[] | string | null | undefined): string | null {
  if (Array.isArray(value)) return value.join("|");
  if (typeof value === "string") return value;
  return null;
}

function joinInstructions(value: string[] | string | undefined): string {
  if (Array.isArray(value)) return value.join(" ");
  return typeof value === "string" ? value : "";
}

function normalizeRecord(item: DirectRepDbExercise): RepDbExerciseRecord | null {
  if (!item.id || !item.name_es || !item.category || !item.body_part) {
    return null;
  }

  return {
    id: item.id,
    name_es: item.name_es,
    category: item.category,
    force_type: item.force_type ?? null,
    mechanic: item.mechanic ?? null,
    difficulty: item.difficulty ?? "intermediate",
    equipment: item.equipment ?? null,
    body_part: item.body_part,
    primary_muscles: joinList(item.primary_muscles) ?? "",
    secondary_muscles: joinList(item.secondary_muscles),
    goals: joinList(item.goals) ?? "",
    tags: joinList(item.tags),
    met: Number.isFinite(item.met) ? Number(item.met) : 5,
    is_unilateral: Boolean(item.is_unilateral),
    is_bodyweight: Boolean(item.is_bodyweight),
    instructions_en: joinInstructions(item.instructions_en),
    instructions_es: joinInstructions(item.instructions_es),
  };
}

async function loadDirectRepDb(): Promise<RepDbExerciseRecord[]> {
  const response = await fetch(REPDB_JSON_URL, {
    headers: { Accept: "application/json" },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`RepDB ${response.status}`);
  }

  const payload = (await response.json()) as DirectRepDbPayload;
  const records = (payload.exercises ?? [])
    .map(normalizeRecord)
    .filter((item): item is RepDbExerciseRecord => Boolean(item));

  if (records.length < 100) {
    throw new Error("RepDB no devolvió el catálogo completo");
  }

  return records;
}

export async function loadRepDbCandidates(): Promise<{
  candidates: IntelligentExerciseCandidate[];
  source: "remote" | "fallback";
}> {
  try {
    const records = await loadDirectRepDb();

    return {
      candidates: [...records.map(repDbToCandidate), ...getRecipeCandidates()],
      source: "remote",
    };
  } catch {
    return {
      candidates: [...repDbFallback.map(repDbToCandidate), ...getRecipeCandidates()],
      source: "fallback",
    };
  }
}
