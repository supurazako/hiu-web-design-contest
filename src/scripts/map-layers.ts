import L from "leaflet";
import type { Spot } from "../data/spots";
import { isSpotVisibleForMode } from "./map-style";
import type { MapPageState, MarkerEntry, TimeMode } from "./map-types";

export const timeModes = ["day", "night"] as const satisfies readonly TimeMode[];

export const markerPaneByMode = {
  day: "day-marker-pane",
  night: "night-marker-pane",
} as const satisfies Record<TimeMode, string>;

const pinIconSize: [number, number] = [36, 36];
const pinIconAnchor: [number, number] = [18, 18];

const createPinHtml = (spot: Spot, mode: TimeMode) => `
  <span
    class="time-pin time-pin--${mode}"
    style="--pin-color: ${spot.marker.color}; --pin-accent: ${spot.accent}"
    aria-hidden="true"
  >
    <svg
      class="time-pin__icon"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="${spot.marker.iconViewBox}"
      focusable="false"
      aria-hidden="true"
    >
      <path d="${spot.marker.iconPath}"></path>
    </svg>
  </span>
`;

const createClusterIcon = (cluster: L.MarkerCluster, mode: TimeMode) => {
  const count = cluster.getChildCount();
  const size = count >= 10 ? 48 : 42;

  return L.divIcon({
    className: "time-cluster-wrapper",
    html: `
      <span class="time-cluster time-cluster--${mode}" aria-hidden="true">
        <span class="time-cluster__count">${count}</span>
      </span>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
};

const createMarkerClusterGroup = (mode: TimeMode) =>
  L.markerClusterGroup({
    clusterPane: markerPaneByMode[mode],
    iconCreateFunction: (cluster) => createClusterIcon(cluster, mode),
    showCoverageOnHover: false,
    spiderfyOnMaxZoom: true,
    zoomToBoundsOnClick: true,
    disableClusteringAtZoom: 20,
    maxClusterRadius: (zoom) => (zoom >= 19 ? 18 : zoom >= 17 ? 28 : 48),
  });

export const createMarkerClusterGroups = () =>
  Object.fromEntries(timeModes.map((mode) => [mode, createMarkerClusterGroup(mode)])) as Record<
    TimeMode,
    L.MarkerClusterGroup
  >;

export const createSpotMarkers = ({
  spots,
  markerClusterGroupsByMode,
  onSelect,
}: {
  spots: Spot[];
  markerClusterGroupsByMode: Record<TimeMode, L.MarkerClusterGroup>;
  onSelect: (spot: Spot, mode: TimeMode) => void;
}) => {
  const markerEntries = new Map<string, MarkerEntry>();

  const createMarker = (spot: Spot, mode: TimeMode) => {
    const marker = L.marker(spot.coordinates, {
      pane: markerPaneByMode[mode],
      icon: L.divIcon({
        className: "time-pin-wrapper",
        html: createPinHtml(spot, mode),
        iconSize: pinIconSize,
        iconAnchor: pinIconAnchor,
      }),
    });

    marker.on("click", () => {
      onSelect(spot, mode);
    });

    markerClusterGroupsByMode[mode].addLayer(marker);
    markerEntries.set(`${spot.id}:${mode}`, { marker, spot, mode });
  };

  spots.forEach((spot) => {
    if (isSpotVisibleForMode(spot, "day")) createMarker(spot, "day");
    if (isSpotVisibleForMode(spot, "night")) createMarker(spot, "night");
  });

  return markerEntries;
};

export const updateMarkerClusterVisibility = ({
  map,
  state,
  markerClusterGroupsByMode,
}: {
  map: L.Map;
  state: MapPageState;
  markerClusterGroupsByMode: Record<TimeMode, L.MarkerClusterGroup>;
}) => {
  timeModes.forEach((mode) => {
    const clusterGroup = markerClusterGroupsByMode[mode];
    const shouldShow = state.displayMode === "single" ? mode === state.timeMode : true;

    if (shouldShow && !map.hasLayer(clusterGroup)) {
      clusterGroup.addTo(map);
    }

    if (!shouldShow && map.hasLayer(clusterGroup)) {
      map.removeLayer(clusterGroup);
    }
  });
};

export const updateMarkerSelection = ({
  state,
  markerEntries,
}: {
  state: MapPageState;
  markerEntries: Map<string, MarkerEntry>;
}) => {
  markerEntries.forEach(({ marker, spot, mode }) => {
    const pin = marker.getElement()?.querySelector(".time-pin");
    if (pin) {
      const isSelected =
        state.selectedSpotId === spot.id &&
        (state.displayMode === "single" ? mode === state.timeMode : state.selectedSpotMode === mode);
      pin.classList.toggle("is-selected", isSelected);
    }
  });
};
