import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { CloudSyncContext, type CloudSyncStatus } from "../contexts/cloudSyncContext.ts";
import {
  ensureFreshCloudSession,
  getStoredCloudSession,
  isSupabaseConfigured,
  persistCloudSession,
  signOutCloudSession,
  type CloudSession,
} from "../lib/supabaseRest.ts";
import {
  initialCloudSync,
  isApplyingRemoteSnapshot,
  pullCloudChanges,
  pushAllCloudDomains,
  pushCloudDomain,
  subscribeToLocalDomains,
  type SyncDomain,
} from "../services/cloudSyncService.ts";

const PUSH_DEBOUNCE_MS = 700;
const INTELLIGENCE_PUSH_DEBOUNCE_MS = 5_000;
const PULL_INTERVAL_MS = 60_000;

export function CloudSyncProvider({ children }: { children: ReactNode }) {
  const [session, setSessionState] = useState<CloudSession | null>(() =>
    isSupabaseConfigured ? getStoredCloudSession() : null,
  );
  const [status, setStatus] = useState<CloudSyncStatus>(() =>
    !isSupabaseConfigured ? "local-only" : session ? "loading" : "auth-required",
  );
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const sessionRef = useRef<CloudSession | null>(session);
  const timersRef = useRef(new Map<SyncDomain, number>());
  const dirtyDomainsRef = useRef(new Set<SyncDomain>());

  const setSession = useCallback((nextSession: CloudSession | null) => {
    sessionRef.current = nextSession;
    persistCloudSession(nextSession);
    setSessionState(nextSession);
    setError(null);
    setStatus(nextSession ? "syncing" : isSupabaseConfigured ? "auth-required" : "local-only");
  }, []);

  const getFreshSession = useCallback(async (): Promise<CloudSession | null> => {
    const current = sessionRef.current;
    if (!current) return null;

    try {
      const fresh = await ensureFreshCloudSession(current);
      if (fresh.accessToken !== current.accessToken || fresh.refreshToken !== current.refreshToken) {
        sessionRef.current = fresh;
        persistCloudSession(fresh);
        setSessionState(fresh);
      }
      return fresh;
    } catch (refreshError) {
      persistCloudSession(null);
      sessionRef.current = null;
      setSessionState(null);
      setStatus("auth-required");
      setError(refreshError instanceof Error ? refreshError.message : "La sesión expiró.");
      return null;
    }
  }, []);

  const syncNow = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setStatus("local-only");
      return;
    }

    const fresh = await getFreshSession();
    if (!fresh) return;

    setStatus("syncing");
    setError(null);

    try {
      for (const domain of dirtyDomainsRef.current) {
        await pushCloudDomain(fresh, domain);
      }
      dirtyDomainsRef.current.clear();
      await pullCloudChanges(fresh);
      await pushAllCloudDomains(fresh);
      setLastSyncedAt(new Date().toISOString());
      setStatus("synced");
    } catch (syncError) {
      const message = syncError instanceof Error ? syncError.message : "No se pudo sincronizar La Forja.";
      setError(message);
      setStatus(navigator.onLine ? "error" : "offline");
    }
  }, [getFreshSession]);

  const signOut = useCallback(async () => {
    const current = sessionRef.current;
    if (current) {
      await signOutCloudSession(current).catch(() => undefined);
    }
    setSession(null);
  }, [setSession]);

  useEffect(() => {
    if (!isSupabaseConfigured || !sessionRef.current) return;

    void getFreshSession().then((fresh) => {
      if (fresh) setStatus("syncing");
    });
  }, [getFreshSession]);

  const userId = session?.user.id ?? null;

  useEffect(() => {
    if (!isSupabaseConfigured || !userId) return;

    // Capture the current timer map for this effect lifecycle so cleanup
    // always clears the same timers that this effect created.
    const timers = timersRef.current;
    let cancelled = false;
    let unsubscribeStores: (() => void) | null = null;
    let pullInterval: number | null = null;

    const runPull = async () => {
      const fresh = await getFreshSession();
      if (!fresh || cancelled) return;

      try {
        for (const domain of dirtyDomainsRef.current) {
          await pushCloudDomain(fresh, domain);
        }
        dirtyDomainsRef.current.clear();
        const changed = await pullCloudChanges(fresh);
        if (cancelled) return;
        if (changed) setLastSyncedAt(new Date().toISOString());
        setStatus("synced");
        setError(null);
      } catch (pullError) {
        if (cancelled) return;
        setError(pullError instanceof Error ? pullError.message : "No se pudo descargar el progreso.");
        setStatus(navigator.onLine ? "error" : "offline");
      }
    };

    const handleDomainChanged = (domain: SyncDomain) => {
      if (cancelled || isApplyingRemoteSnapshot()) return;
      dirtyDomainsRef.current.add(domain);

      const currentTimer = timers.get(domain);
      if (currentTimer) window.clearTimeout(currentTimer);

      const debounceMs = domain === "exercise-intelligence"
        ? INTELLIGENCE_PUSH_DEBOUNCE_MS
        : PUSH_DEBOUNCE_MS;

      const timer = window.setTimeout(() => {
        timers.delete(domain);
        void (async () => {
          const fresh = await getFreshSession();
          if (!fresh || cancelled) return;

          try {
            setStatus("syncing");
            await pushCloudDomain(fresh, domain);
            dirtyDomainsRef.current.delete(domain);
            if (cancelled) return;
            setLastSyncedAt(new Date().toISOString());
            setStatus("synced");
            setError(null);
          } catch (pushError) {
            if (cancelled) return;
            setError(pushError instanceof Error ? pushError.message : "No se pudo guardar el progreso.");
            setStatus(navigator.onLine ? "error" : "offline");
          }
        })();
      }, debounceMs);

      timers.set(domain, timer);
    };

    void (async () => {
      const fresh = await getFreshSession();
      if (!fresh || cancelled) return;

      try {
        setStatus("syncing");
        await initialCloudSync(fresh);
        if (cancelled) return;
        setLastSyncedAt(new Date().toISOString());
        setStatus("synced");
        setError(null);
        unsubscribeStores = subscribeToLocalDomains(handleDomainChanged);
        pullInterval = window.setInterval(() => void runPull(), PULL_INTERVAL_MS);
      } catch (initialError) {
        if (cancelled) return;
        setError(initialError instanceof Error ? initialError.message : "No se pudo iniciar la sincronización.");
        setStatus(navigator.onLine ? "error" : "offline");
      }
    })();

    const handleFocus = () => void runPull();
    const handleOnline = () => void runPull();
    const handleOffline = () => setStatus("offline");

    window.addEventListener("focus", handleFocus);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      cancelled = true;
      unsubscribeStores?.();
      if (pullInterval) window.clearInterval(pullInterval);
      for (const timer of timers.values()) window.clearTimeout(timer);
      timers.clear();
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [getFreshSession, userId]);

  return (
    <CloudSyncContext.Provider
      value={{
        session,
        status,
        configured: isSupabaseConfigured,
        lastSyncedAt,
        error,
        setSession,
        syncNow,
        signOut,
      }}
    >
      {children}
    </CloudSyncContext.Provider>
  );
}
