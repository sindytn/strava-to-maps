# Strava → Google Maps

A mobile web app that lets you open a route you created on Strava in **Google
Maps with turn-by-turn voice navigation**. Log in with Strava, tap a route, and
Google Maps opens and starts navigating (bike or walk mode, matching the route
type).

## How it works

1. You authorize the app with Strava (OAuth).
2. It lists your Strava routes.
3. When you tap a route, the app fetches the route's encoded polyline, simplifies
   it to a handful of waypoints, and builds a Google Maps Directions deep link
   (`https://www.google.com/maps/dir/?api=1&...&dir_action=navigate`).
4. On your phone that link opens the Google Maps app and starts navigation.

### Known limitation

Google Maps navigates **between waypoints** rather than following an arbitrary
GPS track. Google Maps' consumer app only accepts a limited number of waypoints,
so the route is simplified (default: up to 8 intermediate waypoints via
Ramer–Douglas–Peucker). Google Maps then re-routes between those points and may
choose slightly different roads/trails than your exact Strava route. Tune the
count with the `MAX_WAYPOINTS` env var. For an exact-track alternative, an app
like OsmAnd or Komoot is a better fit.

## Setup

### 1. Create a Strava API application

Go to https://www.strava.com/settings/api and create an app.

- **Authorization Callback Domain**: the domain of your deployment with **no
  scheme or path**, e.g. `strava-to-maps.vercel.app` (use `localhost` for local
  development).
- Copy the **Client ID** and **Client Secret**.

### 2. Configure environment variables

Copy `.env.example` to `.env` (local) or set these in your host (e.g. Vercel):

| Variable               | Description                                                        |
| ---------------------- | ------------------------------------------------------------------ |
| `STRAVA_CLIENT_ID`     | From your Strava API app.                                          |
| `STRAVA_CLIENT_SECRET` | From your Strava API app.                                          |
| `SESSION_PASSWORD`     | Random 32+ char secret for cookie encryption (`openssl rand -base64 32`). |
| `APP_BASE_URL`         | Public base URL, no trailing slash. Local: `http://localhost:3000`. |
| `MAX_WAYPOINTS`        | Optional. Max intermediate waypoints (default `8`).               |

### 3. Run locally

```bash
npm install
npm run dev
```

Open http://localhost:3000 and connect with Strava.

## Deploy (Vercel)

1. Import the repo into Vercel.
2. Set the environment variables above (set `APP_BASE_URL` to your Vercel URL).
3. Set the Strava app's **Authorization Callback Domain** to your Vercel domain.
4. Open the deployment on your phone, connect Strava, and navigate.

## Scripts

- `npm run dev` — start the dev server
- `npm run build` — production build
- `npm run start` — run the production build
- `npm run lint` — ESLint
- `npm run typecheck` — TypeScript type checking
