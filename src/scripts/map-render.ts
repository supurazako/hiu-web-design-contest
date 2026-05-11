import type { Spot } from "../data/spots";
import type { ThemeByMode, UiCopy } from "../data/site";
import type { MapDomRefs } from "./map-dom-refs";
import type { MapPageState } from "./map-types";

export const renderLandingTitle = (
  title: HTMLElement | null,
  lines: readonly string[],
) => {
  if (!title) return;
  title.replaceChildren(
    ...lines.map((line) => {
      const span = document.createElement("span");
      span.textContent = line;
      return span;
    }),
  );
};

export const renderLandingText = ({
  refs,
  state,
  uiCopy,
}: {
  refs: MapDomRefs;
  state: MapPageState;
  uiCopy: UiCopy;
}) => {
  const ui = uiCopy[state.locale];
  document.documentElement.lang = state.locale;
  document.body.dataset.locale = state.locale;
  renderLandingTitle(refs.landingTitle, ui.landingTitleLines);
  if (refs.landingLead) refs.landingLead.textContent = ui.landingLead;
  if (refs.landingCta) refs.landingCta.textContent = ui.landingPrimaryCta;
  if (refs.conceptTitle) refs.conceptTitle.textContent = ui.conceptTitle;
  if (refs.conceptBody) refs.conceptBody.textContent = ui.conceptBody;
  if (refs.sectionsTitle) refs.sectionsTitle.textContent = ui.sectionsTitle;
  if (refs.diaryTitle) refs.diaryTitle.textContent = ui.diarySectionTitle;
  if (refs.diaryBody) refs.diaryBody.textContent = ui.diarySectionBody;
  if (refs.sceneLabelDay) refs.sceneLabelDay.textContent = ui.dayLabel;
  if (refs.sceneLabelNight) refs.sceneLabelNight.textContent = ui.nightLabel;
  if (refs.sceneMoodDay) refs.sceneMoodDay.textContent = ui.dayMood;
  if (refs.sceneMoodNight) refs.sceneMoodNight.textContent = ui.nightMood;
  window.dispatchEvent(
    new CustomEvent("time-map:locale-change", {
      detail: { locale: state.locale },
    }),
  );
};

export const renderLanguageUI = ({
  refs,
  state,
  uiCopy,
}: {
  refs: MapDomRefs;
  state: MapPageState;
  uiCopy: UiCopy;
}) => {
  const ui = uiCopy[state.locale];
  refs.languageSwitchers.forEach((switcher) => {
    const isOpen = state.openLanguageSwitcherId === switcher.id;
    switcher.trigger.setAttribute("aria-label", ui.languageLabel);
    switcher.trigger.setAttribute("aria-expanded", String(isOpen));
    switcher.menu.setAttribute("aria-label", ui.languageLabel);
    switcher.menu.hidden = !isOpen;
    switcher.menu.classList.toggle("is-open", isOpen);
    switcher.options.forEach((button) => {
      button.classList.toggle(
        "is-active",
        button.dataset.locale === state.locale,
      );
    });
  });
};

export const renderDocumentMetadata = ({
  refs,
  state,
  uiCopy,
}: {
  refs: MapDomRefs;
  state: MapPageState;
  uiCopy: UiCopy;
}) => {
  const ui = uiCopy[state.locale];
  const title = state.isExpanded
    ? `${ui.siteTitle} | ${ui.mapPageTitle}`
    : `${ui.siteTitle} | ${ui.siteTagline}`;
  document.title = title;
  document.documentElement.lang = state.locale;
  if (refs.metaDescription) refs.metaDescription.content = ui.metaDescription;
  if (refs.ogTitle) refs.ogTitle.content = title;
  if (refs.ogDescription) refs.ogDescription.content = ui.metaDescription;
  if (refs.twitterTitle) refs.twitterTitle.content = title;
  if (refs.twitterDescription)
    refs.twitterDescription.content = ui.metaDescription;
};

export const renderStaticText = ({
  refs,
  state,
  uiCopy,
}: {
  refs: MapDomRefs;
  state: MapPageState;
  uiCopy: UiCopy;
}) => {
  const ui = uiCopy[state.locale];
  renderDocumentMetadata({ refs, state, uiCopy });
  refs.backHomeButton.setAttribute("aria-label", ui.backHome);
  refs.zoomControls.setAttribute("aria-label", ui.zoomControlsLabel);
  refs.zoomInButton.setAttribute("aria-label", ui.zoomInLabel);
  refs.zoomInButton.setAttribute("title", ui.zoomInLabel);
  refs.zoomOutButton.setAttribute("aria-label", ui.zoomOutLabel);
  refs.zoomOutButton.setAttribute("title", ui.zoomOutLabel);
  refs.timeModeButtonByMode.day.setAttribute("aria-label", ui.dayLabel);
  refs.timeModeButtonByMode.day.setAttribute("title", ui.dayLabel);
  refs.timeModeButtonByMode.night.setAttribute("aria-label", ui.nightLabel);
  refs.timeModeButtonByMode.night.setAttribute("title", ui.nightLabel);
  refs.mapAttributionText.textContent = ui.mapDataAttribution;
  refs.displayModeGroup.setAttribute("aria-label", ui.displayModeLabel);
  const displayModeLabels: Array<[HTMLElement, string]> = [
    [refs.displayModeButtonByMode.single, ui.singleModeLabel],
    [refs.displayModeButtonByMode.compare, ui.compareModeLabel],
    [refs.displayModeButtonByMode.magnifier, ui.magnifierModeLabel],
    [refs.displayModeButtonByMode.clock, ui.clockModeLabel],
    [refs.displayModeButtonByMode.scratch, ui.scratchModeLabel],
  ];
  displayModeLabels.forEach(([button, label]) => {
    button.setAttribute("aria-label", label);
    button.setAttribute("title", label);
  });
  refs.splitHandle.setAttribute("aria-label", ui.compareHandleLabel);
  refs.clockDial.setAttribute("aria-label", ui.clockDialLabel);
  refs.scratchResetButton.setAttribute("aria-label", ui.scratchResetLabel);
  refs.scratchResetButton.setAttribute("title", ui.scratchResetLabel);
  refs.diaryNotebookOpenButton.setAttribute(
    "aria-label",
    ui.diaryNotebookOpenLabel,
  );
  refs.diaryNotebookOpenButton.setAttribute("title", ui.diaryNotebookOpenLabel);
  refs.diaryNotebookClose.setAttribute(
    "aria-label",
    ui.diaryNotebookCloseLabel,
  );
  refs.diaryNotebookTitle.textContent = ui.diarySectionTitle;
  renderLandingText({ refs, state, uiCopy });
  renderLanguageUI({ refs, state, uiCopy });
};

export const updateButtons = ({
  refs,
  state,
  currentZoom,
  maxZoom,
  minZoom,
}: {
  refs: MapDomRefs;
  state: MapPageState;
  currentZoom: number;
  maxZoom: number;
  minZoom: number;
}) => {
  refs.timeModeButtons.forEach((button) => {
    button.classList.toggle(
      "is-active",
      button.dataset.timeMode === state.timeMode,
    );
  });
  refs.displayModeButtons.forEach((button) => {
    button.classList.toggle(
      "is-active",
      button.dataset.displayMode === state.displayMode,
    );
  });
  refs.languageOptionButtons.forEach((button) => {
    button.classList.toggle(
      "is-active",
      button.dataset.locale === state.locale,
    );
  });

  refs.zoomInButton.disabled = currentZoom >= maxZoom;
  refs.zoomOutButton.disabled = currentZoom <= minZoom;
};

export const renderControlCluster = ({
  refs,
  state,
}: {
  refs: MapDomRefs;
  state: MapPageState;
}) => {
  refs.controlCluster.classList.toggle(
    "is-hidden-by-selection",
    state.selectedSpotId !== null,
  );
};

export const renderDiaryNotebookModal = ({
  refs,
  state,
  uiCopy,
}: {
  refs: MapDomRefs;
  state: MapPageState;
  uiCopy: UiCopy;
}) => {
  const ui = uiCopy[state.locale];
  refs.root.classList.toggle(
    "is-diary-notebook-open",
    state.isDiaryNotebookOpen,
  );
  refs.diaryNotebookOpenButton.setAttribute(
    "aria-label",
    ui.diaryNotebookOpenLabel,
  );
  refs.diaryNotebookOpenButton.setAttribute("title", ui.diaryNotebookOpenLabel);
  refs.diaryNotebookClose.setAttribute(
    "aria-label",
    ui.diaryNotebookCloseLabel,
  );
  refs.diaryNotebookTitle.textContent = ui.diarySectionTitle;

  if (!state.isDiaryNotebookOpen) {
    refs.diaryNotebookModal.hidden = true;
    refs.diaryNotebookModal.classList.remove("is-visible");
    return;
  }

  refs.diaryNotebookModal.hidden = false;
  refs.diaryNotebookModal.classList.add("is-visible");
};

export const renderDiscoveryToast = ({
  refs,
  state,
  uiCopy,
  discoveredSpot,
}: {
  refs: MapDomRefs;
  state: MapPageState;
  uiCopy: UiCopy;
  discoveredSpot: Spot | null;
}) => {
  const ui = uiCopy[state.locale];

  if (!discoveredSpot?.diary) {
    refs.diaryToast.hidden = true;
    refs.diaryToast.classList.remove("is-visible");
    refs.diaryToastName.textContent = "";
    return;
  }

  refs.diaryToast.hidden = false;
  refs.diaryToast.classList.add("is-visible");
  refs.diaryToastTitle.textContent = ui.diaryToastTitle;
  refs.diaryToastName.textContent = discoveredSpot.diary.title[state.locale];
  refs.diaryToastBody.textContent = ui.diaryToastBody;
};

export const applyTheme = ({
  root,
  state,
  themeByMode,
}: {
  root: HTMLElement;
  state: MapPageState;
  themeByMode: ThemeByMode;
}) => {
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
