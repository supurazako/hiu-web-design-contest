import type { Spot } from "../data/spots";
import type { TimeMode } from "./map-types";

type FeatureCategory = "building" | "waterway" | "highway" | "highwaySecondary";

const geoJsonStyles = {
  day: {
    building: {
      color: "#d9cbbd",
      weight: 1,
      fillColor: "#f3e6d6",
      fillOpacity: 0.85,
    },
    waterway: {
      color: "#6fb7e9",
      weight: 3,
      opacity: 0.9,
    },
    highway: {
      color: "#ffffff",
      weight: 3,
      opacity: 0.95,
    },
    highwaySecondary: {
      color: "#ecd8b8",
      weight: 2.2,
      opacity: 0.9,
    },
  },
  night: {
    building: {
      color: "#364454",
      weight: 1,
      fillColor: "#263241",
      fillOpacity: 0.72,
    },
    waterway: {
      color: "#7ac8ff",
      weight: 2.6,
      opacity: 0.92,
    },
    highway: {
      color: "#d6e7ff",
      weight: 2.6,
      opacity: 0.85,
    },
    highwaySecondary: {
      color: "#6d8198",
      weight: 1.8,
      opacity: 0.82,
    },
  },
} as const;

export const featureCategory = (feature: GeoJSON.Feature | undefined): FeatureCategory | null => {
  const props = feature?.properties ?? {};
  if (props.waterway) return "waterway";
  if (props.building) return "building";
  if (props.highway) {
    if (["primary", "secondary", "tertiary", "residential", "service"].includes(props.highway)) {
      return "highway";
    }
    if (["footway", "path", "track", "steps"].includes(props.highway)) {
      return "highwaySecondary";
    }
  }
  return null;
};

export const layerStyleForMode = (mode: TimeMode, feature: GeoJSON.Feature | undefined) => {
  const category = featureCategory(feature);
  if (!category) {
    return {
      color: "transparent",
      weight: 0,
      fillOpacity: 0,
      opacity: 0,
    };
  }
  return geoJsonStyles[mode][category];
};

export const isSpotVisibleForMode = (spot: Spot, mode: TimeMode) =>
  spot.timeMode === "both" || spot.timeMode === mode;

export const mapBackgroundForMode = (mode: TimeMode) =>
  mode === "night"
    ? "radial-gradient(circle at 20% 20%, rgba(133, 188, 255, 0.16), transparent 18%), linear-gradient(160deg, rgba(23, 38, 53, 0.98), rgba(17, 28, 41, 0.96))"
    : "radial-gradient(circle at 20% 20%, rgba(143, 209, 255, 0.14), transparent 20%), linear-gradient(160deg, rgba(255, 250, 244, 0.9), rgba(236, 244, 249, 0.76))";
