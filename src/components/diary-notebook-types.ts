import type { Locale, UiCopy } from "@/data/site";

export type DiaryNotebookEntry = {
  spotId: string;
  spotName: Record<Locale, string>;
  timeMode: "day" | "night" | "both";
  title: Record<Locale, string>;
  body: Record<Locale, string>;
  unlockHint?: Record<Locale, string>;
};

export type DiaryNotebookUiCopy = Record<
  Locale,
  Pick<
    UiCopy[Locale],
    | "dayLabel"
    | "nightLabel"
    | "bothLabel"
    | "diaryProgressLabel"
    | "diaryDiscoveredLabel"
    | "diaryUndiscoveredLabel"
    | "diaryHintLabel"
    | "diaryFallbackHint"
    | "diaryLockedBody"
  >
>;

export type DiaryTurnDirection = "previous" | "next";
