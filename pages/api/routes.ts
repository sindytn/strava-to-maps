import type { NextApiRequest, NextApiResponse } from "next";
import { getSession } from "@/lib/session";
import { getValidAccessToken, listRoutes } from "@/lib/strava";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const session = await getSession(req, res);
  if (!session.refreshToken || !session.athleteId) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  try {
    const token = await getValidAccessToken(session);
    const routes = await listRoutes(token, session.athleteId);
    res.json(
      routes.map((r) => ({
        id: r.id_str ?? String(r.id),
        name: r.name,
        distance: r.distance,
        elevationGain: r.elevation_gain,
        type: r.type,
      }))
    );
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
}
