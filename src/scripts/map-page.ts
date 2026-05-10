import L from "leaflet";
import "leaflet.markercluster";
import type { Spot } from "../data/spots";
import type { ThemeByMode, UiCopy } from "../data/site";
import { isDiaryDiscovered, saveDiscoveredDiary } from "../lib/diary-storage";
import { getJsonData, requiredElement, requiredElementById } from "./dom-utils";
import { featureCategory, isSpotVisibleForMode, layerStyleForMode, mapBackgroundForMode } from "./map-style";
import type { DisplayMode, MapPoint, TimeMode } from "./map-types";
import {
  clamp,
  formatClockHour,
  getInitialTimeMode,
  nightRatioForHour,
  oppositeTimeMode,
} from "./map-utils";
import { applyInverseCircleMask, clearMaskStyles, clipPathForCircle, setBlendPaneState, setPaneState } from "./pane-utils";
import { createScratchController } from "./scratch-controller";

type Locale = "ja" | "en";
type MarkerEntry = {
  marker: L.Marker;
  spot: Spot;
  mode: TimeMode;
};

const spots = getJsonData<Spot[]>("spots-data");
const uiCopy = getJsonData<UiCopy>("ui-data");
const themeByMode = getJsonData<ThemeByMode>("theme-data");

const root = requiredElement<HTMLElement>("[data-map-shell]");
const mapElement = requiredElementById<HTMLElement>("map");
const openMapLink = document.querySelector("[data-open-map]") as HTMLAnchorElement | null;
const controlCluster = requiredElement<HTMLElement>("[data-control-cluster]");
const controlShell = requiredElement<HTMLElement>("[data-control-shell]");
const timeToggleGroup = requiredElement<HTMLElement>("[data-time-toggle-group]");
const compareOverlay = requiredElement<HTMLElement>("[data-compare-overlay]");
const splitDivider = requiredElement<HTMLElement>("[data-split-divider]");
const splitHandle = requiredElement<HTMLButtonElement>("[data-split-handle]");
const magnifierOverlay = requiredElement<HTMLElement>("[data-magnifier-overlay]");
const clockPanel = requiredElement<HTMLElement>("[data-clock-panel]");
const clockDial = requiredElement<HTMLButtonElement>("[data-clock-dial]");
const clockHand = requiredElement<HTMLElement>("[data-clock-hand]");
const clockTime = requiredElement<HTMLElement>("[data-clock-time]");
const scratchSurface = requiredElement<HTMLCanvasElement>("[data-scratch-surface]");
const singleGroup = requiredElement<HTMLElement>("[data-single-group]");
const scratchGroup = requiredElement<HTMLElement>("[data-scratch-group]");
const scratchResetButton = requiredElement<HTMLButtonElement>("[data-scratch-reset]");
const zoomControls = requiredElement<HTMLElement>("[data-zoom-controls]");
const zoomInButton = requiredElement<HTMLButtonElement>("[data-zoom-in]");
const zoomOutButton = requiredElement<HTMLButtonElement>("[data-zoom-out]");
const floatingSheet = requiredElement<HTMLElement>(".sheet-host--floating");

const spotCard = requiredElement<HTMLElement>("[data-spot-card]");
const spotVisual = requiredElement<HTMLElement>("[data-spot-visual]");
const spotMeta = requiredElement<HTMLElement>("[data-spot-meta]");
const spotCategory = requiredElement<HTMLElement>("[data-spot-category]");
const spotRoute = requiredElement<HTMLElement>("[data-spot-route]");
const spotTitle = requiredElement<HTMLElement>("[data-spot-title]");
const spotDescription = requiredElement<HTMLElement>("[data-spot-description]");
const spotDetailLabel = requiredElement<HTMLElement>("[data-spot-detail-label]");
const spotDiary = requiredElement<HTMLElement>("[data-spot-diary]");
const spotDiaryLabel = requiredElement<HTMLElement>("[data-spot-diary-label]");
const spotDiaryTitle = requiredElement<HTMLElement>("[data-spot-diary-title]");
const spotDiaryBody = requiredElement<HTMLElement>("[data-spot-diary-body]");
const spotEmpty = requiredElement<HTMLElement>("[data-spot-empty]");
const spotEmptyTitle = requiredElement<HTMLElement>("[data-spot-empty-title]");
const spotEmptyHint = requiredElement<HTMLElement>("[data-spot-empty-hint]");
const diaryToast = requiredElement<HTMLElement>("[data-diary-toast]");
const diaryToastTitle = requiredElement<HTMLElement>("[data-diary-toast-title]");
const diaryToastName = requiredElement<HTMLElement>("[data-diary-toast-name]");
const diaryToastBody = requiredElement<HTMLElement>("[data-diary-toast-body]");
const diaryNotebookOpenButton = requiredElement<HTMLButtonElement>("[data-map-diary-notebook-open]");
const diaryNotebookModal = requiredElement<HTMLElement>("[data-map-diary-notebook-modal]");
const diaryNotebookPanel = requiredElement<HTMLElement>("[data-map-diary-notebook-panel]");
const diaryNotebookClose = requiredElement<HTMLButtonElement>("[data-map-diary-notebook-close]");
const diaryNotebookTitle = requiredElement<HTMLElement>("[data-map-diary-notebook-title]");
const backHomeButton = requiredElement<HTMLButtonElement>("[data-back-home-link]");
const mapAttribution = requiredElement<HTMLElement>("[data-map-attribution]");
const mapAttributionText = requiredElement<HTMLElement>(".map-attribution span");
const displayModeGroup = requiredElement<HTMLElement>("[data-display-mode-group]");
const timeModeButtons = Array.from(document.querySelectorAll<HTMLElement>("[data-time-mode]"));
const displayModeButtons = Array.from(document.querySelectorAll<HTMLElement>("[data-display-mode]"));
const landingTitle = document.querySelector<HTMLElement>("[data-landing-title]");
const landingLead = document.querySelector<HTMLElement>("[data-landing-lead]");
const landingCta = document.querySelector<HTMLElement>("[data-landing-cta]");
const conceptTitle = document.querySelector<HTMLElement>("[data-concept-title]");
const conceptBody = document.querySelector<HTMLElement>("[data-concept-body]");
const sectionsTitle = document.querySelector<HTMLElement>("[data-sections-title]");
const diaryTitle = document.querySelector<HTMLElement>("[data-diary-title]");
const diaryBody = document.querySelector<HTMLElement>("[data-diary-body]");
const sceneLabelDay = document.querySelector<HTMLElement>('[data-scene-label="day"]');
const sceneLabelNight = document.querySelector<HTMLElement>('[data-scene-label="night"]');
const sceneMoodDay = document.querySelector<HTMLElement>('[data-scene-mood="day"]');
const sceneMoodNight = document.querySelector<HTMLElement>('[data-scene-mood="night"]');
const languageSwitchers = Array.from(document.querySelectorAll<HTMLElement>("[data-language-switcher]")).map((switcherRoot) => {
  const trigger = switcherRoot.querySelector<HTMLButtonElement>("[data-language-menu-trigger]");
  const menu = switcherRoot.querySelector<HTMLElement>("[data-language-menu]");
  const options = Array.from(switcherRoot.querySelectorAll<HTMLButtonElement>("[data-language-option]"));
  if (!trigger || !menu || options.length === 0) {
    throw new Error("Language switcher markup is incomplete.");
  }

  return {
    id: switcherRoot.dataset.languageSwitcher ?? "",
    root: switcherRoot,
    trigger,
    menu,
    options,
  };
});
const languageOptionButtons = languageSwitchers.flatMap((switcher) => switcher.options);

const timeModeButtonByMode = {
  day: requiredElement<HTMLElement>('[data-time-mode="day"]'),
  night: requiredElement<HTMLElement>('[data-time-mode="night"]'),
} as const;

const displayModeButtonByMode = {
  single: requiredElement<HTMLElement>('[data-display-mode="single"]'),
  compare: requiredElement<HTMLElement>('[data-display-mode="compare"]'),
  magnifier: requiredElement<HTMLElement>('[data-display-mode="magnifier"]'),
  clock: requiredElement<HTMLElement>('[data-display-mode="clock"]'),
  scratch: requiredElement<HTMLElement>('[data-display-mode="scratch"]'),
} as const;

const placeholderClasses = ["placeholder-river", "placeholder-steam", "placeholder-forest", "placeholder-light"];
const timeModes = ["day", "night"] as const satisfies readonly TimeMode[];
const markerPaneByMode = {
  day: "day-marker-pane",
  night: "night-marker-pane",
} as const satisfies Record<TimeMode, string>;
const pinIconSize: [number, number] = [36, 36];
const pinIconAnchor: [number, number] = [18, 18];
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const isMobileViewport = () => window.innerWidth < 768;
const isVerticalCompareMode = () => state.displayMode === "compare" && isMobileViewport();
type ComparePaneSide = "day" | "night";
let pendingSplitRatio: number | null = null;
let splitAnimationFrame: number | null = null;

const state: {
  locale: Locale;
  displayMode: DisplayMode;
  timeMode: TimeMode;
  splitRatio: number;
  selectedSpotId: string | null;
  selectedSpotMode: TimeMode | null;
  openLanguageSwitcherId: string | null;
  isDraggingSplit: boolean;
  hasMagnifierPoint: boolean;
  magnifierPoint: MapPoint;
  clockHour: number;
  isDraggingClock: boolean;
  isExpanded: boolean;
  discoveredDiaryToastSpotId: string | null;
  isDiaryNotebookOpen: boolean;
} = {
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
  maxZoom: 18,
});

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

const syncCustomPaneBounds = () => {
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

syncCustomPaneBounds();

const geoRendererByMode = {
  day: L.svg({ pane: "day-geojson-pane" }),
  night: L.svg({ pane: "night-geojson-pane" }),
} as const;

const markerEntries = new Map<string, MarkerEntry>();
const markerClusterGroupsByMode = Object.fromEntries(
  timeModes.map((mode) => [mode, createMarkerClusterGroup(mode)]),
) as Record<TimeMode, L.MarkerClusterGroup>;
const geoJsonLayers: Partial<Record<TimeMode, L.GeoJSON>> = {};
let dataBounds: L.LatLngBounds | null = null;
let transitionCleanupTimer: number | null = null;
let spotCardHideTimer: number | null = null;
let spotCardShowFrame: number | null = null;
let diaryToastHideTimer: number | null = null;
const mapTransitionDuration = 720;
const spotCardMotionDuration = 320;
const diaryToastDuration = 3200;
const townCenter = L.latLng(42.9650, 141.16615);
const townZoomDesktop = 15.5;
const townZoomMobile = 15.25;
const mobileAttributionBottomInset = 16;
const mobileAttributionGap = 12;
const mobileAttributionMinHeight = 58;

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

const isMarkerModeVisibleAtPoint = (mode: TimeMode, point: MapPoint) => {
  if (state.displayMode === "single") return mode === state.timeMode;

  if (state.displayMode === "compare") {
    const mapRect = mapElement.getBoundingClientRect();
    const splitBoundary = (isVerticalCompareMode() ? mapRect.height : mapRect.width) * state.splitRatio;
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
    const radius = Number.parseFloat(getComputedStyle(root).getPropertyValue("--magnifier-radius")) || 90;
    const isInsideLens = Math.hypot(point.x - state.magnifierPoint.x, point.y - state.magnifierPoint.y) <= radius;
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

  markerEntries.forEach((entry) => {
    const { marker, mode } = entry;
    if (!map.hasLayer(markerClusterGroupsByMode[mode]) || !isMarkerModeVisibleAtPoint(mode, point)) return;
    if (!marker.getElement()) return;

    const markerPoint = map.latLngToContainerPoint(marker.getLatLng());
    const distance = Math.hypot(point.x - markerPoint.x, point.y - markerPoint.y);
    if (distance > hitRadius) return;

    const priority =
      (state.displayMode === "magnifier" && mode === oppositeTimeMode(state.timeMode)) ||
      (state.displayMode === "scratch" && mode === "night" && scratchController.isRevealedAtPoint(point))
        ? 1
        : 0;

    if (priority > closestPriority || (priority === closestPriority && distance < closestDistance)) {
      closest = entry;
      closestDistance = distance;
      closestPriority = priority;
    }
  });

  return closest;
};

const selectVisibleMarkerFromPointer = (clientX: number, clientY: number) => {
  const point = scratchController.getPointFromPointer(clientX, clientY);
  if (!point) return false;
  const entry = getVisibleMarkerAtPoint(point);
  if (!entry) return false;
  selectSpot(entry.spot, entry.mode);
  render();
  return true;
};

const clearSelectedSpot = () => {
  if (!state.selectedSpotId && !state.selectedSpotMode) return;
  state.selectedSpotId = null;
  state.selectedSpotMode = null;
  render();
};

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

function createClusterIcon(cluster: L.MarkerCluster, mode: TimeMode) {
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
}

function createMarkerClusterGroup(mode: TimeMode) {
  return L.markerClusterGroup({
    clusterPane: markerPaneByMode[mode],
    iconCreateFunction: (cluster) => createClusterIcon(cluster, mode),
    showCoverageOnHover: false,
    spiderfyOnMaxZoom: true,
    zoomToBoundsOnClick: true,
    maxClusterRadius: (zoom) => (zoom >= 17 ? 28 : 48),
  });
}

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
    selectSpot(spot, mode);
    render();
  });

  markerClusterGroupsByMode[mode].addLayer(marker);
  markerEntries.set(`${spot.id}:${mode}`, { marker, spot, mode });
};

const initMarkers = () => {
  spots.forEach((spot) => {
    if (isSpotVisibleForMode(spot, "day")) createMarker(spot, "day");
    if (isSpotVisibleForMode(spot, "night")) createMarker(spot, "night");
  });
};

const clearPaneBackgrounds = () => {
  customPanes.forEach((pane) => {
    pane.style.background = "";
    clearMaskStyles(pane);
  });
  magnifierBackgroundPane.style.opacity = "0";
  magnifierBackgroundPane.style.visibility = "hidden";
  magnifierBackgroundPane.style.clipPath = "none";
};

const ensureMagnifierPoint = () => {
  if (state.hasMagnifierPoint) return;
  const { width, height } = mapElement.getBoundingClientRect();
  state.magnifierPoint = { x: width / 2, y: height / 2 };
  state.hasMagnifierPoint = true;
};

const applyPaneVisibility = () => {
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

const updateMarkerVisibility = () => {
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

const updateButtons = () => {
  timeModeButtons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.timeMode === state.timeMode);
  });
  displayModeButtons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.displayMode === state.displayMode);
  });
  languageOptionButtons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.locale === state.locale);
  });

  const currentZoom = map.getZoom();
  zoomInButton.disabled = currentZoom >= map.getMaxZoom();
  zoomOutButton.disabled = currentZoom <= map.getMinZoom();
};

const showSpotCard = () => {
  if (spotCardHideTimer !== null) {
    window.clearTimeout(spotCardHideTimer);
    spotCardHideTimer = null;
  }

  if (spotCardShowFrame !== null) {
    window.cancelAnimationFrame(spotCardShowFrame);
    spotCardShowFrame = null;
  }

  const wasHidden = spotCard.hidden;
  spotCard.hidden = false;

  if (!wasHidden && spotCard.classList.contains("is-visible-sheet")) return;

  spotCardShowFrame = window.requestAnimationFrame(() => {
    spotCard.classList.add("is-visible-sheet");
    syncBottomOverlayLayout();
    spotCardShowFrame = null;
  });
};

const hideSpotCard = () => {
  if (spotCardShowFrame !== null) {
    window.cancelAnimationFrame(spotCardShowFrame);
    spotCardShowFrame = null;
  }

  spotCard.classList.remove("is-visible-sheet");
  if (spotCard.hidden || spotCardHideTimer !== null) return;

  spotCardHideTimer = window.setTimeout(() => {
    spotCard.hidden = true;
    syncBottomOverlayLayout();
    spotCardHideTimer = null;
  }, spotCardMotionDuration);
};

const renderDiscoveryToast = () => {
  const ui = uiCopy[state.locale];
  const discoveredSpot = getDiscoveredDiaryToastSpot();

  if (!discoveredSpot?.diary) {
    diaryToast.hidden = true;
    diaryToast.classList.remove("is-visible");
    diaryToastName.textContent = "";
    return;
  }

  diaryToast.hidden = false;
  diaryToast.classList.add("is-visible");
  diaryToastTitle.textContent = ui.diaryToastTitle;
  diaryToastName.textContent = discoveredSpot.diary.title[state.locale];
  diaryToastBody.textContent = ui.diaryToastBody;
};

const renderDiaryNotebookModal = () => {
  const ui = uiCopy[state.locale];
  diaryNotebookOpenButton.setAttribute("aria-label", ui.diaryNotebookOpenLabel);
  diaryNotebookOpenButton.setAttribute("title", ui.diaryNotebookOpenLabel);
  diaryNotebookClose.setAttribute("aria-label", ui.diaryNotebookCloseLabel);
  diaryNotebookTitle.textContent = ui.diarySectionTitle;

  if (!state.isDiaryNotebookOpen) {
    diaryNotebookModal.hidden = true;
    diaryNotebookModal.classList.remove("is-visible");
    return;
  }

  diaryNotebookModal.hidden = false;
  diaryNotebookModal.classList.add("is-visible");
};

const openDiaryNotebook = () => {
  state.isDiaryNotebookOpen = true;
  renderDiaryNotebookModal();
  diaryNotebookClose.focus({ preventScroll: true });
};

const closeDiaryNotebook = () => {
  state.isDiaryNotebookOpen = false;
  renderDiaryNotebookModal();
  diaryNotebookOpenButton.focus({ preventScroll: true });
};

const renderCard = () => {
  const ui = uiCopy[state.locale];
  const spot = getSelectedSpot();

  if (!spot) {
    hideSpotCard();
    spotCard.classList.add("is-empty-sheet");
    spotCard.classList.remove("is-selected-sheet");
    spotEmpty.hidden = true;
    spotEmptyTitle.textContent = ui.cardEmptyTitle;
    spotEmptyHint.textContent = ui.cardEmptyHint;
    return;
  }

  showSpotCard();
  const activeTimeMode =
    state.displayMode === "single" ? state.timeMode : state.selectedSpotMode ?? state.timeMode;
  const activeTimeLabel =
    activeTimeMode === "day" ? ui.dayLabel : activeTimeMode === "night" ? ui.nightLabel : ui.bothLabel;

  spotCard.classList.add("is-selected-sheet");
  spotCard.classList.remove("is-empty-sheet");
  spotVisual.hidden = false;
  spotMeta.hidden = false;
  spotTitle.hidden = false;
  spotDescription.hidden = false;
  spotDetailLabel.hidden = false;
  spotDiary.hidden = true;
  spotEmpty.hidden = true;
  spotVisual.classList.remove(...placeholderClasses);
  spotVisual.classList.add(`placeholder-${spot.image.placeholderVariant}`);
  spotCategory.textContent = `${ui.categoryLabel}: ${spot.category[state.locale]}`;
  spotRoute.textContent = `${ui.routeHint}: ${activeTimeLabel}`;
  spotTitle.textContent = spot.name[state.locale];
  spotDescription.textContent = spot.description[state.locale];
  spotDetailLabel.textContent = ui.detailsLabel;

  if (spot.diary && isDiaryDiscovered(spot.id)) {
    spotDiary.hidden = false;
    spotDiaryLabel.textContent = ui.diaryCardLabel;
    spotDiaryTitle.textContent = spot.diary.title[state.locale];
    spotDiaryBody.textContent = spot.diary.body[state.locale];
  } else {
    spotDiary.hidden = true;
    spotDiaryTitle.textContent = "";
    spotDiaryBody.textContent = "";
  }
};

const renderLandingTitle = (lines: readonly string[]) => {
  if (!landingTitle) return;
  landingTitle.replaceChildren(
    ...lines.map((line) => {
      const span = document.createElement("span");
      span.textContent = line;
      return span;
    }),
  );
};

const renderLandingText = () => {
  const ui = uiCopy[state.locale];
  document.documentElement.lang = state.locale;
  document.body.dataset.locale = state.locale;
  renderLandingTitle(ui.landingTitleLines);
  if (landingLead) landingLead.textContent = ui.landingLead;
  if (landingCta) landingCta.textContent = ui.landingPrimaryCta;
  if (conceptTitle) conceptTitle.textContent = ui.conceptTitle;
  if (conceptBody) conceptBody.textContent = ui.conceptBody;
  if (sectionsTitle) sectionsTitle.textContent = ui.sectionsTitle;
  if (diaryTitle) diaryTitle.textContent = ui.diarySectionTitle;
  if (diaryBody) diaryBody.textContent = ui.diarySectionBody;
  if (sceneLabelDay) sceneLabelDay.textContent = ui.dayLabel;
  if (sceneLabelNight) sceneLabelNight.textContent = ui.nightLabel;
  if (sceneMoodDay) sceneMoodDay.textContent = ui.dayMood;
  if (sceneMoodNight) sceneMoodNight.textContent = ui.nightMood;
  window.dispatchEvent(new CustomEvent("time-map:locale-change", { detail: { locale: state.locale } }));
};

const renderLanguageUI = () => {
  const ui = uiCopy[state.locale];
  languageSwitchers.forEach((switcher) => {
    const isOpen = state.openLanguageSwitcherId === switcher.id;
    switcher.trigger.setAttribute("aria-label", ui.languageLabel);
    switcher.trigger.setAttribute("aria-expanded", String(isOpen));
    switcher.menu.setAttribute("aria-label", ui.languageLabel);
    switcher.menu.hidden = !isOpen;
    switcher.menu.classList.toggle("is-open", isOpen);
    switcher.options.forEach((button) => {
      button.classList.toggle("is-active", button.dataset.locale === state.locale);
    });
  });
};

const renderControlCluster = () => {
  controlCluster.classList.toggle("is-hidden-by-selection", state.selectedSpotId !== null);
};

const clearBottomOverlayLayout = () => {
  root.style.removeProperty("--map-attribution-measured-height");
  root.style.removeProperty("--map-selected-sheet-top");
};

const getMobileAttributionHeight = () =>
  Math.max(
    Math.ceil(mapAttribution.getBoundingClientRect().height),
    mobileAttributionMinHeight,
  );

const syncBottomOverlayLayout = () => {
  const hasSelectedSpot = state.selectedSpotId !== null;
  mapAttribution.classList.toggle("is-raised-by-selection", hasSelectedSpot);

  if (!isMobileViewport()) {
    clearBottomOverlayLayout();
    return;
  }

  const rootRect = root.getBoundingClientRect();
  const sheetRect = floatingSheet.getBoundingClientRect();
  const measuredHeight = getMobileAttributionHeight();
  const selectedSheetTop = hasSelectedSpot ? Math.max(Math.round(sheetRect.top - rootRect.top), 0) : 0;
  root.style.setProperty("--map-attribution-measured-height", `${measuredHeight}px`);
  root.style.setProperty("--map-selected-sheet-top", `${selectedSheetTop}px`);
};

const setCompareDividerPosition = (splitPercent: string) => {
  if (isVerticalCompareMode()) {
    splitDivider.style.top = splitPercent;
    splitDivider.style.removeProperty("left");
    return;
  }

  splitDivider.style.left = splitPercent;
  splitDivider.style.removeProperty("top");
};

const updateCompareUI = () => {
  const splitPercent = `${state.splitRatio * 100}%`;
  const clockTimeText = formatClockHour(state.clockHour);
  const clockAngle = state.clockHour * 15;
  const clockNightRatio = nightRatioForHour(state.clockHour);
  const isVerticalCompare = isVerticalCompareMode();
  root.style.setProperty("--compare-split", splitPercent);
  root.style.setProperty("--clock-night-ratio", String(clockNightRatio));
  setCompareDividerPosition(splitPercent);
  splitHandle.setAttribute("aria-valuenow", String(Math.round(state.splitRatio * 100)));
  splitHandle.setAttribute("aria-valuetext", `${Math.round(state.splitRatio * 100)}%`);
  splitHandle.setAttribute("aria-orientation", isVerticalCompare ? "vertical" : "horizontal");
  compareOverlay.hidden = state.displayMode !== "compare";
  magnifierOverlay.hidden = state.displayMode !== "magnifier";
  clockPanel.hidden = state.displayMode !== "clock";
  clockHand.style.transform = `translateX(-50%) rotate(${clockAngle}deg)`;
  clockTime.textContent = clockTimeText;
  clockDial.setAttribute("aria-valuenow", String(Math.round(state.clockHour * 10) / 10));
  clockDial.setAttribute("aria-valuetext", clockTimeText);
  if (state.displayMode === "magnifier") {
    ensureMagnifierPoint();
    root.style.setProperty("--magnifier-x", `${state.magnifierPoint.x}px`);
    root.style.setProperty("--magnifier-y", `${state.magnifierPoint.y}px`);
  }
  const isScratch = state.displayMode === "scratch";
  const isSingle = state.displayMode === "single";
  singleGroup.classList.toggle("is-expanded", isSingle);
  scratchGroup.classList.toggle("is-expanded", isScratch);
  scratchResetButton.setAttribute("aria-hidden", String(!isScratch));
  scratchResetButton.tabIndex = isScratch ? 0 : -1;
  controlShell.classList.toggle("is-compare", state.displayMode === "compare");
  controlShell.classList.toggle("is-magnifier", state.displayMode === "magnifier");
  controlShell.classList.toggle("is-clock", state.displayMode === "clock");
  controlShell.classList.toggle("is-scratch", isScratch);
  timeToggleGroup.setAttribute("aria-hidden", String(!isSingle));
  timeModeButtons.forEach((button) => {
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
  const bounds = mapElement.getBoundingClientRect();
  return isVerticalCompareMode()
    ? clamp((clientY - bounds.top) / bounds.height, 0.1, 0.9)
    : clamp((clientX - bounds.left) / bounds.width, 0.1, 0.9);
};

const adjustSplitRatio = (delta: number) => {
  state.splitRatio = clamp(state.splitRatio + delta, 0.1, 0.9);
  applyPaneVisibility();
  updateCompareUI();
};

const renderStaticText = () => {
  const ui = uiCopy[state.locale];
  document.title = state.isExpanded ? `${ui.siteTitle} | ${ui.mapPageTitle}` : `${ui.siteTitle} | ${ui.siteTagline}`;
  backHomeButton.setAttribute("aria-label", ui.backHome);
  zoomControls.setAttribute("aria-label", ui.zoomControlsLabel);
  zoomInButton.setAttribute("aria-label", ui.zoomInLabel);
  zoomInButton.setAttribute("title", ui.zoomInLabel);
  zoomOutButton.setAttribute("aria-label", ui.zoomOutLabel);
  zoomOutButton.setAttribute("title", ui.zoomOutLabel);
  timeModeButtonByMode.day.setAttribute("aria-label", ui.dayLabel);
  timeModeButtonByMode.day.setAttribute("title", ui.dayLabel);
  timeModeButtonByMode.night.setAttribute("aria-label", ui.nightLabel);
  timeModeButtonByMode.night.setAttribute("title", ui.nightLabel);
  mapAttributionText.textContent = ui.mapDataAttribution;
  displayModeGroup.setAttribute("aria-label", ui.displayModeLabel);
  const displayModeLabels: Array<[HTMLElement, string]> = [
    [displayModeButtonByMode.single, ui.singleModeLabel],
    [displayModeButtonByMode.compare, ui.compareModeLabel],
    [displayModeButtonByMode.magnifier, ui.magnifierModeLabel],
    [displayModeButtonByMode.clock, ui.clockModeLabel],
    [displayModeButtonByMode.scratch, ui.scratchModeLabel],
  ];
  displayModeLabels.forEach(([button, label]) => {
    button.setAttribute("aria-label", label);
    button.setAttribute("title", label);
  });
  splitHandle.setAttribute("aria-label", ui.compareHandleLabel);
  clockDial.setAttribute("aria-label", ui.clockDialLabel);
  scratchResetButton.setAttribute("aria-label", ui.scratchResetLabel);
  scratchResetButton.setAttribute("title", ui.scratchResetLabel);
  diaryNotebookOpenButton.setAttribute("aria-label", ui.diaryNotebookOpenLabel);
  diaryNotebookOpenButton.setAttribute("title", ui.diaryNotebookOpenLabel);
  diaryNotebookClose.setAttribute("aria-label", ui.diaryNotebookCloseLabel);
  diaryNotebookTitle.textContent = ui.diarySectionTitle;
  renderLandingText();
  renderLanguageUI();
};

const applyTheme = () => {
  const themeMode = state.displayMode === "compare" ? "day" : state.timeMode;
  root.classList.remove(
    themeByMode.day.className,
    themeByMode.night.className,
    themeByMode.compare.className,
    themeByMode.scratch.className,
  );
  root.classList.add(themeByMode[themeMode].className);
  root.style.setProperty("--theme-glow", themeByMode[themeMode].glow);
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

const clearMapTransitionClasses = () => {
  root.classList.remove("is-map-entering", "is-map-leaving");
  document.body.classList.remove("is-map-entering", "is-map-leaving");
  document.documentElement.classList.remove("is-map-entering", "is-map-leaving");
  if (transitionCleanupTimer !== null) {
    window.clearTimeout(transitionCleanupTimer);
    transitionCleanupTimer = null;
  }
};

const setMapTransitionDirection = (direction: "entering" | "leaving" | null) => {
  clearMapTransitionClasses();
  if (!direction) return;

  const className = direction === "entering" ? "is-map-entering" : "is-map-leaving";
  root.classList.add(className);
  document.body.classList.add(className);
  document.documentElement.classList.add(className);
  transitionCleanupTimer = window.setTimeout(clearMapTransitionClasses, mapTransitionDuration);
};

const getFitBoundsPadding = () => {
  const isMobile = isMobileViewport();
  const sheetRect = state.isExpanded ? floatingSheet.getBoundingClientRect() : new DOMRect(0, 0, 0, 0);
  const attributionHeight = isMobile
    ? getMobileAttributionHeight() + mobileAttributionBottomInset + mobileAttributionGap
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
  const isMobile = window.innerWidth < 768;
  const zoom = isMobile ? townZoomMobile : townZoomDesktop;
  const padding = getFitBoundsPadding();
  const offsetX = (padding.paddingBottomRight[0] - padding.paddingTopLeft[0]) / 2;
  const offsetY = (padding.paddingBottomRight[1] - padding.paddingTopLeft[1]) / 2;
  const targetPoint = map.project(townCenter, zoom).subtract([offsetX, offsetY]);
  map.setView(map.unproject(targetPoint, zoom), zoom);
};

const syncExpandedState = (nextExpanded: boolean, options: { updateHistory?: boolean } = {}) => {
  if (state.isExpanded === nextExpanded && window.location.hash === (nextExpanded ? "#map" : "")) {
    return;
  }

  const wasExpanded = state.isExpanded;
  const transitionDirection = wasExpanded === nextExpanded ? null : nextExpanded ? "entering" : "leaving";
  setMapTransitionDirection(transitionDirection);

  if (wasExpanded && !nextExpanded && state.displayMode === "scratch") {
    scratchController.reset();
    state.displayMode = "single";
    state.timeMode = getInitialTimeMode();
    state.selectedSpotMode = null;
  }

  state.isExpanded = nextExpanded;
  state.openLanguageSwitcherId = null;

  if (options.updateHistory) {
    if (nextExpanded) {
      window.history.pushState({ mapExpanded: true }, "", "#map");
    } else {
      window.history.pushState({ mapExpanded: false }, "", window.location.pathname);
    }
  }

  render();
  requestAnimationFrame(() => {
    map.invalidateSize();
    const sizeChanged = syncCustomPaneBounds();
    if (sizeChanged && state.displayMode === "scratch") {
      scratchController.redraw();
    }
    clampMagnifierPoint();
    setMapToTownCenter();
    applyPaneVisibility();
  });
  window.setTimeout(() => {
    map.invalidateSize();
    const sizeChanged = syncCustomPaneBounds();
    if (sizeChanged && state.displayMode === "scratch") {
      scratchController.redraw();
    }
    clampMagnifierPoint();
    applyPaneVisibility();
  }, mapTransitionDuration);
};

const setSplitRatioFromPointer = (clientX: number, clientY: number) => {
  scheduleSplitRatioUpdate(getSplitRatioFromPointer(clientX, clientY));
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

openMapLink?.addEventListener("click", (event) => {
  event.preventDefault();
  syncExpandedState(true, { updateHistory: window.location.hash !== "#map" });
});

backHomeButton.addEventListener("click", () => {
  if (window.location.hash === "#map") {
    window.history.back();
    return;
  }
  syncExpandedState(false, { updateHistory: true });
});

window.addEventListener("popstate", () => {
  syncExpandedState(window.location.hash === "#map");
});

timeModeButtons.forEach((button) => {
  button.addEventListener("click", () => {
    state.timeMode = button.dataset.timeMode as TimeMode;
    render();
  });
});

displayModeButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const nextMode = button.dataset.displayMode as DisplayMode;
    if (nextMode === "magnifier" && state.displayMode !== "magnifier") {
      ensureMagnifierPoint();
      state.timeMode = "day";
    }
    if (nextMode === "clock" && state.displayMode !== "clock") {
      state.clockHour = 12;
      state.timeMode = "day";
    }
    if (nextMode === "scratch" && state.displayMode !== "scratch") {
      scratchController.reset();
      state.timeMode = "day";
      state.selectedSpotMode = state.selectedSpotMode ?? "day";
    }
    if (state.displayMode === "scratch" && nextMode !== "scratch") {
      scratchController.reset();
    }
    state.displayMode = nextMode;
    render();
  });
});

zoomInButton.addEventListener("click", () => {
  map.zoomIn();
});

zoomOutButton.addEventListener("click", () => {
  map.zoomOut();
});

diaryNotebookOpenButton.addEventListener("click", (event) => {
  event.stopPropagation();
  openDiaryNotebook();
});

diaryNotebookClose.addEventListener("click", () => {
  closeDiaryNotebook();
});

diaryNotebookModal.addEventListener("click", (event) => {
  if (event.target === diaryNotebookModal) {
    closeDiaryNotebook();
  }
});

diaryNotebookPanel.addEventListener("click", (event) => {
  event.stopPropagation();
});

mapElement.addEventListener("pointerdown", (event) => {
  if (!state.isExpanded || state.displayMode === "magnifier" || state.displayMode === "scratch") return;
  const target = event.target;
  if (target instanceof Element && target.closest(".time-pin, .time-pin-wrapper, .time-cluster, .time-cluster-wrapper")) return;
  clearSelectedSpot();
});

magnifierOverlay.addEventListener("pointerdown", (event) => {
  if (state.displayMode !== "magnifier") return;
  event.preventDefault();
  magnifierOverlay.setPointerCapture(event.pointerId);
  setMagnifierPointFromPointer(event.clientX, event.clientY);
  if (!selectVisibleMarkerFromPointer(event.clientX, event.clientY)) {
    clearSelectedSpot();
  }
});

magnifierOverlay.addEventListener("pointermove", (event) => {
  if (state.displayMode !== "magnifier") return;
  setMagnifierPointFromPointer(event.clientX, event.clientY);
});

magnifierOverlay.addEventListener("pointerup", (event) => {
  if (magnifierOverlay.hasPointerCapture(event.pointerId)) {
    magnifierOverlay.releasePointerCapture(event.pointerId);
  }
});

magnifierOverlay.addEventListener("pointercancel", (event) => {
  if (magnifierOverlay.hasPointerCapture(event.pointerId)) {
    magnifierOverlay.releasePointerCapture(event.pointerId);
  }
});

clockDial.addEventListener("pointerdown", (event) => {
  if (state.displayMode !== "clock") return;
  event.preventDefault();
  state.isDraggingClock = true;
  clockDial.setPointerCapture(event.pointerId);
  setClockHourFromPointer(event.clientX, event.clientY);
});

clockDial.addEventListener("pointermove", (event) => {
  if (!state.isDraggingClock) return;
  setClockHourFromPointer(event.clientX, event.clientY);
});

clockDial.addEventListener("pointerup", (event) => {
  state.isDraggingClock = false;
  if (clockDial.hasPointerCapture(event.pointerId)) {
    clockDial.releasePointerCapture(event.pointerId);
  }
});

clockDial.addEventListener("pointercancel", (event) => {
  state.isDraggingClock = false;
  if (clockDial.hasPointerCapture(event.pointerId)) {
    clockDial.releasePointerCapture(event.pointerId);
  }
});

clockDial.addEventListener("keydown", (event) => {
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

languageSwitchers.forEach((switcher) => {
  switcher.trigger.addEventListener("click", (event) => {
    event.stopPropagation();
    state.openLanguageSwitcherId = state.openLanguageSwitcherId === switcher.id ? null : switcher.id;
    renderLanguageUI();
  });

  switcher.menu.addEventListener("click", (event) => {
    event.stopPropagation();
  });
});

prefersReducedMotion.addEventListener("change", () => {
  render();
});

languageOptionButtons.forEach((button) => {
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

splitHandle.addEventListener("pointerdown", (event) => {
  if (state.displayMode !== "compare") return;
  state.isDraggingSplit = true;
  splitHandle.setPointerCapture(event.pointerId);
  setSplitRatioFromPointer(event.clientX, event.clientY);
});

splitHandle.addEventListener("pointermove", (event) => {
  if (!state.isDraggingSplit) return;
  setSplitRatioFromPointer(event.clientX, event.clientY);
});

splitHandle.addEventListener("pointerup", (event) => {
  state.isDraggingSplit = false;
  flushPendingSplitRatio();
  if (splitHandle.hasPointerCapture(event.pointerId)) {
    splitHandle.releasePointerCapture(event.pointerId);
  }
});

splitHandle.addEventListener("pointercancel", (event) => {
  state.isDraggingSplit = false;
  pendingSplitRatio = null;
  cancelPendingSplitFrame();
  if (splitHandle.hasPointerCapture(event.pointerId)) {
    splitHandle.releasePointerCapture(event.pointerId);
  }
});

splitHandle.addEventListener("keydown", (event) => {
  if (state.displayMode !== "compare") return;
  const isVerticalCompare = isVerticalCompareMode();
  if ((!isVerticalCompare && event.key === "ArrowLeft") || (isVerticalCompare && event.key === "ArrowUp")) {
    event.preventDefault();
    adjustSplitRatio(-0.02);
  }
  if ((!isVerticalCompare && event.key === "ArrowRight") || (isVerticalCompare && event.key === "ArrowDown")) {
    event.preventDefault();
    adjustSplitRatio(0.02);
  }
});

scratchResetButton.addEventListener("click", () => {
  scratchController.reset();
  render();
});

scratchSurface.addEventListener("pointerdown", (event) => {
  if (state.displayMode !== "scratch") return;
  event.preventDefault();
  const didBegin = scratchController.begin(event.clientX, event.clientY);
  try {
    scratchSurface.setPointerCapture(event.pointerId);
  } catch {
    // Ignore synthetic or interrupted pointer streams; the first scratch mark is already applied.
  }
  if (didBegin) {
    if (!selectVisibleMarkerFromPointer(event.clientX, event.clientY)) {
      clearSelectedSpot();
    }
  }
});

scratchSurface.addEventListener("pointermove", (event) => {
  if (state.displayMode !== "scratch") return;
  event.preventDefault();
  scratchController.moveFromPointerEvent(event);
});

scratchSurface.addEventListener("pointerup", (event) => {
  if (!scratchController.isActive()) return;
  if (scratchSurface.hasPointerCapture(event.pointerId)) {
    scratchSurface.releasePointerCapture(event.pointerId);
  }
  scratchController.end();
});

scratchSurface.addEventListener("pointercancel", (event) => {
  if (!scratchController.isActive()) return;
  if (scratchSurface.hasPointerCapture(event.pointerId)) {
    scratchSurface.releasePointerCapture(event.pointerId);
  }
  scratchController.end();
});

document.addEventListener("click", (event) => {
  const target = event.target as Node | null;
  if (!target) return;
  if (state.openLanguageSwitcherId && !languageSwitchers.some((switcher) => switcher.root.contains(target))) {
    state.openLanguageSwitcherId = null;
    renderLanguageUI();
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && state.isDiaryNotebookOpen) {
    closeDiaryNotebook();
    return;
  }

  if (event.key === "Escape" && state.openLanguageSwitcherId) {
    state.openLanguageSwitcherId = null;
    renderLanguageUI();
  }
});

initMarkers();
initGeoJson().then(() => {
  render();
  requestAnimationFrame(() => {
    map.invalidateSize();
    const sizeChanged = syncCustomPaneBounds();
    if (sizeChanged && state.displayMode === "scratch") {
      scratchController.redraw();
    }
    clampMagnifierPoint();
    setMapToTownCenter();
    applyPaneVisibility();
  });
});

window.addEventListener("resize", () => {
  syncBottomOverlayLayout();
  const sizeChanged = syncCustomPaneBounds();
  if (sizeChanged && state.displayMode === "scratch") {
    scratchController.redraw();
  }
  clampMagnifierPoint();
  applyPaneVisibility();
});

map.on("move resize", () => {
  const sizeChanged = syncCustomPaneBounds();
  if (sizeChanged && state.displayMode === "scratch") {
    scratchController.redraw();
  }
  clampMagnifierPoint();
  applyPaneVisibility();
});
