import L from "leaflet";

type TimeMode = "day" | "night";

const spots = JSON.parse(document.getElementById("spots-data")!.textContent!);
const uiCopy = JSON.parse(document.getElementById("ui-data")!.textContent!);
const themeByMode = JSON.parse(document.getElementById("theme-data")!.textContent!);

const root = document.querySelector(".map-shell") as HTMLElement;
const mapElement = document.getElementById("map") as HTMLElement;
const cardElement = document.getElementById("spot-card") as HTMLElement;
const languageMenuTrigger = document.querySelector("[data-language-menu-trigger]") as HTMLButtonElement;
const languageMenu = document.querySelector("[data-language-menu]") as HTMLElement;

const state: {
  locale: "ja" | "en";
  mode: TimeMode;
  selectedSpotId: string | null;
  isLanguageMenuOpen: boolean;
} = {
  locale: "ja",
  mode: "day",
  selectedSpotId: null,
  isLanguageMenuOpen: false,
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

const markerMap = new Map<string, L.Marker>();
const geoJsonLayers: L.GeoJSON[] = [];

const isVisible = (spot: (typeof spots)[number]) => spot.timeMode === "both" || spot.timeMode === state.mode;

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

const layerStyle = (feature: any) => {
  const category = featureCategory(feature);
  if (!category) {
    return {
      color: "transparent",
      weight: 0,
      fillOpacity: 0,
      opacity: 0,
    };
  }
  return geoJsonStyles[state.mode][category];
};

const initGeoJson = async () => {
  const response = await fetch("/geodata/map.geojson");
  const data = await response.json();

  const baseLayer = L.geoJSON(data, {
    filter: (feature) => {
      const category = featureCategory(feature);
      return Boolean(category) && feature.geometry?.type !== "Point";
    },
    style: layerStyle,
    interactive: false,
    pane: "overlayPane",
  }).addTo(map);

  geoJsonLayers.push(baseLayer);
  const dataBounds = baseLayer.getBounds();
  if (dataBounds.isValid()) {
    map.fitBounds(dataBounds.pad(-0.45), { padding: [24, 24] });
    map.setMaxBounds(dataBounds.pad(0.2));
  }
};

const renderCard = () => {
  const ui = uiCopy[state.locale];
  const selectedSpot = spots.find((spot: (typeof spots)[number]) => spot.id === state.selectedSpotId && isVisible(spot));
  const modeLabel = {
    day: ui.dayLabel,
    night: ui.nightLabel,
    both: ui.bothLabel,
  };

  if (!selectedSpot) {
    cardElement.classList.add("is-empty-sheet");
    cardElement.classList.remove("is-selected-sheet");
    cardElement.innerHTML = `
      <div class="spot-card__body is-empty">
        <p class="spot-card__empty-title">${ui.cardEmptyTitle}</p>
        <p>${ui.cardEmptyHint}</p>
      </div>
    `;
    return;
  }

  cardElement.classList.remove("is-empty-sheet");
  cardElement.classList.add("is-selected-sheet");
  cardElement.innerHTML = `
    <div class="spot-card__visual placeholder-${selectedSpot.image.placeholderVariant}" aria-hidden="true">
      <div class="spot-card__visual-overlay"></div>
    </div>
    <div class="spot-card__body">
      <div class="spot-card__meta">
        <span class="spot-card__pill">${ui.categoryLabel}: ${selectedSpot.category[state.locale]}</span>
        <span class="spot-card__pill">${ui.routeHint}: ${modeLabel[selectedSpot.timeMode]}</span>
      </div>
      <h2>${selectedSpot.name[state.locale]}</h2>
      <p>${selectedSpot.description[state.locale]}</p>
      <p class="spot-card__detail-label">${ui.detailsLabel}</p>
    </div>
  `;
};

const updateButtons = () => {
  document.querySelectorAll<HTMLElement>("[data-mode]").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.mode === state.mode);
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

const renderMarkers = () => {
  spots.forEach((spot: (typeof spots)[number]) => {
    let marker = markerMap.get(spot.id);

    if (!marker) {
      marker = L.marker(spot.coordinates, {
        icon: L.divIcon({
          className: "time-pin-wrapper",
          html: `<button class="time-pin" type="button" style="--pin-color: ${spot.accent}"><span></span></button>`,
          iconSize: [28, 28],
          iconAnchor: [14, 14],
        }),
      });
      marker.on("click", () => {
        state.selectedSpotId = spot.id;
        map.flyTo(spot.coordinates, Math.max(map.getZoom(), 15), {
          duration: 0.7,
        });
        render();
      });
      markerMap.set(spot.id, marker);
    }

    const visible = isVisible(spot);
    const isSelected = state.selectedSpotId === spot.id;

    if (visible && !map.hasLayer(marker)) {
      marker.addTo(map);
    }

    if (!visible && map.hasLayer(marker)) {
      map.removeLayer(marker);
    }

    if (visible) {
      const element = marker.getElement();
      if (element) {
        element.querySelector(".time-pin")?.classList.toggle("is-selected", isSelected);
      }
    }
  });

  const selectedSpotStillVisible = spots.some(
    (spot: (typeof spots)[number]) => spot.id === state.selectedSpotId && isVisible(spot),
  );
  if (!selectedSpotStillVisible) {
    state.selectedSpotId = null;
  }
};

const renderStaticText = () => {
  const ui = uiCopy[state.locale];
  document.title = `${ui.siteTitle} | ${ui.mapPageTitle}`;
  (document.querySelector(".text-link") as HTMLElement).textContent = ui.backHome;
  (document.querySelector(".map-header .eyebrow") as HTMLElement).textContent = ui.siteTagline;
  (document.querySelector(".map-header h1") as HTMLElement).textContent = ui.mapOverlayTitle;
  (document.querySelector(".map-header__title p") as HTMLElement).textContent = ui.mapOverlayBody;
  (document.querySelector(".control-label") as HTMLElement).textContent = ui.timeLabel;
  (document.querySelector('[data-mode="day"]') as HTMLElement).textContent = ui.dayLabel;
  (document.querySelector('[data-mode="night"]') as HTMLElement).textContent = ui.nightLabel;
  (document.querySelector(".map-attribution span") as HTMLElement).textContent = ui.mapDataAttribution;
  languageMenuTrigger.setAttribute("aria-label", ui.languageLabel);
  languageMenu.setAttribute("aria-label", ui.languageLabel);
};

const applyTheme = () => {
  root.classList.remove(themeByMode.day.className, themeByMode.night.className);
  root.classList.add(themeByMode[state.mode].className);
  root.style.setProperty("--theme-glow", themeByMode[state.mode].glow);
  geoJsonLayers.forEach((layer) => {
    layer.setStyle(layerStyle);
  });
};

const render = () => {
  renderMarkers();
  updateButtons();
  updateLanguageMenu();
  renderStaticText();
  applyTheme();
  renderCard();
};

document.querySelectorAll<HTMLElement>("[data-mode]").forEach((button) => {
  button.addEventListener("click", () => {
    state.mode = button.dataset.mode as TimeMode;
    render();
  });
});

document.querySelectorAll<HTMLElement>("[data-language-option]").forEach((button) => {
  button.addEventListener("click", () => {
    state.locale = button.dataset.locale as "ja" | "en";
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

initGeoJson().then(render);
