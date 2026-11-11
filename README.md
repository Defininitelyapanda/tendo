# TENDO prototype and backend scaffold

A responsive browser prototype for exploring the TENDO business operations experience, plus a minimal backend that serves the app and provides workspace-scoped API routes.

## Run the frontend prototype

- Start the static prototype server: `npm start`
- Open `http://localhost:3000` in a modern browser
- If port 3000 is already in use, the server retries the next free port and logs the final URL

## Run the backend API

- Start the API server: `npm run backend`
- Open `http://localhost:3100`
- Health check: `http://localhost:3100/health`
- If 3100 is occupied, the backend automatically retries the next free port and logs the actual listening URL

## Quick validation

- Frontend syntax check: `npm run check`
- Backend syntax check: `npm run backend:check`

## Environment and data safety

Use a separate development or staging database for integration and cleanup work. Production writes are blocked unless `TENDO_ALLOW_PRODUCTION_WRITE=true` is set explicitly after a verified backup and a clear understanding of the records being modified.

The backend now separates database files by environment:

- Development: `backend/data/tendo.development.db`
- Staging: `backend/data/tendo.staging.db`
- Production: `backend/data/tendo.production.db`

Each record also carries a `data_classification` label (`demo`, `staging`, or `production`) to distinguish demonstration records from genuine business records. The `/health` endpoint reports the active environment and classification so the app does not silently operate against the wrong data set.

## Prototype boundary

This project includes a browser-only prototype and a minimal backend scaffold for workspace-aware operations. It is not a production SaaS deployment. The prototype uses browser memory for sample data and resets on refresh. The backend is intentionally minimal and uses a local SQLite database to support secure workspace isolation and basic record flows without adding unnecessary infrastructure.

The interface demonstrates invoice and expense workflows, customer synchronization, optional inventory, summary reports, CSV downloads, browser printing/sharing, and Kenyan tax estimates. Tax calculations are informational only; there is no KRA or eTIMS integration.

## Desktop prototype installer

The Windows installer is a packaged Electron shell around the local prototype frontend. It does not provide sign-in or connect business workflows to the backend; the displayed records are sample data and changes reset on refresh. Do not use it for genuine business records.

Build the installer from `desktop` with `npm run dist`. The generated installer is unsigned and Windows may show an unknown-publisher warning. This prototype installer is separate from a production release.

## Android prototype APK

Open `android-app` in Android Studio or build it with `gradle assembleDebug` after configuring the Android SDK. The APK bundles the same prototype frontend; its demo records are not persisted or connected to the backend. The debug-signed APK is for local evaluation, not app-store distribution. The Android wrapper targets API 34 and supports API 26 and later.
