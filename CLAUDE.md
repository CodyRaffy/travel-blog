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
app/              - Next.js App Router pages and layouts
app/api/          - API route handlers
app/admin/        - Admin pages for managing stops
components/       - React components
components/admin/ - Admin-specific components
data/             - JSON data storage (stops.json)
lib/              - Server-side data access functions
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

### Admin Components

- **components/admin/StopList.tsx** - Table displaying stops with actions
- **components/admin/StopForm.tsx** - Reusable form for stop details
- **components/admin/LocationPicker.tsx** - Map for selecting stop location
- **components/admin/WaypointEditor.tsx** - Interactive map for adding/removing journey waypoints

### API Routes

- **app/api/stops/route.ts** - GET all stops, POST create new stop
- **app/api/stops/[id]/route.ts** - GET, PUT, DELETE single stop

### Data Layer

- **lib/stops.ts** - Data access functions (getStops, createStop, updateStop, deleteStop)
- **data/stops.json** - JSON file storing all stops (persists across restarts)
- **models/StopInfo.ts** - TypeScript interfaces: `StopInfo`, `StopInfoResponse`, `CreateStopInput`, `UpdateStopInput`
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
