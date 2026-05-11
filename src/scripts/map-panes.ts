import type L from "leaflet";
import { mapBackgroundForMode } from "./map-style";
import type { ComparePaneSide, MapPageState, TimeMode } from "./map-types";
import { clamp, nightRatioForHour, oppositeTimeMode } from "./map-utils";
import { applyInverseCircleMask, clearMaskStyles, clipPathForCircle, setBlendPaneState, setPaneState } from "./pane-utils";

type MapPaneSet = {
  geo: HTMLElement;
  marker: HTMLElement;
};

type ScratchControllerForPanes = {
  applyMask: () => void;
  clearMask: () => void;
};

type ScratchLayoutController = {
  invalidateLayout: () => void;
  syncSurfaceSize: () => boolean;
};

export const createTimeMapPanes = (map: L.Map) => {
  const paneByMode = {
    day: {
      geo: map.createPane("day-geojson-pane"),
      marker: map.createPane("day-marker-pane"),
    },
    night: {
      geo: map.createPane("night-geojson-pane"),
      marker: map.createPane("night-marker-pane"),
    },
  } as const;
  const magnifierBackgroundPane = map.createPane("magnifier-background-pane");

  paneByMode.day.geo.style.zIndex = "340";
  paneByMode.night.geo.style.zIndex = "341";
  paneByMode.day.marker.style.zIndex = "620";
  paneByMode.night.marker.style.zIndex = "621";
  magnifierBackgroundPane.style.zIndex = "341";

  const customPanes = [
    paneByMode.day.geo,
    paneByMode.night.geo,
    paneByMode.day.marker,
    paneByMode.night.marker,
    magnifierBackgroundPane,
  ];
  const clippedCustomPanes = [
    paneByMode.day.geo,
    paneByMode.night.geo,
    paneByMode.day.marker,
    paneByMode.night.marker,
  ];
  clippedCustomPanes.forEach((pane) => {
    pane.classList.add("time-map-clipped-pane");
  });

  return {
    paneByMode,
    magnifierBackgroundPane,
    customPanes,
    clippedCustomPanes,
  };
};

export const createPaneBoundsSynchronizer = ({
  mapElement,
  clippedCustomPanes,
  magnifierBackgroundPane,
  scratchController,
}: {
  mapElement: HTMLElement;
  clippedCustomPanes: HTMLElement[];
  magnifierBackgroundPane: HTMLElement;
  scratchController: ScratchLayoutController;
}) => {
  return () => {
    scratchController.invalidateLayout();
    const { width, height } = mapElement.getBoundingClientRect();
    const paneOverscan = Math.round(Math.max(width, height) * 2);
    clippedCustomPanes.forEach((pane) => {
      pane.style.width = `${Math.round(width + paneOverscan * 2)}px`;
      pane.style.height = `${Math.round(height + paneOverscan * 2)}px`;
      pane.style.left = `${-paneOverscan}px`;
      pane.style.top = `${-paneOverscan}px`;
      pane.style.setProperty("--custom-pane-offset-x", `${paneOverscan}px`);
      pane.style.setProperty("--custom-pane-offset-y", `${paneOverscan}px`);
    });
    const backgroundOverscan = Math.round(Math.max(width, height));
    magnifierBackgroundPane.style.width = `${Math.round(width + backgroundOverscan * 2)}px`;
    magnifierBackgroundPane.style.height = `${Math.round(height + backgroundOverscan * 2)}px`;
    magnifierBackgroundPane.style.left = `${-backgroundOverscan}px`;
    magnifierBackgroundPane.style.top = `${-backgroundOverscan}px`;
    return scratchController.syncSurfaceSize();
  };
};

export const createPaneVisibilityController = ({
  root,
  mapElement,
  state,
  paneByMode,
  customPanes,
  magnifierBackgroundPane,
  scratchController,
  ensureMagnifierPoint,
  isVerticalCompareMode,
}: {
  root: HTMLElement;
  mapElement: HTMLElement;
  state: MapPageState;
  paneByMode: Record<TimeMode, MapPaneSet>;
  customPanes: HTMLElement[];
  magnifierBackgroundPane: HTMLElement;
  scratchController: ScratchControllerForPanes;
  ensureMagnifierPoint: () => void;
  isVerticalCompareMode: () => boolean;
}) => {
  const clearPaneBackgrounds = () => {
    customPanes.forEach((pane) => {
      pane.style.background = "";
      clearMaskStyles(pane);
    });
    magnifierBackgroundPane.style.opacity = "0";
    magnifierBackgroundPane.style.visibility = "hidden";
    magnifierBackgroundPane.style.clipPath = "none";
  };

  return () => {
    clearPaneBackgrounds();

    if (state.displayMode === "single") {
      const activeMode = state.timeMode;
      const inactiveMode: TimeMode = activeMode === "day" ? "night" : "day";
      setPaneState(paneByMode[activeMode].geo, { visible: true, clipPath: "none" });
      setPaneState(paneByMode[activeMode].marker, { visible: true, clipPath: "none" });
      setPaneState(paneByMode[inactiveMode].geo, { visible: false, clipPath: "none" });
      setPaneState(paneByMode[inactiveMode].marker, { visible: false, clipPath: "none" });
      return;
    }

    if (state.displayMode === "magnifier") {
      ensureMagnifierPoint();
      const activeMode = state.timeMode;
      const revealMode = oppositeTimeMode(activeMode);
      const radius = Number.parseFloat(getComputedStyle(root).getPropertyValue("--magnifier-radius")) || 90;
      const revealClipPath = clipPathForCircle(mapElement, paneByMode[revealMode].geo, state.magnifierPoint, radius);
      const revealMarkerClipPath = clipPathForCircle(mapElement, paneByMode[revealMode].marker, state.magnifierPoint, radius);
      const backgroundClipPath = clipPathForCircle(mapElement, magnifierBackgroundPane, state.magnifierPoint, radius);
      paneByMode[activeMode].geo.style.zIndex = "340";
      magnifierBackgroundPane.style.zIndex = "341";
      paneByMode[revealMode].geo.style.zIndex = "342";
      paneByMode[activeMode].marker.style.zIndex = "620";
      paneByMode[revealMode].marker.style.zIndex = "621";
      magnifierBackgroundPane.style.background = mapBackgroundForMode(revealMode);
      magnifierBackgroundPane.style.opacity = "1";
      magnifierBackgroundPane.style.visibility = "visible";
      magnifierBackgroundPane.style.clipPath = backgroundClipPath;
      setPaneState(paneByMode[activeMode].geo, { visible: true, clipPath: "none" });
      setPaneState(paneByMode[activeMode].marker, { visible: true, clipPath: "none" });
      setPaneState(paneByMode[revealMode].geo, { visible: true, clipPath: revealClipPath });
      setPaneState(paneByMode[revealMode].marker, { visible: true, clipPath: revealMarkerClipPath });
      applyInverseCircleMask(mapElement, paneByMode[activeMode].marker, state.magnifierPoint, radius);
      return;
    }

    if (state.displayMode === "clock") {
      const nightRatio = nightRatioForHour(state.clockHour);
      magnifierBackgroundPane.style.zIndex = "341";
      magnifierBackgroundPane.style.background = mapBackgroundForMode("night");
      magnifierBackgroundPane.style.opacity = String(nightRatio);
      magnifierBackgroundPane.style.visibility = nightRatio > 0 ? "visible" : "hidden";
      magnifierBackgroundPane.style.clipPath = "none";
      paneByMode.day.geo.style.zIndex = "340";
      paneByMode.night.geo.style.zIndex = "342";
      paneByMode.day.marker.style.zIndex = "620";
      paneByMode.night.marker.style.zIndex = "621";
      setPaneState(paneByMode.day.geo, { visible: true, clipPath: "none" });
      setBlendPaneState(paneByMode.night.geo, nightRatio);
      setBlendPaneState(paneByMode.day.marker, 1 - nightRatio);
      setBlendPaneState(paneByMode.night.marker, nightRatio);
      return;
    }

    if (state.displayMode === "scratch") {
      paneByMode.day.geo.style.zIndex = "340";
      magnifierBackgroundPane.style.zIndex = "341";
      paneByMode.night.geo.style.zIndex = "342";
      paneByMode.day.marker.style.zIndex = "620";
      paneByMode.night.marker.style.zIndex = "621";
      magnifierBackgroundPane.style.background = mapBackgroundForMode("night");
      magnifierBackgroundPane.style.opacity = "1";
      magnifierBackgroundPane.style.visibility = "visible";
      magnifierBackgroundPane.style.clipPath = "none";
      setPaneState(paneByMode.night.geo, { visible: true, clipPath: "none" });
      setPaneState(paneByMode.night.marker, { visible: true, clipPath: "none" });
      setPaneState(paneByMode.day.geo, { visible: true, clipPath: "none" });
      setPaneState(paneByMode.day.marker, { visible: true, clipPath: "none" });
      scratchController.applyMask();
      return;
    }

    scratchController.clearMask();

    const mapRect = mapElement.getBoundingClientRect();
    const isVerticalCompare = isVerticalCompareMode();
    const splitWithinMap = (isVerticalCompare ? mapRect.height : mapRect.width) * state.splitRatio;
    const clipPathForPane = (pane: HTMLElement, side: ComparePaneSide) => {
      const paneRect = pane.getBoundingClientRect();
      if (isVerticalCompare) {
        const dividerWithinPane = clamp(mapRect.top - paneRect.top + splitWithinMap, 0, paneRect.height);
        if (side === "day") {
          const bottomInset = Math.max(0, paneRect.height - dividerWithinPane);
          return `inset(0px 0px ${bottomInset}px 0px)`;
        }
        return `inset(${dividerWithinPane}px 0px 0px 0px)`;
      }

      const dividerWithinPane = clamp(mapRect.left - paneRect.left + splitWithinMap, 0, paneRect.width);
      if (side === "day") {
        const rightInset = Math.max(0, paneRect.width - dividerWithinPane);
        return `inset(0px ${rightInset}px 0px 0px)`;
      }
      return `inset(0px 0px 0px ${dividerWithinPane}px)`;
    };

    magnifierBackgroundPane.style.zIndex = "341";
    magnifierBackgroundPane.style.background = mapBackgroundForMode("night");
    magnifierBackgroundPane.style.opacity = "1";
    magnifierBackgroundPane.style.visibility = "visible";
    magnifierBackgroundPane.style.clipPath = clipPathForPane(magnifierBackgroundPane, "night");
    paneByMode.day.geo.style.zIndex = "340";
    paneByMode.night.geo.style.zIndex = "342";
    paneByMode.day.marker.style.zIndex = "620";
    paneByMode.night.marker.style.zIndex = "621";
    setPaneState(paneByMode.day.geo, { visible: true, clipPath: clipPathForPane(paneByMode.day.geo, "day") });
    setPaneState(paneByMode.day.marker, { visible: true, clipPath: clipPathForPane(paneByMode.day.marker, "day") });
    setPaneState(paneByMode.night.geo, { visible: true, clipPath: clipPathForPane(paneByMode.night.geo, "night") });
    setPaneState(paneByMode.night.marker, { visible: true, clipPath: clipPathForPane(paneByMode.night.marker, "night") });
  };
};
