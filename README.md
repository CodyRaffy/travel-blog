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

## Tech Stack

- [Next.js 16](https://nextjs.org/) (App Router, Turbopack)
- [React 19](https://react.dev/)
- [TypeScript](https://www.typescriptlang.org/)
- [Leaflet](https://leafletjs.com/) / [React Leaflet](https://react-leaflet.js.org/)
- [SQLite](https://sqlite.org/) via [better-sqlite3](https://github.com/WiseLibs/better-sqlite3) + [Drizzle ORM](https://orm.drizzle.team/)
