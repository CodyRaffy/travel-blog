import { NextResponse } from "next/server";
import { stops } from "@/data/Stops";

// Simulates a database fetch with artificial delay
async function getStopsFromDatabase() {
  // Simulate database latency
  await new Promise((resolve) => setTimeout(resolve, 100));

  // In the future, this would be replaced with actual database query:
  // const stops = await db.query("SELECT * FROM stops");
  return stops;
}

export async function GET() {
  const stopsData = await getStopsFromDatabase();

  // Convert dates to ISO strings for JSON serialization
  const serializedStops = stopsData.map((stop) => ({
    ...stop,
    arrivalDate: stop.arrivalDate.toISOString(),
    departureDate: stop.departureDate.toISOString(),
  }));

  return NextResponse.json(serializedStops);
}
