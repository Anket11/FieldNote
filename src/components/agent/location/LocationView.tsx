import ChatIcon from "../../app/ChatIcon";
import styles from "./LocationView.module.css";
import { useEffect, useState } from "react";
import { extractQueryLocation } from "@/services/queryLocation";
import { findLocation } from "@/services/packageLocations";
import { findSatelliteScenes } from "@/services/satellite";
import type { MapLocation, MapView, SatelliteScene } from "@/types/geography";
import LocationCanvas, { visibleMapError } from "./LocationCanvas";
import HistoryControls from "./HistoryControls";

export default function LocationView({ query, coordinates, initialView = "map" }: { query: string; coordinates?: [number, number]; initialView?: MapView }) {
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";
  const target = extractQueryLocation(query) ?? query.trim();
  const [locationAttempt, setLocationAttempt] = useState(0);
  const locationKey = `${query}:${coordinates?.join(",")}:${locationAttempt}`;
  const [resolved, setResolved] = useState<{ key: string; location: MapLocation | null; error: string } | null>(null);
  const locationResult = resolved?.key === locationKey ? resolved : null;
  const location = locationResult?.location ?? null;
  const [view, setView] = useState<MapView>(initialView);
  const [year, setYear] = useState(() => new Date().getUTCFullYear());
  const [retry, setRetry] = useState(0);
  const [reply, setReply] = useState<{ key: string; scene?: SatelliteScene; error: string } | null>(null);
  const [mapError, setMapError] = useState("");
  const requestKey = `${location?.coordinates.join(",")}:${year}:${retry}`;
  const data = reply?.key === requestKey ? reply : null;
  const scene = data?.scene;
  const shownMapError = visibleMapError(mapError);
  useEffect(() => {
    if ((!target && !coordinates) || (!token && !coordinates)) return;
    const controller = new AbortController();
    findLocation(target, token, controller.signal, coordinates).then((location) => {
      if (!controller.signal.aborted) setResolved({ key: locationKey, location, error: "" });
    }).catch(() => {
      if (!controller.signal.aborted) setResolved({ key: locationKey, location: null, error: "Target location could not be resolved. Refine the place in your research query or retry." });
    });
    return () => controller.abort();
  }, [query, target, token, coordinates, locationKey]);
  useEffect(() => {
    if (view !== "history" || !location) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      findSatelliteScenes(location.coordinates, year, 100, controller.signal).then((scenes) => {
        if (!controller.signal.aborted) setReply({ key: requestKey, scene: scenes[0], error: "" });
      }).catch(() => {
        if (!controller.signal.aborted) setReply({ key: requestKey, error: "Imagery could not be loaded. Please retry." });
      });
    }, 300);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [view, location, year, requestKey]);
  return <aside aria-label="Location workspace" className={styles.root}>
    {!target && !coordinates && <p>Add a town, region or coordinates to your research query to view its location.</p>}
    {target && token && !locationResult && <p role="status">Locating {target}…</p>}
    {locationResult?.error && <p role="alert">{locationResult.error} <button type="button" onClick={() => setLocationAttempt(locationAttempt + 1)}>Retry</button></p>}
    {!token && <p role="status">Map access is not configured.</p>}
    <div className={styles.controls} role="group" aria-label="Location view">
      {([{ id: "map", title: "Map" }, { id: "terrain", title: "3D" }, { id: "history", title: "Historical imagery" }] as const).map((mode) =>
        <button key={mode.id} type="button" aria-pressed={view === mode.id} onClick={() => setView(mode.id)}><ChatIcon name={mode.id === "map" ? "map" : mode.id === "terrain" ? "terrain" : "history"} />{mode.title}</button>)}
    </div>
    {location && <>
      <p>{location.name} · {location.coordinates[1]}, {location.coordinates[0]}{location.precision === "approximate" ? " · Approximate location" : " · Provided coordinates"}</p>
      {view === "history" && <HistoryControls year={year} onYear={setYear} hasScene={!!scene} loading={!data} error={data?.error ?? ""} onRetry={() => setRetry(retry + 1)} />}
      {shownMapError && <p role="alert">{shownMapError}</p>}
      {token && <LocationCanvas key={location.coordinates.join(",")} location={location} token={token} view={view} scene={view === "history" ? scene : undefined} onError={setMapError} />}
    </>}
  </aside>;
}
