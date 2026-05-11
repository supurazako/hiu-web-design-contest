import type { Spot } from "../data/spots";
import type { UiCopy } from "../data/site";
import { isDiaryDiscovered } from "../lib/diary-storage";
import type { MapDomRefs } from "./map-dom-refs";
import type { MapPageState } from "./map-types";

const placeholderClasses = ["placeholder-river", "placeholder-steam", "placeholder-forest", "placeholder-light"];

export const createSpotCardRenderer = ({
  refs,
  state,
  uiCopy,
  getSelectedSpot,
  syncBottomOverlayLayout,
}: {
  refs: MapDomRefs;
  state: MapPageState;
  uiCopy: UiCopy;
  getSelectedSpot: () => Spot | null;
  syncBottomOverlayLayout: () => void;
}) => {
  let hideTimer: number | null = null;
  let showFrame: number | null = null;
  const spotCardMotionDuration = 320;

  const show = () => {
    if (hideTimer !== null) {
      window.clearTimeout(hideTimer);
      hideTimer = null;
    }

    if (showFrame !== null) {
      window.cancelAnimationFrame(showFrame);
      showFrame = null;
    }

    const wasHidden = refs.spotCard.hidden;
    refs.spotCard.hidden = false;

    if (!wasHidden && refs.spotCard.classList.contains("is-visible-sheet")) return;

    showFrame = window.requestAnimationFrame(() => {
      refs.spotCard.classList.add("is-visible-sheet");
      syncBottomOverlayLayout();
      showFrame = null;
    });
  };

  const hide = () => {
    if (showFrame !== null) {
      window.cancelAnimationFrame(showFrame);
      showFrame = null;
    }

    refs.spotCard.classList.remove("is-visible-sheet");
    if (refs.spotCard.hidden || hideTimer !== null) return;

    hideTimer = window.setTimeout(() => {
      refs.spotCard.hidden = true;
      syncBottomOverlayLayout();
      hideTimer = null;
    }, spotCardMotionDuration);
  };

  return () => {
    const ui = uiCopy[state.locale];
    const spot = getSelectedSpot();

    if (!spot) {
      hide();
      refs.spotCard.classList.add("is-empty-sheet");
      refs.spotCard.classList.remove("is-selected-sheet");
      refs.spotEmpty.hidden = true;
      refs.spotEmptyTitle.textContent = ui.cardEmptyTitle;
      refs.spotEmptyHint.textContent = ui.cardEmptyHint;
      return;
    }

    show();
    const activeTimeMode =
      state.displayMode === "single" ? state.timeMode : state.selectedSpotMode ?? state.timeMode;
    const activeTimeLabel =
      activeTimeMode === "day" ? ui.dayLabel : activeTimeMode === "night" ? ui.nightLabel : ui.bothLabel;

    refs.spotCard.classList.add("is-selected-sheet");
    refs.spotCard.classList.remove("is-empty-sheet");
    refs.spotVisual.hidden = false;
    refs.spotMeta.hidden = false;
    refs.spotTitle.hidden = false;
    refs.spotDescription.hidden = false;
    refs.spotDetailLabel.hidden = false;
    refs.spotDiary.hidden = true;
    refs.spotEmpty.hidden = true;
    refs.spotVisual.classList.remove(...placeholderClasses);
    refs.spotVisual.classList.add(`placeholder-${spot.image.placeholderVariant}`);

    if (spot.image_url) {
      refs.spotVisual.classList.add("has-image");
      refs.spotVisual.removeAttribute("aria-hidden");
      refs.spotImage.hidden = false;
      refs.spotImage.src = spot.image_url;
      refs.spotImage.alt = spot.image_alt[state.locale];
      refs.spotImageCredit.hidden = false;
      refs.spotImageCredit.href = spot.image_source_url;
      refs.spotImageCredit.textContent = spot.image_credit;
      refs.spotImageCredit.title = spot.image_license;
    } else {
      refs.spotVisual.classList.remove("has-image");
      refs.spotVisual.setAttribute("aria-hidden", "true");
      refs.spotImage.hidden = true;
      refs.spotImage.removeAttribute("src");
      refs.spotImage.alt = "";
      refs.spotImageCredit.hidden = true;
      refs.spotImageCredit.removeAttribute("href");
      refs.spotImageCredit.textContent = "";
      refs.spotImageCredit.removeAttribute("title");
    }

    refs.spotCategory.textContent = `${ui.categoryLabel}: ${spot.category[state.locale]}`;
    refs.spotRoute.textContent = `${ui.routeHint}: ${activeTimeLabel}`;
    refs.spotTitle.textContent = spot.name[state.locale];
    refs.spotDescription.textContent = spot.description[state.locale];
    refs.spotDetailLabel.textContent = ui.detailsLabel;

    if (spot.diary && isDiaryDiscovered(spot.id)) {
      refs.spotDiary.hidden = false;
      refs.spotDiaryLabel.textContent = ui.diaryCardLabel;
      refs.spotDiaryTitle.textContent = spot.diary.title[state.locale];
      refs.spotDiaryBody.textContent = spot.diary.body[state.locale];
    } else {
      refs.spotDiary.hidden = true;
      refs.spotDiaryTitle.textContent = "";
      refs.spotDiaryBody.textContent = "";
    }
  };
};
