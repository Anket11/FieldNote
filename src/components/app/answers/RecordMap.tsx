import { useEffect, useMemo, useState } from "react";
import type { Evidence } from "@/types/research";
import { groupLocations, locatePackages, type LocatedPackage } from "@/services/packageLocations";
import List from "../../agent/List";
import MarkerMap from "../../agent/map/MarkerMap";

interface Props { items: Evidence[]; visibleItems?: { id: string }[]; controlsId?: string; focusedId: string; onPick: (id: string) => void }
export default function RecordMap({ items: allItems, visibleItems, focusedId, onPick, controlsId }: Props) {
  const items = useMemo(() => visibleItems ? allItems.filter((item) => visibleItems.some((visible) => visible.id === item.id)) : allItems, [allItems, visibleItems]);
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  const [locations, setLocations] = useState<LocatedPackage[] | null>(null);
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
  return <div className="space-y-3">
    <p>Approximate areas, not exact sites or transmission routes.</p>
    {!token && <p role="status">Map unavailable. Select a title below or use List view.</p>}
    {error && <p role="alert">{error}</p>}
    {token && !locations && !error && <p role="status">Loading package locations…</p>}
    {token && groups.length > 0 && <MarkerMap groups={groups} token={token} onPick={onPick} onError={setError} />}
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
