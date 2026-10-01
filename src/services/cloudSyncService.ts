import type { CloudSession, RemoteDomainRow } from "../lib/supabaseRest.ts";
import { fetchRemoteDomains, upsertRemoteDomain } from "../lib/supabaseRest.ts";
import { useExerciseIntelligenceStore } from "../stores/exerciseIntelligenceStore.ts";
import { useFreeWorkoutStore } from "../stores/freeWorkoutStore.ts";
import { useGeneratedLevelStore } from "../stores/generatedLevelStore.ts";
import { useOperationForjaStore } from "../stores/operationForjaStore.ts";
import { usePlayerStore } from "../stores/playerStore.ts";
import { useProfileStore } from "../stores/profileStore.ts";

export type SyncDomain =
  | "profile"
  | "player"
  | "operation"
  | "generated-levels"
  | "free-workouts"
  | "exercise-intelligence";

const ALL_DOMAINS: SyncDomain[] = [
  "profile",
  "player",
  "operation",
  "generated-levels",
  "free-workouts",
  "exercise-intelligence",
];

const OWNER_STORAGE_KEY = "la-forja-cloud-owner-v1";

let applyingRemote = false;
const remoteUpdatedAt = new Map<SyncDomain, string>();

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function uniqueStrings(...values: unknown[]): string[] {
  const result = new Set<string>();
  for (const value of values) {
    if (!Array.isArray(value)) continue;
    for (const item of value) {
      if (typeof item === "string") result.add(item);
    }
  }
  return [...result];
}

function mergeById<T extends { id: string }>(
  local: T[],
  remote: T[],
  choose?: (localItem: T, remoteItem: T) => T,
): T[] {
  const merged = new Map<string, T>();
  for (const item of remote) merged.set(item.id, item);
  for (const item of local) {
    const current = merged.get(item.id);
    merged.set(item.id, current && choose ? choose(item, current) : item);
  }
  return [...merged.values()];
}

function latestIso(first?: string | null, second?: string | null): string | null {
  if (!first) return second ?? null;
  if (!second) return first;
  return first >= second ? first : second;
}

export function getDomainSnapshot(domain: SyncDomain): unknown {
  if (domain === "profile") {
    const state = useProfileStore.getState();
    return {
      profile: state.profile,
      isProfileComplete: state.isProfileComplete,
      weightHistory: state.weightHistory,
    };
  }

  if (domain === "player") {
    const state = usePlayerStore.getState();
    return {
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
    };
  }

  if (domain === "operation") {
    const state = useOperationForjaStore.getState();
    return { logs: state.logs, meals: state.meals, externalActivities: state.externalActivities };
  }

  if (domain === "generated-levels") {
    const state = useGeneratedLevelStore.getState();
    return {
      levels: state.levels,
      activeLevelId: state.activeLevelId,
      lastGenerationSource: state.lastGenerationSource,
    };
  }

  if (domain === "free-workouts") {
    const state = useFreeWorkoutStore.getState();
    return {
      activeWorkout: state.activeWorkout,
      history: state.history,
      lastPreferences: state.lastPreferences,
    };
  }

  const state = useExerciseIntelligenceStore.getState();
  return {
    stats: state.stats,
    labResults: state.labResults,
    customRecipes: state.customRecipes,
  };
}

function mergeProfile(localPayload: unknown, remotePayload: unknown): unknown {
  const local = asRecord(localPayload);
  const remote = asRecord(remotePayload);
  const localHistory = Array.isArray(local.weightHistory) ? local.weightHistory : [];
  const remoteHistory = Array.isArray(remote.weightHistory) ? remote.weightHistory : [];
  const history = mergeById(
    localHistory as Array<{ id: string; date: string; weightKg: number; createdAt: string }>,
    remoteHistory as Array<{ id: string; date: string; weightKg: number; createdAt: string }>,
    (localItem, remoteItem) =>
      localItem.createdAt >= remoteItem.createdAt ? localItem : remoteItem,
  ).sort((a, b) => a.date.localeCompare(b.date));

  const newestLocal = localHistory.at(-1) as { createdAt?: string } | undefined;
  const newestRemote = remoteHistory.at(-1) as { createdAt?: string } | undefined;
  const useLocalProfile =
    Boolean(local.isProfileComplete) &&
    (!remote.isProfileComplete ||
      (newestLocal?.createdAt ?? "") >= (newestRemote?.createdAt ?? ""));

  return {
    profile: useLocalProfile ? local.profile : remote.profile ?? local.profile,
    isProfileComplete: Boolean(local.isProfileComplete || remote.isProfileComplete),
    weightHistory: history,
  };
}

function mergePlayer(localPayload: unknown, remotePayload: unknown): unknown {
  const local = asRecord(localPayload);
  const remote = asRecord(remotePayload);
  const numberMax = (key: string) =>
    Math.max(Number(local[key] ?? 0), Number(remote[key] ?? 0));

  const localHistory = Array.isArray(local.missionHistory) ? local.missionHistory : [];
  const remoteHistory = Array.isArray(remote.missionHistory) ? remote.missionHistory : [];
  const missionHistory = mergeById(
    localHistory as Array<{ id: string; completedAt: string }>,
    remoteHistory as Array<{ id: string; completedAt: string }>,
  ).sort((a, b) => b.completedAt.localeCompare(a.completedAt));

  return {
    experience: numberMax("experience"),
    coins: numberMax("coins"),
    currentStreak: numberMax("currentStreak"),
    totalWorkouts: numberMax("totalWorkouts"),
    totalMissions: numberMax("totalMissions"),
    totalRepetitions: numberMax("totalRepetitions"),
    completedMissionIds: uniqueStrings(local.completedMissionIds, remote.completedMissionIds),
    unlockedMissionIds: uniqueStrings(local.unlockedMissionIds, remote.unlockedMissionIds),
    missionHistory,
    lastWorkoutDate: latestIso(
      typeof local.lastWorkoutDate === "string" ? local.lastWorkoutDate : null,
      typeof remote.lastWorkoutDate === "string" ? remote.lastWorkoutDate : null,
    ),
  };
}

function mergeOperation(localPayload: unknown, remotePayload: unknown): unknown {
  const local = asRecord(localPayload);
  const remote = asRecord(remotePayload);
  const localLogs = asRecord(local.logs);
  const remoteLogs = asRecord(remote.logs);
  const dates = new Set([...Object.keys(remoteLogs), ...Object.keys(localLogs)]);
  const logs: Record<string, unknown> = {};

  for (const date of dates) {
    const left = asRecord(localLogs[date]);
    const right = asRecord(remoteLogs[date]);
    logs[date] = {
      date,
      steps: Math.max(Number(left.steps ?? 0), Number(right.steps ?? 0)),
      completedTaskIds: uniqueStrings(left.completedTaskIds, right.completedTaskIds),
      completedHabitIds: uniqueStrings(left.completedHabitIds, right.completedHabitIds),
      suitFit: left.suitFit ?? right.suitFit,
      notes:
        typeof left.notes === "string" && left.notes.trim()
          ? left.notes
          : right.notes,
      completedAt: latestIso(
        typeof left.completedAt === "string" ? left.completedAt : null,
        typeof right.completedAt === "string" ? right.completedAt : null,
      ) ?? undefined,
    };
  }

  const localMeals = Array.isArray(local.meals) ? local.meals : [];
  const remoteMeals = Array.isArray(remote.meals) ? remote.meals : [];
  const meals = mergeById(
    localMeals as Array<{ id: string; createdAt: string }>,
    remoteMeals as Array<{ id: string; createdAt: string }>,
    (localItem, remoteItem) =>
      localItem.createdAt >= remoteItem.createdAt ? localItem : remoteItem,
  ).sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const localExternal = Array.isArray(local.externalActivities) ? local.externalActivities : [];
  const remoteExternal = Array.isArray(remote.externalActivities) ? remote.externalActivities : [];
  const externalActivities = mergeById(
    localExternal as Array<{ id: string; createdAt: string }>,
    remoteExternal as Array<{ id: string; createdAt: string }>,
    (localItem, remoteItem) =>
      localItem.createdAt >= remoteItem.createdAt ? localItem : remoteItem,
  ).sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return { logs, meals, externalActivities };
}

function mergeGeneratedLevels(localPayload: unknown, remotePayload: unknown): unknown {
  const local = asRecord(localPayload);
  const remote = asRecord(remotePayload);
  const localLevels = Array.isArray(local.levels)
    ? (local.levels as Array<{ id: string; sequence: number; completedAt?: string | null }>)
    : [];
  const remoteLevels = Array.isArray(remote.levels)
    ? (remote.levels as Array<{ id: string; sequence: number; completedAt?: string | null }>)
    : [];
  const bySequence = new Map<number, (typeof localLevels)[number]>();
  for (const level of remoteLevels) bySequence.set(level.sequence, level);
  for (const level of localLevels) {
    const previous = bySequence.get(level.sequence);
    bySequence.set(
      level.sequence,
      previous
        ? {
            ...previous,
            ...level,
            completedAt: latestIso(level.completedAt, previous.completedAt),
          }
        : level,
    );
  }
  const levels = [...bySequence.values()].sort((a, b) => a.sequence - b.sequence);

  return {
    levels,
    activeLevelId: local.activeLevelId ?? remote.activeLevelId ?? null,
    lastGenerationSource: local.lastGenerationSource ?? remote.lastGenerationSource ?? null,
  };
}

function mergeFreeWorkouts(localPayload: unknown, remotePayload: unknown): unknown {
  const local = asRecord(localPayload);
  const remote = asRecord(remotePayload);
  const localHistory = Array.isArray(local.history) ? local.history : [];
  const remoteHistory = Array.isArray(remote.history) ? remote.history : [];
  const history = mergeById(
    localHistory as Array<{ id: string; completedAt: string }>,
    remoteHistory as Array<{ id: string; completedAt: string }>,
  ).sort((a, b) => b.completedAt.localeCompare(a.completedAt));

  const localWorkout = asRecord(local.activeWorkout);
  const remoteWorkout = asRecord(remote.activeWorkout);
  const localCreated = typeof localWorkout.createdAt === "string" ? localWorkout.createdAt : "";
  const remoteCreated = typeof remoteWorkout.createdAt === "string" ? remoteWorkout.createdAt : "";

  return {
    activeWorkout:
      localCreated >= remoteCreated
        ? local.activeWorkout ?? remote.activeWorkout ?? null
        : remote.activeWorkout ?? local.activeWorkout ?? null,
    history,
    lastPreferences: local.lastPreferences ?? remote.lastPreferences ?? null,
  };
}

function mergeExerciseIntelligence(localPayload: unknown, remotePayload: unknown): unknown {
  const local = asRecord(localPayload);
  const remote = asRecord(remotePayload);
  const localStats = asRecord(local.stats);
  const remoteStats = asRecord(remote.stats);
  const keys = new Set([...Object.keys(localStats), ...Object.keys(remoteStats)]);
  const stats: Record<string, unknown> = {};

  for (const key of keys) {
    const left = asRecord(localStats[key]);
    const right = asRecord(remoteStats[key]);
    const leftDate = typeof left.updatedAt === "string" ? left.updatedAt : "";
    const rightDate = typeof right.updatedAt === "string" ? right.updatedAt : "";
    const newer = leftDate >= rightDate ? left : right;
    stats[key] = {
      ...right,
      ...left,
      attempts: Math.max(Number(left.attempts ?? 0), Number(right.attempts ?? 0)),
      detected: Math.max(Number(left.detected ?? 0), Number(right.detected ?? 0)),
      invalid: Math.max(Number(left.invalid ?? 0), Number(right.invalid ?? 0)),
      replacements: Math.max(Number(left.replacements ?? 0), Number(right.replacements ?? 0)),
      labPassed: Math.max(Number(left.labPassed ?? 0), Number(right.labPassed ?? 0)),
      labFailed: Math.max(Number(left.labFailed ?? 0), Number(right.labFailed ?? 0)),
      approved: Boolean(newer.approved),
      rejected: Boolean(newer.rejected),
      updatedAt: newer.updatedAt ?? new Date().toISOString(),
    };
  }

  const localResults = Array.isArray(local.labResults) ? local.labResults : [];
  const remoteResults = Array.isArray(remote.labResults) ? remote.labResults : [];
  const labResults = mergeById(
    localResults as Array<{ id: string; createdAt: string }>,
    remoteResults as Array<{ id: string; createdAt: string }>,
  ).sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const localRecipes = Array.isArray(local.customRecipes) ? local.customRecipes : [];
  const remoteRecipes = Array.isArray(remote.customRecipes) ? remote.customRecipes : [];
  const customRecipes = mergeById(
    localRecipes as Array<{ id: string }>,
    remoteRecipes as Array<{ id: string }>,
  );

  return { stats, labResults, customRecipes };
}

function mergeDomain(domain: SyncDomain, local: unknown, remote: unknown): unknown {
  if (domain === "profile") return mergeProfile(local, remote);
  if (domain === "player") return mergePlayer(local, remote);
  if (domain === "operation") return mergeOperation(local, remote);
  if (domain === "generated-levels") return mergeGeneratedLevels(local, remote);
  if (domain === "free-workouts") return mergeFreeWorkouts(local, remote);
  return mergeExerciseIntelligence(local, remote);
}

export function applyDomainSnapshot(domain: SyncDomain, payload: unknown): void {
  const data = asRecord(payload);
  applyingRemote = true;
  try {
    if (domain === "profile") {
      useProfileStore.setState({
        profile: data.profile as ReturnType<typeof useProfileStore.getState>["profile"],
        isProfileComplete: Boolean(data.isProfileComplete),
        weightHistory: Array.isArray(data.weightHistory)
          ? (data.weightHistory as ReturnType<typeof useProfileStore.getState>["weightHistory"])
          : [],
      });
      return;
    }

    if (domain === "player") {
      usePlayerStore.setState({
        experience: Number(data.experience ?? 0),
        coins: Number(data.coins ?? 0),
        currentStreak: Number(data.currentStreak ?? 0),
        totalWorkouts: Number(data.totalWorkouts ?? 0),
        totalMissions: Number(data.totalMissions ?? 0),
        totalRepetitions: Number(data.totalRepetitions ?? 0),
        completedMissionIds: Array.isArray(data.completedMissionIds) ? (data.completedMissionIds as string[]) : [],
        unlockedMissionIds: Array.isArray(data.unlockedMissionIds) ? (data.unlockedMissionIds as string[]) : ["awakening"],
        missionHistory: Array.isArray(data.missionHistory)
          ? (data.missionHistory as ReturnType<typeof usePlayerStore.getState>["missionHistory"])
          : [],
        lastWorkoutDate: typeof data.lastWorkoutDate === "string" ? data.lastWorkoutDate : null,
      });
      return;
    }

    if (domain === "operation") {
      useOperationForjaStore.setState({
        logs: asRecord(data.logs) as ReturnType<typeof useOperationForjaStore.getState>["logs"],
        meals: Array.isArray(data.meals)
          ? (data.meals as ReturnType<typeof useOperationForjaStore.getState>["meals"])
          : [],
        externalActivities: Array.isArray(data.externalActivities)
          ? (data.externalActivities as ReturnType<typeof useOperationForjaStore.getState>["externalActivities"])
          : [],
      });
      return;
    }

    if (domain === "generated-levels") {
      useGeneratedLevelStore.setState({
        levels: Array.isArray(data.levels)
          ? (data.levels as ReturnType<typeof useGeneratedLevelStore.getState>["levels"])
          : [],
        activeLevelId: typeof data.activeLevelId === "string" ? data.activeLevelId : null,
        lastGenerationSource:
          data.lastGenerationSource === "procedural" || data.lastGenerationSource === "ai"
            ? data.lastGenerationSource
            : null,
      });
      return;
    }

    if (domain === "free-workouts") {
      useFreeWorkoutStore.setState({
        activeWorkout:
          data.activeWorkout && typeof data.activeWorkout === "object"
            ? (data.activeWorkout as ReturnType<typeof useFreeWorkoutStore.getState>["activeWorkout"])
            : null,
        history: Array.isArray(data.history)
          ? (data.history as ReturnType<typeof useFreeWorkoutStore.getState>["history"])
          : [],
        lastPreferences:
          data.lastPreferences && typeof data.lastPreferences === "object"
            ? (data.lastPreferences as ReturnType<typeof useFreeWorkoutStore.getState>["lastPreferences"])
            : null,
      });
      return;
    }

    useExerciseIntelligenceStore.setState({
      stats: asRecord(data.stats) as ReturnType<typeof useExerciseIntelligenceStore.getState>["stats"],
      labResults: Array.isArray(data.labResults)
        ? (data.labResults as ReturnType<typeof useExerciseIntelligenceStore.getState>["labResults"])
        : [],
      customRecipes: Array.isArray(data.customRecipes)
        ? (data.customRecipes as ReturnType<typeof useExerciseIntelligenceStore.getState>["customRecipes"])
        : [],
    });
  } finally {
    applyingRemote = false;
  }
}

export function isApplyingRemoteSnapshot(): boolean {
  return applyingRemote;
}

export function clearLocalSyncedState(): void {
  applyingRemote = true;
  try {
    useProfileStore.getState().resetProfile();
    usePlayerStore.getState().resetProgress();
    useOperationForjaStore.setState({ logs: {}, meals: [], externalActivities: [] });
    useGeneratedLevelStore.getState().clearGeneratedLevels();
    useFreeWorkoutStore.setState({ activeWorkout: null, history: [], lastPreferences: null });
    useExerciseIntelligenceStore.setState({ stats: {}, labResults: [], customRecipes: [] });
  } finally {
    applyingRemote = false;
  }
}

function rowMap(rows: RemoteDomainRow[]): Map<SyncDomain, RemoteDomainRow> {
  const map = new Map<SyncDomain, RemoteDomainRow>();
  for (const row of rows) {
    if (ALL_DOMAINS.includes(row.domain as SyncDomain)) {
      map.set(row.domain as SyncDomain, row);
    }
  }
  return map;
}

export async function initialCloudSync(session: CloudSession): Promise<void> {
  const owner = localStorage.getItem(OWNER_STORAGE_KEY);
  if (owner && owner !== session.user.id) {
    clearLocalSyncedState();
  }

  const rows = await fetchRemoteDomains(session);
  const remote = rowMap(rows);
  const isFirstMigration = !owner;

  for (const domain of ALL_DOMAINS) {
    const row = remote.get(domain);
    const localPayload = getDomainSnapshot(domain);

    if (!row) {
      const saved = await upsertRemoteDomain(session, domain, localPayload);
      remoteUpdatedAt.set(domain, saved.updated_at);
      continue;
    }

    const nextPayload = isFirstMigration
      ? mergeDomain(domain, localPayload, row.payload)
      : row.payload;

    applyDomainSnapshot(domain, nextPayload);
    const saved = isFirstMigration
      ? await upsertRemoteDomain(session, domain, nextPayload)
      : row;
    remoteUpdatedAt.set(domain, saved.updated_at);
  }

  localStorage.setItem(OWNER_STORAGE_KEY, session.user.id);
}

export async function pullCloudChanges(session: CloudSession): Promise<boolean> {
  const rows = await fetchRemoteDomains(session);
  let changed = false;

  for (const row of rows) {
    const domain = row.domain as SyncDomain;
    if (!ALL_DOMAINS.includes(domain)) continue;
    const known = remoteUpdatedAt.get(domain);
    if (known && row.updated_at <= known) continue;

    applyDomainSnapshot(domain, row.payload);
    remoteUpdatedAt.set(domain, row.updated_at);
    changed = true;
  }

  return changed;
}

export async function pushCloudDomain(
  session: CloudSession,
  domain: SyncDomain,
): Promise<void> {
  if (applyingRemote) return;
  const row = await upsertRemoteDomain(session, domain, getDomainSnapshot(domain));
  remoteUpdatedAt.set(domain, row.updated_at);
}

export async function pushAllCloudDomains(session: CloudSession): Promise<void> {
  for (const domain of ALL_DOMAINS) {
    await pushCloudDomain(session, domain);
  }
}

export function subscribeToLocalDomains(
  onDomainChanged: (domain: SyncDomain) => void,
): () => void {
  const unsubscribers = [
    useProfileStore.subscribe(() => onDomainChanged("profile")),
    usePlayerStore.subscribe(() => onDomainChanged("player")),
    useOperationForjaStore.subscribe(() => onDomainChanged("operation")),
    useGeneratedLevelStore.subscribe(() => onDomainChanged("generated-levels")),
    useFreeWorkoutStore.subscribe(() => onDomainChanged("free-workouts")),
    useExerciseIntelligenceStore.subscribe(() => onDomainChanged("exercise-intelligence")),
  ];

  return () => {
    for (const unsubscribe of unsubscribers) unsubscribe();
  };
}
