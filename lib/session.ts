import type { IronSession, SessionOptions } from "iron-session";
import { getIronSession } from "iron-session";
import type { NextApiRequest, NextApiResponse } from "next";

export interface SessionData {
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: number; // unix seconds
  athleteId?: number;
  athleteName?: string;
  oauthState?: string;
}

export const sessionOptions: SessionOptions = {
  password: process.env.SESSION_PASSWORD ?? "",
  cookieName: "strava_maps_session",
  cookieOptions: {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 30, // 30 days
  },
};

export function getSession(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<IronSession<SessionData>> {
  if (!sessionOptions.password) {
    throw new Error("SESSION_PASSWORD is not set");
  }
  return getIronSession<SessionData>(req, res, sessionOptions);
}
