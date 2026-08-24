# Raffy's on the Road Blog

The record of 3½ years of full-time RV travel (December 2020 – April 2024), plus the trips before and after: an interactive map with a drivable trip slider, stop pages with photo galleries, and a journal imported from Facebook. Live at **travel.raffensperger.net**, served from the home server through a Cloudflare Tunnel.

## The map

- Legs are coloured by trip year, with legend chips to filter by **era** (All / RV years / Trips from home) and by year.
- The **trip slider** (with ▶ play) drives a marker along the actual road routes, with the stop name, month/year and a road-miles odometer. The marker matches how we travelled: the dually + 38 ft fifth wheel, the minivan (pre/post-RV trips), the rented motorhome (Alaska), a ship on water crossings, or an airplane on flights.
- Marker shapes: pins for destinations, small dots for overnight stops, a house glyph for home-base stays (Kilkierane, the Monticello KOA between houses, Killarney Way since April 2024).

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) for the map and [/admin](http://localhost:3000/admin) to manage content. The SQLite database (`data/travel-blog.db`) is created and migrated automatically on first run. **Note:** dev and the live site have separate data; content editing normally happens against the live site (`http://localhost:2323/admin`, or remotely — see Admin access).

## Content workflow

### 1. Rebuild stops from photos

The photo library is read straight from the synced Dropbox folder (default `C:\Dropbox`; override with `PHOTO_LIBRARY_DIR`, `PHOTO_ROOTS`, `TRIP_START`, `TRIP_END` — see `lib/import/config.ts`). Requires [exiftool](https://exiftool.org/). If Dropbox has made files "online-only", the scan reports them — use Explorer → *Make available offline* first.

```bash
npm run prod -- photos:scan      # index capture time + GPS (incremental)
npm run prod -- photos:cluster   # group into candidate stops, named via Nominatim
```

Review at `/admin/stops/review`: each candidate shows sample photos, dates and a suggested name. Approve (creates the stop, attaches photos, pre-picks a gallery, draws the OSRM road route), merge stays the clustering split, or skip. **Bulk approve** takes every candidate with ≥ N nights in one go. Home stays are auto-detected against the home-of-that-date. Candidates near home outside the RV years are skipped as daily life. Re-clustering never re-proposes decided spans.

Per stop you can set categories (state/national park, Army Corps, overnight, home base, city), the **vehicle**, and **"We flew here"** (draws the leg as a dashed flight — pair it with the Boat vehicle for a ferry). The stop list has *Set vehicle by date range* and *Re-route all legs* tools.

### 2. Curate photos

**Photos** on a stop opens the curation grid: keep/skip the ~8 suggestions or any of the stop's photos (the enlarge view pages with ← → and keeps/skips with auto-advance), drag to reorder, star a cover, add captions. Photos you keep get resized web copies (WebP, 480/1400/2400 px); originals never leave Dropbox; skipped photos are not copied at all.

### 3. Import the Facebook journal

1. Facebook → Settings → **Download your information**: JSON, all time, media quality high, at least "Posts".
2. `npm run prod -- import:facebook -- <extracted-export-dir>` (add `--dry-run` to preview). Media is copied into the site's media directory; re-runs skip what's staged.
3. Review at `/admin/posts/review`. Posts are matched to the stop whose dates contain them, falling back to the post's check-in location and to "recently left" stops (people post late); approving a stop re-matches pending posts automatically.
4. Optional photo upgrade: `npm run prod -- photos:hash` then `npm run prod -- posts:match-media` links Facebook's recompressed photos to the full-quality Dropbox originals by perceptual hash; approved posts then display the originals.

Hand-written entries use the same posts table and editor (`/admin/posts/new`).

## Scripts

- `npm run dev` / `build` / `start` - Next.js dev, production build, production server
- `npm run db:generate` / `db:migrate` / `db:studio` / `db:import-json` - Migrations and DB tools
- `npm run photos:scan [-- --force]` - Index the photo library (exiftool; incremental)
- `npm run photos:cluster [-- --radius 30 --min-days 2 --min-photos 15 --max-gap 7 --no-geocode]` - Propose stop candidates
- `npm run photos:hash` - Perceptual-hash the library (for media matching; resumable)
- `npm run posts:match-media [-- --render]` - Link Facebook post photos to Dropbox originals
- `npm run import:facebook -- <export-dir> [--dry-run]` - Stage Facebook posts for review
- `npm run prod -- <script> [args]` - Run any of the above against the live site's data
- `npm run deploy [-- -SkipBuild]` - Build and publish to the home server
- `npm run backup` - Back up the live database + media into Dropbox

## API Routes

Public: `GET /api/stops`, `GET /api/stops/[id]`, `GET /api/stops/[id]/gallery`, `GET /api/posts?stopId=&published=true`, `GET /api/posts/[id]`, `GET /api/media/[...path]`.

Admin (localhost or Cloudflare Access login): stop CRUD and `PATCH /api/stops` (vehicle by date range), `POST /api/stops/reroute` and `/api/stops/[id]/route-from-previous`, stop-candidate queue (`/api/stop-candidates`, actions approve/reject/reset/merge/update/bulkApprove), post CRUD and post-candidate queue, curation (`/api/photos*`, `/api/stops/[id]/photos/suggest`), library thumbnails (`/api/photos/[id]/thumb`).

## Deploying to the home server

The site runs as the Windows service `travel-blog` on `http://localhost:2323`, exposed as travel.raffensperger.net through a Cloudflare Tunnel.

```bash
npm run deploy              # next build (standalone) -> C:\websites\travel-blog, restart service, health check
```

One-time setup, each from an **elevated** PowerShell:

```powershell
# service (WinSW), production env, Cloudflare Access config, deploy rights
powershell -ExecutionPolicy Bypass -File C:\Code\travel-blog\scripts\install-service.ps1 `
    -CfAccessTeamDomain <team> [-CfAccessAud <aud>] [-CfAccessEmails a@b.com,c@d.com]

# nightly 03:15 backup task
powershell -ExecutionPolicy Bypass -File C:\Code\travel-blog\scripts\install-backup-task.ps1
```

Production data (database, media, thumbnail cache) lives in `C:\websites\_data\travel-blog\` and survives deploys. Re-run the installer to change any environment variable.

**Admin access:** `/admin`, write API calls and raw library thumbnails are allowed from localhost on the server, or remotely through a Cloudflare Access application on `travel.raffensperger.net/admin` (One-time PIN — an emailed code; no Cloudflare account needed for users). The app verifies the Access token on every protected request, optionally pinned to the app's AUD tag and an email allow-list.

**Backups:** `npm run backup` (and the nightly task) writes to `C:\Dropbox\Backups\travel-blog\` — a zipped consistent DB snapshot (last 14 kept) plus a mirror of the media directory — which Dropbox then syncs offsite. ~2.3 GB today.

## Tech Stack

- [Next.js 16](https://nextjs.org/) (App Router, Turbopack, standalone output)
- [React 19](https://react.dev/)
- [TypeScript](https://www.typescriptlang.org/)
- [Leaflet](https://leafletjs.com/) / [React Leaflet](https://react-leaflet.js.org/)
- [SQLite](https://sqlite.org/) via [better-sqlite3](https://github.com/WiseLibs/better-sqlite3) + [Drizzle ORM](https://orm.drizzle.team/)
- [sharp](https://sharp.pixelplumbing.com/) for image variants/thumbnails, [exiftool](https://exiftool.org/) for photo metadata
- [Nominatim](https://nominatim.org/) reverse geocoding and [OSRM](http://project-osrm.org/) road routing (public instances, cached and rate-limited)
- Hosting: Windows service (WinSW) + [Cloudflare Tunnel](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/) + [Cloudflare Access](https://developers.cloudflare.com/cloudflare-one/policies/access/) for admin login
