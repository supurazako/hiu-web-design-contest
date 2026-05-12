import type { Spot } from "../data/spots";
import type { TimeMode } from "./map-types";

type FeatureCategory = "building" | "waterway" | "highway" | "highwaySecondary";

type ColorToken = `--map-${TimeMode}-${string}`;
type GeoJsonStyleToken = {
  color: ColorToken;
  weight: number;
  opacity?: number;
  fillColor?: ColorToken;
  fillOpacity?: number;
};

const geoJsonStyleTokens = {
  day: {
    building: {
      color: "--map-day-building-stroke",
      weight: 1,
      fillColor: "--map-day-building-fill",
      fillOpacity: 0.85,
    },
    waterway: {
      color: "--map-day-waterway-stroke",
      weight: 3,
      opacity: 0.9,
    },
    highway: {
      color: "--map-day-highway-stroke",
      weight: 3,
      opacity: 0.95,
    },
    highwaySecondary: {
      color: "--map-day-path-stroke",
      weight: 2.2,
      opacity: 0.9,
    },
  },
  night: {
    building: {
      color: "--map-night-building-stroke",
      weight: 1,
      fillColor: "--map-night-building-fill",
      fillOpacity: 0.72,
    },
    waterway: {
      color: "--map-night-waterway-stroke",
      weight: 2.6,
      opacity: 0.92,
    },
    highway: {
      color: "--map-night-highway-stroke",
      weight: 2.6,
      opacity: 0.85,
    },
    highwaySecondary: {
      color: "--map-night-path-stroke",
      weight: 1.8,
      opacity: 0.82,
    },
  },
} as const satisfies Record<
  TimeMode,
  Record<FeatureCategory, GeoJsonStyleToken>
>;

const cssVariableValue = (styleRoot: HTMLElement, token: ColorToken) =>
  getComputedStyle(styleRoot).getPropertyValue(token).trim();

const resolveGeoJsonStyle = (
  styleRoot: HTMLElement,
  style: GeoJsonStyleToken,
) => ({
  ...style,
  color: cssVariableValue(styleRoot, style.color),
  fillColor: style.fillColor
    ? cssVariableValue(styleRoot, style.fillColor)
    : undefined,
});

export const featureCategory = (
  feature: GeoJSON.Feature | undefined,
): FeatureCategory | null => {
  const props = feature?.properties ?? {};
  if (props.waterway) return "waterway";
  if (props.building) return "building";
  if (props.highway) {
    if (
      ["primary", "secondary", "tertiary", "residential", "service"].includes(
        props.highway,
      )
    ) {
      return "highway";
    }
    if (["footway", "path", "track", "steps"].includes(props.highway)) {
      return "highwaySecondary";
    }
  }
  return null;
};

export const layerStyleForMode = (
  mode: TimeMode,
  feature: GeoJSON.Feature | undefined,
  styleRoot: HTMLElement,
) => {
  const category = featureCategory(feature);
  if (!category) {
    return {
      color: "transparent",
      weight: 0,
      fillOpacity: 0,
      opacity: 0,
    };
  }
  return resolveGeoJsonStyle(styleRoot, geoJsonStyleTokens[mode][category]);
};

export const isSpotVisibleForMode = (spot: Spot, mode: TimeMode) =>
  spot.timeMode === "both" || spot.timeMode === mode;

export const mapBackgroundForMode = (mode: TimeMode) =>
  mode === "night"
    ? "radial-gradient(circle at 20% 20%, var(--map-night-background-glow), transparent 18%), linear-gradient(160deg, var(--map-night-background-start), var(--map-night-background-end))"
    : "radial-gradient(circle at 20% 20%, var(--map-day-background-glow), transparent 20%), linear-gradient(160deg, var(--map-day-background-start), var(--map-day-background-end))";
