import { z } from "zod";

// Fresh instances avoid shared nested references in Gemini tool schemas.
export const coordinatesSchema = () => z.array(z.number().finite().min(-180).max(180)).length(2)
  .refine((point): point is [number, number] => point.length === 2 && Math.abs(point[1]) <= 90, "Latitude must be between -90 and 90.")
  .describe("Mapbox/GeoJSON order: [longitude, latitude]. Longitude: -180 to 180. Latitude: -90 to 90. Use only user/source coordinates.");
