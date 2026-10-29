// CDN SDK methods used by the map components.
export interface MapboxMap {
  on(event: "load" | "error", callback: (event: { sourceId?: string }) => void): void;
  fitBounds(bounds: [[number, number], [number, number]], options: { padding: number; maxZoom: number; duration: number }): void;
  addControl(control: object): void;
  addSource(id: string, source: object): void;
  addLayer(layer: object): void;
  getLayer(id: string): object | undefined;
  getSource(id: string): object | undefined;
  removeLayer(id: string): void;
  removeSource(id: string): void;
  setTerrain(terrain: { source: string; exaggeration: number } | null): void;
  setLayoutProperty(id: string, name: string, value: string): void;
  setPitch(pitch: number): void;
  jumpTo(options: { center: [number, number]; zoom: number; bearing: number; pitch: number }): void;
  resize(): void;
  remove(): void;
}
interface MapboxMarker {
  setLngLat(coordinates: [number, number]): MapboxMarker;
  addTo(map: MapboxMap): MapboxMarker;
}
export interface MapboxSDK {
  supported(): boolean;
  Map: new (options: { container: HTMLElement; accessToken: string; style: string; center: [number, number]; zoom: number }) => MapboxMap;
  Marker: new (options: { element: HTMLElement; anchor?: "bottom" | "center"; pitchAlignment?: "viewport"; rotationAlignment?: "viewport"; occludedOpacity?: number }) => MapboxMarker;
  NavigationControl: new () => object;
}
declare global { interface Window { mapboxgl?: MapboxSDK } }
