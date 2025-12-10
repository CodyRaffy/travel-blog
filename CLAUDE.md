# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm run dev` - Run development server at http://localhost:3000
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## Architecture

This is a Next.js 16 (App Router) TypeScript travel blog application that displays trip stops on an interactive Leaflet map. Uses React 19 and Turbopack as the default bundler.

### Project Structure

```
app/           - Next.js App Router pages and layouts
app/api/       - API route handlers
components/    - React components
data/          - Static data (stops, markers)
models/        - TypeScript interfaces
utils/         - Utility functions (map icons)
public/        - Static assets (images, leaflet icons)
```

### Core Components

- **app/page.tsx** - Home page that dynamically imports MainMap (SSR disabled for Leaflet)
- **components/MainMap.tsx** - Main map component using react-leaflet, displays current location, home, all stops with connecting polylines
- **components/Stop.tsx** - Renders individual stop markers

### API Routes

- **app/api/stops/route.ts** - GET endpoint that returns stops data as JSON. Currently reads from static data but designed for easy database migration.

### Data Layer

- **models/StopInfo.ts** - TypeScript interfaces: `StopInfo` (with Date objects) and `StopInfoResponse` (with serialized date strings for API responses)
- **data/Stops.ts** - Array of StopInfo objects with detailed journey coordinates (used as data source for API)
- **data/ImportantMarkers.ts** - Fixed locations (current location, home, center of USA)

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
