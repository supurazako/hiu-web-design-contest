import { requiredElement, requiredElementById } from "./dom-utils";

export type LanguageSwitcherRefs = {
  id: string;
  root: HTMLElement;
  trigger: HTMLButtonElement;
  menu: HTMLElement;
  options: HTMLButtonElement[];
};

export type MapDomRefs = {
  root: HTMLElement;
  mapElement: HTMLElement;
  openMapLink: HTMLAnchorElement | null;
  controlCluster: HTMLElement;
  controlShell: HTMLElement;
  timeToggleGroup: HTMLElement;
  compareOverlay: HTMLElement;
  splitDivider: HTMLElement;
  splitHandle: HTMLButtonElement;
  magnifierOverlay: HTMLElement;
  clockPanel: HTMLElement;
  clockDial: HTMLButtonElement;
  clockHand: HTMLElement;
  clockTime: HTMLElement;
  scratchSurface: HTMLCanvasElement;
  singleGroup: HTMLElement;
  scratchGroup: HTMLElement;
  scratchResetButton: HTMLButtonElement;
  zoomControls: HTMLElement;
  zoomInButton: HTMLButtonElement;
  zoomOutButton: HTMLButtonElement;
  floatingSheet: HTMLElement;
  spotCard: HTMLElement;
  spotVisual: HTMLElement;
  spotTitle: HTMLElement;
  spotDescription: HTMLElement;
  spotDiary: HTMLElement;
  spotDiaryLabel: HTMLElement;
  spotDiaryTitle: HTMLElement;
  spotDiaryBody: HTMLElement;
  spotImage: HTMLImageElement;
  spotImageCredit: HTMLAnchorElement;
  spotEmpty: HTMLElement;
  spotEmptyTitle: HTMLElement;
  spotEmptyHint: HTMLElement;
  diaryToast: HTMLElement;
  diaryToastTitle: HTMLElement;
  diaryToastName: HTMLElement;
  diaryNotebookOpenButton: HTMLButtonElement;
  diaryNotebookModal: HTMLElement;
  diaryNotebookPanel: HTMLElement;
  diaryNotebookClose: HTMLButtonElement;
  diaryNotebookTitle: HTMLElement;
  backHomeButton: HTMLButtonElement;
  mapAttribution: HTMLElement;
  mapAttributionText: HTMLElement;
  displayModeGroup: HTMLElement;
  timeModeButtons: HTMLElement[];
  displayModeButtons: HTMLElement[];
  landingTitle: HTMLElement | null;
  landingLead: HTMLElement | null;
  landingCta: HTMLElement | null;
  conceptTitle: HTMLElement | null;
  conceptBody: HTMLElement | null;
  sectionsTitle: HTMLElement | null;
  diaryTitle: HTMLElement | null;
  diaryBody: HTMLElement | null;
  copyright: HTMLElement | null;
  sceneLabelDay: HTMLElement | null;
  sceneLabelNight: HTMLElement | null;
  sceneMoodDay: HTMLElement | null;
  sceneMoodNight: HTMLElement | null;
  metaDescription: HTMLMetaElement | null;
  ogTitle: HTMLMetaElement | null;
  ogDescription: HTMLMetaElement | null;
  twitterTitle: HTMLMetaElement | null;
  twitterDescription: HTMLMetaElement | null;
  languageSwitchers: LanguageSwitcherRefs[];
  languageOptionButtons: HTMLButtonElement[];
  timeModeButtonByMode: {
    day: HTMLElement;
    night: HTMLElement;
  };
  displayModeButtonByMode: {
    single: HTMLElement;
    compare: HTMLElement;
    magnifier: HTMLElement;
    clock: HTMLElement;
    scratch: HTMLElement;
  };
};

const getLanguageSwitchers = (): LanguageSwitcherRefs[] =>
  Array.from(
    document.querySelectorAll<HTMLElement>("[data-language-switcher]"),
  ).map((switcherRoot) => {
    const trigger = switcherRoot.querySelector<HTMLButtonElement>(
      "[data-language-menu-trigger]",
    );
    const menu = switcherRoot.querySelector<HTMLElement>(
      "[data-language-menu]",
    );
    const options = Array.from(
      switcherRoot.querySelectorAll<HTMLButtonElement>(
        "[data-language-option]",
      ),
    );
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

export const getMapDomRefs = (): MapDomRefs => {
  const languageSwitchers = getLanguageSwitchers();

  return {
    root: requiredElement<HTMLElement>("[data-map-shell]"),
    mapElement: requiredElementById<HTMLElement>("map"),
    openMapLink: document.querySelector(
      "[data-open-map]",
    ) as HTMLAnchorElement | null,
    controlCluster: requiredElement<HTMLElement>("[data-control-cluster]"),
    controlShell: requiredElement<HTMLElement>("[data-control-shell]"),
    timeToggleGroup: requiredElement<HTMLElement>("[data-time-toggle-group]"),
    compareOverlay: requiredElement<HTMLElement>("[data-compare-overlay]"),
    splitDivider: requiredElement<HTMLElement>("[data-split-divider]"),
    splitHandle: requiredElement<HTMLButtonElement>("[data-split-handle]"),
    magnifierOverlay: requiredElement<HTMLElement>("[data-magnifier-overlay]"),
    clockPanel: requiredElement<HTMLElement>("[data-clock-panel]"),
    clockDial: requiredElement<HTMLButtonElement>("[data-clock-dial]"),
    clockHand: requiredElement<HTMLElement>("[data-clock-hand]"),
    clockTime: requiredElement<HTMLElement>("[data-clock-time]"),
    scratchSurface: requiredElement<HTMLCanvasElement>(
      "[data-scratch-surface]",
    ),
    singleGroup: requiredElement<HTMLElement>("[data-single-group]"),
    scratchGroup: requiredElement<HTMLElement>("[data-scratch-group]"),
    scratchResetButton: requiredElement<HTMLButtonElement>(
      "[data-scratch-reset]",
    ),
    zoomControls: requiredElement<HTMLElement>("[data-zoom-controls]"),
    zoomInButton: requiredElement<HTMLButtonElement>("[data-zoom-in]"),
    zoomOutButton: requiredElement<HTMLButtonElement>("[data-zoom-out]"),
    floatingSheet: requiredElement<HTMLElement>(".sheet-host--floating"),
    spotCard: requiredElement<HTMLElement>("[data-spot-card]"),
    spotVisual: requiredElement<HTMLElement>("[data-spot-visual]"),
    spotTitle: requiredElement<HTMLElement>("[data-spot-title]"),
    spotDescription: requiredElement<HTMLElement>("[data-spot-description]"),
    spotDiary: requiredElement<HTMLElement>("[data-spot-diary]"),
    spotDiaryLabel: requiredElement<HTMLElement>("[data-spot-diary-label]"),
    spotDiaryTitle: requiredElement<HTMLElement>("[data-spot-diary-title]"),
    spotDiaryBody: requiredElement<HTMLElement>("[data-spot-diary-body]"),
    spotImage: requiredElement<HTMLImageElement>("[data-spot-image]"),
    spotImageCredit: requiredElement<HTMLAnchorElement>(
      "[data-spot-image-credit]",
    ),
    spotEmpty: requiredElement<HTMLElement>("[data-spot-empty]"),
    spotEmptyTitle: requiredElement<HTMLElement>("[data-spot-empty-title]"),
    spotEmptyHint: requiredElement<HTMLElement>("[data-spot-empty-hint]"),
    diaryToast: requiredElement<HTMLElement>("[data-diary-toast]"),
    diaryToastTitle: requiredElement<HTMLElement>("[data-diary-toast-title]"),
    diaryToastName: requiredElement<HTMLElement>("[data-diary-toast-name]"),
    diaryNotebookOpenButton: requiredElement<HTMLButtonElement>(
      "[data-map-diary-notebook-open]",
    ),
    diaryNotebookModal: requiredElement<HTMLElement>(
      "[data-map-diary-notebook-modal]",
    ),
    diaryNotebookPanel: requiredElement<HTMLElement>(
      "[data-map-diary-notebook-panel]",
    ),
    diaryNotebookClose: requiredElement<HTMLButtonElement>(
      "[data-map-diary-notebook-close]",
    ),
    diaryNotebookTitle: requiredElement<HTMLElement>(
      "[data-map-diary-notebook-title]",
    ),
    backHomeButton: requiredElement<HTMLButtonElement>("[data-back-home-link]"),
    mapAttribution: requiredElement<HTMLElement>("[data-map-attribution]"),
    mapAttributionText: requiredElement<HTMLElement>(".map-attribution span"),
    displayModeGroup: requiredElement<HTMLElement>("[data-display-mode-group]"),
    timeModeButtons: Array.from(
      document.querySelectorAll<HTMLElement>("[data-time-mode]"),
    ),
    displayModeButtons: Array.from(
      document.querySelectorAll<HTMLElement>("[data-display-mode]"),
    ),
    landingTitle: document.querySelector<HTMLElement>("[data-landing-title]"),
    landingLead: document.querySelector<HTMLElement>("[data-landing-lead]"),
    landingCta: document.querySelector<HTMLElement>("[data-landing-cta]"),
    conceptTitle: document.querySelector<HTMLElement>("[data-concept-title]"),
    conceptBody: document.querySelector<HTMLElement>("[data-concept-body]"),
    sectionsTitle: document.querySelector<HTMLElement>("[data-sections-title]"),
    diaryTitle: document.querySelector<HTMLElement>("[data-diary-title]"),
    diaryBody: document.querySelector<HTMLElement>("[data-diary-body]"),
    copyright: document.querySelector<HTMLElement>("[data-copyright]"),
    sceneLabelDay: document.querySelector<HTMLElement>(
      '[data-scene-label="day"]',
    ),
    sceneLabelNight: document.querySelector<HTMLElement>(
      '[data-scene-label="night"]',
    ),
    sceneMoodDay: document.querySelector<HTMLElement>(
      '[data-scene-mood="day"]',
    ),
    sceneMoodNight: document.querySelector<HTMLElement>(
      '[data-scene-mood="night"]',
    ),
    metaDescription: document.querySelector<HTMLMetaElement>(
      'meta[name="description"]',
    ),
    ogTitle: document.querySelector<HTMLMetaElement>(
      'meta[property="og:title"]',
    ),
    ogDescription: document.querySelector<HTMLMetaElement>(
      'meta[property="og:description"]',
    ),
    twitterTitle: document.querySelector<HTMLMetaElement>(
      'meta[name="twitter:title"]',
    ),
    twitterDescription: document.querySelector<HTMLMetaElement>(
      'meta[name="twitter:description"]',
    ),
    languageSwitchers,
    languageOptionButtons: languageSwitchers.flatMap(
      (switcher) => switcher.options,
    ),
    timeModeButtonByMode: {
      day: requiredElement<HTMLElement>('[data-time-mode="day"]'),
      night: requiredElement<HTMLElement>('[data-time-mode="night"]'),
    },
    displayModeButtonByMode: {
      single: requiredElement<HTMLElement>('[data-display-mode="single"]'),
      compare: requiredElement<HTMLElement>('[data-display-mode="compare"]'),
      magnifier: requiredElement<HTMLElement>(
        '[data-display-mode="magnifier"]',
      ),
      clock: requiredElement<HTMLElement>('[data-display-mode="clock"]'),
      scratch: requiredElement<HTMLElement>('[data-display-mode="scratch"]'),
    },
  };
};
