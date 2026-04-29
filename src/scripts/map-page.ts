import L from "leaflet";
import type { Spot } from "../data/spots";
import type { ThemeByMode, UiCopy } from "../data/site";
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
type ThemeMode = keyof ThemeByMode;
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
const languageMenuTrigger = requiredElement<HTMLButtonElement>("[data-language-menu-trigger]");
const languageMenu = requiredElement<HTMLElement>("[data-language-menu]");
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
const scratchGroup = requiredElement<HTMLElement>("[data-scratch-group]");
const scratchResetButton = requiredElement<HTMLButtonElement>("[data-scratch-reset]");
const floatingSheet = requiredElement<HTMLElement>(".sheet-host--floating");

const spotCard = requiredElement<HTMLElement>("[data-spot-card]");
const spotVisual = requiredElement<HTMLElement>("[data-spot-visual]");
const spotMeta = requiredElement<HTMLElement>("[data-spot-meta]");
const spotCategory = requiredElement<HTMLElement>("[data-spot-category]");
const spotRoute = requiredElement<HTMLElement>("[data-spot-route]");
const spotTitle = requiredElement<HTMLElement>("[data-spot-title]");
const spotDescription = requiredElement<HTMLElement>("[data-spot-description]");
const spotDetailLabel = requiredElement<HTMLElement>("[data-spot-detail-label]");
const spotEmpty = requiredElement<HTMLElement>("[data-spot-empty]");
const spotEmptyTitle = requiredElement<HTMLElement>("[data-spot-empty-title]");
const spotEmptyHint = requiredElement<HTMLElement>("[data-spot-empty-hint]");
const backHomeButton = requiredElement<HTMLButtonElement>("[data-back-home-link]");
const mapAttributionText = requiredElement<HTMLElement>(".map-attribution span");
const displayModeGroup = requiredElement<HTMLElement>("[data-display-mode-group]");
const timeModeButtons = Array.from(document.querySelectorAll<HTMLElement>("[data-time-mode]"));
const displayModeButtons = Array.from(document.querySelectorAll<HTMLElement>("[data-display-mode]"));
const languageOptionButtons = Array.from(document.querySelectorAll<HTMLElement>("[data-language-option]"));

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

const state: {
  locale: Locale;
  displayMode: DisplayMode;
  timeMode: TimeMode;
  splitRatio: number;
  selectedSpotId: string | null;
  selectedSpotMode: TimeMode | null;
  isLanguageMenuOpen: boolean;
  isDraggingSplit: boolean;
  hasMagnifierPoint: boolean;
  magnifierPoint: MapPoint;
  clockHour: number;
  isDraggingClock: boolean;
  isExpanded: boolean;
} = {
  locale: "ja",
  displayMode: "single",
  timeMode: getInitialTimeMode(),
  splitRatio: 0.5,
  selectedSpotId: null,
  selectedSpotMode: null,
  isLanguageMenuOpen: false,
  isDraggingSplit: false,
  hasMagnifierPoint: false,
  magnifierPoint: { x: 0, y: 0 },
  clockHour: 12,
  isDraggingClock: false,
  isExpanded: window.location.hash === "#map",
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
const geoJsonLayers: Partial<Record<TimeMode, L.GeoJSON>> = {};
let dataBounds: L.LatLngBounds | null = null;
let transitionCleanupTimer: number | null = null;
const mapTransitionDuration = 720;
const townCenter = L.latLng(42.9650, 141.16615);
const townZoomDesktop = 15.5;
const townZoomMobile = 15.25;

const getSelectedSpot = () => spots.find((spot) => spot.id === state.selectedSpotId) ?? null;

const isMarkerModeVisibleAtPoint = (mode: TimeMode, point: MapPoint) => {
  if (state.displayMode === "single") return mode === state.timeMode;

  if (state.displayMode === "compare") {
    const { width } = mapElement.getBoundingClientRect();
    const splitX = width * state.splitRatio;
    return mode === "day" ? point.x <= splitX : point.x >= splitX;
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
    if (!map.hasLayer(marker) || !isMarkerModeVisibleAtPoint(mode, point)) return;

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
  state.selectedSpotId = entry.spot.id;
  state.selectedSpotMode = entry.mode;
  render();
  return true;
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

const createMarker = (spot: Spot, mode: TimeMode) => {
  const marker = L.marker(spot.coordinates, {
    pane: mode === "day" ? "day-marker-pane" : "night-marker-pane",
    icon: L.divIcon({
      className: "time-pin-wrapper",
      html: createPinHtml(spot, mode),
      iconSize: [36, 36],
      iconAnchor: [18, 18],
    }),
  });

  marker.on("click", () => {
    state.selectedSpotId = spot.id;
    state.selectedSpotMode = mode;
    render();
  });

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
  const splitX = mapRect.width * state.splitRatio;
  const clipPathForPane = (pane: HTMLElement, side: "left" | "right") => {
    const paneRect = pane.getBoundingClientRect();
    const dividerWithinPane = clamp(mapRect.left - paneRect.left + splitX, 0, paneRect.width);
    if (side === "left") {
      const rightInset = Math.max(0, paneRect.width - dividerWithinPane);
      return `inset(0px ${rightInset}px 0px 0px)`;
    }
    return `inset(0px 0px 0px ${dividerWithinPane}px)`;
  };

  setPaneState(paneByMode.day.geo, { visible: true, clipPath: clipPathForPane(paneByMode.day.geo, "left") });
  setPaneState(paneByMode.day.marker, { visible: true, clipPath: clipPathForPane(paneByMode.day.marker, "left") });
  setPaneState(paneByMode.night.geo, { visible: true, clipPath: clipPathForPane(paneByMode.night.geo, "right") });
  setPaneState(paneByMode.night.marker, { visible: true, clipPath: clipPathForPane(paneByMode.night.marker, "right") });
};

const updateMarkerVisibility = () => {
  markerEntries.forEach(({ marker, spot, mode }) => {
    const shouldShow = state.displayMode === "single" ? mode === state.timeMode : true;

    if (shouldShow && !map.hasLayer(marker)) {
      marker.addTo(map);
    }

    if (!shouldShow && map.hasLayer(marker)) {
      map.removeLayer(marker);
    }

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
};

const updateLanguageMenu = () => {
  languageMenu.hidden = !state.isExpanded || !state.isLanguageMenuOpen;
  languageMenu.classList.toggle("is-open", state.isLanguageMenuOpen);
  languageMenuTrigger.setAttribute("aria-expanded", String(state.isLanguageMenuOpen));
};

const renderCard = () => {
  const ui = uiCopy[state.locale];
  const spot = getSelectedSpot();

  if (!spot) {
    spotCard.classList.add("is-empty-sheet");
    spotCard.classList.remove("is-selected-sheet");
    spotVisual.hidden = true;
    spotMeta.hidden = true;
    spotTitle.hidden = true;
    spotDescription.hidden = true;
    spotDetailLabel.hidden = true;
    spotEmpty.hidden = false;
    spotEmptyTitle.textContent = ui.cardEmptyTitle;
    spotEmptyHint.textContent = ui.cardEmptyHint;
    return;
  }

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
  spotEmpty.hidden = true;
  spotVisual.classList.remove(...placeholderClasses);
  spotVisual.classList.add(`placeholder-${spot.image.placeholderVariant}`);
  spotCategory.textContent = `${ui.categoryLabel}: ${spot.category[state.locale]}`;
  spotRoute.textContent = `${ui.routeHint}: ${activeTimeLabel}`;
  spotTitle.textContent = spot.name[state.locale];
  spotDescription.textContent = spot.description[state.locale];
  spotDetailLabel.textContent = ui.detailsLabel;
};

const updateCompareUI = () => {
  const splitPercent = `${state.splitRatio * 100}%`;
  const clockTimeText = formatClockHour(state.clockHour);
  const clockAngle = state.clockHour * 15;
  const clockNightRatio = nightRatioForHour(state.clockHour);
  root.style.setProperty("--compare-split", splitPercent);
  root.style.setProperty("--clock-night-ratio", String(clockNightRatio));
  splitDivider.style.left = splitPercent;
  splitHandle.setAttribute("aria-valuenow", String(Math.round(state.splitRatio * 100)));
  splitHandle.setAttribute("aria-valuetext", `${Math.round(state.splitRatio * 100)}%`);
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
  scratchGroup.classList.toggle("is-expanded", isScratch);
  scratchResetButton.setAttribute("aria-hidden", String(!isScratch));
  scratchResetButton.tabIndex = isScratch ? 0 : -1;
  const isSingle = state.displayMode === "single";
  controlShell.classList.toggle("is-compare", state.displayMode === "compare");
  controlShell.classList.toggle("is-magnifier", state.displayMode === "magnifier");
  controlShell.classList.toggle("is-clock", state.displayMode === "clock");
  controlShell.classList.toggle("is-scratch", isScratch);
  timeToggleGroup.setAttribute("aria-hidden", String(!isSingle));
};

const renderStaticText = () => {
  const ui = uiCopy[state.locale];
  document.title = state.isExpanded ? `${ui.siteTitle} | ${ui.mapPageTitle}` : `${ui.siteTitle} | ${ui.siteTagline}`;
  backHomeButton.setAttribute("aria-label", ui.backHome);
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
  languageMenuTrigger.setAttribute("aria-label", ui.languageLabel);
  languageMenu.setAttribute("aria-label", ui.languageLabel);
  scratchResetButton.setAttribute("aria-label", ui.scratchResetLabel);
  scratchResetButton.setAttribute("title", ui.scratchResetLabel);
};

const applyTheme = () => {
  root.classList.remove(
    themeByMode.day.className,
    themeByMode.night.className,
    themeByMode.compare.className,
    themeByMode.scratch.className,
  );
  const themeKey: ThemeMode =
    state.displayMode === "compare"
      ? "compare"
      : state.displayMode === "scratch"
        ? "scratch"
        : state.timeMode;
  root.classList.add(themeByMode[themeKey].className);
  root.style.setProperty("--theme-glow", themeByMode[themeKey].glow);
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
  updateLanguageMenu();
  renderStaticText();
  updateCompareUI();
  applyTheme();
  applyScratchState();
  applyPaneVisibility();
  updateMarkerVisibility();
  renderCard();
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
  const isMobile = window.innerWidth < 768;
  const sheetRect = state.isExpanded ? floatingSheet.getBoundingClientRect() : new DOMRect(0, 0, 0, 0);

  return {
    paddingTopLeft: [
      state.isExpanded ? (isMobile ? 24 : 92) : 28,
      state.isExpanded ? (isMobile ? 92 : 56) : 28,
    ] as [number, number],
    paddingBottomRight: [
      state.isExpanded ? 32 : 28,
      state.isExpanded ? (isMobile ? Math.round(sheetRect.height + 44) : Math.round(sheetRect.height + 36)) : 28,
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
  state.isLanguageMenuOpen = false;

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

const setSplitRatioFromPointer = (clientX: number) => {
  const bounds = mapElement.getBoundingClientRect();
  const nextRatio = clamp((clientX - bounds.left) / bounds.width, 0.1, 0.9);
  state.splitRatio = nextRatio;
  applyPaneVisibility();
  updateCompareUI();
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

  (["day", "night"] as TimeMode[]).forEach((mode) => {
    const layer = L.geoJSON(data, {
      filter: (feature: GeoJSON.Feature | undefined) => {
        const category = featureCategory(feature);
        return Boolean(category) && feature?.geometry?.type !== "Point";
      },
      style: (feature: GeoJSON.Feature | undefined) => layerStyleForMode(mode, feature),
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

magnifierOverlay.addEventListener("pointerdown", (event) => {
  if (state.displayMode !== "magnifier") return;
  event.preventDefault();
  magnifierOverlay.setPointerCapture(event.pointerId);
  setMagnifierPointFromPointer(event.clientX, event.clientY);
  selectVisibleMarkerFromPointer(event.clientX, event.clientY);
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

languageOptionButtons.forEach((button) => {
  button.addEventListener("click", () => {
    state.locale = button.dataset.locale as Locale;
    state.isLanguageMenuOpen = false;
    render();
  });
});

languageMenuTrigger.addEventListener("click", (event) => {
  event.stopPropagation();
  state.isLanguageMenuOpen = !state.isLanguageMenuOpen;
  render();
});

languageMenu.addEventListener("click", (event) => {
  event.stopPropagation();
});

splitHandle.addEventListener("pointerdown", (event) => {
  if (state.displayMode !== "compare") return;
  state.isDraggingSplit = true;
  splitHandle.setPointerCapture(event.pointerId);
  setSplitRatioFromPointer(event.clientX);
});

splitHandle.addEventListener("pointermove", (event) => {
  if (!state.isDraggingSplit) return;
  setSplitRatioFromPointer(event.clientX);
});

splitHandle.addEventListener("pointerup", (event) => {
  state.isDraggingSplit = false;
  if (splitHandle.hasPointerCapture(event.pointerId)) {
    splitHandle.releasePointerCapture(event.pointerId);
  }
});

splitHandle.addEventListener("pointercancel", (event) => {
  state.isDraggingSplit = false;
  if (splitHandle.hasPointerCapture(event.pointerId)) {
    splitHandle.releasePointerCapture(event.pointerId);
  }
});

splitHandle.addEventListener("keydown", (event) => {
  if (state.displayMode !== "compare") return;
  if (event.key === "ArrowLeft") {
    event.preventDefault();
    state.splitRatio = clamp(state.splitRatio - 0.02, 0.1, 0.9);
    applyPaneVisibility();
    updateCompareUI();
  }
  if (event.key === "ArrowRight") {
    event.preventDefault();
    state.splitRatio = clamp(state.splitRatio + 0.02, 0.1, 0.9);
    applyPaneVisibility();
    updateCompareUI();
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
    selectVisibleMarkerFromPointer(event.clientX, event.clientY);
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
  if (state.isLanguageMenuOpen && !languageMenu.contains(target) && !languageMenuTrigger.contains(target)) {
    state.isLanguageMenuOpen = false;
    render();
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && state.isLanguageMenuOpen) {
    state.isLanguageMenuOpen = false;
    render();
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
  const sizeChanged = syncCustomPaneBounds();
  if (sizeChanged && state.displayMode === "scratch") {
    scratchController.redraw();
  }
  clampMagnifierPoint();
  applyPaneVisibility();
});

map.on("move zoom resize", () => {
  const sizeChanged = syncCustomPaneBounds();
  if (sizeChanged && state.displayMode === "scratch") {
    scratchController.redraw();
  }
  clampMagnifierPoint();
  applyPaneVisibility();
});
