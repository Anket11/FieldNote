import assert from "node:assert/strict";
import test from "node:test";
import { locationOverride } from "../services/locationOverrides";
import { extractQueryLocation } from "../services/queryLocation";
import { findLocation, locatePackages } from "../services/packageLocations";
import type { Evidence } from "../types/research";

test("Benban mentions use the configured coordinates for targets and package markers without geocoding", async (context) => {
  const original = process.env.NEXT_PUBLIC_BENBAN_COORDINATES;
  process.env.NEXT_PUBLIC_BENBAN_COORDINATES = "32.739000,24.456000";
  context.after(() => {
    if (original === undefined) delete process.env.NEXT_PUBLIC_BENBAN_COORDINATES;
    else process.env.NEXT_PUBLIC_BENBAN_COORDINATES = original;
  });
  context.mock.method(globalThis, "fetch", () => { throw new Error("Geocoding must not run."); });
  const query = "Show **Benban Solar Park Complex** in 3D";
  assert.equal(extractQueryLocation(query), "Benban Solar Park Complex");
  assert.deepEqual(locationOverride("benban solar park")?.coordinates, [32.739, 24.456]);
  assert.equal(locationOverride("Tuensang"), null);
  const location = await findLocation(query, "", new AbortController().signal, [0, 0]);
  assert.deepEqual(location.coordinates, [32.739, 24.456]);
  const item: Evidence = { id: "benban", kind: "package", title: "Benban Solar Park Complex", text: "Original record", citationIds: [], projectIds: [], differences: [], unknowns: [] };
  const packages = await locatePackages([item], "", new AbortController().signal);
  assert.deepEqual(packages[0].coordinates, location.coordinates);
  process.env.NEXT_PUBLIC_BENBAN_COORDINATES = "32.739,100";
  assert.throws(() => locationOverride(query));
});
