import { createContext } from "react";
import type { CloudSession } from "../lib/supabaseRest.ts";

export type CloudSyncStatus =
  | "local-only"
  | "loading"
  | "auth-required"
  | "syncing"
  | "synced"
  | "offline"
  | "error";

export interface CloudSyncContextValue {
  session: CloudSession | null;
  status: CloudSyncStatus;
  configured: boolean;
  lastSyncedAt: string | null;
  error: string | null;
  setSession: (session: CloudSession | null) => void;
  syncNow: () => Promise<void>;
  signOut: () => Promise<void>;
}

export const CloudSyncContext = createContext<CloudSyncContextValue | null>(null);
