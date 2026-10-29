import { addTargetMarker } from "./targetMarker";
import styles from "./MarkerMap.module.css";
import { useEffect, useRef, useState } from "react";
import MapboxLoader from "./MapboxLoader";
import type { MapboxMap } from "@/types/mapbox";
import type { MapGroup, MapLocation } from "@/types/geography";

interface Props {
  groups: MapGroup[]; target?: MapLocation; selectedId?: string; controlsId?: string;
  token: string;
  onPick: (id: string) => void;
  onError: (message: string) => void;
}
export default function MarkerMap({ groups, target, token, onPick, onError, selectedId, controlsId }: Props) {
  const container = useRef<HTMLDivElement>(null);
  const markers = useRef<{ button: HTMLButtonElement; ids: string[] }[]>([]);
  const [ready, setReady] = useState(false);
  const selected = useRef(selectedId);
  useEffect(() => {
    selected.current = selectedId;
    for (const { button, ids } of markers.current) button.setAttribute("aria-pressed", String(ids.includes(selectedId ?? "")));
  }, [selectedId]);
  useEffect(() => {
    const sdk = window.mapboxgl;
    if (!ready || !container.current || !sdk || (!groups.length && !target)) return;
    let map: MapboxMap | undefined;
    let resizeObserver: ResizeObserver | undefined;
    const mapContainer = container.current;
    try {
      if (!sdk.supported()) throw new Error("WebGL is unavailable.");
      map = new sdk.Map({ container: container.current, accessToken: token, style: "mapbox://styles/mapbox/light-v11", center: target?.coordinates ?? groups[0].coordinates, zoom: 5 });
      const currentMap = map;
      if (target) addTargetMarker(sdk, currentMap, target, true);
      currentMap.on("load", () => {
        for (const [index, group] of groups.entries()) {
          const button = document.createElement("button");
          button.type = "button";
          button.className = styles.marker;
          button.textContent = String(index + 1);
          button.title = `${group.name} · ${group.itemIds.length} ${group.itemIds.length === 1 ? "package" : "packages"}`;
          if (controlsId) button.setAttribute("aria-controls", controlsId);
          markers.current.push({ button, ids: group.itemIds });
          button.setAttribute("aria-label", `View items near ${group.name}`);
          button.setAttribute("aria-pressed", String(group.itemIds.includes(selected.current ?? "")));
          button.addEventListener("click", () => onPick(group.itemIds[0]));
          new sdk.Marker({ element: button }).setLngLat(group.coordinates).addTo(currentMap);
        }
        const coordinates = [...groups.map((group) => group.coordinates), ...(target ? [target.coordinates] : [])];
        const lngs = coordinates.map((point) => point[0]);
        const lats = coordinates.map((point) => point[1]);
        const frameLocations = () => {
          currentMap.resize();
          currentMap.fitBounds([[Math.min(...lngs), Math.min(...lats)], [Math.max(...lngs), Math.max(...lats)]], { padding: 60, maxZoom: 7, duration: 0 });
        };
        frameLocations();
        resizeObserver = new ResizeObserver(frameLocations);
        resizeObserver.observe(mapContainer);
      });
      currentMap.on("error", () => onError("Map could not be loaded. List view is still available."));
      currentMap.addControl(new sdk.NavigationControl());
    } catch {
      onError("Map could not be loaded. List view is still available.");
    }
    return () => { resizeObserver?.disconnect(); markers.current = []; map?.remove(); };
  }, [ready, groups, target, token, onPick, onError, controlsId]);
  return (
    <>
      <MapboxLoader onReady={() => setReady(true)} onError={() => onError("Map could not be loaded. List view is still available.")} />
      {!ready && <p role="status">Loading map…</p>}
      <div ref={container} className={styles.map} role="region" aria-label="Approximate locations" />
    </>
  );
}
