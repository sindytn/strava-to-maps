import type { NextApiRequest, NextApiResponse } from "next";
import { randomBytes } from "crypto";
import { getSession } from "@/lib/session";
import { buildAuthorizeUrl } from "@/lib/strava";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const session = await getSession(req, res);
  const state = randomBytes(16).toString("hex");
  session.oauthState = state;
  await session.save();
  res.redirect(buildAuthorizeUrl(state));
}
