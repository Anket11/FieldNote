export interface MapLocation {
  name: string;
  coordinates: [number, number];
  precision: "approximate" | "coordinates";
}
export type MapView = "map" | "terrain" | "history";
export interface SatelliteScene {
  id: string;
  date: string;
  cloudCover: number | null;
  bounds: [number, number, number, number];
  tiles: string;
}

export interface MapGroup {
  name: string;
  coordinates: [number, number];
  itemIds: string[];
}
