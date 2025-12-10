# Raffy's on the Road Blog

A travel blog application built with Next.js that displays trip stops on an interactive Leaflet map.

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the map.

Open [http://localhost:3000/admin](http://localhost:3000/admin) to manage stops.

## Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## API Routes

- `GET /api/stops` - Returns all trip stops as JSON
- `POST /api/stops` - Create a new stop
- `GET /api/stops/[id]` - Get a single stop
- `PUT /api/stops/[id]` - Update a stop
- `DELETE /api/stops/[id]` - Delete a stop

## Tech Stack

- [Next.js 16](https://nextjs.org/) (App Router, Turbopack)
- [React 19](https://react.dev/)
- [TypeScript](https://www.typescriptlang.org/)
- [Leaflet](https://leafletjs.com/) / [React Leaflet](https://react-leaflet.js.org/)
