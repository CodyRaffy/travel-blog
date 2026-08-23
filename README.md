# Raffy's on the Road Blog

A travel blog application built with Next.js that displays trip stops on an interactive Leaflet map.

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the map.

Open [http://localhost:3000/admin](http://localhost:3000/admin) to manage stops.

The SQLite database (`data/travel-blog.db`) is created and migrated automatically on first run. To load the legacy `data/stops.json` into it:

```bash
npm run db:import-json
```

Set `DATABASE_PATH` to store the database somewhere else (e.g. a Docker volume).

### Rebuilding stops from photos

The photo library is read straight from the synced Dropbox folder (default `C:\Dropbox`; override with `PHOTO_LIBRARY_DIR`, `PHOTO_ROOTS`, `TRIP_START`, `TRIP_END`, `EXIFTOOL` — see `lib/import/config.ts`). Requires [exiftool](https://exiftool.org/).

```bash
npm run photos:scan      # index capture time + GPS for every photo in the trip date range (incremental)
npm run photos:cluster   # group located photos into candidate stops and name them via Nominatim
```

Then open [http://localhost:3000/admin/stops/review](http://localhost:3000/admin/stops/review): each candidate shows sample photos, dates, and a suggested name. Approve to create the stop (its photos are attached and the road route from the previous stop is drawn with OSRM), merge candidates that are really one stay, or skip. Re-clustering never re-proposes something you've already approved or skipped.

### Importing Facebook posts

1. On Facebook go to Settings → **Download your information**. Choose **JSON** format, date range **All time**, media quality **High**, and include at least **Posts**.
2. Extract the archive somewhere, then run:

   ```bash
   npm run import:facebook -- /path/to/extracted-export
   ```

   Add `--dry-run` to preview without writing. Post media is copied to `data/media/` (override with `MEDIA_DIR`).
3. Open [http://localhost:3000/admin/posts/review](http://localhost:3000/admin/posts/review). Each post is matched to the stop whose dates contain it; approve, re-assign, or skip each one. Approved posts become blog entries.

Re-running the import is safe — posts already staged are skipped.

## Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run db:generate` - Generate a new SQL migration after editing `lib/db/schema.ts`
- `npm run db:migrate` - Apply pending migrations (also happens automatically at app startup)
- `npm run db:studio` - Open Drizzle Studio to browse the database
- `npm run db:import-json` - One-time import of `data/stops.json` into SQLite
- `npm run import:facebook -- <export-dir> [--dry-run]` - Stage posts from a Facebook export for review
- `npm run photos:scan [-- --force]` - Index the local photo library (exiftool; incremental)
- `npm run deploy [-- -SkipBuild]` - Build and publish to the home server (see Deploying)
- `npm run photos:cluster [-- --radius 30 --min-days 2 --min-photos 15 --max-gap 7 --no-geocode]` - Propose stop candidates

## API Routes

- `GET /api/stops` - Returns all trip stops as JSON
- `POST /api/stops` - Create a new stop
- `GET /api/stops/[id]` - Get a single stop
- `PUT /api/stops/[id]` - Update a stop
- `DELETE /api/stops/[id]` - Delete a stop
- `GET /api/posts?stopId=&published=true` - List posts (newest first); `POST` creates a hand-written post
- `GET|PUT|DELETE /api/posts/[id]` - Single post
- `GET /api/post-candidates?status=pending|approved|rejected` - Imported posts awaiting review (`countsOnly=true` for counts); `POST` re-runs stop matching
- `PATCH /api/post-candidates/[id]` - `{ action: "approve" | "reject" | "reset" | "suggest", stopId? }`
- `GET /api/media/[...path]` - Serves files from the media directory
- `GET /api/stop-candidates?status=` - Photo-derived stop candidates + library stats; `POST` re-clusters
- `PATCH /api/stop-candidates/[id]` - `{ action: "approve" | "reject" | "reset" | "merge" | "update", ... }`
- `GET /api/stop-candidates/[id]/photos` - Sample photos for a candidate
- `GET /api/photos/[id]/thumb?size=320` - JPEG thumbnail of a library photo (cached in `data/cache/`)
- `POST /api/stops/[id]/route-from-previous` - Redraw a stop's journey line with OSRM road routing

## Deploying to the home server

The site is served from this machine as the Windows service `travel-blog` on `http://localhost:2323`, exposed as travel.raffensperger.net through a Cloudflare Tunnel.

```bash
npm run deploy              # next build (standalone) -> C:\websites\travel-blog, restart service, health check
npm run deploy -- -SkipBuild
```

First time only, from an **elevated** PowerShell, after the first `npm run deploy`:

```powershell
powershell -ExecutionPolicy Bypass -File C:\Code\travel-blog\scripts\install-service.ps1
```

This installs WinSW as `C:\websites\_services\travel-blog\travel-blog.exe`, writes the service definition (environment: `PORT`, `DATABASE_PATH`, `MEDIA_DIR`, `CACHE_DIR`, `PHOTO_LIBRARY_DIR`, `EXIFTOOL`), seeds the server database from `data/travel-blog.db`, and starts the service. Data lives in `C:\websites\_data\travel-blog\` and survives deploys. Re-run the script to change environment variables.

**Admin access:** `/admin`, write API calls, and raw photo thumbnails are only allowed from `localhost` on the server (`proxy.ts`). To use admin remotely, create a Cloudflare Access application for `travel.raffensperger.net/admin` (and `/api`), then re-run the installer with `-CfAccessTeamDomain <team> -CfAccessAud <audience-tag>`; the app verifies the Access JWT on every protected request.

## Tech Stack

- [Next.js 16](https://nextjs.org/) (App Router, Turbopack)
- [React 19](https://react.dev/)
- [TypeScript](https://www.typescriptlang.org/)
- [Leaflet](https://leafletjs.com/) / [React Leaflet](https://react-leaflet.js.org/)
- [sharp](https://sharp.pixelplumbing.com/) for thumbnails, [exiftool](https://exiftool.org/) for photo metadata
- [Nominatim](https://nominatim.org/) reverse geocoding and [OSRM](http://project-osrm.org/) road routing (public instances, cached)
- [SQLite](https://sqlite.org/) via [better-sqlite3](https://github.com/WiseLibs/better-sqlite3) + [Drizzle ORM](https://orm.drizzle.team/)
