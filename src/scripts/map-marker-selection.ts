import type L from "leaflet";
import type { Spot } from "../data/spots";
import type {
  MapPageState,
  MapPoint,
  MarkerEntry,
  TimeMode,
} from "./map-types";
import { nightRatioForHour, oppositeTimeMode } from "./map-utils";

type ScratchMarkerController = {
  getPointFromPointer: (clientX: number, clientY: number) => MapPoint | null;
  isRevealedAtPoint: (point: MapPoint) => boolean;
};

export const createVisibleMarkerSelector = ({
  root,
  mapElement,
  map,
  state,
  markerClusterGroupsByMode,
  scratchController,
  getMarkerEntries,
  isVerticalCompareMode,
  selectSpot,
  render,
}: {
  root: HTMLElement;
  mapElement: HTMLElement;
  map: L.Map;
  state: MapPageState;
  markerClusterGroupsByMode: Record<TimeMode, L.MarkerClusterGroup>;
  scratchController: ScratchMarkerController;
  getMarkerEntries: () => Map<string, MarkerEntry>;
  isVerticalCompareMode: () => boolean;
  selectSpot: (spot: Spot, mode: TimeMode) => void;
  render: () => void;
}) => {
  const isMarkerModeVisibleAtPoint = (mode: TimeMode, point: MapPoint) => {
    if (state.displayMode === "single") return mode === state.timeMode;

    if (state.displayMode === "compare") {
      const mapRect = mapElement.getBoundingClientRect();
      const splitBoundary =
        (isVerticalCompareMode() ? mapRect.height : mapRect.width) *
        state.splitRatio;
      return isVerticalCompareMode()
        ? mode === "day"
          ? point.y <= splitBoundary
          : point.y >= splitBoundary
        : mode === "day"
          ? point.x <= splitBoundary
          : point.x >= splitBoundary;
    }

    if (state.displayMode === "magnifier") {
      const activeMode = state.timeMode;
      const radius =
        Number.parseFloat(
          getComputedStyle(root).getPropertyValue("--magnifier-radius"),
        ) || 90;
      const isInsideLens =
        Math.hypot(
          point.x - state.magnifierPoint.x,
          point.y - state.magnifierPoint.y,
        ) <= radius;
      return mode === activeMode ? !isInsideLens : isInsideLens;
    }

    if (state.displayMode === "scratch") {
      const isRevealed = scratchController.isRevealedAtPoint(point);
      return mode === "day" ? !isRevealed : isRevealed;
    }

    if (state.displayMode === "clock") {
      const nightRatio = nightRatioForHour(state.clockHour);
      return mode === "day" ? nightRatio < 1 : nightRatio > 0;
    }

    return true;
  };

  const getVisibleMarkerAtPoint = (point: MapPoint): MarkerEntry | null => {
    const hitRadius = 24;
    let closest: MarkerEntry | null = null;
    let closestDistance = Number.POSITIVE_INFINITY;
    let closestPriority = -1;

    getMarkerEntries().forEach((entry) => {
      const { marker, mode } = entry;
      if (
        !map.hasLayer(markerClusterGroupsByMode[mode]) ||
        !isMarkerModeVisibleAtPoint(mode, point)
      )
        return;
      if (!marker.getElement()) return;

      const markerPoint = map.latLngToContainerPoint(marker.getLatLng());
      const distance = Math.hypot(
        point.x - markerPoint.x,
        point.y - markerPoint.y,
      );
      if (distance > hitRadius) return;

      const priority =
        (state.displayMode === "magnifier" &&
          mode === oppositeTimeMode(state.timeMode)) ||
        (state.displayMode === "scratch" &&
          mode === "night" &&
          scratchController.isRevealedAtPoint(point))
          ? 1
          : 0;

      if (
        priority > closestPriority ||
        (priority === closestPriority && distance < closestDistance)
      ) {
        closest = entry;
        closestDistance = distance;
        closestPriority = priority;
      }
    });

    return closest;
  };

  return (clientX: number, clientY: number) => {
    const point = scratchController.getPointFromPointer(clientX, clientY);
    if (!point) return false;
    const entry = getVisibleMarkerAtPoint(point);
    if (!entry) return false;
    selectSpot(entry.spot, entry.mode);
    render();
    return true;
  };
};
