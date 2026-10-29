import type { MapLocation } from "../types/geography";
import { coordinatesSchema } from "./coordinates";

export function locationOverride(query: string): MapLocation | null {
  if (!/\bbenban\s+solar\s+park(?:\s+complex)?\b/i.test(query)) return null;
  const configured = process.env.NEXT_PUBLIC_BENBAN_COORDINATES;
  if (!configured) return null;
  const values = configured.split(",").map((part) => part.trim());
  if (values.some((part) => !part)) throw new Error("Invalid Benban coordinate override.");
  return { name: "Benban Solar Park Complex", coordinates: coordinatesSchema().parse(values.map(Number)), precision: "coordinates" };
}
