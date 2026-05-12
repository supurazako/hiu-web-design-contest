import L from "leaflet";
import { timeModes } from "./map-layers";
import { featureCategory, layerStyleForMode } from "./map-style";
import type { TimeMode } from "./map-types";

export type TimeMapGeoJsonResult = {
  bounds: L.LatLngBounds | null;
  layers: Partial<Record<TimeMode, L.GeoJSON>>;
};

export const loadTimeMapGeoJson = async ({
  map,
  root,
  rendererByMode,
}: {
  map: L.Map;
  root: HTMLElement;
  rendererByMode: Record<TimeMode, L.Renderer>;
}): Promise<TimeMapGeoJsonResult> => {
  const response = await fetch("/geodata/map.geojson");
  const data = (await response.json()) as GeoJSON.GeoJsonObject;
  const layers: Partial<Record<TimeMode, L.GeoJSON>> = {};

  timeModes.forEach((mode) => {
    const layer = L.geoJSON(data, {
      filter: (feature: GeoJSON.Feature | undefined) => {
        const category = featureCategory(feature);
        return Boolean(category) && feature?.geometry?.type !== "Point";
      },
      style: (feature: GeoJSON.Feature | undefined) =>
        layerStyleForMode(mode, feature, root),
      interactive: false,
      pane: mode === "day" ? "day-geojson-pane" : "night-geojson-pane",
      renderer: rendererByMode[mode],
    } as L.GeoJSONOptions & { renderer: L.Renderer }).addTo(map);

    layers[mode] = layer;
  });

  return {
    bounds: layers.day?.getBounds() ?? null,
    layers,
  };
};
