import type { Locale } from "@/data/site";
import { cn } from "@/lib/utils";
import type {
  DiaryNotebookEntry,
  DiaryNotebookUiCopy,
} from "./diary-notebook-types";
import { useDiaryNotebookState } from "./useDiaryNotebookState";

type DiaryNotebookProps = {
  entries: DiaryNotebookEntry[];
  initialLocale: Locale;
  unlockMode?: "discovered" | "all";
  uiCopy: DiaryNotebookUiCopy;
};

const TimeModeBadge = ({
  mode,
  label,
}: {
  mode: DiaryNotebookEntry["timeMode"];
  label: string;
}) => {
  const iconClassName = "h-4 w-4 fill-current";

  const DayIcon = () => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 -960 960 960"
      className={iconClassName}
      aria-hidden="true"
    >
      <path d="M440-760v-160h80v160h-80Zm266 110-55-55 112-115 56 57-113 113Zm54 210v-80h160v80H760ZM440-40v-160h80v160h-80ZM254-652 140-763l57-56 113 113-56 54Zm508 512L651-255l54-54 114 110-57 59ZM40-440v-80h160v80H40Zm157 300-56-57 112-112 29 27 29 28-114 114Zm113-170q-70-70-70-170t70-170q70-70 170-70t170 70q70 70 70 170t-70 170q-70 70-170 70t-170-70Zm283-57q47-47 47-113t-47-113q-47-47-113-47t-113 47q-47 47-47 113t47 113q47 47 113 47t113-47ZM480-480Z" />
    </svg>
  );

  const NightIcon = () => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 -960 960 960"
      className={iconClassName}
      aria-hidden="true"
    >
      <path d="M480-120q-150 0-255-105T120-480q0-150 105-255t255-105q14 0 27.5 1t26.5 3q-41 29-65.5 75.5T444-660q0 90 63 153t153 63q55 0 101-24.5t75-65.5q2 13 3 26.5t1 27.5q0 150-105 255T480-120Zm0-80q88 0 158-48.5T740-375q-20 5-40 8t-40 3q-123 0-209.5-86.5T364-660q0-20 3-40t8-40q-78 32-126.5 102T200-480q0 116 82 198t198 82Zm-10-270Z" />
    </svg>
  );

  if (mode === "both") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-[#d8c5ee] px-2.5 py-1 text-[0.68rem] font-semibold tracking-[0.08em] text-[#5b3b79]">
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
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[0.68rem] font-semibold tracking-[0.08em]",
        isDay ? "bg-[#f8d58a] text-[#6d4b07]" : "bg-[#b7cdf8] text-[#31415f]",
      )}
    >
      {isDay ? <DayIcon /> : <NightIcon />}
      <span>{label}</span>
    </span>
  );
};

const PageTurnIcon = ({ direction }: { direction: "previous" | "next" }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 -960 960 960"
    className="h-5 w-5 fill-current"
    aria-hidden="true"
  >
    {direction === "previous" ? (
      <path d="M560-240 320-480l240-240 56 56-184 184 184 184-56 56Z" />
    ) : (
      <path d="M504-480 320-664l56-56 240 240-240 240-56-56 184-184Z" />
    )}
  </svg>
);

type DiaryPageProps = {
  entry: DiaryNotebookEntry;
  index: number;
  locale: Locale;
  isDiscovered: boolean;
  timeLabel: string;
  localizedUi: DiaryNotebookProps["uiCopy"][Locale];
  side: "left" | "right" | "single";
};

const DiaryPage = ({
  entry,
  index,
  locale,
  isDiscovered,
  timeLabel,
  localizedUi,
  side,
}: DiaryPageProps) => {
  const hint = entry.unlockHint?.[locale] || localizedUi.diaryFallbackHint;

  return (
    <article
      className={cn(
        "relative flex min-h-[430px] flex-col overflow-hidden border border-[rgba(127,96,55,0.2)] bg-[#fffaf0] px-5 py-5 shadow-[0_18px_38px_rgba(73,48,22,0.13)] sm:px-7 sm:py-7",
        side === "left" && "rounded-l-[24px] rounded-r-[10px]",
        side === "right" && "rounded-l-[10px] rounded-r-[24px]",
        side === "single" && "rounded-[24px]",
        !isDiscovered && "bg-[#f3ecdf]",
      )}
      style={{
        backgroundImage:
          "linear-gradient(90deg, rgba(196,73,73,0.34) 38px, transparent 39px), linear-gradient(180deg, rgba(255,255,255,0.78), rgba(255,250,240,0.9)), repeating-linear-gradient(180deg, transparent 0, transparent 31px, rgba(115,93,66,0.13) 31px, rgba(115,93,66,0.13) 32px)",
      }}
    >
      <div className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-[linear-gradient(90deg,transparent,rgba(88,58,27,0.08))]" />
      <div className="pointer-events-none absolute left-[44px] top-0 h-full w-px bg-[rgba(196,73,73,0.32)]" />
      <div className="pointer-events-none absolute right-5 top-0 h-11 w-14 rounded-b-[14px] bg-[linear-gradient(180deg,#d79f3b,#b97b1e)] opacity-90 shadow-[0_8px_18px_rgba(119,77,16,0.2)]" />

      <div className="relative z-10 flex h-full flex-col gap-5 pl-7">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-[rgba(255,255,255,0.72)] px-2.5 py-1 text-[0.7rem] font-semibold tracking-[0.12em] text-[#6f604e]">
                {String(index + 1).padStart(2, "0")}
              </span>
              <TimeModeBadge mode={entry.timeMode} label={timeLabel} />
            </div>
            <p className="text-sm leading-6 text-[#5c4a38]">
              {entry.spotName[locale]}
            </p>
          </div>
          <span
            className={cn(
              "rounded-full border px-3 py-1 text-[0.72rem] font-semibold",
              isDiscovered
                ? "border-[rgba(126,87,0,0.18)] bg-[rgba(255,255,255,0.78)] text-[#6d4b07]"
                : "border-[rgba(126,87,0,0.32)] bg-[#f2d38a] text-[#4f3308] shadow-[0_6px_14px_rgba(126,87,0,0.12)]",
            )}
          >
            {isDiscovered
              ? localizedUi.diaryDiscoveredLabel
              : localizedUi.diaryUndiscoveredLabel}
          </span>
        </div>

        {isDiscovered ? (
          <div className="flex flex-1 flex-col justify-between gap-6">
            <div className="space-y-4">
              <h3
                className="text-[1.7rem] leading-tight text-[#3f2e20]"
                style={{ fontFamily: "var(--font-diary)" }}
              >
                {entry.title[locale]}
              </h3>
              <p
                className="text-[1.08rem] leading-9 text-[#564536]"
                style={{ fontFamily: "var(--font-diary)" }}
              >
                {entry.body[locale]}
              </p>
            </div>
            <p className="self-end text-[0.72rem] font-semibold tracking-[0.12em] text-[rgba(83,62,41,0.48)]">
              PAGE {String(index + 1).padStart(2, "0")}
            </p>
          </div>
        ) : (
          <div className="flex flex-1 flex-col justify-between gap-5">
            <div className="rounded-[20px] border border-dashed border-[rgba(117,101,80,0.26)] bg-[rgba(255,255,255,0.42)] px-4 py-5">
              <p
                className="text-[1.42rem] text-[rgba(84,71,58,0.58)]"
                style={{ fontFamily: "var(--font-diary)" }}
              >
                ????
              </p>
              <p className="mt-4 select-none text-sm leading-7 text-[rgba(84,71,58,0.68)] blur-[0.8px]">
                {localizedUi.diaryLockedBody}
              </p>
            </div>
            <div className="rounded-[18px] bg-[linear-gradient(180deg,#f7d873,#efc654)] px-4 py-4 text-[#5b410d] shadow-[0_10px_20px_rgba(145,106,24,0.16)]">
              <p className="text-[0.72rem] font-semibold uppercase tracking-[0.14em]">
                {localizedUi.diaryHintLabel}
              </p>
              <p className="mt-2 text-[0.96rem] leading-7">{hint}</p>
            </div>
          </div>
        )}
      </div>
    </article>
  );
};

export default function DiaryNotebook({
  entries,
  initialLocale,
  unlockMode = "discovered",
  uiCopy,
}: DiaryNotebookProps) {
  const {
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
  } = useDiaryNotebookState({ entries, initialLocale, unlockMode });
  const localizedUi = uiCopy[locale] ?? uiCopy.ja;

  return (
    <div className="space-y-6">
      <style>{`
        @keyframes diary-page-next {
          0% { opacity: 0.84; transform: rotateY(-18deg) translateX(18px); }
          100% { opacity: 1; transform: rotateY(0deg) translateX(0); }
        }

        @keyframes diary-page-previous {
          0% { opacity: 0.84; transform: rotateY(18deg) translateX(-18px); }
          100% { opacity: 1; transform: rotateY(0deg) translateX(0); }
        }

        .diary-book-stage {
          perspective: 1500px;
        }

        .diary-book-pages {
          transform-style: preserve-3d;
        }

        .diary-book-pages.is-turning-next {
          animation: diary-page-next 520ms cubic-bezier(.2,.74,.21,1);
          transform-origin: right center;
        }

        .diary-book-pages.is-turning-previous {
          animation: diary-page-previous 520ms cubic-bezier(.2,.74,.21,1);
          transform-origin: left center;
        }

        @media (prefers-reduced-motion: reduce) {
          .diary-book-pages.is-turning-next,
          .diary-book-pages.is-turning-previous {
            animation: none;
          }
        }
      `}</style>

      <div className="flex flex-col gap-4 rounded-[24px] border border-[rgba(141,105,52,0.2)] bg-[linear-gradient(180deg,rgba(255,251,244,0.96),rgba(247,238,224,0.92))] px-5 py-5 shadow-[0_18px_48px_rgba(78,52,24,0.1)] sm:flex-row sm:items-center sm:justify-between sm:px-7">
        <div className="space-y-1.5">
          <p className="text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-[#6d4b07]">
            {localizedUi.diaryProgressLabel}
          </p>
          <p className="text-2xl font-semibold text-[#3f2e20]">
            {foundCount} / {entries.length}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-[rgba(126,87,0,0.12)] bg-white/65 px-4 py-2 text-sm text-[#5c4a38] shadow-[0_10px_24px_rgba(85,61,35,0.08)]">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-[#d68729]" />
            <span>
              {localizedUi.diaryDiscoveredLabel} {foundCount} /{" "}
              {localizedUi.diaryUndiscoveredLabel} {hiddenCount}
            </span>
          </div>
          <span className="rounded-full bg-[rgba(84,71,58,0.08)] px-4 py-2 text-sm font-semibold text-[#5c4a38]">
            {visiblePageCount === 1
              ? `${safeCurrentPage + 1} / ${entries.length}`
              : `${safeCurrentPage + 1}-${safeCurrentPage + visibleEntries.length} / ${entries.length}`}
          </span>
        </div>
      </div>

      <div className="diary-book-stage">
        <div className="relative rounded-[30px] bg-[linear-gradient(135deg,#7b4f2a,#3f2b1c)] p-3 shadow-[0_26px_68px_rgba(65,41,19,0.24)]">
          <div className="pointer-events-none absolute inset-y-6 left-1/2 z-20 hidden w-[3px] -translate-x-1/2 rounded-full bg-[linear-gradient(180deg,rgba(0,0,0,0.02),rgba(72,42,18,0.34),rgba(255,255,255,0.18))] md:block" />
          <div
            className={cn(
              "diary-book-pages grid gap-2 md:grid-cols-2",
              turnDirection === "next" && "is-turning-next",
              turnDirection === "previous" && "is-turning-previous",
            )}
          >
            {visibleEntries.map((entry, visibleIndex) => {
              const pageIndex = safeCurrentPage + visibleIndex;
              const timeLabel =
                entry.timeMode === "day"
                  ? localizedUi.dayLabel
                  : entry.timeMode === "night"
                    ? localizedUi.nightLabel
                    : localizedUi.bothLabel;

              return (
                <DiaryPage
                  key={`${entry.spotId}-${pageIndex}`}
                  entry={entry}
                  index={pageIndex}
                  locale={locale}
                  isDiscovered={
                    isAllUnlocked || Boolean(discovered[entry.spotId])
                  }
                  timeLabel={timeLabel}
                  localizedUi={localizedUi}
                  side={
                    visiblePageCount === 1
                      ? "single"
                      : visibleIndex === 0
                        ? "left"
                        : "right"
                  }
                />
              );
            })}
          </div>
          <div className="absolute inset-3 z-30 grid grid-cols-2">
            <button
              type="button"
              onClick={() => turnPage("previous")}
              disabled={!canGoPrevious}
              className="cursor-w-resize rounded-l-[24px] bg-transparent disabled:cursor-default"
              aria-label="Previous diary page"
            >
              <span className="sr-only">Previous diary page</span>
            </button>
            <button
              type="button"
              onClick={() => turnPage("next")}
              disabled={!canGoNext}
              className="cursor-e-resize rounded-r-[24px] bg-transparent disabled:cursor-default"
              aria-label="Next diary page"
            >
              <span className="sr-only">Next diary page</span>
            </button>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => turnPage("previous")}
          disabled={!canGoPrevious}
          className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-[rgba(126,87,0,0.18)] bg-white/78 text-[#6d4b07] shadow-[0_10px_24px_rgba(85,61,35,0.1)] transition hover:bg-[#fff6df] disabled:cursor-not-allowed disabled:opacity-35"
          aria-label="Previous diary page"
        >
          <PageTurnIcon direction="previous" />
        </button>

        <div className="flex flex-wrap justify-center gap-2">
          {entries.map((entry, index) => {
            const isCurrent =
              index >= safeCurrentPage && index < safeCurrentPage + pageStep;
            const isDiscovered =
              isAllUnlocked || Boolean(discovered[entry.spotId]);

            return (
              <button
                key={entry.spotId}
                type="button"
                onClick={() => goToEntryIndex(index)}
                className={cn(
                  "h-2.5 rounded-full transition-all",
                  isCurrent
                    ? "w-8 bg-[#7a4c20]"
                    : "w-2.5 bg-[rgba(122,76,32,0.24)]",
                  isDiscovered && !isCurrent && "bg-[#d68729]",
                )}
                aria-label={`Diary page ${index + 1}`}
                aria-current={isCurrent ? "page" : undefined}
              />
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => turnPage("next")}
          disabled={!canGoNext}
          className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-[rgba(126,87,0,0.18)] bg-white/78 text-[#6d4b07] shadow-[0_10px_24px_rgba(85,61,35,0.1)] transition hover:bg-[#fff6df] disabled:cursor-not-allowed disabled:opacity-35"
          aria-label="Next diary page"
        >
          <PageTurnIcon direction="next" />
        </button>
      </div>
    </div>
  );
}
