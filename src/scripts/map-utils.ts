import type { TimeMode } from "./map-types";

export type { TimeMode } from "./map-types";

export const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export const oppositeTimeMode = (mode: TimeMode): TimeMode => (mode === "day" ? "night" : "day");

const smoothstep = (edge0: number, edge1: number, value: number) => {
  const x = clamp((value - edge0) / (edge1 - edge0), 0, 1);
  return x * x * (3 - 2 * x);
};

export const nightRatioForHour = (hour: number) => {
  const normalizedHour = ((hour % 24) + 24) % 24;
  if (normalizedHour >= 20 || normalizedHour < 4) return 1;
  if (normalizedHour >= 8 && normalizedHour < 16) return 0;
  if (normalizedHour >= 4 && normalizedHour < 8) return 1 - smoothstep(4, 8, normalizedHour);
  return smoothstep(16, 20, normalizedHour);
};

export const formatClockHour = (hour: number) => {
  const normalizedHour = ((hour % 24) + 24) % 24;
  const wholeHour = Math.floor(normalizedHour);
  const minutes = Math.round((normalizedHour - wholeHour) * 60);
  const adjustedHour = (wholeHour + Math.floor(minutes / 60)) % 24;
  const adjustedMinutes = minutes % 60;
  return `${String(adjustedHour).padStart(2, "0")}:${String(adjustedMinutes).padStart(2, "0")}`;
};

export const getInitialTimeMode = (): TimeMode => {
  const hour = new Date().getHours();
  return hour >= 6 && hour < 18 ? "day" : "night";
};
