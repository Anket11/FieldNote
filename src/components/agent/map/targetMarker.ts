import type { MapLocation } from "@/types/geography";
import type { MapboxMap, MapboxSDK } from "@/types/mapbox";
import styles from "./TargetMarker.module.css";

/** DOM marker stays above raster imagery and faces the screen at every map pitch. */
export function addTargetMarker(sdk: Pick<MapboxSDK, "Marker">, map: MapboxMap, location: MapLocation, compact = false) {
  const element = document.createElement("div");
  element.className = compact ? `${styles.root} ${styles.compact}` : styles.root;
  element.setAttribute("role", "img");
  const label = `${location.precision === "approximate" ? "Target area" : "Target location"}: ${location.name}`;
  element.setAttribute("aria-label", label);
  element.title = label;
  const caption = document.createElement("span");
  caption.className = styles.label;
  caption.textContent = compact ? "Target" : label;
  const pin = document.createElement("span");
  pin.className = styles.pin;
  pin.setAttribute("aria-hidden", "true");
  element.append(caption, pin);
  return new sdk.Marker({ element, anchor: "bottom", pitchAlignment: "viewport", rotationAlignment: "viewport", occludedOpacity: 1 })
    .setLngLat(location.coordinates).addTo(map);
}
