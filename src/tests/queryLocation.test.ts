import assert from "node:assert/strict";
import test from "node:test";
import { findLocation } from "../services/packageLocations";
import { DEMO_QUERY } from "../services/demoQuery";
import { extractQueryLocation } from "../services/queryLocation";

test("query extraction uses the proposed location and avoids terrain descriptions or ambiguous targets", () => {
  assert.equal(extractQueryLocation(DEMO_QUERY), "Tuensang, Nagaland, India");
  assert.equal(extractQueryLocation("Build a substation in Pune, India."), "Pune, India");
  assert.equal(extractQueryLocation("Build a substation in hilly terrain."), null);
  assert.equal(extractQueryLocation("Build near Tuensang and Dimapur."), null);
  assert.equal(extractQueryLocation("Research a transmission line."), null);
});

test("query coordinates resolve directly with latitude/longitude validation", async () => {
  const signal = new AbortController().signal;
  const location = await findLocation(extractQueryLocation("Build a substation at +26.2, +94.8 in hilly terrain.")!, "", signal);
  assert.deepEqual(location.coordinates, [94.8, 26.2]);
  assert.equal(location.precision, "coordinates");
  await assert.rejects(findLocation(extractQueryLocation("Build at 99, 190.")!, "", signal), /Latitude/);
});

test("geocoding receives only the extracted target place", async (context) => {
  let requested: URL | undefined;
  context.mock.method(globalThis, "fetch", async (url: string | URL | Request) => {
    requested = new URL(String(url));
    return Response.json({ features: [{ geometry: { coordinates: [94.8, 26.2] } }] });
  });
  const location = await findLocation(extractQueryLocation(DEMO_QUERY)!, "test", new AbortController().signal);
  assert.equal(requested?.searchParams.get("q"), "Tuensang, Nagaland, India");
  assert.equal(location.precision, "approximate");
});

test("labelled coordinates preserve latitude/longitude order, including colon syntax", () => {
  assert.equal(extractQueryLocation("Show latitude: 26.2, longitude: 94.8 in 3D."), "26.2, 94.8");
  assert.equal(extractQueryLocation("Map lng=-73.9 lat=40.7"), "40.7, -73.9");
  assert.equal(extractQueryLocation("Use coordinates:26.2,94.8 for historical imagery"), "26.2,94.8");
});

test("structured map coordinates bypass geocoding and validate bounds without swapping axes", async (context) => {
  context.mock.method(globalThis, "fetch", () => { throw new Error("Geocoding must not run for coordinates."); });
  const signal = new AbortController().signal;
  const point: [number, number] = [94.8, 26.2];
  const location = await findLocation("Target substation", "", signal, point);
  assert.deepEqual(location, { name: "Target substation", coordinates: point, precision: "coordinates" });
  location.coordinates[0] = 0;
  assert.equal(point[0], 94.8);
  await assert.rejects(findLocation("Invalid latitude", "", signal, [94.8, 91]));
  await assert.rejects(findLocation("Invalid longitude", "", signal, [181, 26.2]));
  await assert.rejects(findLocation("Not finite", "", signal, [Infinity, 26.2]));
});
