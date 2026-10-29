import styles from "./RecordMap.module.css";
import { useEffect, useMemo, useState } from "react";
import type { Evidence } from "@/types/research";
import { findLocation, groupLocations, locatePackages, type LocatedPackage } from "@/services/packageLocations";
import { extractQueryLocation } from "@/services/queryLocation";
import { locationOverride } from "@/services/locationOverrides";
import type { MapLocation, MapTarget } from "@/types/geography";
import List from "../../agent/List";
import MarkerMap from "../../agent/map/MarkerMap";

interface Props { query?: string; targetLocation?: MapTarget; items: Evidence[]; controlsId?: string; focusedId: string; onPick: (id: string) => void }
export default function RecordMap({ items, query, targetLocation, focusedId, onPick, controlsId }: Props) {
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  const [locations, setLocations] = useState<LocatedPackage[] | null>(null);
  const targetName = locationOverride(query ?? "")?.name ?? targetLocation?.name ?? (query ? extractQueryLocation(query) : null);
  const targetKey = `${targetName}:${targetLocation?.coordinates.join(",")}`;
  const [resolvedTarget, setResolvedTarget] = useState<{ key: string; location: MapLocation | null; error: string } | null>(null);
  const target = resolvedTarget?.key === targetKey ? resolvedTarget.location : null;
  useEffect(() => {
    if (!token || !targetName) return;
    const controller = new AbortController();
    findLocation(targetName, token, controller.signal, targetLocation?.coordinates).then((location) => {
      if (!controller.signal.aborted) setResolvedTarget({ key: targetKey, location, error: "" });
    }).catch(() => {
      if (!controller.signal.aborted) setResolvedTarget({ key: targetKey, location: null, error: "The target location could not be resolved. Package markers remain available." });
    });
    return () => controller.abort();
  }, [targetName, targetKey, targetLocation, token]);
  const [error, setError] = useState("");
  const groups = useMemo(() => groupLocations(locations ?? []), [locations]);
  const focusedGroup = groups.find((group) => group.itemIds.includes(focusedId));
  useEffect(() => {
    if (!token) return;
    const controller = new AbortController();
    locatePackages(items, token, controller.signal).then((result) => {
      if (!controller.signal.aborted) setLocations(result);
    }).catch(() => {
      if (!controller.signal.aborted) setError("Package locations could not be loaded. Select a title below or use List view.");
    });
    return () => controller.abort();
  }, [items, token]);
  const unmapped = items.filter((item) => !locations?.some((location) => location.itemId === item.id));
  return <div className={styles.root}>
    <p className={styles.note}>Source coordinates are shown where available. Place-name matches are approximate.</p>
    {!token && <p role="status">Map unavailable. Select a title below or use List view.</p>}
    {targetName && token && resolvedTarget?.key !== targetKey && <p role="status">Locating target: {targetName}…</p>}
    {resolvedTarget?.key === targetKey && resolvedTarget?.error && <p role="status">{resolvedTarget.error}</p>}
    {error && <p role="alert">{error}</p>}
    {token && !locations && !error && <p role="status">Loading package locations…</p>}
    {token && (groups.length > 0 || target) && <MarkerMap selectedId={focusedId} controlsId={controlsId} groups={groups} target={target ?? undefined} token={token} onPick={onPick} onError={setError} />}
    {groups.length > 0 && <div className={styles.legend} aria-label="Map locations">{groups.map((group, index) => <button key={group.name} type="button" aria-pressed={group.itemIds.includes(focusedId)} aria-controls={controlsId} onClick={() => onPick(group.itemIds[0])}><span className={styles.number}>{index + 1}</span><span>{group.name}<small>{group.itemIds.length} {group.itemIds.length === 1 ? "package" : "packages"}</small></span></button>)}</div>}
    {target && <p className={styles.target}><span aria-hidden="true" /> Target: {target.name}</p>}
    {focusedGroup && focusedGroup.itemIds.length > 1 && <section>
      <h4>Packages near {focusedGroup.name}</h4>
      <List items={items.filter((item) => focusedGroup.itemIds.includes(item.id))} selectedId={focusedId} onSelect={onPick} controlsId={controlsId} label="Procurement list" />
    </section>}
    {(!token || error) ? <List items={items} selectedId={focusedId} onSelect={onPick} controlsId={controlsId} label="Procurement list" /> : locations && unmapped.length > 0 && <section>
      <h4>Location unavailable</h4>
      <List items={unmapped} selectedId={focusedId} onSelect={onPick} controlsId={controlsId} label="Procurement list" />
    </section>}
  </div>;
}
