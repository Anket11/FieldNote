import { useEffect, useRef, useState } from "react";
import MapboxLoader from "../map/MapboxLoader";
import type { MapboxMap } from "@/types/mapbox";
import type { MapLocation, MapView, SatelliteScene } from "@/types/geography";

export const copernicusTerrainSource = {
  type: "raster-dem",
  tiles: ["https://api.imagery.hotosm.org/raster/collections/cop-dem-glo-30/tiles/WebMercatorQuad/{z}/{x}/{y}.png?assets=data&algorithm=terrarium"],
  encoding: "terrarium", tileSize: 256, maxzoom: 12,
  attribution: '<a href="https://dataspace.copernicus.eu/explore-data/data-collections/copernicus-contributing-missions/collections-description/COP-DEM">Copernicus DEM GLO-30</a> / OpenAerialMap',
};

interface Props { location: MapLocation; token: string; view: MapView; scene?: SatelliteScene; onError: (message: string) => void }
export default function LocationCanvas({ location, token, view, scene, onError }: Props) {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<MapboxMap | null>(null);
  const [ready, setReady] = useState(false);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    const sdk = window.mapboxgl;
    if (!ready || !container.current || !sdk) return;
    let current: MapboxMap;
    let observer: ResizeObserver;
    try {
      if (!sdk.supported()) throw new Error("WebGL unavailable");
      current = new sdk.Map({ container: container.current, accessToken: token, style: "mapbox://styles/mapbox/streets-v12", center: location.coordinates, zoom: 12 });
      map.current = current;
      current.addControl(new sdk.NavigationControl());
      const pin = document.createElement("span");
      pin.textContent = "Selected location";
      new sdk.Marker({ element: pin }).setLngLat(location.coordinates).addTo(current);
      current.on("load", () => {
        current.addSource("elevation", copernicusTerrainSource);
        current.addSource("terrain-imagery", { type: "raster", url: "mapbox://mapbox.satellite", tileSize: 256 });
        current.addLayer({ id: "terrain-imagery", type: "raster", source: "terrain-imagery", layout: { visibility: "none" } });
        current.addLayer({ id: "buildings-3d", source: "composite", "source-layer": "building", type: "fill-extrusion", minzoom: 14,
          filter: ["==", "extrude", "true"], layout: { visibility: "none" },
          paint: { "fill-extrusion-height": ["get", "height"], "fill-extrusion-base": ["get", "min_height"] } });
        setLoaded(true);
      });
      current.on("error", (event) => onError(event.sourceId === "historical" ? "The historical image tiles could not load. Try another capture." : event.sourceId === "elevation" ? "Copernicus elevation could not load. Map and historical imagery remain available." : "Some map data could not load. Check your connection and Mapbox access."));
      observer = new ResizeObserver(() => current.resize());
      observer.observe(container.current);
    } catch { onError("Map unavailable. Check WebGL support and Mapbox access."); }
    return () => { observer?.disconnect(); map.current = null; current?.remove(); };
  }, [ready, token, location, onError]);
  useEffect(() => {
    const current = map.current;
    if (!loaded || !current) return;
    onError("");
    updateMapView(current, view, scene);
  }, [loaded, view, scene, onError]);
  return <div className="space-y-2">
    <MapboxLoader onReady={() => setReady(true)} onError={() => onError("Map could not be downloaded. Check your connection.")} />
    {!loaded && <p role="status">Loading map…</p>}
    <div ref={container} className="h-[28rem] w-full" role="region" aria-label="Location map" />
    <button type="button" disabled={!loaded} onClick={() => map.current?.jumpTo({ center: location.coordinates, zoom: 12, bearing: 0, pitch: view === "terrain" ? 70 : 0 })}>Reset view</button>
    {view === "terrain" && <p>Copernicus DEM GLO-30 · 30 m surface elevation · true scale. Satellite imagery and available buildings provide context.</p>}
  </div>;
}

export function updateMapView(current: MapboxMap, view: MapView, scene?: SatelliteScene) {
    current.setTerrain(view === "terrain" ? { source: "elevation", exaggeration: 1 } : null);
    current.setLayoutProperty("terrain-imagery", "visibility", view === "terrain" ? "visible" : "none");
    current.setLayoutProperty("buildings-3d", "visibility", view === "terrain" ? "visible" : "none");
    current.setPitch(view === "terrain" ? 70 : 0);
    if (current.getLayer("historical")) current.removeLayer("historical");
    if (current.getSource("historical")) current.removeSource("historical");
    if (view === "history" && scene) {
      current.addSource("historical", { type: "raster", tiles: [scene.tiles], tileSize: 256, bounds: scene.bounds, maxzoom: 14,
        attribution: `Contains modified Copernicus Sentinel data (${scene.date.slice(0, 4)}) / Microsoft Planetary Computer` });
      current.addLayer({ id: "historical", type: "raster", source: "historical" });
    }
}
