import * as React from "react";

import type { Locale } from "@/data/site";
import {
  diaryDiscoveredEventName,
  diaryStorageKey,
  loadDiscoveredDiaries,
  type DiscoveredDiaryMap,
} from "@/lib/diary-storage";
import type {
  DiaryNotebookEntry,
  DiaryTurnDirection,
} from "./diary-notebook-types";

type LocaleChangeDetail = {
  locale: Locale;
};

type DiaryDiscoveredDetail = {
  spotId: string;
  discovered: DiscoveredDiaryMap;
};

const localeChangeEventName = "time-map:locale-change";

const getVisiblePageCount = () =>
  window.matchMedia("(min-width: 768px)").matches ? 2 : 1;

export const useDiaryNotebookState = ({
  entries,
  initialLocale,
  unlockMode,
}: {
  entries: DiaryNotebookEntry[];
  initialLocale: Locale;
  unlockMode: "discovered" | "all";
}) => {
  const [locale, setLocale] = React.useState<Locale>(initialLocale);
  const [discovered, setDiscovered] = React.useState<DiscoveredDiaryMap>({});
  const [currentPage, setCurrentPage] = React.useState(0);
  const [visiblePageCount, setVisiblePageCount] = React.useState(1);
  const [turnDirection, setTurnDirection] =
    React.useState<DiaryTurnDirection | null>(null);

  React.useEffect(() => {
    setDiscovered(loadDiscoveredDiaries());
    setVisiblePageCount(getVisiblePageCount());

    const currentLocale =
      document.body.dataset.locale ?? document.documentElement.lang;
    if (currentLocale === "ja" || currentLocale === "en") {
      setLocale(currentLocale);
    }

    const handleLocaleChange = (event: Event) => {
      const { detail } = event as CustomEvent<LocaleChangeDetail>;
      if (!detail?.locale) return;
      setLocale(detail.locale);
    };

    const handleDiaryDiscovered = (event: Event) => {
      const { detail } = event as CustomEvent<DiaryDiscoveredDetail>;
      if (detail?.discovered) {
        setDiscovered(detail.discovered);
        return;
      }

      setDiscovered(loadDiscoveredDiaries());
    };

    const handleStorage = (event: StorageEvent) => {
      if (event.key !== null && event.key !== diaryStorageKey) return;
      setDiscovered(loadDiscoveredDiaries());
    };

    const handleResize = () => {
      setVisiblePageCount(getVisiblePageCount());
    };

    window.addEventListener(localeChangeEventName, handleLocaleChange);
    window.addEventListener(diaryDiscoveredEventName, handleDiaryDiscovered);
    window.addEventListener("storage", handleStorage);
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener(localeChangeEventName, handleLocaleChange);
      window.removeEventListener(
        diaryDiscoveredEventName,
        handleDiaryDiscovered,
      );
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  const isAllUnlocked = unlockMode === "all";
  const foundCount = isAllUnlocked
    ? entries.length
    : entries.filter((entry) => discovered[entry.spotId]).length;
  const hiddenCount = entries.length - foundCount;
  const pageStep = visiblePageCount === 2 ? 2 : 1;
  const maxPage = Math.max(0, entries.length - pageStep);
  const safeCurrentPage = Math.min(currentPage, maxPage);
  const visibleEntries = entries.slice(
    safeCurrentPage,
    safeCurrentPage + pageStep,
  );
  const canGoPrevious = safeCurrentPage > 0;
  const canGoNext = safeCurrentPage + pageStep < entries.length;

  React.useEffect(() => {
    setCurrentPage((page) =>
      Math.min(page, Math.max(0, entries.length - visiblePageCount)),
    );
  }, [entries.length, visiblePageCount]);

  const turnPage = (direction: DiaryTurnDirection) => {
    setTurnDirection(direction);
    setCurrentPage((page) => {
      const nextPage = direction === "next" ? page + pageStep : page - pageStep;
      return Math.min(Math.max(nextPage, 0), maxPage);
    });
  };

  const goToEntryIndex = (index: number) => {
    const targetPage = visiblePageCount === 2 ? index - (index % 2) : index;
    setTurnDirection(targetPage > safeCurrentPage ? "next" : "previous");
    setCurrentPage(Math.min(targetPage, maxPage));
  };

  React.useEffect(() => {
    if (!turnDirection) return;
    const timer = window.setTimeout(() => setTurnDirection(null), 520);
    return () => window.clearTimeout(timer);
  }, [turnDirection]);

  return {
    locale,
    discovered,
    visiblePageCount,
    turnDirection,
    isAllUnlocked,
    foundCount,
    hiddenCount,
    pageStep,
    safeCurrentPage,
    visibleEntries,
    canGoPrevious,
    canGoNext,
    turnPage,
    goToEntryIndex,
  };
};
