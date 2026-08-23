# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm run dev` - Run development server at http://localhost:3000
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run db:generate` - Generate a SQL migration in `drizzle/` after changing `lib/db/schema.ts`
- `npm run db:migrate` - Apply migrations manually (the app also applies them automatically on startup)
- `npm run db:studio` - Browse the database in Drizzle Studio
- `npm run db:import-json` - One-time import of legacy `data/stops.json`
- `npm run import:facebook -- <export-dir> [--dry-run]` - Parse a Facebook export and stage posts into `post_candidates`
- `npm run deploy [-- -SkipBuild]` - Standalone build -> `C:\websites\travel-blog`, restart the `travel-blog` Windows service on :2323 (`scripts/deploy.ps1`; one-time elevated `scripts/install-service.ps1`)
- `npm run prod -- <script> [args]` - Run any script above against the production data dir (`C:\websites\_data	ravel-blog`)
- `npm run photos:scan [-- --force]` - exiftool scan of the local photo library into `photos` (incremental via `scanned_files`)
- `npm run photos:cluster [-- --radius 30 --min-days 2 --min-photos 15 --max-gap 7 --no-geocode]` - Cluster into `stop_candidates`

## Architecture

This is a Next.js 16 (App Router) TypeScript travel blog application that displays trip stops on an interactive Leaflet map. Uses React 19 and Turbopack as the default bundler.

### Project Structure

```
app/              - Next.js App Router pages and layouts
app/api/          - API route handlers
app/admin/        - Admin pages for managing stops
components/       - React components
components/admin/ - Admin-specific components
data/             - SQLite database (travel-blog.db) and media/ (both gitignored), legacy stops.json
lib/import/       - Importers: config.ts (env-overridable settings), facebook.ts, photoScan.ts, cluster.ts
drizzle/          - Generated SQL migrations (commit these)
lib/              - Server-side data access functions
lib/db/           - Drizzle schema (schema.ts) and shared connection (index.ts)
scripts/          - One-off maintenance scripts (run with tsx)
models/           - TypeScript interfaces
utils/            - Utility functions (map icons)
public/           - Static assets (images, leaflet icons)
```

### Core Components

- **app/page.tsx** - Home page that dynamically imports MainMap (SSR disabled for Leaflet)
- **components/MainMap.tsx** - Main map component using react-leaflet, displays current location, home, all stops with connecting polylines
- **components/Stop.tsx** - Renders individual stop markers

### Admin Pages

- **app/admin/page.tsx** - Admin dashboard listing all stops with edit/delete actions
- **app/admin/add/page.tsx** - Form to create new stop with map location picker
- **app/admin/edit/[id]/page.tsx** - Edit stop details and journey waypoints with interactive map
- **app/admin/stops/review/page.tsx** - Review queue for photo-derived stop candidates (map + cards: approve / merge / rename / skip)
- **app/admin/stops/[id]/photos/page.tsx** - Photo curation for a stop (Suggested / All / Kept / Skipped; keep, skip, drag-reorder, cover, caption)
- **app/admin/posts/page.tsx** - List all blog posts
- **app/admin/posts/review/page.tsx** - Review queue for imported post candidates (approve / re-assign stop / skip)
- **app/admin/posts/new/page.tsx**, **app/admin/posts/[id]/page.tsx** - Create / edit a post

### Admin Components

- **components/admin/StopList.tsx** - Table displaying stops with actions
- **components/admin/StopForm.tsx** - Reusable form for stop details
- **components/admin/LocationPicker.tsx** - Map for selecting stop location
- **components/admin/WaypointEditor.tsx** - Interactive map for adding/removing journey waypoints
- **components/admin/StopCandidateReview.tsx**, **StopCandidateCard.tsx**, **CandidateMap.tsx** - Stop candidate review UI
- **components/admin/PhotoCurator.tsx** - Curation grid
- **components/admin/PostForm.tsx** - Shared form for creating/editing posts
- **components/admin/PostCandidateReview.tsx** - Import review queue UI
- **components/admin/MediaStrip.tsx** - Thumbnail row for a post's media

### API Routes

- **app/api/stops/route.ts** - GET all stops, POST create new stop
- **app/api/stops/[id]/route.ts** - GET, PUT, DELETE single stop
- **app/api/posts/route.ts**, **app/api/posts/[id]/route.ts** - Posts CRUD (`?stopId=`, `?published=true` filters)
- **app/api/post-candidates/route.ts** - GET queue + counts; POST re-runs stop matching
- **app/api/post-candidates/[id]/route.ts** - PATCH `{ action: approve|reject|reset|suggest, stopId? }`
- **app/api/media/[...path]/route.ts** - Serves files from `MEDIA_DIR` (path-traversal safe)
- **app/api/stop-candidates/route.ts**, **[id]/route.ts**, **[id]/photos/route.ts** - Candidate queue; POST re-clusters; PATCH actions approve/reject/reset/merge/update
- **app/api/photos/route.ts** (GET `?stopId=&status=`), **[id]/route.ts** (PATCH curationStatus/caption/sortOrder), **reorder/route.ts** - admin curation (all gated by the `/api/photos/` prefix)
- **app/api/stops/[id]/photos/suggest/route.ts** - POST: score + pick ~8 photos (`?target=`)
- **app/api/stops/[id]/gallery/route.ts** - Public: kept photos with web-variant URLs
- **app/api/photos/[id]/thumb/route.ts** - Cached JPEG thumbnails (sharp; exiftool embedded preview for HEIC/video)
- **app/api/stops/[id]/route-from-previous/route.ts** - OSRM road route from the chronologically previous stop

### Data Layer

- **lib/db/schema.ts** - Drizzle schema. Tables: `stops`, `posts` (blog entries), `photos` (Dropbox-scanned library + curation status), and staging tables `stop_candidates` / `post_candidates` for importer review queues. Timestamps are ISO strings, coordinate lists are JSON columns.
- **lib/db/index.ts** - Shared better-sqlite3 connection (`db`). Opens `data/travel-blog.db` (override with `DATABASE_PATH`), enables WAL + foreign keys, and runs pending migrations from `drizzle/` on startup.
- **lib/stops.ts** - Data access functions (getStops, getStopById, getStopBySlug, createStop, updateStop, deleteStop). Maps DB rows to `StopInfoResponse`; slugs are derived from the name and kept unique.
- **lib/posts.ts** - Posts CRUD, candidate staging/approval, and `suggestStopForDate()` (stop whose stay contains the date; departure day inclusive; tightest range wins; null = ambiguous)
- **lib/import/facebook.ts** - Parses `your_posts*.json` from a Facebook export (old and new layouts), fixes Facebook's Latin-1-escaped UTF-8 (`fixMojibake`), extracts text/media/place. Built against Facebook's documented format; adjust here if a real export differs.
- **lib/import/config.ts** - Photo pipeline settings: `PHOTO_LIBRARY_DIR` (C:\Dropbox), `PHOTO_ROOTS`, `TRIP_START`/`TRIP_END` (Dec 2020 – Apr 2024), `EXIFTOOL`, clustering thresholds, Nominatim/OSRM endpoints
- **lib/import/photoScan.ts** - Walks the library, runs exiftool in batches on new/changed files only (ledger in `scanned_files`), upserts in-range photos. Paths stored relative to the library root with forward slashes and a leading slash. `takenAt` is naive camera-local time.
- **lib/import/cluster.ts** - Pure clustering: per-day dominant location (5 km grid) → chain days within `CLUSTER_RADIUS_KM` and `CLUSTER_MAX_GAP_DAYS` → drop clusters under `CLUSTER_MIN_DAYS` and `CLUSTER_MIN_PHOTOS`
- **lib/stopCandidates.ts** - Generate (replaces pending; skips clusters overlapping existing stops or decided candidates), approve (creates stop, attaches cluster photos + unlocated photos in the date range, draws OSRM route), merge, reject, reset
- **lib/geocode.ts** - Nominatim reverse geocoding, 1 req/s, cached in `geocode_cache` keyed by ~1 km rounded coords
- **lib/routing.ts** - OSRM `roadRoute()`, thinned to ≤400 points
- **lib/photos.ts** - Curation: `suggestStopPhotos()` (GPS +, big +, PNG/video -, burst -, spread over time buckets), `setCuration()` (keeping renders WebP `thumb`/`medium`/`large` into `MEDIA_DIR/photos/<id>/`; un-keeping deletes them and clears the stop cover), reorder, public gallery
- **lib/thumbs.ts** - Thumbnail generation into `CACHE_DIR` (`data/cache`)
- **lib/media.ts** - `MEDIA_DIR` (default `data/media`), `resolveMediaPath()`, `mediaUrl()`
- **lib/slug.ts** - `slugify()` helper
- **data/stops.json** - Legacy JSON data, kept only as the source for `npm run db:import-json`
- **models/StopInfo.ts** - TypeScript interfaces: `StopInfo`, `StopInfoResponse`, `CreateStopInput`, `UpdateStopInput`
- **data/ImportantMarkers.ts** - Fixed locations (current location, home, center of USA)

Curation: only `kept` photos with `variants` are public (`/api/stops/[id]/gallery`, `/api/media/photos/...`). Originals never leave `PHOTO_LIBRARY_DIR`.

Import flows: `photos:scan` → `photos` → `photos:cluster` → `stop_candidates` → admin review → `stops` (photos get `stopId`); Facebook importer → `post_candidates` → admin review → `posts`. Nothing reaches `posts` without approval. Imported and hand-written posts share the `posts` table and editor.

Schema changes: edit `lib/db/schema.ts`, run `npm run db:generate`, and commit the new file in `drizzle/`. Never hand-edit generated migrations.

### Deployment & security

- `next.config.js` sets `output: "standalone"`; `scripts/deploy.ps1` publishes `.next/standalone` + `.next/static` + `public` + `drizzle` to `C:\websites\travel-blog` and restarts the WinSW-wrapped `travel-blog` service (`scripts/install-service.ps1`, elevated, writes `C:\websites\_services\travel-blog\travel-blog.xml` with the production env). Production data is in `C:\websites\_data\travel-blog`.
- `proxy.ts` (Next 16 middleware) gates `/admin`, non-GET `/api/*`, `/api/*-candidates` and `/api/photos/*`: allowed from localhost (no `CF-Connecting-IP` header), or with a valid Cloudflare Access JWT when `CF_ACCESS_TEAM_DOMAIN`/`CF_ACCESS_AUD` are set; otherwise 403. Keep new admin/write routes under those prefixes so they stay covered.

### Leaflet Integration

Leaflet requires client-side only rendering. The MainMap component:
1. Uses `"use client"` directive
2. Is dynamically imported in page.tsx with `ssr: false`
3. Custom icons reference static assets in `/public/leaflet/` and `/public/img/`

## Documentation

When making major changes (framework upgrades, new features, architectural changes), update README.md to reflect:
- Version changes in the Tech Stack section
- New dependencies or removed dependencies
- Changes to available scripts
- New setup requirements
