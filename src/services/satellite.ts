import type { SatelliteScene } from "../types/geography";

const catalog = "https://planetarycomputer.microsoft.com/api/stac/v1";
export function parseSatelliteScenes(data: unknown, year: number): SatelliteScene[] {
  if (!data || typeof data !== "object" || !("features" in data) || !Array.isArray(data.features)) throw new Error("Invalid imagery response.");
  const scenes: SatelliteScene[] = [];
  const seen = new Set<string>();
  for (const raw of data.features) {
    if (!raw || typeof raw !== "object") throw new Error("Invalid imagery record.");
    const item = raw as Record<string, unknown>;
    const properties = item.properties;
    const assets = item.assets;
    if (typeof item.id !== "string" || !item.id || !properties || typeof properties !== "object" || !assets || typeof assets !== "object") throw new Error("Invalid imagery record.");
    if (!("visual" in assets)) continue;
    const date = "datetime" in properties ? properties.datetime : undefined;
    const bounds = item.bbox;
    if (typeof date !== "string" || !Number.isFinite(Date.parse(date)) || !Array.isArray(bounds) || bounds.length !== 4 ||
      !bounds.every((value) => typeof value === "number" && Number.isFinite(value)) || bounds[0] < -180 || bounds[2] > 180 || bounds[1] < -90 || bounds[3] > 90 || bounds[0] >= bounds[2] || bounds[1] >= bounds[3]) throw new Error("Invalid imagery metadata.");
    if (new Date(date).getUTCFullYear() !== year || seen.has(item.id)) continue;
    const cloud = "eo:cloud_cover" in properties ? properties["eo:cloud_cover"] : undefined;
    const params = new URLSearchParams({ collection: "sentinel-2-l2a", item: item.id, assets: "visual", asset_bidx: "visual|1,2,3", nodata: "0", format: "png" });
    scenes.push({ id: item.id, date, cloudCover: typeof cloud === "number" && cloud >= 0 && cloud <= 100 ? cloud : null,
      bounds: [bounds[0], bounds[1], bounds[2], bounds[3]],
      tiles: `https://planetarycomputer.microsoft.com/api/data/v1/item/tiles/WebMercatorQuad/{z}/{x}/{y}@1x?${params}` });
    seen.add(item.id);
  }
  return scenes.sort((a, b) => Date.parse(b.date) - Date.parse(a.date));
}
export async function findSatelliteScenes(coordinates: [number, number], year: number, cloudCover: number, signal: AbortSignal): Promise<SatelliteScene[]> {
  const now = new Date();
  const currentYear = now.getUTCFullYear();
  if (!coordinates.every(Number.isFinite) || Math.abs(coordinates[0]) > 180 || Math.abs(coordinates[1]) > 90 || !Number.isInteger(year) || year < currentYear - 10 || year > currentYear || !Number.isFinite(cloudCover) || cloudCover < 0 || cloudCover > 100) throw new Error("Choose a valid location, year and cloud limit.");
  const lookback = new Date(now);
  lookback.setUTCFullYear(currentYear - 10);
  const start = year === currentYear - 10 ? lookback.toISOString() : `${year}-01-01T00:00:00Z`;
  const end = year === currentYear ? now.toISOString() : `${year}-12-31T23:59:59Z`;
  const params = new URLSearchParams({ collections: "sentinel-2-l2a", intersects: JSON.stringify({ type: "Point", coordinates }),
    datetime: `${start}/${end}`, limit: "100", sortby: "-datetime", query: JSON.stringify({ "eo:cloud_cover": { lte: cloudCover } }) });
  // shortcut: clearest of the latest 100 captures, use an annual mosaic when complete coverage is needed.
  const response = await fetch(`${catalog}/search?${params}`, { signal: AbortSignal.any([signal, AbortSignal.timeout(20000)]) });
  if (!response.ok) throw new Error("Historical imagery could not be loaded. Try another year or retry.");
  return parseSatelliteScenes(await response.json(), year)
    .sort((a, b) => (a.cloudCover ?? 101) - (b.cloudCover ?? 101)).slice(0, 1);
}
