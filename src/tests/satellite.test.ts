import assert from "node:assert/strict";
import test from "node:test";
import { findSatelliteScenes, parseSatelliteScenes } from "../services/satellite";
import { copernicusTerrainSource, updateMapView } from "../components/agent/location/LocationCanvas";
import type { MapboxMap } from "../types/mapbox";
import { findLocation } from "../services/packageLocations";

const year = new Date().getUTCFullYear() - 1;
const feature = (id: string, month = "02") => ({ id, properties: { datetime: `${year}-${month}-01T10:00:00Z`, "eo:cloud_cover": 12.5 }, assets: { visual: {} }, bbox: [94, 25, 96, 27] });

test("satellite adapter preserves capture metadata, orders scenes and uses trusted tile URLs", () => {
  const record = feature("old&collection=other");
  const data = { features: [record, feature("new", "03"), record, { ...feature("no-rgb"), assets: {} }, { ...feature("wrong-year"), properties: { datetime: "2001-01-01T00:00:00Z" } }] };
  const before = JSON.stringify(data);
  const scenes = parseSatelliteScenes(data, year);
  assert.deepEqual(scenes.map((scene) => scene.id), ["new", "old&collection=other"]);
  assert.equal(scenes[0].date, `${year}-03-01T10:00:00Z`);
  assert.equal(scenes[0].cloudCover, 12.5);
  assert.deepEqual(scenes[0].bounds, [94, 25, 96, 27]);
  const url = new URL(scenes[1].tiles);
  assert.equal(url.hostname, "planetarycomputer.microsoft.com");
  assert.equal(url.searchParams.get("collection"), "sentinel-2-l2a");
  assert.equal(url.searchParams.get("item"), record.id);
  assert.equal(JSON.stringify(data), before);
  assert.deepEqual(parseSatelliteScenes({ features: [] }, year), []);
  assert.equal(parseSatelliteScenes({ features: [{ ...record, properties: { datetime: record.properties.datetime } }] }, year)[0].cloudCover, null);
  assert.throws(() => parseSatelliteScenes({ features: [{ ...record, bbox: [0, 0, 500, 50] }] }, year), /Invalid imagery metadata/);
});

test("catalog requests are location/year-specific, cloud-filtered and handle empty/error responses", async (context) => {
  let requestUrl: URL | undefined;
  const request = context.mock.method(globalThis, "fetch", async (url: string | URL | Request) => {
    requestUrl = new URL(String(url));
    const clearer = feature("clearer", "01");
    clearer.properties["eo:cloud_cover"] = 2;
    return Response.json({ features: [feature("capture"), clearer] });
  });
  const signal = new AbortController().signal;
  const scenes = await findSatelliteScenes([95, 26], year, 30, signal);
  assert.equal(scenes.length, 1);
  assert.equal(scenes[0].id, "clearer");
  assert.deepEqual(JSON.parse(requestUrl!.searchParams.get("intersects")!), { type: "Point", coordinates: [95, 26] });
  assert.equal(requestUrl!.searchParams.get("datetime"), `${year}-01-01T00:00:00Z/${year}-12-31T23:59:59Z`);
  assert.deepEqual(JSON.parse(requestUrl!.searchParams.get("query")!), { "eo:cloud_cover": { lte: 30 } });
  assert.equal(requestUrl!.searchParams.get("sortby"), "-datetime");
  request.mock.mockImplementation(async () => Response.json({ features: [] }));
  assert.deepEqual(await findSatelliteScenes([95, 26], year, 30, signal), []);
  request.mock.mockImplementation(async () => new Response(null, { status: 503 }));
  await assert.rejects(findSatelliteScenes([95, 26], year, 30, signal), /could not be loaded/);
  await assert.rejects(findSatelliteScenes([195, 26], year, 30, signal), /valid location/);
  await assert.rejects(findSatelliteScenes([95, 26], year - 20, 30, signal), /valid location/);
});

test("typed coordinates need no geocoding; ambiguous or empty locations are not invented", async (context) => {
  const request = context.mock.method(globalThis, "fetch", () => { throw new Error("No network request expected"); });
  const signal = new AbortController().signal;
  assert.deepEqual(await findLocation("26.2, 94.8", "token", signal), { name: "26.2, 94.8", coordinates: [94.8, 26.2], precision: "coordinates" });
  await assert.rejects(findLocation("95, 10", "token", signal), /Latitude must/);
  await assert.rejects(findLocation("", "token", signal), /Enter a place/);
  request.mock.mockImplementation(async () => Response.json({ features: [] }));
  await assert.rejects(findLocation("Unknown town", "token", signal), /Location not found/);
});

test("map mode changes remove old historical images and retain honest terrain settings", () => {
  const sources = new Map<string, object>();
  const layers = new Map<string, object>();
  let terrain: { source: string; exaggeration: number } | null = null;
  let buildings = "none";
  const map: MapboxMap = {
    on() {}, fitBounds() {}, addControl() {}, remove() {}, resize() {}, jumpTo() {}, setPitch() {},
    addSource(id, source) { sources.set(id, source); }, getSource(id) { return sources.get(id); }, removeSource(id) { sources.delete(id); },
    addLayer(layer) { layers.set("historical", layer); }, getLayer(id) { return layers.get(id); }, removeLayer(id) { layers.delete(id); },
    setTerrain(value) { terrain = value; }, setLayoutProperty(_id, _property, value) { buildings = value; },
  };
  const scene = parseSatelliteScenes({ features: [feature("capture")] }, year)[0];
  updateMapView(map, "history", scene);
  assert.ok(sources.has("historical"));
  updateMapView(map, "history");
  assert.equal(sources.has("historical"), false);
  assert.equal(layers.has("historical"), false);
  updateMapView(map, "terrain");
  assert.deepEqual(terrain, { source: "elevation", exaggeration: 1 });
  assert.equal(buildings, "visible");
  updateMapView(map, "map");
  assert.equal(terrain, null);
  assert.equal(buildings, "none");
});

test("terrain uses Copernicus DEM tiles with Terrarium decoding", () => {
  assert.equal(copernicusTerrainSource.type, "raster-dem");
  assert.equal(copernicusTerrainSource.encoding, "terrarium");
  assert.match(copernicusTerrainSource.tiles[0], /cop-dem-glo-30/);
  assert.equal(new URL(copernicusTerrainSource.tiles[0]).searchParams.get("algorithm"), "terrarium");
});
