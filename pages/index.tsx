import type { GetServerSideProps } from "next";
import Head from "next/head";
import { getIronSession } from "iron-session";
import { sessionOptions, type SessionData } from "@/lib/session";
import { getValidAccessToken, listRoutes } from "@/lib/strava";

interface RouteItem {
  id: string;
  name: string;
  distance: number;
  elevationGain: number;
  type: number;
}

interface PageProps {
  authenticated: boolean;
  athleteName: string | null;
  routes: RouteItem[];
  error: string | null;
}

const METERS_PER_MILE = 1609.344;
const FEET_PER_METER = 3.28084;

function formatDistance(meters: number): string {
  return `${(meters / METERS_PER_MILE).toFixed(1)} mi`;
}

function formatElevation(meters: number): string {
  return `${Math.round(meters * FEET_PER_METER).toLocaleString()} ft`;
}

function activityLabel(type: number): string {
  return type === 2 ? "Run / walk" : "Ride";
}

export default function Home({
  authenticated,
  athleteName,
  routes,
  error,
}: PageProps) {
  return (
    <>
      <Head>
        <title>Strava → Google Maps</title>
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, viewport-fit=cover"
        />
        <meta name="theme-color" content="#fc4c02" />
      </Head>
      <main className="container">
        <header className="header">
          <h1>Strava → Google Maps</h1>
          <p className="subtitle">
            Pick a route to open turn-by-turn voice navigation in Google Maps.
          </p>
        </header>

        {error && <div className="banner error">{error}</div>}

        {!authenticated ? (
          <div className="connect">
            <a className="btn strava" href="/api/auth/login">
              Connect with Strava
            </a>
          </div>
        ) : (
          <>
            <div className="account">
              {athleteName && <span>Signed in as {athleteName}</span>}
              <a className="link" href="/api/auth/logout">
                Log out
              </a>
            </div>

            {routes.length === 0 ? (
              <p className="empty">
                No routes found on your Strava account. Create a route at
                strava.com/routes, then refresh.
              </p>
            ) : (
              <ul className="routes">
                {routes.map((r) => (
                  <li key={r.id}>
                    <a className="route" href={`/api/nav/${r.id}`}>
                      <span className="route-name">{r.name}</span>
                      <span className="route-meta">
                        {activityLabel(r.type)} · {formatDistance(r.distance)} ·
                        ↑ {formatElevation(r.elevationGain)}
                      </span>
                      <span className="route-cta">Navigate ›</span>
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}

        <footer className="footer">
          Google Maps navigates between waypoints, so it approximates your exact
          Strava route.
        </footer>
      </main>
    </>
  );
}

export const getServerSideProps: GetServerSideProps<PageProps> = async (ctx) => {
  const queryError =
    typeof ctx.query.error === "string" ? ctx.query.error : null;

  if (!sessionOptions.password) {
    return {
      props: {
        authenticated: false,
        athleteName: null,
        routes: [],
        error: "Server is missing SESSION_PASSWORD configuration.",
      },
    };
  }

  const session = await getIronSession<SessionData>(
    ctx.req,
    ctx.res,
    sessionOptions
  );

  if (!session.refreshToken || !session.athleteId) {
    return {
      props: {
        authenticated: false,
        athleteName: null,
        routes: [],
        error: queryError,
      },
    };
  }

  try {
    const token = await getValidAccessToken(session);
    const routes = await listRoutes(token, session.athleteId);
    return {
      props: {
        authenticated: true,
        athleteName: session.athleteName ?? null,
        routes: routes.map((r) => ({
          id: r.id_str ?? String(r.id),
          name: r.name,
          distance: r.distance,
          elevationGain: r.elevation_gain,
          type: r.type,
        })),
        error: queryError,
      },
    };
  } catch (e) {
    return {
      props: {
        authenticated: true,
        athleteName: session.athleteName ?? null,
        routes: [],
        error: `Could not load routes: ${String(e)}`,
      },
    };
  }
};
