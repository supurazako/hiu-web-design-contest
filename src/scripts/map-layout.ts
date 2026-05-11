import type { MapDomRefs } from "./map-dom-refs";
import type { MapPageState } from "./map-types";
import { clamp, formatClockHour, nightRatioForHour } from "./map-utils";

const mobileAttributionMinHeight = 58;

export const createMapLayoutController = ({
  refs,
  state,
  isMobileViewport,
  isVerticalCompareMode,
  ensureMagnifierPoint,
  applyPaneVisibility,
}: {
  refs: MapDomRefs;
  state: MapPageState;
  isMobileViewport: () => boolean;
  isVerticalCompareMode: () => boolean;
  ensureMagnifierPoint: () => void;
  applyPaneVisibility: () => void;
}) => {
  let pendingSplitRatio: number | null = null;
  let splitAnimationFrame: number | null = null;

  const clearBottomOverlayLayout = () => {
    refs.root.style.removeProperty("--map-attribution-measured-height");
    refs.root.style.removeProperty("--map-selected-sheet-top");
  };

  const getMobileAttributionHeight = () =>
    Math.max(
      Math.ceil(refs.mapAttribution.getBoundingClientRect().height),
      mobileAttributionMinHeight,
    );

  const syncBottomOverlayLayout = () => {
    const hasSelectedSpot = state.selectedSpotId !== null;
    refs.mapAttribution.classList.toggle(
      "is-raised-by-selection",
      hasSelectedSpot,
    );

    if (!isMobileViewport()) {
      clearBottomOverlayLayout();
      return;
    }

    const rootRect = refs.root.getBoundingClientRect();
    const sheetRect = refs.floatingSheet.getBoundingClientRect();
    const measuredHeight = getMobileAttributionHeight();
    const selectedSheetTop = hasSelectedSpot
      ? Math.max(Math.round(sheetRect.top - rootRect.top), 0)
      : 0;
    refs.root.style.setProperty(
      "--map-attribution-measured-height",
      `${measuredHeight}px`,
    );
    refs.root.style.setProperty(
      "--map-selected-sheet-top",
      `${selectedSheetTop}px`,
    );
  };

  const setCompareDividerPosition = (splitPercent: string) => {
    if (isVerticalCompareMode()) {
      refs.splitDivider.style.top = splitPercent;
      refs.splitDivider.style.removeProperty("left");
      return;
    }

    refs.splitDivider.style.left = splitPercent;
    refs.splitDivider.style.removeProperty("top");
  };

  const updateCompareUI = () => {
    const splitPercent = `${state.splitRatio * 100}%`;
    const clockTimeText = formatClockHour(state.clockHour);
    const clockAngle = state.clockHour * 15;
    const clockNightRatio = nightRatioForHour(state.clockHour);
    const isVerticalCompare = isVerticalCompareMode();
    refs.root.style.setProperty("--compare-split", splitPercent);
    refs.root.style.setProperty("--clock-night-ratio", String(clockNightRatio));
    setCompareDividerPosition(splitPercent);
    refs.splitHandle.setAttribute(
      "aria-valuenow",
      String(Math.round(state.splitRatio * 100)),
    );
    refs.splitHandle.setAttribute(
      "aria-valuetext",
      `${Math.round(state.splitRatio * 100)}%`,
    );
    refs.splitHandle.setAttribute(
      "aria-orientation",
      isVerticalCompare ? "vertical" : "horizontal",
    );
    refs.compareOverlay.hidden = state.displayMode !== "compare";
    refs.magnifierOverlay.hidden = state.displayMode !== "magnifier";
    refs.clockPanel.hidden = state.displayMode !== "clock";
    refs.clockHand.style.transform = `translateX(-50%) rotate(${clockAngle}deg)`;
    refs.clockTime.textContent = clockTimeText;
    refs.clockDial.setAttribute(
      "aria-valuenow",
      String(Math.round(state.clockHour * 10) / 10),
    );
    refs.clockDial.setAttribute("aria-valuetext", clockTimeText);
    if (state.displayMode === "magnifier") {
      ensureMagnifierPoint();
      refs.root.style.setProperty(
        "--magnifier-x",
        `${state.magnifierPoint.x}px`,
      );
      refs.root.style.setProperty(
        "--magnifier-y",
        `${state.magnifierPoint.y}px`,
      );
    }
    const isScratch = state.displayMode === "scratch";
    const isSingle = state.displayMode === "single";
    refs.singleGroup.classList.toggle("is-expanded", isSingle);
    refs.scratchGroup.classList.toggle("is-expanded", isScratch);
    refs.scratchResetButton.setAttribute("aria-hidden", String(!isScratch));
    refs.scratchResetButton.tabIndex = isScratch ? 0 : -1;
    refs.controlShell.classList.toggle(
      "is-compare",
      state.displayMode === "compare",
    );
    refs.controlShell.classList.toggle(
      "is-magnifier",
      state.displayMode === "magnifier",
    );
    refs.controlShell.classList.toggle(
      "is-clock",
      state.displayMode === "clock",
    );
    refs.controlShell.classList.toggle("is-scratch", isScratch);
    refs.timeToggleGroup.setAttribute("aria-hidden", String(!isSingle));
    refs.timeModeButtons.forEach((button) => {
      button.tabIndex = isSingle ? 0 : -1;
    });
  };

  const cancelPendingSplitFrame = () => {
    if (splitAnimationFrame === null) return;
    window.cancelAnimationFrame(splitAnimationFrame);
    splitAnimationFrame = null;
  };

  const commitSplitRatio = (nextRatio: number) => {
    if (state.splitRatio === nextRatio) return;
    state.splitRatio = nextRatio;
    applyPaneVisibility();
    updateCompareUI();
  };

  const flushPendingSplitRatio = () => {
    if (pendingSplitRatio === null) {
      cancelPendingSplitFrame();
      return;
    }

    const ratio = pendingSplitRatio;
    pendingSplitRatio = null;
    cancelPendingSplitFrame();
    commitSplitRatio(ratio);
  };

  const scheduleSplitRatioUpdate = (nextRatio: number) => {
    if (!isVerticalCompareMode()) {
      commitSplitRatio(nextRatio);
      return;
    }

    pendingSplitRatio = nextRatio;
    if (splitAnimationFrame !== null) return;

    splitAnimationFrame = window.requestAnimationFrame(() => {
      splitAnimationFrame = null;
      if (pendingSplitRatio === null) return;
      const ratio = pendingSplitRatio;
      pendingSplitRatio = null;
      commitSplitRatio(ratio);
    });
  };

  const getSplitRatioFromPointer = (clientX: number, clientY: number) => {
    const bounds = refs.mapElement.getBoundingClientRect();
    return isVerticalCompareMode()
      ? clamp((clientY - bounds.top) / bounds.height, 0.1, 0.9)
      : clamp((clientX - bounds.left) / bounds.width, 0.1, 0.9);
  };

  const setSplitRatioFromPointer = (clientX: number, clientY: number) => {
    scheduleSplitRatioUpdate(getSplitRatioFromPointer(clientX, clientY));
  };

  const adjustSplitRatio = (delta: number) => {
    state.splitRatio = clamp(state.splitRatio + delta, 0.1, 0.9);
    applyPaneVisibility();
    updateCompareUI();
  };

  return {
    adjustSplitRatio,
    cancelSplitRatioUpdate: () => {
      pendingSplitRatio = null;
      cancelPendingSplitFrame();
    },
    flushPendingSplitRatio,
    getMobileAttributionHeight,
    setSplitRatioFromPointer,
    syncBottomOverlayLayout,
    updateCompareUI,
  };
};
