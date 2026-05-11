import type L from "leaflet";
import type { Spot } from "../data/spots";

export type DisplayMode = "single" | "compare" | "magnifier" | "clock" | "scratch";
export type TimeMode = "day" | "night";
export type MapPoint = { x: number; y: number };
export type PointerBounds = Pick<DOMRectReadOnly, "left" | "right" | "top" | "bottom">;

export type Locale = "ja" | "en";
export type ComparePaneSide = "day" | "night";

export type MarkerEntry = {
  marker: L.Marker;
  spot: Spot;
  mode: TimeMode;
};

export type MapPageState = {
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
};
