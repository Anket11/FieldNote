import { useEffect, useRef, useState } from "react";
import MapboxLoader from "./MapboxLoader";
import type { MapboxMap } from "@/types/mapbox";
import type { MapGroup } from "@/types/geography";

interface Props {
  groups: MapGroup[];
  token: string;
  onPick: (id: string) => void;
  onError: (message: string) => void;
}
export default function MarkerMap({ groups, token, onPick, onError }: Props) {
  const container = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const sdk = window.mapboxgl;
    if (!ready || !container.current || !sdk || !groups.length) return;
    let map: MapboxMap | undefined;
    try {
      if (!sdk.supported()) throw new Error("WebGL is unavailable.");
      map = new sdk.Map({ container: container.current, accessToken: token, style: "mapbox://styles/mapbox/streets-v12", center: groups[0].coordinates, zoom: 5 });
      const currentMap = map;
      currentMap.on("load", () => {
        for (const group of groups) {
          const button = document.createElement("button");
          button.type = "button";
          button.textContent = `${group.name} (${group.itemIds.length})`;
          button.setAttribute("aria-label", `View items near ${group.name}`);
          button.addEventListener("click", () => onPick(group.itemIds[0]));
          new sdk.Marker({ element: button }).setLngLat(group.coordinates).addTo(currentMap);
        }
        const lngs = groups.map((group) => group.coordinates[0]);
        const lats = groups.map((group) => group.coordinates[1]);
        currentMap.fitBounds([[Math.min(...lngs), Math.min(...lats)], [Math.max(...lngs), Math.max(...lats)]], { padding: 48, maxZoom: 7, duration: 0 });
      });
      currentMap.on("error", () => onError("Map could not be loaded. List view is still available."));
      currentMap.addControl(new sdk.NavigationControl());
    } catch {
      onError("Map could not be loaded. List view is still available.");
    }
    return () => map?.remove();
  }, [ready, groups, token, onPick, onError]);
  return (
    <>
      <MapboxLoader onReady={() => setReady(true)} onError={() => onError("Map could not be loaded. List view is still available.")} />
      {!ready && <p role="status">Loading map…</p>}
      <div ref={container} className="h-[28rem] w-full" role="region" aria-label="Approximate locations" />
    </>
  );
}
