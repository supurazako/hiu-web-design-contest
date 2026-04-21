import L from "leaflet";

type TimeMode = "day" | "night";
type DisplayMode = "single" | "compare" | "scratch";
type Locale = "ja" | "en";
type Spot = (typeof spots)[number];
type MarkerEntry = {
  marker: L.Marker;
  spot: Spot;
  mode: TimeMode;
};
type ScratchPoint = { x: number; y: number };

const spots = JSON.parse(document.getElementById("spots-data")!.textContent!) as Spot[];
const uiCopy = JSON.parse(document.getElementById("ui-data")!.textContent!);
const themeByMode = JSON.parse(document.getElementById("theme-data")!.textContent!);

const root = document.querySelector(".map-shell") as HTMLElement;
const mapElement = document.getElementById("map") as HTMLElement;
const languageMenuTrigger = document.querySelector("[data-language-menu-trigger]") as HTMLButtonElement;
const languageMenu = document.querySelector("[data-language-menu]") as HTMLElement;
const controlShell = document.querySelector("[data-control-shell]") as HTMLElement;
const timeToggleGroup = document.querySelector("[data-time-toggle-group]") as HTMLElement;
const compareOverlay = document.querySelector("[data-compare-overlay]") as HTMLElement;
const splitDivider = document.querySelector("[data-split-divider]") as HTMLElement;
const splitHandle = document.querySelector("[data-split-handle]") as HTMLButtonElement;
const scratchSurface = document.querySelector("[data-scratch-surface]") as HTMLCanvasElement;
const scratchGroup = document.querySelector("[data-scratch-group]") as HTMLElement;
const scratchResetButton = document.querySelector("[data-scratch-reset]") as HTMLButtonElement;
const floatingSheet = document.querySelector(".sheet-host--floating") as HTMLElement;

const spotCard = document.querySelector("[data-spot-card]") as HTMLElement;
const spotVisual = document.querySelector("[data-spot-visual]") as HTMLElement;
const spotMeta = document.querySelector("[data-spot-meta]") as HTMLElement;
const spotCategory = document.querySelector("[data-spot-category]") as HTMLElement;
const spotRoute = document.querySelector("[data-spot-route]") as HTMLElement;
const spotTitle = document.querySelector("[data-spot-title]") as HTMLElement;
const spotDescription = document.querySelector("[data-spot-description]") as HTMLElement;
const spotDetailLabel = document.querySelector("[data-spot-detail-label]") as HTMLElement;
const spotEmpty = document.querySelector("[data-spot-empty]") as HTMLElement;
const spotEmptyTitle = document.querySelector("[data-spot-empty-title]") as HTMLElement;
const spotEmptyHint = document.querySelector("[data-spot-empty-hint]") as HTMLElement;

const placeholderClasses = ["placeholder-river", "placeholder-steam", "placeholder-forest", "placeholder-light"];

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const getInitialTimeMode = (): TimeMode => {
  const hour = new Date().getHours();
  return hour >= 6 && hour < 18 ? "day" : "night";
};

const state: {
  locale: Locale;
  displayMode: DisplayMode;
  timeMode: TimeMode;
  splitRatio: number;
  selectedSpotId: string | null;
  selectedSpotMode: TimeMode | null;
  isLanguageMenuOpen: boolean;
  isDraggingSplit: boolean;
  isScratching: boolean;
  scratchLastPoint: ScratchPoint | null;
} = {
  locale: "ja",
  displayMode: "single",
  timeMode: getInitialTimeMode(),
  splitRatio: 0.5,
  selectedSpotId: null,
  selectedSpotMode: null,
  isLanguageMenuOpen: false,
  isDraggingSplit: false,
  isScratching: false,
  scratchLastPoint: null,
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

paneByMode.day.geo.style.zIndex = "340";
paneByMode.night.geo.style.zIndex = "341";
paneByMode.day.marker.style.zIndex = "620";
paneByMode.night.marker.style.zIndex = "621";

const customPanes = [paneByMode.day.geo, paneByMode.night.geo, paneByMode.day.marker, paneByMode.night.marker];
const scratchContext = scratchSurface.getContext("2d");
const scratchBrushRadius = 48;

const syncCustomPaneBounds = () => {
  const { width, height } = mapElement.getBoundingClientRect();
  customPanes.forEach((pane) => {
    pane.style.width = `${Math.round(width)}px`;
    pane.style.height = `${Math.round(height)}px`;
    pane.style.left = "0";
    pane.style.top = "0";
  });
  const pixelRatio = window.devicePixelRatio || 1;
  scratchSurface.width = Math.round(width * pixelRatio);
  scratchSurface.height = Math.round(height * pixelRatio);
  scratchSurface.style.width = `${Math.round(width)}px`;
  scratchSurface.style.height = `${Math.round(height)}px`;
  if (scratchContext) {
    scratchContext.setTransform(1, 0, 0, 1, 0, 0);
    scratchContext.scale(pixelRatio, pixelRatio);
  }
};

syncCustomPaneBounds();

const paintScratchOverlay = () => {
  if (!scratchContext) return;
  const { width, height } = mapElement.getBoundingClientRect();
  scratchContext.globalCompositeOperation = "source-over";
  scratchContext.clearRect(0, 0, width, height);

  const gradient = scratchContext.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, "rgba(255, 248, 241, 0.98)");
  gradient.addColorStop(1, "rgba(244, 236, 224, 0.96)");
  scratchContext.fillStyle = gradient;
  scratchContext.fillRect(0, 0, width, height);

  const glow = scratchContext.createRadialGradient(width * 0.18, height * 0.2, 0, width * 0.18, height * 0.2, width * 0.28);
  glow.addColorStop(0, "rgba(255, 226, 171, 0.26)");
  glow.addColorStop(1, "rgba(255, 226, 171, 0)");
  scratchContext.fillStyle = glow;
  scratchContext.fillRect(0, 0, width, height);
};

const resetScratch = () => {
  state.scratchLastPoint = null;
  state.isScratching = false;
  paintScratchOverlay();
};

const eraseScratchAtPoint = (point: ScratchPoint) => {
  if (!scratchContext) return;
  scratchContext.globalCompositeOperation = "destination-out";
  scratchContext.lineCap = "round";
  scratchContext.lineJoin = "round";
  scratchContext.lineWidth = scratchBrushRadius * 2;
  scratchContext.strokeStyle = "rgba(0, 0, 0, 1)";

  if (!state.scratchLastPoint) {
    scratchContext.beginPath();
    scratchContext.arc(point.x, point.y, scratchBrushRadius, 0, Math.PI * 2);
    scratchContext.fill();
  } else {
    scratchContext.beginPath();
    scratchContext.moveTo(state.scratchLastPoint.x, state.scratchLastPoint.y);
    scratchContext.lineTo(point.x, point.y);
    scratchContext.stroke();
  }

  state.scratchLastPoint = point;
};

const geoRendererByMode = {
  day: L.svg({ pane: "day-geojson-pane" }),
  night: L.svg({ pane: "night-geojson-pane" }),
} as const;

const markerEntries = new Map<string, MarkerEntry>();
const geoJsonLayers: Partial<Record<TimeMode, L.GeoJSON>> = {};

const geoJsonStyles = {
  day: {
    building: {
      color: "#d9cbbd",
      weight: 1,
      fillColor: "#f3e6d6",
      fillOpacity: 0.85,
    },
    waterway: {
      color: "#6fb7e9",
      weight: 3,
      opacity: 0.9,
    },
    highway: {
      color: "#ffffff",
      weight: 3,
      opacity: 0.95,
    },
    highwaySecondary: {
      color: "#ecd8b8",
      weight: 2.2,
      opacity: 0.9,
    },
  },
  night: {
    building: {
      color: "#364454",
      weight: 1,
      fillColor: "#263241",
      fillOpacity: 0.72,
    },
    waterway: {
      color: "#7ac8ff",
      weight: 2.6,
      opacity: 0.92,
    },
    highway: {
      color: "#d6e7ff",
      weight: 2.6,
      opacity: 0.85,
    },
    highwaySecondary: {
      color: "#6d8198",
      weight: 1.8,
      opacity: 0.82,
    },
  },
} as const;

const featureCategory = (feature: any) => {
  const props = feature.properties || {};
  if (props.waterway) return "waterway";
  if (props.building) return "building";
  if (props.highway) {
    if (["primary", "secondary", "tertiary", "residential", "service"].includes(props.highway)) {
      return "highway";
    }
    if (["footway", "path", "track", "steps"].includes(props.highway)) {
      return "highwaySecondary";
    }
  }
  return null;
};

const layerStyleForMode = (mode: TimeMode, feature: any) => {
  const category = featureCategory(feature);
  if (!category) {
    return {
      color: "transparent",
      weight: 0,
      fillOpacity: 0,
      opacity: 0,
    };
  }
  return geoJsonStyles[mode][category];
};

const isSpotVisibleForMode = (spot: Spot, mode: TimeMode) => spot.timeMode === "both" || spot.timeMode === mode;

const getSelectedSpot = () => spots.find((spot) => spot.id === state.selectedSpotId) ?? null;

const createMarker = (spot: Spot, mode: TimeMode) => {
  const marker = L.marker(spot.coordinates, {
    pane: mode === "day" ? "day-marker-pane" : "night-marker-pane",
    icon: L.divIcon({
      className: "time-pin-wrapper",
      html: `<span class="time-pin time-pin--${mode}" style="--pin-color: ${spot.accent}"><span></span></span>`,
      iconSize: [28, 28],
      iconAnchor: [14, 14],
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

const setPaneState = (pane: HTMLElement, options: { visible: boolean; clipPath: string }) => {
  pane.style.opacity = options.visible ? "1" : "0";
  pane.style.visibility = options.visible ? "visible" : "hidden";
  pane.style.clipPath = options.visible ? options.clipPath : "none";
};

const applyPaneVisibility = () => {
  if (state.displayMode === "single") {
    const activeMode = state.timeMode;
    const inactiveMode: TimeMode = activeMode === "day" ? "night" : "day";
    setPaneState(paneByMode[activeMode].geo, { visible: true, clipPath: "none" });
    setPaneState(paneByMode[activeMode].marker, { visible: true, clipPath: "none" });
    setPaneState(paneByMode[inactiveMode].geo, { visible: false, clipPath: "none" });
    setPaneState(paneByMode[inactiveMode].marker, { visible: false, clipPath: "none" });
    return;
  }

  if (state.displayMode === "scratch") {
    setPaneState(paneByMode.day.geo, { visible: true, clipPath: "none" });
    setPaneState(paneByMode.day.marker, { visible: true, clipPath: "none" });
    setPaneState(paneByMode.night.geo, { visible: true, clipPath: "none" });
    setPaneState(paneByMode.night.marker, { visible: true, clipPath: "none" });
    return;
  }

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
  document.querySelectorAll<HTMLElement>("[data-time-mode]").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.timeMode === state.timeMode);
  });
  document.querySelectorAll<HTMLElement>("[data-display-mode]").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.displayMode === state.displayMode);
  });
  document.querySelectorAll<HTMLElement>("[data-language-option]").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.locale === state.locale);
  });
};

const updateLanguageMenu = () => {
  languageMenu.hidden = !state.isLanguageMenuOpen;
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
  root.style.setProperty("--compare-split", splitPercent);
  splitDivider.style.left = splitPercent;
  splitHandle.setAttribute("aria-valuenow", String(Math.round(state.splitRatio * 100)));
  splitHandle.setAttribute("aria-valuetext", `${Math.round(state.splitRatio * 100)}%`);
  compareOverlay.hidden = state.displayMode !== "compare";
  const isScratch = state.displayMode === "scratch";
  scratchGroup.classList.toggle("is-expanded", isScratch);
  scratchResetButton.setAttribute("aria-hidden", String(!isScratch));
  scratchResetButton.tabIndex = isScratch ? 0 : -1;
  const isSingle = state.displayMode === "single";
  controlShell.classList.toggle("is-compare", state.displayMode === "compare");
  controlShell.classList.toggle("is-scratch", isScratch);
  timeToggleGroup.setAttribute("aria-hidden", String(!isSingle));
};

const renderStaticText = () => {
  const ui = uiCopy[state.locale];
  document.title = `${ui.siteTitle} | ${ui.mapPageTitle}`;
  (document.querySelector("[data-back-home-link]") as HTMLElement).setAttribute("aria-label", ui.backHome);
  (document.querySelector('[data-time-mode="day"]') as HTMLElement).setAttribute("aria-label", ui.dayLabel);
  (document.querySelector('[data-time-mode="day"]') as HTMLElement).setAttribute("title", ui.dayLabel);
  (document.querySelector('[data-time-mode="night"]') as HTMLElement).setAttribute("aria-label", ui.nightLabel);
  (document.querySelector('[data-time-mode="night"]') as HTMLElement).setAttribute("title", ui.nightLabel);
  (document.querySelector(".map-attribution span") as HTMLElement).textContent = ui.mapDataAttribution;
  (document.querySelector("[data-display-mode-group]") as HTMLElement).setAttribute("aria-label", ui.displayModeLabel);
  (document.querySelector('[data-display-mode="single"]') as HTMLElement).setAttribute("aria-label", ui.singleModeLabel);
  (document.querySelector('[data-display-mode="single"]') as HTMLElement).setAttribute("title", ui.singleModeLabel);
  (document.querySelector('[data-display-mode="compare"]') as HTMLElement).setAttribute("aria-label", ui.compareModeLabel);
  (document.querySelector('[data-display-mode="compare"]') as HTMLElement).setAttribute("title", ui.compareModeLabel);
  (document.querySelector('[data-display-mode="scratch"]') as HTMLElement).setAttribute("aria-label", ui.scratchModeLabel);
  (document.querySelector('[data-display-mode="scratch"]') as HTMLElement).setAttribute("title", ui.scratchModeLabel);
  splitHandle.setAttribute("aria-label", ui.compareHandleLabel);
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
  const themeKey = state.displayMode === "compare" ? "compare" : state.displayMode === "scratch" ? "scratch" : state.timeMode;
  root.classList.add(themeByMode[themeKey].className);
  root.style.setProperty("--theme-glow", themeByMode[themeKey].glow);
};

const applyScratchState = () => {
  const isScratch = state.displayMode === "scratch";
  scratchSurface.hidden = !isScratch;
  root.classList.toggle("is-scratch-active", isScratch);
  mapElement.style.pointerEvents = isScratch ? "none" : "auto";

  paneByMode.day.geo.style.zIndex = "340";
  paneByMode.night.geo.style.zIndex = "341";
  paneByMode.day.marker.style.zIndex = "620";
  paneByMode.night.marker.style.zIndex = "621";

  if (!isScratch) {
    map.dragging.enable();
    map.touchZoom.enable();
    map.doubleClickZoom.enable();
    map.boxZoom.disable();
  } else {
    map.dragging.disable();
    map.touchZoom.disable();
    map.doubleClickZoom.disable();
    map.boxZoom.disable();
    paintScratchOverlay();
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

const setSplitRatioFromPointer = (clientX: number) => {
  const bounds = mapElement.getBoundingClientRect();
  const nextRatio = clamp((clientX - bounds.left) / bounds.width, 0.1, 0.9);
  state.splitRatio = nextRatio;
  applyPaneVisibility();
  updateCompareUI();
};

const getScratchPointFromPointer = (clientX: number, clientY: number): ScratchPoint | null => {
  const bounds = mapElement.getBoundingClientRect();
  if (clientX < bounds.left || clientX > bounds.right || clientY < bounds.top || clientY > bounds.bottom) {
    return null;
  }
  return {
    x: clientX - bounds.left,
    y: clientY - bounds.top,
  };
};

const beginScratch = (clientX: number, clientY: number) => {
  const point = getScratchPointFromPointer(clientX, clientY);
  if (!point) return;
  state.isScratching = true;
  state.scratchLastPoint = null;
  eraseScratchAtPoint(point);
};

const moveScratch = (clientX: number, clientY: number) => {
  if (!state.isScratching) return;
  const point = getScratchPointFromPointer(clientX, clientY);
  if (!point) {
    state.scratchLastPoint = null;
    return;
  }
  eraseScratchAtPoint(point);
};

const endScratch = () => {
  state.isScratching = false;
  state.scratchLastPoint = null;
};

const getFitBoundsPadding = () => {
  const isMobile = window.innerWidth < 768;
  const sheetRect = floatingSheet.getBoundingClientRect();

  return {
    paddingTopLeft: [
      isMobile ? 24 : 92,
      isMobile ? 92 : 56,
    ] as L.PointExpression,
    paddingBottomRight: [
      32,
      isMobile ? Math.round(sheetRect.height + 44) : Math.round(sheetRect.height + 36),
    ] as L.PointExpression,
  };
};

const initGeoJson = async () => {
  const response = await fetch("/geodata/map.geojson");
  const data = await response.json();

  (["day", "night"] as TimeMode[]).forEach((mode) => {
    const layer = L.geoJSON(data, {
      filter: (feature) => {
        const category = featureCategory(feature);
        return Boolean(category) && feature.geometry?.type !== "Point";
      },
      style: (feature) => layerStyleForMode(mode, feature),
      interactive: false,
      pane: mode === "day" ? "day-geojson-pane" : "night-geojson-pane",
      renderer: geoRendererByMode[mode],
    }).addTo(map);
    geoJsonLayers[mode] = layer;
  });

  const dataBounds = geoJsonLayers.day?.getBounds();
  if (dataBounds?.isValid()) {
    map.fitBounds(dataBounds.pad(0.08), getFitBoundsPadding());
    map.setMaxBounds(dataBounds.pad(0.2));
  }
};

document.querySelectorAll<HTMLElement>("[data-time-mode]").forEach((button) => {
  button.addEventListener("click", () => {
    state.timeMode = button.dataset.timeMode as TimeMode;
    render();
  });
});

document.querySelectorAll<HTMLElement>("[data-display-mode]").forEach((button) => {
  button.addEventListener("click", () => {
    const nextMode = button.dataset.displayMode as DisplayMode;
    if (nextMode === "scratch" && state.displayMode !== "scratch") {
      resetScratch();
      state.timeMode = "day";
      state.selectedSpotMode = state.selectedSpotMode ?? "day";
    }
    if (state.displayMode === "scratch" && nextMode !== "scratch") {
      resetScratch();
    }
    state.displayMode = nextMode;
    render();
  });
});

document.querySelectorAll<HTMLElement>("[data-language-option]").forEach((button) => {
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
  resetScratch();
  render();
});

scratchSurface.addEventListener("pointerdown", (event) => {
  if (state.displayMode !== "scratch") return;
  event.preventDefault();
  scratchSurface.setPointerCapture(event.pointerId);
  beginScratch(event.clientX, event.clientY);
});

scratchSurface.addEventListener("pointermove", (event) => {
  if (state.displayMode !== "scratch") return;
  moveScratch(event.clientX, event.clientY);
});

scratchSurface.addEventListener("pointerup", (event) => {
  if (!state.isScratching) return;
  if (scratchSurface.hasPointerCapture(event.pointerId)) {
    scratchSurface.releasePointerCapture(event.pointerId);
  }
  endScratch();
});

scratchSurface.addEventListener("pointercancel", (event) => {
  if (!state.isScratching) return;
  if (scratchSurface.hasPointerCapture(event.pointerId)) {
    scratchSurface.releasePointerCapture(event.pointerId);
  }
  endScratch();
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
    syncCustomPaneBounds();
    applyPaneVisibility();
  });
});

window.addEventListener("resize", () => {
  syncCustomPaneBounds();
  if (state.displayMode === "scratch") {
    paintScratchOverlay();
  }
  applyPaneVisibility();
});

map.on("move zoom resize", () => {
  syncCustomPaneBounds();
  applyPaneVisibility();
});
