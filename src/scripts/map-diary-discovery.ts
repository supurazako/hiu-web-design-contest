import type { Spot } from "../data/spots";
import { saveDiscoveredDiary } from "../lib/diary-storage";
import type { MapPageState, TimeMode } from "./map-types";

const diaryToastDuration = 3200;

export const createDiaryDiscoveryController = ({
  state,
  renderDiscoveryToast,
}: {
  state: MapPageState;
  renderDiscoveryToast: () => void;
}) => {
  let hideTimer: number | null = null;

  const selectSpot = (spot: Spot, mode: TimeMode) => {
    state.selectedSpotId = spot.id;
    state.selectedSpotMode = mode;

    if (!spot.diary) return;

    const didDiscover = saveDiscoveredDiary(spot.id);
    if (!didDiscover) return;

    state.discoveredDiaryToastSpotId = spot.id;
    if (hideTimer !== null) {
      window.clearTimeout(hideTimer);
    }

    hideTimer = window.setTimeout(() => {
      state.discoveredDiaryToastSpotId = null;
      hideTimer = null;
      renderDiscoveryToast();
    }, diaryToastDuration);
  };

  return { selectSpot };
};
