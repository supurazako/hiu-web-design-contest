import type { Spot } from "../data/spots";
import { isSpotVisibleForMode } from "./map-style";
import type { MapPageState } from "./map-types";

export const ensureSelectionVisibility = ({
  state,
  selectedSpot,
}: {
  state: MapPageState;
  selectedSpot: Spot | null;
}) => {
  if (!selectedSpot) return;

  if (
    state.displayMode === "single" &&
    !isSpotVisibleForMode(selectedSpot, state.timeMode)
  ) {
    state.selectedSpotId = null;
    state.selectedSpotMode = null;
  }

  if (
    state.displayMode === "compare" &&
    state.selectedSpotMode &&
    !isSpotVisibleForMode(selectedSpot, state.selectedSpotMode)
  ) {
    state.selectedSpotId = null;
    state.selectedSpotMode = null;
  }

  if (
    state.displayMode === "scratch" &&
    state.selectedSpotMode &&
    !isSpotVisibleForMode(selectedSpot, state.selectedSpotMode)
  ) {
    state.selectedSpotMode = isSpotVisibleForMode(selectedSpot, "day")
      ? "day"
      : "night";
  }
};
