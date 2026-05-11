import type L from "leaflet";
import { transitionDisplayMode } from "./map-display-mode-transition";
import type { MapDomRefs } from "./map-dom-refs";
import type { DisplayMode, Locale, MapPageState, TimeMode } from "./map-types";

type ScratchControllerForEvents = {
  begin: (clientX: number, clientY: number) => boolean;
  moveFromPointerEvent: (event: PointerEvent) => void;
  isActive: () => boolean;
  end: () => void;
  reset: () => void;
  captureZoomSnapshot: () => void;
  transformForZoom: (center: L.LatLng, zoom: number) => void;
  commitZoomTransform: (center: L.LatLng, zoom: number) => void;
};

export const registerMapPageEvents = ({
  refs,
  state,
  map,
  scratchController,
  prefersReducedMotion,
  syncExpandedState,
  render,
  renderLanguageUI,
  ensureMagnifierPoint,
  setMagnifierPointFromPointer,
  selectVisibleMarkerFromPointer,
  clearSelectedSpot,
  setClockHourFromPointer,
  adjustClockHour,
  setSplitRatioFromPointer,
  flushPendingSplitRatio,
  cancelSplitRatioUpdate,
  adjustSplitRatio,
  updateButtons,
}: {
  refs: MapDomRefs;
  state: MapPageState;
  map: L.Map;
  scratchController: ScratchControllerForEvents;
  prefersReducedMotion: MediaQueryList;
  syncExpandedState: (
    nextExpanded: boolean,
    options?: { updateHistory?: boolean },
  ) => void;
  render: () => void;
  renderLanguageUI: () => void;
  ensureMagnifierPoint: () => void;
  setMagnifierPointFromPointer: (clientX: number, clientY: number) => void;
  selectVisibleMarkerFromPointer: (clientX: number, clientY: number) => boolean;
  clearSelectedSpot: () => void;
  setClockHourFromPointer: (clientX: number, clientY: number) => void;
  adjustClockHour: (delta: number) => void;
  setSplitRatioFromPointer: (clientX: number, clientY: number) => void;
  flushPendingSplitRatio: () => void;
  cancelSplitRatioUpdate: () => void;
  adjustSplitRatio: (delta: number) => void;
  updateButtons: () => void;
}) => {
  refs.openMapLink?.addEventListener("click", (event) => {
    event.preventDefault();
    syncExpandedState(true, { updateHistory: window.location.hash !== "#map" });
  });

  refs.backHomeButton.addEventListener("click", () => {
    state.isDiaryNotebookOpen = false;
    if (window.location.hash === "#map") {
      window.history.back();
      return;
    }
    syncExpandedState(false, { updateHistory: true });
  });

  window.addEventListener("popstate", () => {
    syncExpandedState(window.location.hash === "#map");
  });

  refs.timeModeButtons.forEach((button) => {
    button.addEventListener("click", () => {
      state.timeMode = button.dataset.timeMode as TimeMode;
      render();
    });
  });

  refs.displayModeButtons.forEach((button) => {
    button.addEventListener("click", () => {
      transitionDisplayMode({
        state,
        nextMode: button.dataset.displayMode as DisplayMode,
        scratchController,
        ensureMagnifierPoint,
      });
      render();
    });
  });

  refs.zoomInButton.addEventListener("click", () => {
    map.zoomIn();
  });

  refs.zoomOutButton.addEventListener("click", () => {
    map.zoomOut();
  });

  const openDiaryNotebook = () => {
    if (state.isDiaryNotebookOpen) {
      state.isDiaryNotebookOpen = false;
      render();
      refs.diaryNotebookOpenButton.focus({ preventScroll: true });
      return;
    }

    if (state.displayMode !== "single") {
      transitionDisplayMode({
        state,
        nextMode: "single",
        scratchController,
        ensureMagnifierPoint,
      });
    }

    state.isDiaryNotebookOpen = true;
    render();
    refs.diaryNotebookClose.focus({ preventScroll: true });
  };

  refs.diaryNotebookOpenButton.addEventListener("click", (event) => {
    event.stopPropagation();
    openDiaryNotebook();
  });

  refs.diaryNotebookClose.addEventListener("click", () => {
    state.isDiaryNotebookOpen = false;
    render();
    refs.diaryNotebookOpenButton.focus({ preventScroll: true });
  });

  refs.diaryNotebookModal.addEventListener("click", (event) => {
    if (event.target === refs.diaryNotebookModal) {
      state.isDiaryNotebookOpen = false;
      render();
      refs.diaryNotebookOpenButton.focus({ preventScroll: true });
    }
  });

  refs.diaryNotebookPanel.addEventListener("click", (event) => {
    event.stopPropagation();
  });

  refs.mapElement.addEventListener("pointerdown", (event) => {
    if (
      !state.isExpanded ||
      state.displayMode === "magnifier" ||
      state.displayMode === "scratch"
    )
      return;
    const target = event.target;
    if (
      target instanceof Element &&
      target.closest(
        ".time-pin, .time-pin-wrapper, .time-cluster, .time-cluster-wrapper",
      )
    )
      return;
    clearSelectedSpot();
  });

  refs.magnifierOverlay.addEventListener("pointerdown", (event) => {
    if (state.displayMode !== "magnifier") return;
    event.preventDefault();
    refs.magnifierOverlay.setPointerCapture(event.pointerId);
    setMagnifierPointFromPointer(event.clientX, event.clientY);
    if (!selectVisibleMarkerFromPointer(event.clientX, event.clientY)) {
      clearSelectedSpot();
    }
  });

  refs.magnifierOverlay.addEventListener("pointermove", (event) => {
    if (state.displayMode !== "magnifier") return;
    setMagnifierPointFromPointer(event.clientX, event.clientY);
  });

  const releaseMagnifierPointer = (event: PointerEvent) => {
    if (refs.magnifierOverlay.hasPointerCapture(event.pointerId)) {
      refs.magnifierOverlay.releasePointerCapture(event.pointerId);
    }
  };
  refs.magnifierOverlay.addEventListener("pointerup", releaseMagnifierPointer);
  refs.magnifierOverlay.addEventListener(
    "pointercancel",
    releaseMagnifierPointer,
  );

  refs.clockDial.addEventListener("pointerdown", (event) => {
    if (state.displayMode !== "clock") return;
    event.preventDefault();
    state.isDraggingClock = true;
    refs.clockDial.setPointerCapture(event.pointerId);
    setClockHourFromPointer(event.clientX, event.clientY);
  });

  refs.clockDial.addEventListener("pointermove", (event) => {
    if (!state.isDraggingClock) return;
    setClockHourFromPointer(event.clientX, event.clientY);
  });

  const endClockDrag = (event: PointerEvent) => {
    state.isDraggingClock = false;
    if (refs.clockDial.hasPointerCapture(event.pointerId)) {
      refs.clockDial.releasePointerCapture(event.pointerId);
    }
  };
  refs.clockDial.addEventListener("pointerup", endClockDrag);
  refs.clockDial.addEventListener("pointercancel", endClockDrag);

  refs.clockDial.addEventListener("keydown", (event) => {
    if (state.displayMode !== "clock") return;
    if (event.key === "ArrowLeft" || event.key === "ArrowDown") {
      event.preventDefault();
      adjustClockHour(-0.25);
    }
    if (event.key === "ArrowRight" || event.key === "ArrowUp") {
      event.preventDefault();
      adjustClockHour(0.25);
    }
  });

  refs.languageSwitchers.forEach((switcher) => {
    switcher.trigger.addEventListener("click", (event) => {
      event.stopPropagation();
      state.openLanguageSwitcherId =
        state.openLanguageSwitcherId === switcher.id ? null : switcher.id;
      renderLanguageUI();
    });

    switcher.menu.addEventListener("click", (event) => {
      event.stopPropagation();
    });
  });

  prefersReducedMotion.addEventListener("change", () => {
    render();
  });

  refs.languageOptionButtons.forEach((button) => {
    button.addEventListener("click", () => {
      state.locale = button.dataset.locale as Locale;
      state.openLanguageSwitcherId = null;
      render();
    });
  });

  map.on("zoomstart", () => {
    if (state.displayMode !== "scratch") return;
    scratchController.captureZoomSnapshot();
  });

  map.on("zoomanim", (event) => {
    if (state.displayMode !== "scratch") return;
    scratchController.transformForZoom(event.center, event.zoom);
  });

  map.on("zoomend", () => {
    if (state.displayMode === "scratch") {
      scratchController.commitZoomTransform(map.getCenter(), map.getZoom());
    }
    updateButtons();
  });

  refs.splitHandle.addEventListener("pointerdown", (event) => {
    if (state.displayMode !== "compare") return;
    state.isDraggingSplit = true;
    refs.splitHandle.setPointerCapture(event.pointerId);
    setSplitRatioFromPointer(event.clientX, event.clientY);
  });

  refs.splitHandle.addEventListener("pointermove", (event) => {
    if (!state.isDraggingSplit) return;
    setSplitRatioFromPointer(event.clientX, event.clientY);
  });

  refs.splitHandle.addEventListener("pointerup", (event) => {
    state.isDraggingSplit = false;
    flushPendingSplitRatio();
    if (refs.splitHandle.hasPointerCapture(event.pointerId)) {
      refs.splitHandle.releasePointerCapture(event.pointerId);
    }
  });

  refs.splitHandle.addEventListener("pointercancel", (event) => {
    state.isDraggingSplit = false;
    cancelSplitRatioUpdate();
    if (refs.splitHandle.hasPointerCapture(event.pointerId)) {
      refs.splitHandle.releasePointerCapture(event.pointerId);
    }
  });

  refs.splitHandle.addEventListener("keydown", (event) => {
    if (state.displayMode !== "compare") return;
    const isVerticalCompare =
      state.displayMode === "compare" && window.innerWidth < 768;
    if (
      (!isVerticalCompare && event.key === "ArrowLeft") ||
      (isVerticalCompare && event.key === "ArrowUp")
    ) {
      event.preventDefault();
      adjustSplitRatio(-0.02);
    }
    if (
      (!isVerticalCompare && event.key === "ArrowRight") ||
      (isVerticalCompare && event.key === "ArrowDown")
    ) {
      event.preventDefault();
      adjustSplitRatio(0.02);
    }
  });

  refs.scratchResetButton.addEventListener("click", () => {
    scratchController.reset();
    render();
  });

  refs.scratchSurface.addEventListener("pointerdown", (event) => {
    if (state.displayMode !== "scratch") return;
    event.preventDefault();
    const didBegin = scratchController.begin(event.clientX, event.clientY);
    try {
      refs.scratchSurface.setPointerCapture(event.pointerId);
    } catch {
      // Ignore synthetic or interrupted pointer streams; the first scratch mark is already applied.
    }
    if (didBegin) {
      if (!selectVisibleMarkerFromPointer(event.clientX, event.clientY)) {
        clearSelectedSpot();
      }
    }
  });

  refs.scratchSurface.addEventListener("pointermove", (event) => {
    if (state.displayMode !== "scratch") return;
    event.preventDefault();
    scratchController.moveFromPointerEvent(event);
  });

  const endScratch = (event: PointerEvent) => {
    if (!scratchController.isActive()) return;
    if (refs.scratchSurface.hasPointerCapture(event.pointerId)) {
      refs.scratchSurface.releasePointerCapture(event.pointerId);
    }
    scratchController.end();
  };
  refs.scratchSurface.addEventListener("pointerup", endScratch);
  refs.scratchSurface.addEventListener("pointercancel", endScratch);

  document.addEventListener("click", (event) => {
    const target = event.target as Node | null;
    if (!target) return;
    if (
      state.openLanguageSwitcherId &&
      !refs.languageSwitchers.some((switcher) => switcher.root.contains(target))
    ) {
      state.openLanguageSwitcherId = null;
      renderLanguageUI();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && state.isDiaryNotebookOpen) {
      state.isDiaryNotebookOpen = false;
      render();
      refs.diaryNotebookOpenButton.focus({ preventScroll: true });
      return;
    }

    if (event.key === "Escape" && state.openLanguageSwitcherId) {
      state.openLanguageSwitcherId = null;
      renderLanguageUI();
    }
  });
};
