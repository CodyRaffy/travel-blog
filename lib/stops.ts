import { promises as fs } from "fs";
import path from "path";
import { StopInfoResponse, CreateStopInput, UpdateStopInput } from "@/models/StopInfo";

const DATA_FILE = path.join(process.cwd(), "data", "stops.json");

export async function getStops(): Promise<StopInfoResponse[]> {
  const data = await fs.readFile(DATA_FILE, "utf-8");
  return JSON.parse(data);
}

export async function getStopById(id: string): Promise<StopInfoResponse | null> {
  const stops = await getStops();
  return stops.find((stop) => stop.id === id) || null;
}

export async function createStop(input: CreateStopInput): Promise<StopInfoResponse> {
  const stops = await getStops();

  const newStop: StopInfoResponse = {
    id: crypto.randomUUID(),
    name: input.name,
    latLongTuple: input.latLongTuple,
    link: input.link,
    statePark: input.statePark,
    nationalMonument: input.nationalMonument,
    nationalPark: input.nationalPark,
    arrivalDate: input.arrivalDate,
    departureDate: input.departureDate,
    journeyLatLongTuples: [],
  };

  stops.push(newStop);
  await fs.writeFile(DATA_FILE, JSON.stringify(stops, null, 2));

  return newStop;
}

export async function updateStop(
  id: string,
  input: UpdateStopInput
): Promise<StopInfoResponse | null> {
  const stops = await getStops();
  const index = stops.findIndex((stop) => stop.id === id);

  if (index === -1) {
    return null;
  }

  const updatedStop: StopInfoResponse = {
    ...stops[index],
    ...input,
  };

  stops[index] = updatedStop;
  await fs.writeFile(DATA_FILE, JSON.stringify(stops, null, 2));

  return updatedStop;
}

export async function deleteStop(id: string): Promise<boolean> {
  const stops = await getStops();
  const index = stops.findIndex((stop) => stop.id === id);

  if (index === -1) {
    return false;
  }

  stops.splice(index, 1);
  await fs.writeFile(DATA_FILE, JSON.stringify(stops, null, 2));

  return true;
}
