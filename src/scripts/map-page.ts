import L from "leaflet";
import "leaflet.markercluster";
import type { Spot } from "../data/spots";
import type { ThemeByMode, UiCopy } from "../data/site";
import { saveDiscoveredDiary } from "../lib/diary-storage";
import { getJsonData } from "./dom-utils";
import { createSpotCardRenderer } from "./map-card";
import { getMapDomRefs } from "./map-dom-refs";
import { registerMapPageEvents } from "./map-events";
import { createMapLayoutController } from "./map-layout";
import {
  createMarkerClusterGroups,
  createSpotMarkers,
  timeModes,
  updateMarkerClusterVisibility,
  updateMarkerSelection,
} from "./map-layers";
import { createVisibleMarkerSelector } from "./map-marker-selection";
import { createMapNavigationController } from "./map-navigation";
import { createPaneBoundsSynchronizer, createPaneVisibilityController, createTimeMapPanes } from "./map-panes";
import { featureCategory, isSpotVisibleForMode, layerStyleForMode } from "./map-style";
import type { MapPageState, MarkerEntry, TimeMode } from "./map-types";
import {
  applyTheme as applyThemeRender,
  renderControlCluster as renderControlClusterView,
  renderDiaryNotebookModal as renderDiaryNotebookModalView,
  renderDiscoveryToast as renderDiscoveryToastView,
  renderLanguageUI as renderLanguageUIView,
  renderStaticText as renderStaticTextView,
  updateButtons as updateButtonsView,
} from "./map-render";
import { clamp, getInitialTimeMode } from "./map-utils";
import { createScratchController } from "./scratch-controller";

const spots = getJsonData<Spot[]>("spots-data");
const uiCopy = getJsonData<UiCopy>("ui-data");
const themeByMode = getJsonData<ThemeByMode>("theme-data");
const refs = getMapDomRefs();
const {
  root,
  mapElement,
  clockDial,
  scratchSurface,
  floatingSheet,
} = refs;

const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const isMobileViewport = () => window.innerWidth < 768;
const isVerticalCompareMode = () => state.displayMode === "compare" && isMobileViewport();

const state: MapPageState = {
  locale: "ja",
  displayMode: "single",
  timeMode: getInitialTimeMode(),
  splitRatio: 0.5,
  selectedSpotId: null,
  selectedSpotMode: null,
  openLanguageSwitcherId: null,
  isDraggingSplit: false,
  hasMagnifierPoint: false,
  magnifierPoint: { x: 0, y: 0 },
  clockHour: 12,
  isDraggingClock: false,
  isExpanded: window.location.hash === "#map",
  discoveredDiaryToastSpotId: null,
  isDiaryNotebookOpen: false,
};

const map = L.map(mapElement, {
  attributionControl: false,
  zoomControl: false,
  dragging: true,
  scrollWheelZoom: true,
  touchZoom: true,
  doubleClickZoom: true,
  boxZoom: false,
  zoomSnap: 0.25,
  minZoom: 13,
  maxZoom: 20,
});

const { paneByMode, magnifierBackgroundPane, customPanes, clippedCustomPanes } = createTimeMapPanes(map);

const scratchMaskTargets = () => [
  paneByMode.night.geo,
  paneByMode.night.marker,
  magnifierBackgroundPane,
];

const inverseScratchMaskTargets = () => [
  paneByMode.day.marker,
];

const scratchController = createScratchController({
  map,
  surface: scratchSurface,
  mapElement,
  getMaskTargets: scratchMaskTargets,
  getInverseMaskTargets: inverseScratchMaskTargets,
});

const syncCustomPaneBounds = createPaneBoundsSynchronizer({
  mapElement,
  clippedCustomPanes,
  magnifierBackgroundPane,
  scratchController,
});

syncCustomPaneBounds();

const geoRendererByMode = {
  day: L.svg({ pane: "day-geojson-pane" }),
  night: L.svg({ pane: "night-geojson-pane" }),
} as const;

let markerEntries = new Map<string, MarkerEntry>();
const markerClusterGroupsByMode = createMarkerClusterGroups();
const geoJsonLayers: Partial<Record<TimeMode, L.GeoJSON>> = {};
let dataBounds: L.LatLngBounds | null = null;
let diaryToastHideTimer: number | null = null;
const diaryToastDuration = 3200;
const townCenter = L.latLng(42.9650, 141.16615);

const getSelectedSpot = () => spots.find((spot) => spot.id === state.selectedSpotId) ?? null;
const getDiscoveredDiaryToastSpot = () =>
  spots.find((spot) => spot.id === state.discoveredDiaryToastSpotId && spot.diary) ?? null;

const selectSpot = (spot: Spot, mode: TimeMode) => {
  state.selectedSpotId = spot.id;
  state.selectedSpotMode = mode;
  if (spot.diary) {
    const didDiscover = saveDiscoveredDiary(spot.id);
    if (didDiscover) {
      state.discoveredDiaryToastSpotId = spot.id;
      if (diaryToastHideTimer !== null) {
        window.clearTimeout(diaryToastHideTimer);
      }
      diaryToastHideTimer = window.setTimeout(() => {
        state.discoveredDiaryToastSpotId = null;
        diaryToastHideTimer = null;
        renderDiscoveryToast();
      }, diaryToastDuration);
    }
  }
};

const selectVisibleMarkerFromPointer = createVisibleMarkerSelector({
  root,
  mapElement,
  map,
  state,
  markerClusterGroupsByMode,
  scratchController,
  getMarkerEntries: () => markerEntries,
  isVerticalCompareMode,
  selectSpot,
  render: () => render(),
});

const clearSelectedSpot = () => {
  if (!state.selectedSpotId && !state.selectedSpotMode) return;
  state.selectedSpotId = null;
  state.selectedSpotMode = null;
  render();
};

const initMarkers = () => {
  markerEntries = createSpotMarkers({
    spots,
    markerClusterGroupsByMode,
    onSelect: (spot, mode) => {
      selectSpot(spot, mode);
      render();
    },
  });
};

const ensureMagnifierPoint = () => {
  if (state.hasMagnifierPoint) return;
  const { width, height } = mapElement.getBoundingClientRect();
  state.magnifierPoint = { x: width / 2, y: height / 2 };
  state.hasMagnifierPoint = true;
};

const applyPaneVisibility = createPaneVisibilityController({
  root,
  mapElement,
  state,
  paneByMode,
  customPanes,
  magnifierBackgroundPane,
  scratchController,
  ensureMagnifierPoint,
  isVerticalCompareMode,
});

const updateMarkerVisibility = () => {
  updateMarkerClusterVisibility({ map, state, markerClusterGroupsByMode });
  updateMarkerSelection({ state, markerEntries });
};

const updateButtons = () => {
  updateButtonsView({
    refs,
    state,
    currentZoom: map.getZoom(),
    maxZoom: map.getMaxZoom(),
    minZoom: map.getMinZoom(),
  });
};

const mapLayout = createMapLayoutController({
  refs,
  state,
  isMobileViewport,
  isVerticalCompareMode,
  ensureMagnifierPoint,
  applyPaneVisibility,
});
const {
  adjustSplitRatio,
  cancelSplitRatioUpdate,
  flushPendingSplitRatio,
  getMobileAttributionHeight,
  setSplitRatioFromPointer,
  syncBottomOverlayLayout,
  updateCompareUI,
} = mapLayout;

const renderDiscoveryToast = () => {
  renderDiscoveryToastView({ refs, state, uiCopy, discoveredSpot: getDiscoveredDiaryToastSpot() });
};

const renderDiaryNotebookModal = () => {
  renderDiaryNotebookModalView({ refs, state, uiCopy });
};

const renderCard = createSpotCardRenderer({
  refs,
  state,
  uiCopy,
  getSelectedSpot,
  syncBottomOverlayLayout,
});

const renderLanguageUI = () => {
  renderLanguageUIView({ refs, state, uiCopy });
};

const renderControlCluster = () => {
  renderControlClusterView({ refs, state });
};

const renderStaticText = () => {
  renderStaticTextView({ refs, state, uiCopy });
};

const applyTheme = () => {
  applyThemeRender({ root, state, themeByMode });
};

const applyScratchState = () => {
  const isScratch = state.displayMode === "scratch";
  const isMagnifier = state.displayMode === "magnifier";
  const isClock = state.displayMode === "clock";
  scratchSurface.hidden = !isScratch;
  root.classList.toggle("is-scratch-active", isScratch);
  root.classList.toggle("is-magnifier-active", isMagnifier);
  root.classList.toggle("is-clock-active", isClock);
  mapElement.style.pointerEvents = isScratch || isMagnifier ? "none" : "auto";

  paneByMode.day.geo.style.zIndex = "340";
  paneByMode.night.geo.style.zIndex = "341";
  paneByMode.day.marker.style.zIndex = "620";
  paneByMode.night.marker.style.zIndex = "621";

  if (!state.isExpanded) {
    map.dragging.disable();
    map.scrollWheelZoom.disable();
    map.touchZoom.disable();
    map.doubleClickZoom.disable();
    map.boxZoom.disable();
    mapElement.style.pointerEvents = "none";
  } else if (!isScratch && !isMagnifier) {
    map.dragging.enable();
    map.scrollWheelZoom.enable();
    map.touchZoom.enable();
    map.doubleClickZoom.enable();
    map.boxZoom.disable();
  } else if (isScratch) {
    map.dragging.disable();
    map.scrollWheelZoom.disable();
    map.touchZoom.disable();
    map.doubleClickZoom.disable();
    map.boxZoom.disable();
    scratchController.redraw();
  } else {
    map.dragging.disable();
    map.scrollWheelZoom.disable();
    map.touchZoom.disable();
    map.doubleClickZoom.disable();
    map.boxZoom.disable();
  }
};

const ensureSelectionVisibility = () => {
  const spot = getSelectedSpot();
  if (!spot) return;

  if (state.displayMode === "single" && !isSpotVisibleForMode(spot, state.timeMode)) {
    state.selectedSpotId = null;
    state.selectedSpotMode = null;
  }

  if (state.displayMode === "compare" && state.selectedSpotMode && !isSpotVisibleForMode(spot, state.selectedSpotMode)) {
    state.selectedSpotId = null;
    state.selectedSpotMode = null;
  }

  if (state.displayMode === "scratch" && state.selectedSpotMode && !isSpotVisibleForMode(spot, state.selectedSpotMode)) {
    state.selectedSpotMode = isSpotVisibleForMode(spot, "day") ? "day" : "night";
  }
};

const render = () => {
  root.classList.toggle("is-map-expanded", state.isExpanded);
  document.body.classList.toggle("is-map-expanded", state.isExpanded);
  document.documentElement.classList.toggle("is-map-expanded", state.isExpanded);
  syncCustomPaneBounds();
  ensureSelectionVisibility();
  updateButtons();
  renderStaticText();
  renderControlCluster();
  updateCompareUI();
  applyTheme();
  applyScratchState();
  applyPaneVisibility();
  updateMarkerVisibility();
  renderDiscoveryToast();
  renderCard();
  renderDiaryNotebookModal();
  syncBottomOverlayLayout();
};

const clampMagnifierPoint = () => {
  if (!state.hasMagnifierPoint) return;
  const { width, height } = mapElement.getBoundingClientRect();
  state.magnifierPoint = {
    x: clamp(state.magnifierPoint.x, 0, width),
    y: clamp(state.magnifierPoint.y, 0, height),
  };
};

const setMagnifierPointFromPointer = (clientX: number, clientY: number) => {
  const point = scratchController.getPointFromPointer(clientX, clientY);
  if (!point) return;
  state.magnifierPoint = point;
  state.hasMagnifierPoint = true;
  root.style.setProperty("--magnifier-x", `${point.x}px`);
  root.style.setProperty("--magnifier-y", `${point.y}px`);
  applyPaneVisibility();
};

const setClockHourFromPointer = (clientX: number, clientY: number) => {
  const bounds = clockDial.getBoundingClientRect();
  const centerX = bounds.left + bounds.width / 2;
  const centerY = bounds.top + bounds.height / 2;
  const angle = Math.atan2(clientY - centerY, clientX - centerX);
  const degrees = (angle * 180) / Math.PI;
  state.clockHour = ((degrees + 90 + 360) % 360) / 15;
  applyPaneVisibility();
  updateCompareUI();
};

const adjustClockHour = (delta: number) => {
  state.clockHour = (state.clockHour + delta + 24) % 24;
  applyPaneVisibility();
  updateCompareUI();
};

const mapNavigation = createMapNavigationController({
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
});
const { invalidateMapLayout, setMapToTownCenter, syncExpandedState } = mapNavigation;

const initGeoJson = async () => {
  const response = await fetch("/geodata/map.geojson");
  const data = (await response.json()) as GeoJSON.GeoJsonObject;

  timeModes.forEach((mode) => {
    const layer = L.geoJSON(data, {
      filter: (feature: GeoJSON.Feature | undefined) => {
        const category = featureCategory(feature);
        return Boolean(category) && feature?.geometry?.type !== "Point";
      },
      style: (feature: GeoJSON.Feature | undefined) => layerStyleForMode(mode, feature, root),
      interactive: false,
      pane: mode === "day" ? "day-geojson-pane" : "night-geojson-pane",
      renderer: geoRendererByMode[mode],
    } as L.GeoJSONOptions & { renderer: L.Renderer }).addTo(map);
    geoJsonLayers[mode] = layer;
  });

  dataBounds = geoJsonLayers.day?.getBounds() ?? null;
  if (dataBounds?.isValid()) {
    setMapToTownCenter();
    map.setMaxBounds(dataBounds.pad(0.2));
  }
};

registerMapPageEvents({
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
});

initMarkers();
initGeoJson().then(() => {
  render();
  requestAnimationFrame(() => {
    invalidateMapLayout({ recenter: true, invalidateSize: true });
  });
});

window.addEventListener("resize", () => {
  syncBottomOverlayLayout();
  invalidateMapLayout({ recenter: false, invalidateSize: false });
});

map.on("move resize", () => {
  invalidateMapLayout({ recenter: false, invalidateSize: false });
});
