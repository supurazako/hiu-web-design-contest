import type { DisplayMode, MapPageState } from "./map-types";

type ScratchControllerForDisplayMode = {
  reset: () => void;
};

export const transitionDisplayMode = ({
  state,
  nextMode,
  scratchController,
  ensureMagnifierPoint,
}: {
  state: MapPageState;
  nextMode: DisplayMode;
  scratchController: ScratchControllerForDisplayMode;
  ensureMagnifierPoint: () => void;
}) => {
  const previousMode = state.displayMode;
  if (nextMode === previousMode) return;

  if (nextMode === "magnifier") {
    ensureMagnifierPoint();
    state.timeMode = "day";
  }

  if (nextMode === "clock") {
    state.clockHour = 12;
    state.timeMode = "day";
  }

  if (nextMode === "scratch") {
    scratchController.reset();
    state.timeMode = "day";
    state.selectedSpotMode = state.selectedSpotMode ?? "day";
  }

  if (previousMode === "scratch" && nextMode !== "scratch") {
    scratchController.reset();
  }

  state.displayMode = nextMode;
};
