import * as React from "react";

import type { Locale, UiCopy } from "@/data/site";
import { cn } from "@/lib/utils";
import {
  diaryDiscoveredEventName,
  diaryStorageKey,
  loadDiscoveredDiaries,
  type DiscoveredDiaryMap,
} from "@/lib/diary-storage";

type DiaryNotebookEntry = {
  spotId: string;
  spotName: Record<Locale, string>;
  timeMode: "day" | "night" | "both";
  title: Record<Locale, string>;
  body: Record<Locale, string>;
  unlockHint?: Record<Locale, string>;
};

type DiaryNotebookProps = {
  entries: DiaryNotebookEntry[];
  initialLocale: Locale;
  uiCopy: Record<
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
};

type LocaleChangeDetail = {
  locale: Locale;
};

type DiaryDiscoveredDetail = {
  spotId: string;
  discovered: DiscoveredDiaryMap;
};

const localeChangeEventName = "time-map:locale-change";

const TimeModeBadge = ({
  mode,
  label,
}: {
  mode: DiaryNotebookEntry["timeMode"];
  label: string;
}) => {
  const iconClassName = "h-4 w-4 fill-current";

  const DayIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960" className={iconClassName} aria-hidden="true">
      <path d="M440-760v-160h80v160h-80Zm266 110-55-55 112-115 56 57-113 113Zm54 210v-80h160v80H760ZM440-40v-160h80v160h-80ZM254-652 140-763l57-56 113 113-56 54Zm508 512L651-255l54-54 114 110-57 59ZM40-440v-80h160v80H40Zm157 300-56-57 112-112 29 27 29 28-114 114Zm113-170q-70-70-70-170t70-170q70-70 170-70t170 70q70 70 70 170t-70 170q-70 70-170 70t-170-70Zm283-57q47-47 47-113t-47-113q-47-47-113-47t-113 47q-47 47-47 113t47 113q47 47 113 47t113-47ZM480-480Z" />
    </svg>
  );

  const NightIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960" className={iconClassName} aria-hidden="true">
      <path d="M480-120q-150 0-255-105T120-480q0-150 105-255t255-105q14 0 27.5 1t26.5 3q-41 29-65.5 75.5T444-660q0 90 63 153t153 63q55 0 101-24.5t75-65.5q2 13 3 26.5t1 27.5q0 150-105 255T480-120Zm0-80q88 0 158-48.5T740-375q-20 5-40 8t-40 3q-123 0-209.5-86.5T364-660q0-20 3-40t8-40q-78 32-126.5 102T200-480q0 116 82 198t198 82Zm-10-270Z" />
    </svg>
  );

  if (mode === "both") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-[#d8c5ee] px-2.5 py-1 text-[0.68rem] font-semibold tracking-[0.1em] text-[#5b3b79]">
        <span className="inline-flex items-center -space-x-1">
          <DayIcon />
          <NightIcon />
        </span>
        <span>{label}</span>
      </span>
    );
  }

  const isDay = mode === "day";

  return (
      <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[0.68rem] font-semibold tracking-[0.1em]",
        isDay ? "bg-[#f8d58a] text-[#6d4b07]" : "bg-[#b7cdf8] text-[#6d4b07]",
      )}
    >
      {isDay ? <DayIcon /> : <NightIcon />}
      <span>{label}</span>
    </span>
  );
};

export default function DiaryNotebook({ entries, initialLocale, uiCopy }: DiaryNotebookProps) {
  const [locale, setLocale] = React.useState<Locale>(initialLocale);
  const [discovered, setDiscovered] = React.useState<DiscoveredDiaryMap>({});

  React.useEffect(() => {
    setDiscovered(loadDiscoveredDiaries());

    const currentLocale = document.body.dataset.locale ?? document.documentElement.lang;
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

    window.addEventListener(localeChangeEventName, handleLocaleChange);
    window.addEventListener(diaryDiscoveredEventName, handleDiaryDiscovered);
    window.addEventListener("storage", handleStorage);

    return () => {
      window.removeEventListener(localeChangeEventName, handleLocaleChange);
      window.removeEventListener(diaryDiscoveredEventName, handleDiaryDiscovered);
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  const localizedUi = uiCopy[locale] ?? uiCopy.ja;
  const foundCount = entries.filter((entry) => discovered[entry.spotId]).length;
  const hiddenCount = entries.length - foundCount;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 rounded-[28px] border border-[rgba(141,105,52,0.2)] bg-[linear-gradient(180deg,rgba(255,251,244,0.96),rgba(247,238,224,0.92))] px-5 py-5 shadow-[0_18px_48px_rgba(78,52,24,0.1)] sm:flex-row sm:items-center sm:justify-between sm:px-7">
        <div className="space-y-1.5">
          <p className="text-[0.72rem] font-semibold uppercase tracking-[0.22em] text-[color:var(--md-sys-color-primary)]">
            {localizedUi.diaryProgressLabel}
          </p>
          <p className="text-2xl font-semibold text-[color:var(--md-sys-color-on-surface)]">
            {foundCount} / {entries.length}
          </p>
        </div>
        <div className="inline-flex items-center gap-2 self-start rounded-full border border-[rgba(126,87,0,0.12)] bg-white/65 px-4 py-2 text-sm text-[color:var(--md-sys-color-on-surface-variant)] shadow-[0_10px_24px_rgba(85,61,35,0.08)]">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-[#d68729]" />
          <span>
            {localizedUi.diaryDiscoveredLabel} {foundCount} / {localizedUi.diaryUndiscoveredLabel} {hiddenCount}
          </span>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2 xl:grid-cols-3">
        {entries.map((entry, index) => {
          const isDiscovered = Boolean(discovered[entry.spotId]);
          const timeLabel =
            entry.timeMode === "day"
              ? localizedUi.dayLabel
              : entry.timeMode === "night"
                ? localizedUi.nightLabel
                : localizedUi.bothLabel;
          const hint = entry.unlockHint?.[locale] || localizedUi.diaryFallbackHint;

          return (
            <article
              key={entry.spotId}
              className={cn(
                "relative overflow-hidden rounded-[26px] border px-5 py-5 shadow-[0_16px_38px_rgba(67,43,20,0.12)] transition-transform duration-300",
                isDiscovered
                  ? "rotate-[-0.3deg] border-[rgba(140,108,61,0.22)] bg-[#fffaf1]"
                  : "rotate-[0.45deg] border-[rgba(115,103,86,0.18)] bg-[#f4eee2]",
              )}
              style={{
                backgroundImage:
                  "linear-gradient(180deg, rgba(255,255,255,0.68), rgba(255,251,245,0.9)), repeating-linear-gradient(180deg, transparent 0, transparent 31px, rgba(115, 93, 66, 0.12) 31px, rgba(115, 93, 66, 0.12) 32px)",
              }}
            >
              <div className="pointer-events-none absolute bottom-0 left-10 top-0 w-px bg-[rgba(196,73,73,0.36)]" />
              <div className="absolute right-4 top-0 h-10 w-14 rounded-b-[14px] bg-[linear-gradient(180deg,#d79f3b,#b97b1e)] opacity-90 shadow-[0_8px_18px_rgba(119,77,16,0.2)]" />

              <div className="relative z-10 flex h-full flex-col gap-4 pl-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-[rgba(255,255,255,0.72)] px-2.5 py-1 text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-[color:var(--md-sys-color-on-surface-variant)]">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <TimeModeBadge mode={entry.timeMode} label={timeLabel} />
                    </div>
                    <p className="text-sm text-[#5c4a38]">{entry.spotName[locale]}</p>
                  </div>
                  <span
                    className={cn(
                      "rounded-full border px-3 py-1 text-[0.72rem] font-semibold",
                      isDiscovered
                        ? "border-[rgba(126,87,0,0.18)] bg-[rgba(255,255,255,0.78)] text-[#6d4b07]"
                        : "border-[rgba(84,71,58,0.12)] bg-[rgba(113,103,92,0.08)] text-[#5c4a38]",
                    )}
                  >
                    {isDiscovered ? localizedUi.diaryDiscoveredLabel : localizedUi.diaryUndiscoveredLabel}
                  </span>
                </div>

                {isDiscovered ? (
                  <div className="space-y-3">
                    <h3
                      className="text-[1.45rem] leading-tight text-[#3f2e20]"
                      style={{ fontFamily: "var(--font-diary)" }}
                    >
                      {entry.title[locale]}
                    </h3>
                    <p
                      className="text-[1.04rem] leading-8 text-[#564536]"
                      style={{ fontFamily: "var(--font-diary)" }}
                    >
                      {entry.body[locale]}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="rounded-[22px] border border-dashed border-[rgba(117,101,80,0.22)] bg-[rgba(255,255,255,0.42)] px-4 py-4">
                      <p className="text-[1.32rem] tracking-[0.1em] text-[rgba(84,71,58,0.58)]" style={{ fontFamily: "var(--font-diary)" }}>
                        ????
                      </p>
                      <p className="mt-3 text-sm leading-7 text-[rgba(84,71,58,0.68)] blur-[0.8px] select-none">
                        {localizedUi.diaryLockedBody}
                      </p>
                    </div>
                    <div className="rounded-[20px] bg-[linear-gradient(180deg,#f7d873,#efc654)] px-4 py-4 text-[#5b410d] shadow-[0_10px_20px_rgba(145,106,24,0.16)]">
                      <p className="text-[0.72rem] font-semibold uppercase tracking-[0.16em]">
                        {localizedUi.diaryHintLabel}
                      </p>
                      <p className="mt-2 text-[0.96rem] leading-7">{hint}</p>
                    </div>
                  </div>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
