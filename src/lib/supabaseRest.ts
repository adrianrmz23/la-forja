const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL ?? "").trim().replace(/\/$/, "");
const SUPABASE_ANON_KEY = (import.meta.env.VITE_SUPABASE_ANON_KEY ?? "").trim();

const SESSION_STORAGE_KEY = "la-forja-supabase-session-v1";

export interface CloudUser {
  id: string;
  email?: string;
}

export interface CloudSession {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  user: CloudUser;
}

export interface RemoteDomainRow {
  domain: string;
  payload: unknown;
  updated_at: string;
}

interface AuthResponse {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  expires_at?: number;
  user?: {
    id?: string;
    email?: string;
  };
  error_description?: string;
  msg?: string;
  message?: string;
}

export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

function authHeaders(accessToken?: string): HeadersInit {
  const headers: Record<string, string> = {
    apikey: SUPABASE_ANON_KEY,
    "Content-Type": "application/json",
  };

  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  return headers;
}

async function readJson<T>(response: Response): Promise<T> {
  const body = (await response.json().catch(() => ({}))) as T & {
    message?: string;
    msg?: string;
    error_description?: string;
  };

  if (!response.ok) {
    throw new Error(
      body.error_description ??
        body.message ??
        body.msg ??
        `Supabase respondió con HTTP ${response.status}.`,
    );
  }

  return body;
}

function normalizeSession(payload: AuthResponse): CloudSession {
  if (!payload.access_token || !payload.refresh_token || !payload.user?.id) {
    throw new Error("Supabase no devolvió una sesión válida.");
  }

  const expiresAt = payload.expires_at
    ? payload.expires_at * 1000
    : Date.now() + (payload.expires_in ?? 3600) * 1000;

  return {
    accessToken: payload.access_token,
    refreshToken: payload.refresh_token,
    expiresAt,
    user: {
      id: payload.user.id,
      email: payload.user.email,
    },
  };
}

export function persistCloudSession(session: CloudSession | null): void {
  if (!session) {
    localStorage.removeItem(SESSION_STORAGE_KEY);
    return;
  }

  localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
}

export function getStoredCloudSession(): CloudSession | null {
  if (!isSupabaseConfigured) return null;

  const raw = localStorage.getItem(SESSION_STORAGE_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as CloudSession;
    if (!parsed.accessToken || !parsed.refreshToken || !parsed.user?.id) {
      localStorage.removeItem(SESSION_STORAGE_KEY);
      return null;
    }
    return parsed;
  } catch {
    localStorage.removeItem(SESSION_STORAGE_KEY);
    return null;
  }
}

export async function refreshCloudSession(session: CloudSession): Promise<CloudSession> {
  const response = await fetch(
    `${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`,
    {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ refresh_token: session.refreshToken }),
    },
  );

  const payload = await readJson<AuthResponse>(response);
  const refreshed = normalizeSession(payload);
  persistCloudSession(refreshed);
  return refreshed;
}

export async function ensureFreshCloudSession(
  session: CloudSession,
): Promise<CloudSession> {
  const refreshMarginMs = 90_000;
  if (session.expiresAt - Date.now() > refreshMarginMs) {
    return session;
  }

  return refreshCloudSession(session);
}

export async function requestEmailOtp(email: string): Promise<void> {
  if (!isSupabaseConfigured) {
    throw new Error("Faltan las variables VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY.");
  }

  const response = await fetch(`${SUPABASE_URL}/auth/v1/otp`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({
      email,
      create_user: true,
    }),
  });

  if (!response.ok) {
    await readJson<AuthResponse>(response);
  }
}

export async function verifyEmailOtp(email: string, token: string): Promise<CloudSession> {
  const response = await fetch(`${SUPABASE_URL}/auth/v1/verify`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({
      email,
      token,
      type: "email",
    }),
  });

  const payload = await readJson<AuthResponse>(response);
  const session = normalizeSession(payload);
  persistCloudSession(session);
  return session;
}

export async function signOutCloudSession(session: CloudSession): Promise<void> {
  try {
    await fetch(`${SUPABASE_URL}/auth/v1/logout`, {
      method: "POST",
      headers: authHeaders(session.accessToken),
    });
  } finally {
    persistCloudSession(null);
  }
}

export async function fetchRemoteDomains(
  session: CloudSession,
): Promise<RemoteDomainRow[]> {
  const fresh = await ensureFreshCloudSession(session);
  const query = new URLSearchParams({
    select: "domain,payload,updated_at",
    user_id: `eq.${fresh.user.id}`,
  });
  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/user_state_domains?${query.toString()}`,
    {
      headers: authHeaders(fresh.accessToken),
    },
  );

  return readJson<RemoteDomainRow[]>(response);
}

export async function upsertRemoteDomain(
  session: CloudSession,
  domain: string,
  payload: unknown,
): Promise<RemoteDomainRow> {
  const fresh = await ensureFreshCloudSession(session);
  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/user_state_domains?on_conflict=user_id,domain`,
    {
      method: "POST",
      headers: {
        ...authHeaders(fresh.accessToken),
        Prefer: "resolution=merge-duplicates,return=representation",
      },
      body: JSON.stringify({
        user_id: fresh.user.id,
        domain,
        payload,
      }),
    },
  );

  const rows = await readJson<RemoteDomainRow[]>(response);
  const row = rows[0];
  if (!row) {
    throw new Error(`Supabase no confirmó el guardado de ${domain}.`);
  }
  return row;
}
