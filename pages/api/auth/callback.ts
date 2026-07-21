import type { NextApiRequest, NextApiResponse } from "next";
import { getSession } from "@/lib/session";
import { exchangeCodeForToken, getAthlete } from "@/lib/strava";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const session = await getSession(req, res);
  const { code, state, error } = req.query;

  if (error) {
    res.redirect(`/?error=${encodeURIComponent(String(error))}`);
    return;
  }
  if (!code || typeof code !== "string") {
    res.redirect("/?error=missing_code");
    return;
  }
  if (!state || state !== session.oauthState) {
    res.redirect("/?error=invalid_state");
    return;
  }

  try {
    const token = await exchangeCodeForToken(code);
    session.accessToken = token.access_token;
    session.refreshToken = token.refresh_token;
    session.expiresAt = token.expires_at;

    const athlete = token.athlete ?? (await getAthlete(token.access_token));
    session.athleteId = athlete.id;
    session.athleteName = [athlete.firstname, athlete.lastname]
      .filter(Boolean)
      .join(" ");
    session.oauthState = undefined;
    await session.save();
    res.redirect("/");
  } catch (e) {
    res.redirect(`/?error=${encodeURIComponent(String(e))}`);
  }
}
