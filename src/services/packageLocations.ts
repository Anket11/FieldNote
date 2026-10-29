import type { MapLocation, MapGroup } from "../types/geography";
import type { Evidence, PackageLocation } from "../types/research";
import { coordinatesSchema } from "./coordinates";
import { locationOverride } from "./locationOverrides";

// shortcut: saved demo area hints, replace with explicit location metadata from the backend.
const demoLocations: Record<string, PackageLocation> = {
  "package:20775f3d78d1298498c53e1284d93b77c09de2e3da843bbea247406879c5ea26": { name: "Jharkhand, India", precision: "region" },
  "package:bd86bfcf11934ea1f97c562dcf21b34f4467632d052f81bbebe9d7e1d28acf2e": { name: "Tuensang, Nagaland, India", precision: "place" },
  "package:bc4539e0d44f23fabe4a0c1bc2999e16093e8848bc108df0366303f78743e418": { name: "Mizoram, India", precision: "region" },
  "package:7fb593b13ca9a0bc8ca2c1fdc39112a37481dcb9d3e9569b9d92504c826b0148": { name: "Manipur, India", precision: "region" },
};
export interface LocatedPackage {
  itemId: string;
  name: string;
  precision: PackageLocation["precision"];
  coordinates: [number, number];
}
function packageLocationHint(item: Evidence): PackageLocation | undefined {
  return item.location ?? (Object.hasOwn(demoLocations, item.id) ? demoLocations[item.id] : undefined);
}
async function geocodeLocation(name: string, token: string, signal: AbortSignal, types?: string): Promise<[number, number] | null> {
  const params = new URLSearchParams({ q: name, limit: "1", autocomplete: "false", access_token: token });
  if (types) params.set("types", types);
  const response = await fetch(`https://api.mapbox.com/search/geocode/v6/forward?${params}`, { signal: AbortSignal.any([signal, AbortSignal.timeout(15000)]) });
  if (!response.ok) throw new Error("Location could not be loaded.");
  const data: unknown = await response.json();
  if (!data || typeof data !== "object" || !("features" in data) || !Array.isArray(data.features)) throw new Error("Invalid location response.");
  const feature: unknown = data.features[0];
  if (!feature) return null;
  if (typeof feature !== "object" || !("geometry" in feature) || !feature.geometry || typeof feature.geometry !== "object" || !("coordinates" in feature.geometry)) throw new Error("Invalid location response.");
  const point: unknown = feature.geometry.coordinates;
  if (!Array.isArray(point) || point.length !== 2 || !point.every((value) => typeof value === "number" && Number.isFinite(value)) || Math.abs(point[0]) > 180 || Math.abs(point[1]) > 90) throw new Error("Invalid location coordinates.");
  return [point[0], point[1]];
}
export async function locatePackages(items: Evidence[], token: string, signal: AbortSignal): Promise<LocatedPackage[]> {
  const locations = await Promise.all(items.map(async (item): Promise<LocatedPackage | null> => {
    const override = locationOverride(item.location?.name ?? "") ?? locationOverride(item.title);
    if (override) return { itemId: item.id, name: override.name, precision: "place", coordinates: override.coordinates };
    const hint = packageLocationHint(item);
    if (!hint) return null;
    const coordinates = hint.coordinates !== undefined ? coordinatesSchema().parse(hint.coordinates)
      : await geocodeLocation(hint.name, token, signal, hint.precision === "region" ? "region" : "place,locality");
    return coordinates ? { itemId: item.id, name: hint.name, precision: hint.precision, coordinates: [...coordinates] } : null;
  }));
  return locations.filter((location): location is LocatedPackage => location !== null);
}
export function groupLocations(locations: LocatedPackage[]): MapGroup[] {
  const groups = new Map<string, MapGroup>();
  for (const location of locations) {
    const key = location.coordinates.join(",");
    const group = groups.get(key);
    if (group) group.itemIds.push(location.itemId);
    else groups.set(key, { name: location.name, coordinates: location.coordinates, itemIds: [location.itemId] });
  }
  return [...groups.values()];
}

export async function findLocation(query: string, token: string, signal: AbortSignal, point?: [number, number]): Promise<MapLocation> {
  const name = query.trim();
  const override = locationOverride(name);
  if (override) return override;
  if (point !== undefined) {
    const coordinates = coordinatesSchema().parse(point);
    return { name: name || `${coordinates[1]}, ${coordinates[0]}`, coordinates, precision: "coordinates" };
  }
  if (!name) throw new Error("Enter a place or latitude, longitude.");
  const pair = name.match(/^([+-]?\d+(?:\.\d+)?)\s*,\s*([+-]?\d+(?:\.\d+)?)$/);
  if (pair) {
    const latitude = Number(pair[1]);
    const longitude = Number(pair[2]);
    if (Math.abs(latitude) > 90 || Math.abs(longitude) > 180) throw new Error("Latitude must be between -90 and 90, longitude between -180 and 180.");
    return { name, coordinates: [longitude, latitude], precision: "coordinates" };
  }
  const coordinates = await geocodeLocation(name, token, signal);
  if (!coordinates) throw new Error("Location not found. Try a nearby town or coordinates.");
  return { name, coordinates, precision: "approximate" };
}
