import type { Locale, UiCopy } from "./site";
import type { Spot } from "./spots";

export type DiaryNotebookEntry = {
  spotId: string;
  spotName: Spot["name"];
  timeMode: Spot["timeMode"];
  title: NonNullable<Spot["diary"]>["title"];
  body: NonNullable<Spot["diary"]>["body"];
  unlockHint?: NonNullable<Spot["diary"]>["unlockHint"];
};

type DiaryNotebookUiKey =
  | "dayLabel"
  | "nightLabel"
  | "bothLabel"
  | "diaryProgressLabel"
  | "diaryDiscoveredLabel"
  | "diaryUndiscoveredLabel"
  | "diaryHintLabel"
  | "diaryFallbackHint"
  | "diaryLockedBody";

export type DiaryNotebookUiCopy = Record<
  Locale,
  Pick<UiCopy[Locale], DiaryNotebookUiKey>
>;

export const getDiaryEntries = (spots: Spot[]): DiaryNotebookEntry[] =>
  spots.flatMap((spot) => {
    if (!spot.diary) return [];

    return [
      {
        spotId: spot.id,
        spotName: spot.name,
        timeMode: spot.timeMode,
        title: spot.diary.title,
        body: spot.diary.body,
        unlockHint: spot.diary.unlockHint,
      },
    ];
  });

export const getDiaryNotebookUiCopy = (
  uiCopy: UiCopy,
): DiaryNotebookUiCopy => ({
  ja: {
    dayLabel: uiCopy.ja.dayLabel,
    nightLabel: uiCopy.ja.nightLabel,
    bothLabel: uiCopy.ja.bothLabel,
    diaryProgressLabel: uiCopy.ja.diaryProgressLabel,
    diaryDiscoveredLabel: uiCopy.ja.diaryDiscoveredLabel,
    diaryUndiscoveredLabel: uiCopy.ja.diaryUndiscoveredLabel,
    diaryHintLabel: uiCopy.ja.diaryHintLabel,
    diaryFallbackHint: uiCopy.ja.diaryFallbackHint,
    diaryLockedBody: uiCopy.ja.diaryLockedBody,
  },
  en: {
    dayLabel: uiCopy.en.dayLabel,
    nightLabel: uiCopy.en.nightLabel,
    bothLabel: uiCopy.en.bothLabel,
    diaryProgressLabel: uiCopy.en.diaryProgressLabel,
    diaryDiscoveredLabel: uiCopy.en.diaryDiscoveredLabel,
    diaryUndiscoveredLabel: uiCopy.en.diaryUndiscoveredLabel,
    diaryHintLabel: uiCopy.en.diaryHintLabel,
    diaryFallbackHint: uiCopy.en.diaryFallbackHint,
    diaryLockedBody: uiCopy.en.diaryLockedBody,
  },
});
