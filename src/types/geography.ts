export interface MapTarget {
  name: string;
  coordinates: [number, number];
}
export interface MapLocation extends MapTarget {
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
