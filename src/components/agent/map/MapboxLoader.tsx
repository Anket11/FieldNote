import Script from "next/script";

export default function MapboxLoader({ onReady, onError }: { onReady: () => void; onError: () => void }) {
  return <>
    <link rel="stylesheet" href="https://api.mapbox.com/mapbox-gl-js/v3.33.0/mapbox-gl.css" precedence="default" />
    <Script src="https://api.mapbox.com/mapbox-gl-js/v3.33.0/mapbox-gl.js" onReady={onReady} onError={onError} />
  </>;
}
