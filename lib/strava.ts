import type { IronSession } from "iron-session";
import type { SessionData } from "./session";

const STRAVA_OAUTH_AUTHORIZE = "https://www.strava.com/oauth/authorize";
const STRAVA_OAUTH_TOKEN = "https://www.strava.com/oauth/token";
const STRAVA_API = "https://www.strava.com/api/v3";

// `read_all` is required to list the athlete's private routes.
const SCOPE = "read,read_all";

export interface StravaRouteSummary {
  id: number;
  id_str: string;
  name: string;
  distance: number; // meters
  elevation_gain: number; // meters
  type: number; // 1 = ride, 2 = run
  sub_type: number;
  private: boolean;
  map: { id: string; summary_polyline?: string; polyline?: string };
}

export interface StravaRouteDetail extends StravaRouteSummary {
  map: { id: string; polyline?: string; summary_polyline?: string };
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set`);
  return value;
}

export function getRedirectUri(): string {
  const base = (process.env.APP_BASE_URL ?? "http://localhost:3000").replace(
    /\/$/,
    ""
  );
  return `${base}/api/auth/callback`;
}

export function buildAuthorizeUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: requireEnv("STRAVA_CLIENT_ID"),
    redirect_uri: getRedirectUri(),
    response_type: "code",
    approval_prompt: "auto",
    scope: SCOPE,
    state,
  });
  return `${STRAVA_OAUTH_AUTHORIZE}?${params.toString()}`;
}

interface TokenResponse {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  athlete?: { id: number; firstname?: string; lastname?: string };
}

export async function exchangeCodeForToken(
  code: string
): Promise<TokenResponse> {
  const res = await fetch(STRAVA_OAUTH_TOKEN, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: requireEnv("STRAVA_CLIENT_ID"),
      client_secret: requireEnv("STRAVA_CLIENT_SECRET"),
      code,
      grant_type: "authorization_code",
    }),
  });
  if (!res.ok) {
    throw new Error(`Token exchange failed: ${res.status} ${await res.text()}`);
  }
  return (await res.json()) as TokenResponse;
}

async function refreshAccessToken(
  refreshToken: string
): Promise<TokenResponse> {
  const res = await fetch(STRAVA_OAUTH_TOKEN, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: requireEnv("STRAVA_CLIENT_ID"),
      client_secret: requireEnv("STRAVA_CLIENT_SECRET"),
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });
  if (!res.ok) {
    throw new Error(`Token refresh failed: ${res.status} ${await res.text()}`);
  }
  return (await res.json()) as TokenResponse;
}

/**
 * Return a valid access token, transparently refreshing it (and persisting the
 * new tokens to the session) when the current one is expired or near expiry.
 */
export async function getValidAccessToken(
  session: IronSession<SessionData>
): Promise<string> {
  if (!session.refreshToken) {
    throw new Error("Not authenticated");
  }
  const now = Math.floor(Date.now() / 1000);
  const skew = 120; // refresh a little early
  if (session.accessToken && session.expiresAt && session.expiresAt - skew > now) {
    return session.accessToken;
  }
  const token = await refreshAccessToken(session.refreshToken);
  session.accessToken = token.access_token;
  session.refreshToken = token.refresh_token;
  session.expiresAt = token.expires_at;
  await session.save();
  return token.access_token;
}

async function stravaGet<T>(token: string, path: string): Promise<T> {
  const res = await fetch(`${STRAVA_API}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    throw new Error(`Strava GET ${path} failed: ${res.status} ${await res.text()}`);
  }
  return (await res.json()) as T;
}

export interface StravaAthlete {
  id: number;
  firstname?: string;
  lastname?: string;
}

export function getAthlete(token: string): Promise<StravaAthlete> {
  return stravaGet<StravaAthlete>(token, "/athlete");
}

export function listRoutes(
  token: string,
  athleteId: number,
  page = 1,
  perPage = 100
): Promise<StravaRouteSummary[]> {
  return stravaGet<StravaRouteSummary[]>(
    token,
    `/athletes/${athleteId}/routes?page=${page}&per_page=${perPage}`
  );
}

export function getRoute(
  token: string,
  routeId: string
): Promise<StravaRouteDetail> {
  return stravaGet<StravaRouteDetail>(token, `/routes/${routeId}`);
}
