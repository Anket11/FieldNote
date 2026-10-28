import assert from "node:assert/strict";
import test from "node:test";
import { buildDemoResult, adaptResearchResponse } from "../services/research";
import { groupLocations, locatePackages } from "../services/packageLocations";
import sample from "../../demo-data/procurement_final.json";

const packages = () => buildDemoResult().sections.find((section) => section.id === "similar_procurements")!.items.filter((item) => item.kind === "package");

test("demo area hints resolve four packages; missing locations stay unlocated", async (context) => {
  const requests: URL[] = [];
  context.mock.method(globalThis, "fetch", async (input: string | URL | Request) => {
    const url = new URL(String(input));
    requests.push(url);
    return Response.json({ features: [{ geometry: { type: "Point", coordinates: [90 + requests.length, 24] } }] });
  });
  const locations = await locatePackages(packages(), "public-test-token", new AbortController().signal);
  assert.equal(locations.length, 4);
  assert.equal(requests.length, 4);
  assert.equal(requests.filter((url) => url.searchParams.get("types") === "region").length, 3);
  assert.equal(requests.filter((url) => url.searchParams.get("types") === "place,locality").length, 1);
  assert.equal(locations.some((location) => location.itemId === packages()[3].id), false);
  assert.equal(locations[0].name, "Jharkhand, India");
});

test("explicit backend coordinates skip geocoding and shared areas group without invented offsets", async (context) => {
  context.mock.method(globalThis, "fetch", () => { throw new Error("No request expected"); });
  const items = packages().slice(0, 2).map((item) => ({ ...item, location: { name: "Example region", precision: "region" as const, coordinates: [91, 24] as [number, number] } }));
  const locations = await locatePackages(items, "public-test-token", new AbortController().signal);
  assert.deepEqual(groupLocations(locations), [{ name: "Example region", coordinates: [91, 24], itemIds: items.map((item) => item.id) }]);
  assert.deepEqual(items[0].location.coordinates, [91, 24]);
});

test("empty geocoder results stay unmapped and failed/malformed responses are handled", async (context) => {
  const items = packages().slice(0, 1);
  const request = context.mock.method(globalThis, "fetch", async () => Response.json({ features: [] }));
  assert.deepEqual(await locatePackages(items, "token", new AbortController().signal), []);
  request.mock.mockImplementation(async () => new Response(null, { status: 401 }));
  await assert.rejects(locatePackages(items, "token", new AbortController().signal), /could not be loaded/);
  request.mock.mockImplementation(async () => Response.json({ features: [{ geometry: { coordinates: [NaN, 200] } }] }));
  await assert.rejects(locatePackages(items, "token", new AbortController().signal), /Invalid location/);
});

test("backend location metadata is validated and copied without changing source data", () => {
  const raw = structuredClone(sample);
  Object.assign(raw.sections[0].items[0], { location: { name: "Example region", precision: "region", coordinates: [91, 24] } });
  const before = JSON.stringify(raw);
  const result = adaptResearchResponse(raw);
  const location = result.sections[1].items[0].location!;
  assert.equal(location.name, "Example region");
  location.coordinates![0] = 92;
  assert.equal(JSON.stringify(raw), before);
  Object.assign(raw.sections[0].items[0], { location: { name: "Invalid", precision: "region", coordinates: [181, 24] } });
  assert.throws(() => adaptResearchResponse(raw), /Invalid research response: invalid coordinates/);
});
