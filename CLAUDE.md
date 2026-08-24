# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm run dev` - Run development server at http://localhost:3000
- `npm run build` - Build for production (check the exit code, not just grep'd output)
- `npm run start` - Start production server
- `npm run lint` - Run ESLint (currently broken: `next lint` was removed in Next 16)
- `npm run db:generate` - Generate a SQL migration in `drizzle/` after changing `lib/db/schema.ts`
- `npm run db:migrate` - Apply migrations manually (the app also applies them automatically on startup)
- `npm run db:studio` - Browse the database in Drizzle Studio
- `npm run db:import-json` - One-time import of legacy `data/stops.json`
- `npm run import:facebook -- <export-dir> [--dry-run]` - Parse a Facebook export and stage posts into `post_candidates`
- `npm run photos:scan [-- --force]` - exiftool scan of the local photo library into `photos` (incremental via `scanned_files`)
- `npm run photos:cluster [-- --radius 30 --min-days 2 --min-photos 15 --max-gap 7 --no-geocode]` - Cluster into `stop_candidates`
- `npm run photos:hash` - Perceptual-hash (dHash) every library photo missing one (resumable; needed for Facebook media matching)
- `npm run posts:match-media [-- --render]` - Link Facebook post photos to Dropbox originals by hash; `--render` pre-builds variants for approved posts
- `npm run prod -- <script> [args]` - Run any script above against the production data dir (`C:\websites\_data\travel-blog`)
- `npm run deploy [-- -SkipBuild]` - Standalone build -> `C:\websites\travel-blog`, restart the `travel-blog` Windows service on :2323 (`scripts/deploy.ps1`)
- `npm run backup` - Snapshot DB + mirror media into `C:\Dropbox\Backups\travel-blog` (`scripts/backup.ps1`; nightly via elevated `scripts/install-backup-task.ps1`)

One-time elevated setup scripts: `scripts/install-service.ps1` (WinSW service, prod env vars, Cloudflare Access config, deploy-user service rights — re-run it to change any env var) and `scripts/install-backup-task.ps1` (03:15 scheduled task as SYSTEM).

## Architecture

Next.js 16 (App Router) TypeScript travel blog: 3.5 years of full-time RV travel as an interactive Leaflet map, stop pages, photo galleries and a journal. React 19, Turbopack, SQLite. Runs on the family's home server behind a Cloudflare Tunnel (travel.raffensperger.net).

### Project Structure

```
app/              - Next.js App Router pages and layouts
app/api/          - API route handlers
app/admin/        - Admin pages (stops, candidates, posts, curation)
components/       - React components (components/site/ public, components/admin/ admin)
data/             - Dev SQLite database + media/ + cache/ (gitignored), legacy stops.json, ImportantMarkers.ts
drizzle/          - Generated SQL migrations (commit these)
lib/              - Server-side data access
lib/db/           - Drizzle schema (schema.ts) and shared connection (index.ts)
lib/import/       - Importers: config.ts (env-overridable settings), facebook.ts, photoScan.ts, cluster.ts, matchMedia.ts
scripts/          - CLIs (tsx) and PowerShell deploy/service/backup scripts
models/           - TypeScript interfaces
utils/            - Map icon helpers
public/           - Static assets (img/, leaflet/); app/icon.svg is the favicon (truck + fifth wheel)
```

### Public site

Server components read the DB directly via `lib/*` (all public pages are `force-dynamic`). Styling is `app/site.css` (tokens: highway-green `--accent`, route-red `--route`; fonts Zilla Slab + Source Sans 3 via `next/font`). Admin pages keep their inline styles.

- **app/page.tsx** - Map home: fetches stops server-side, renders `components/site/HomeMap.tsx` (client wrapper that dynamically imports `MainMap` with `ssr: false`)
- **components/MainMap.tsx** - react-leaflet map. Legs coloured by trip year; legend has era chips (All / RV years / Trips, via `isRvEra()`) and year-filter chips. Popups show cover photo/dates/link. Marker types: default pin, small dot (overnightStop), house glyph (homeBase), Start/End badges. `components/site/TripScrubber.tsx` drives a vehicle marker along the legs (slider + play; whole positions = stops, fractions interpolate along the polyline) with an odometer of road miles. Legs with `flightLeg` or no road route beyond 60 mi draw dashed ("4 24"): airplane rotated to bearing, or the ship when the destination's vehicle is `boat` ("by sea"). The drive marker faces its direction of travel with debounced flips.
- **app/stops/page.tsx** - Timeline grouped by year with era tabs (`?era=rv|trips`); **app/stops/[slug]/page.tsx** - Stop page: hero (cover), prev/next, description/link, `components/site/Gallery.tsx` (client lightbox), posts written there
- **app/posts/page.tsx**, **app/posts/[id]/page.tsx** - Journal index and single post (`components/site/PostCard.tsx`; media shows the matched Dropbox original when available, else the Facebook copy)
- **components/site/SiteHeader.tsx** (`overlay` prop for the map page), **SiteFooter.tsx**, **StopCard.tsx**; **app/not-found.tsx**
- **lib/format.ts** - `fmtRange`, `fmtNights`, `fmtMonthRange`, `yearOf`, `fmtDateTime`, `isRvEra`

### Stop model concepts

- Categories are boolean columns, defined centrally in `lib/categories.ts` (`STOP_CATEGORIES`: statePark, nationalPark, nationalMonument, armyCorps, overnightStop, homeBase, cityStop; label/badge/help per entry). Forms use `components/admin/CategoryPicker.tsx`; lists and public badges use `categoryBadges()`. To add one: schema column + migration, `models/StopInfo.ts`, `lib/stops.ts` mapping, `lib/stopCandidates.ts` ApproveInput, and an entry in `STOP_CATEGORIES`.
- `vehicle` (lib/vehicles.ts: fifth_wheel | minivan | motorhome | boat) is how the family travelled the leg *into* that stop; `defaultVehicleFor()` picks by date (fifth wheel inside `RV_TRIP_START..RV_TRIP_END` = Dec 2020–Apr 2024, else minivan). SVG artwork lives there too.
- `flightLeg` boolean = "we flew here": the leg is never road-routed (routing clears its waypoints) and always draws dashed; combined with `vehicle: "boat"` it renders as a ferry.
- Home history is `HOME_ERAS` in `data/ImportantMarkers.ts` (Kilkierane → sold 2022-06-15; Monticello KOA between; 2518 Killarney Way from 2024-04). `homeEraAt(date)` drives home-base detection, naming, placement and icons.

### Admin

- **app/admin/page.tsx** - Stop list + tools: "Set vehicle by date range" (PATCH /api/stops), "Re-route all legs", nav
- **app/admin/add**, **app/admin/edit/[id]** - Stop form (categories, vehicle, "We flew here", dates, map picker) + waypoint editor with "Draw road route"
- **app/admin/stops/review** - Photo-derived stop candidates: map + cards (sample photos with lightbox + "show all", rename, dates, categories, vehicle, flight flag, website; approve / merge / skip), "Bulk approve N with ≥X nights", "Re-cluster photos"
- **app/admin/stops/[id]/photos** - Curation grid (Suggested / All / Kept / Skipped; keep/skip incl. from the lightbox with auto-advance, drag-reorder, cover ★, captions)
- **app/admin/posts**, **/review**, **/new**, **/[id]** - Posts list, imported-post review queue (stop matching + check-in shown), editor
- Components: StopList, StopForm, CategoryPicker, LocationPicker, WaypointEditor, StopCandidateReview/Card, CandidateMap, PhotoCurator, PostForm, PostCandidateReview, MediaStrip, HelpIcon

### API Routes

- **app/api/stops/route.ts** - GET all, POST create (auto-routes the new leg + fixes the next), PATCH set vehicle by date range
- **app/api/stops/[id]/route.ts** - GET/PUT/DELETE; **[id]/route-from-previous** - POST OSRM re-route; **/api/stops/reroute** - POST rebuild all legs (`?onlyEmpty=true`)
- **app/api/stops/[id]/gallery** - Public curated photos; **[id]/photos/suggest** - POST pick ~8 (`?target=`)
- **app/api/stop-candidates/route.ts** - GET queue+counts+library stats; POST re-clusters or `{action:"bulkApprove",minNights}`; **[id]** PATCH approve/reject/reset/merge/update; **[id]/photos** GET sample (`?limit=all`)
- **app/api/posts**, **[id]** - Posts CRUD; **app/api/post-candidates**, **[id]** - queue (PATCH approve/reject/reset/suggest; POST re-matches)
- **app/api/photos/route.ts** (GET `?stopId=&status=`), **[id]** (PATCH curationStatus/caption/sortOrder), **reorder**, **[id]/thumb** (cached JPEG; exiftool embedded preview for HEIC/video) - admin, gated by the `/api/photos/` prefix
- **app/api/media/[...path]/route.ts** - Serves files from `MEDIA_DIR` (path-traversal safe)

### Data Layer

- **lib/db/schema.ts** - Tables: `stops`, `posts`, `photos` (library index: path, takenAt naive camera-local, GPS, phash, curation status, variants), staging `stop_candidates` / `post_candidates`, `scanned_files` (scan ledger), `geocode_cache`. Timestamps ISO strings, coordinate lists JSON columns.
- **lib/db/index.ts** - Shared better-sqlite3 connection; `DATABASE_PATH` override, WAL, FKs, auto-migrate from `drizzle/` on startup. NOTE: a brand-new migration can race if parallel build workers all apply it — the dev DB is disposable (delete `data/travel-blog.db*` and rebuild).
- **lib/stops.ts** - Stops CRUD (unique slugs follow renames; `coverUrl` derived; setting `flightLeg` clears stale waypoints), `setVehicleForRange()`
- **lib/posts.ts** - Posts CRUD, candidate staging/approval, `suggestStopForDate()` (containing stay → check-in within 30 km/±30 d → most recent stay left ≤14 d before), media URL resolution to upgraded originals
- **lib/stopCandidates.ts** - Generate (replaces pending; skips spans overlapping existing stops/decisions and near-home clusters outside the RV years), approve (creates stop, attaches photos + unlocated-by-date, pre-suggests gallery, re-matches pending posts, routes), bulk approve (route rebuild once at the end), merge/reject/reset
- **lib/import/photoScan.ts** - Walks `PHOTO_ROOTS`, exiftool in batches on new/changed files only. Dropbox online-only placeholders (reparse points) are detected, reported, and never treated as deleted.
- **lib/import/cluster.ts** - Per-day overnight-hour dominant location (5 km grid) → chain days within radius/gap → fold short excursions back into their base stay → drop drive-bys
- **lib/import/facebook.ts** - Parses `your_posts*`/`profile_posts*` JSON (all export layouts seen), fixes Latin-1-escaped UTF-8, extracts text/media/check-in place
- **lib/import/matchMedia.ts** - Matches Facebook photos to Dropbox originals by dHash within a 120-day window (≤8 bits + 3 margin, or ≤12 + 6); `ensureVariantsForMedia()` renders variants on post approval
- **lib/phash.ts** - dHash + hamming; **lib/photos.ts** - curation (suggest/keep/skip/reorder; keeping renders WebP 480/1400/2400 into `MEDIA_DIR/photos/<id>/`; variants still referenced by a post are never deleted)
- **lib/geocode.ts** (Nominatim, 1 req/s, cached), **lib/routing.ts** (OSRM `roadRoute()` ≤400 pts; `routeStopFromPrevious` also fixes the following leg; `rerouteAllStops`; flight-leg stops are skipped/cleared), **lib/thumbs.ts**, **lib/media.ts**, **lib/slug.ts**, **lib/categories.ts**, **lib/vehicles.ts**
- **lib/import/config.ts** - `PHOTO_LIBRARY_DIR` (C:\Dropbox), `PHOTO_ROOTS`, scan window `TRIP_START`/`TRIP_END` (2018-09 → 2027), `HOME_RADIUS_KM`, `EXIFTOOL`, clustering thresholds, Nominatim/OSRM endpoints

Curation: only `kept` photos with `variants` are public (`/api/stops/[id]/gallery`, `/api/media/photos/...`). Originals never leave `PHOTO_LIBRARY_DIR`.

Import flows: `photos:scan` → `photos` → `photos:cluster` → `stop_candidates` → admin review → `stops` (photos get `stopId`); Facebook importer → `post_candidates` → review → `posts`; `photos:hash` + `posts:match-media` link Facebook copies to originals. Nothing publishes without approval.

Schema changes: edit `lib/db/schema.ts`, run `npm run db:generate`, commit the new file in `drizzle/`. Never hand-edit generated migrations.

### Deployment & security

- Dev and prod are separate: dev DB in `data/`, production data in `C:\websites\_data\travel-blog` (db, media, cache). Content review happens against prod (http://localhost:2323/admin or the public host); use `npm run prod -- <script>` for CLIs.
- `next.config.js`: `output: "standalone"`; `scripts/deploy.ps1` publishes to `C:\websites\travel-blog` and restarts the WinSW `travel-blog` service (deploy user has service start/stop rights; no elevation needed after setup).
- `proxy.ts` (Next 16 middleware) gates `/admin`, non-GET `/api/*`, `/api/*-candidates` and `/api/photos/*`: allowed from localhost (no `CF-Connecting-IP` header) or with a Cloudflare Access JWT verified against team `CF_ACCESS_TEAM_DOMAIN` (AUD pin and `CF_ACCESS_EMAILS` allow-list optional hardening). Cloudflare Access (One-time PIN provider) covers only `travel.raffensperger.net/admin`; API writes rely on the middleware verifying the domain-wide Access cookie. Keep new admin/write routes under the gated prefixes.
- Backups: `scripts/backup.ps1` → `C:\Dropbox\Backups\travel-blog` (VACUUM INTO snapshot zipped, 14 kept; media mirrored with robocopy /MIR; service xml). Nightly scheduled task via `scripts/install-backup-task.ps1`.

### Leaflet Integration

Leaflet requires client-side only rendering. The MainMap component:
1. Uses `"use client"` directive
2. Is dynamically imported with `ssr: false` (via `components/site/HomeMap.tsx`)
3. Custom icons reference static assets in `/public/leaflet/` and `/public/img/`

## Gotchas

- Dropbox "free up space" can dehydrate library files to online-only placeholders; the scanner reports them and keeps their index rows, but EXIF/thumbnails need the bytes (Explorer → "Make available offline").
- Windows shell quoting mangles heredocs/backslashes ("\t" → tab): prefer the Write/Edit tools or python/node scripts in files for multi-line patches; PowerShell here-strings must be single-quoted to keep backticks.
- Overpass/Nominatim/OSRM are public instances: cache, rate-limit (1 req/s), and never fail hard on them.

## Documentation

When making major changes (framework upgrades, new features, architectural changes), update README.md to reflect:
- Version changes in the Tech Stack section
- New dependencies or removed dependencies
- Changes to available scripts
- New setup requirements
