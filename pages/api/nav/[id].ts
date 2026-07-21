import type { NextApiRequest, NextApiResponse } from "next";
import { getSession } from "@/lib/session";
import { getRoute, getValidAccessToken } from "@/lib/strava";
import {
  buildMapsUrlFromPolyline,
  travelModeForStravaType,
} from "@/lib/googleMaps";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const session = await getSession(req, res);
  if (!session.refreshToken) {
    res.redirect("/?error=not_authenticated");
    return;
  }

  const { id } = req.query;
  if (!id || Array.isArray(id)) {
    res.status(400).send("Invalid route id");
    return;
  }

  try {
    const token = await getValidAccessToken(session);
    const route = await getRoute(token, id);
    const encoded = route.map?.polyline || route.map?.summary_polyline;
    if (!encoded) {
      res.status(404).send("Route has no map data");
      return;
    }
    const url = buildMapsUrlFromPolyline(encoded, {
      travelMode: travelModeForStravaType(route.type),
    });
    res.redirect(url);
  } catch (e) {
    res.status(500).send(`Failed to build navigation link: ${String(e)}`);
  }
}
