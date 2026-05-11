import type L from "leaflet";
import type { MapPageState } from "./map-types";
import { getInitialTimeMode } from "./map-utils";

type ScratchNavigationController = {
  redraw: () => void;
  reset: () => void;
};

const mapTransitionDuration = 720;
const townZoomDesktop = 15.5;
const townZoomMobile = 15.25;
const mobileAttributionBottomInset = 16;
const mobileAttributionGap = 12;

export const createMapNavigationController = ({
  root,
  map,
  state,
  floatingSheet,
  townCenter,
  scratchController,
  isMobileViewport,
  getMobileAttributionHeight,
  syncCustomPaneBounds,
  clampMagnifierPoint,
  applyPaneVisibility,
  render,
}: {
  root: HTMLElement;
  map: L.Map;
  state: MapPageState;
  floatingSheet: HTMLElement;
  townCenter: L.LatLng;
  scratchController: ScratchNavigationController;
  isMobileViewport: () => boolean;
  getMobileAttributionHeight: () => number;
  syncCustomPaneBounds: () => boolean;
  clampMagnifierPoint: () => void;
  applyPaneVisibility: () => void;
  render: () => void;
}) => {
  let transitionCleanupTimer: number | null = null;

  const clearMapTransitionClasses = () => {
    root.classList.remove("is-map-entering", "is-map-leaving");
    document.body.classList.remove("is-map-entering", "is-map-leaving");
    document.documentElement.classList.remove(
      "is-map-entering",
      "is-map-leaving",
    );
    if (transitionCleanupTimer !== null) {
      window.clearTimeout(transitionCleanupTimer);
      transitionCleanupTimer = null;
    }
  };

  const setMapTransitionDirection = (
    direction: "entering" | "leaving" | null,
  ) => {
    clearMapTransitionClasses();
    if (!direction) return;

    const className =
      direction === "entering" ? "is-map-entering" : "is-map-leaving";
    root.classList.add(className);
    document.body.classList.add(className);
    document.documentElement.classList.add(className);
    transitionCleanupTimer = window.setTimeout(
      clearMapTransitionClasses,
      mapTransitionDuration,
    );
  };

  const getFitBoundsPadding = () => {
    const isMobile = isMobileViewport();
    const sheetRect = state.isExpanded
      ? floatingSheet.getBoundingClientRect()
      : new DOMRect(0, 0, 0, 0);
    const attributionHeight = isMobile
      ? getMobileAttributionHeight() +
        mobileAttributionBottomInset +
        mobileAttributionGap
      : 0;

    return {
      paddingTopLeft: [
        state.isExpanded ? (isMobile ? 24 : 92) : 28,
        state.isExpanded ? (isMobile ? 92 : 56) : 28,
      ] as [number, number],
      paddingBottomRight: [
        state.isExpanded ? 32 : 28,
        state.isExpanded
          ? isMobile
            ? Math.round(sheetRect.height + 44 + attributionHeight)
            : Math.round(sheetRect.height + 36)
          : 28,
      ] as [number, number],
    };
  };

  const setMapToTownCenter = () => {
    const zoom = isMobileViewport() ? townZoomMobile : townZoomDesktop;
    const padding = getFitBoundsPadding();
    const offsetX =
      (padding.paddingBottomRight[0] - padding.paddingTopLeft[0]) / 2;
    const offsetY =
      (padding.paddingBottomRight[1] - padding.paddingTopLeft[1]) / 2;
    const targetPoint = map
      .project(townCenter, zoom)
      .subtract([offsetX, offsetY]);
    map.setView(map.unproject(targetPoint, zoom), zoom);
  };

  const invalidateMapLayout = ({
    recenter,
    invalidateSize,
  }: {
    recenter: boolean;
    invalidateSize: boolean;
  }) => {
    if (invalidateSize) {
      map.invalidateSize();
    }
    const sizeChanged = syncCustomPaneBounds();
    if (sizeChanged && state.displayMode === "scratch") {
      scratchController.redraw();
    }
    clampMagnifierPoint();
    if (recenter) {
      setMapToTownCenter();
    }
    applyPaneVisibility();
  };

  const syncExpandedState = (
    nextExpanded: boolean,
    options: { updateHistory?: boolean } = {},
  ) => {
    if (
      state.isExpanded === nextExpanded &&
      window.location.hash === (nextExpanded ? "#map" : "")
    ) {
      return;
    }

    const wasExpanded = state.isExpanded;
    const transitionDirection =
      wasExpanded === nextExpanded
        ? null
        : nextExpanded
          ? "entering"
          : "leaving";
    setMapTransitionDirection(transitionDirection);

    if (wasExpanded && !nextExpanded && state.displayMode === "scratch") {
      scratchController.reset();
      state.displayMode = "single";
      state.timeMode = getInitialTimeMode();
      state.selectedSpotMode = null;
    }

    state.isExpanded = nextExpanded;
    if (!nextExpanded) {
      state.isDiaryNotebookOpen = false;
    }
    state.openLanguageSwitcherId = null;

    if (options.updateHistory) {
      if (nextExpanded) {
        window.history.pushState({ mapExpanded: true }, "", "#map");
      } else {
        window.history.pushState(
          { mapExpanded: false },
          "",
          window.location.pathname,
        );
      }
    }

    render();
    requestAnimationFrame(() => {
      invalidateMapLayout({ recenter: true, invalidateSize: true });
    });
    window.setTimeout(() => {
      invalidateMapLayout({ recenter: false, invalidateSize: true });
    }, mapTransitionDuration);
  };

  return {
    invalidateMapLayout,
    setMapToTownCenter,
    syncExpandedState,
  };
};
