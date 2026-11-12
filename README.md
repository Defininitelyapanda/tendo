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

## Run the full local stack

- Start both the UI and API together: `npm run dev`
- The command launches the static prototype and the backend concurrently so the app can load live workspace data immediately

## Quick validation

- Frontend syntax check: `npm run check`
- Backend syntax check: `npm run backend:check`
- Full project build verification: `npm run build`
- Desktop shell: `npm run desktop`
- Desktop Windows installer build: `npm run desktop:build`

## Environment and data safety

Use a separate development or staging database for integration and cleanup work. Production writes are blocked unless `TENDO_ALLOW_PRODUCTION_WRITE=true` is set explicitly after a verified backup and a clear understanding of the records being modified.

The backend now separates database files by environment:

- Development: `backend/data/tendo.development.db`
- Staging: `backend/data/tendo.staging.db`
- Production: `backend/data/tendo.production.db`

Each record also carries a `data_classification` label (`demo`, `staging`, or `production`) to distinguish demonstration records from genuine business records. The `/health` endpoint reports the active environment and classification so the app does not silently operate against the wrong data set.

## Productionization status

TENDO now contains a working local SaaS scaffold with a browser frontend, authenticated workspace API, SQLite persistence, and production-safety controls. The backend supports workspace-scoped auth, customer, invoice, payment, expense, inventory, and reporting data, while the UI can sign in, sync live data, and persist session state locally for convenience.

The application is still intentionally lightweight and designed for local verification and staging use rather than a full public multi-tenant SaaS deployment. It keeps the current architecture simple: one backend, one primary local database per environment, modular business logic, and secure workspace isolation.

The interface demonstrates invoice and expense workflows, customer synchronization, optional inventory, summary reports, CSV downloads, browser printing/sharing, and Kenyan tax estimates. Tax calculations are informational only; there is no KRA or eTIMS integration.

## Workspace API capabilities

The backend exposes authenticated workspace operations for:

- registration and login
- workspace listing and updates
- customer create, read, update, delete
- invoice create, read, update, delete
- payment capture against invoices
- expense create, read, update, delete
- inventory create, read, update, delete
- dashboard and summary analytics
- audit logging for workspace actions

The app also includes a staged database backup script and environment-based DB separation for development, staging, and production.

## Desktop prototype installer

The Windows installer is a packaged Electron shell around the local prototype frontend. It does not provide sign-in or connect business workflows to the backend; the displayed records are sample data and changes reset on refresh. Do not use it for genuine business records.

Build the installer from `desktop` with `npm run dist`. The generated installer is unsigned and Windows may show an unknown-publisher warning. This prototype installer is separate from a production release.

## Android prototype APK

Open `android-app` in Android Studio or build it with `gradle assembleDebug` after configuring the Android SDK. The APK bundles the same prototype frontend; its demo records are not persisted or connected to the backend. The debug-signed APK is for local evaluation, not app-store distribution. The Android wrapper targets API 34 and supports API 26 and later.
