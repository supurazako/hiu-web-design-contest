export const diaryStorageKey = "jozankei-time-map:discovered-diaries";
export const diaryDiscoveredEventName = "time-map:diary-discovered";

export type DiscoveredDiaryMap = Record<string, true>;

const canUseStorage = () => typeof window !== "undefined" && typeof window.localStorage !== "undefined";

export const loadDiscoveredDiaries = (): DiscoveredDiaryMap => {
  if (!canUseStorage()) return {};

  try {
    const raw = window.localStorage.getItem(diaryStorageKey);
    if (!raw) return {};

    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};

    return Object.fromEntries(
      Object.entries(parsed).filter(
        (entry): entry is [string, true] => typeof entry[0] === "string" && entry[1] === true,
      ),
    );
  } catch {
    return {};
  }
};

const writeDiscoveredDiaries = (next: DiscoveredDiaryMap) => {
  if (!canUseStorage()) return;
  window.localStorage.setItem(diaryStorageKey, JSON.stringify(next));
};

export const isDiaryDiscovered = (spotId: string) => Boolean(loadDiscoveredDiaries()[spotId]);

export const saveDiscoveredDiary = (spotId: string) => {
  if (!canUseStorage()) return false;

  const current = loadDiscoveredDiaries();
  if (current[spotId]) return false;

  const next = {
    ...current,
    [spotId]: true,
  } satisfies DiscoveredDiaryMap;

  writeDiscoveredDiaries(next);
  window.dispatchEvent(
    new CustomEvent(diaryDiscoveredEventName, {
      detail: { spotId, discovered: next },
    }),
  );
  return true;
};
