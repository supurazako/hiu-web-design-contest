export type DisplayMode = "single" | "compare" | "magnifier" | "clock" | "scratch";
export type TimeMode = "day" | "night";
export type MapPoint = { x: number; y: number };
export type PointerBounds = Pick<DOMRectReadOnly, "left" | "right" | "top" | "bottom">;
