import { clamp } from "./map-utils";
import type { MapPoint } from "./map-types";

export const clearMaskStyles = (pane: HTMLElement) => {
  pane.style.maskImage = "";
  pane.style.maskRepeat = "";
  pane.style.maskSize = "";
  pane.style.maskPosition = "";
  pane.style.webkitMaskImage = "";
  pane.style.webkitMaskRepeat = "";
  pane.style.webkitMaskSize = "";
  pane.style.webkitMaskPosition = "";
};

export const setMaskImage = (
  pane: HTMLElement,
  options: { image: string; repeat: string; size: string; position: string },
) => {
  pane.style.maskImage = options.image;
  pane.style.maskRepeat = options.repeat;
  pane.style.maskSize = options.size;
  pane.style.maskPosition = options.position;
  pane.style.webkitMaskImage = options.image;
  pane.style.webkitMaskRepeat = options.repeat;
  pane.style.webkitMaskSize = options.size;
  pane.style.webkitMaskPosition = options.position;
};

export const setPaneState = (pane: HTMLElement, options: { visible: boolean; clipPath: string }) => {
  pane.style.opacity = options.visible ? "1" : "0";
  pane.style.visibility = options.visible ? "visible" : "hidden";
  pane.style.clipPath = options.visible ? options.clipPath : "none";
};

export const setBlendPaneState = (pane: HTMLElement, opacity: number, clipPath = "none") => {
  pane.style.opacity = String(opacity);
  pane.style.visibility = opacity > 0 ? "visible" : "hidden";
  pane.style.clipPath = clipPath;
};

export const clipPathForCircle = (
  mapElement: HTMLElement,
  pane: HTMLElement,
  point: MapPoint,
  radius: number,
) => {
  const mapRect = mapElement.getBoundingClientRect();
  const paneRect = pane.getBoundingClientRect();
  const x = clamp(mapRect.left - paneRect.left + point.x, 0, paneRect.width);
  const y = clamp(mapRect.top - paneRect.top + point.y, 0, paneRect.height);
  return `circle(${radius}px at ${x}px ${y}px)`;
};

export const applyInverseCircleMask = (
  mapElement: HTMLElement,
  pane: HTMLElement,
  point: MapPoint,
  radius: number,
) => {
  const mapRect = mapElement.getBoundingClientRect();
  const paneRect = pane.getBoundingClientRect();
  const x = clamp(mapRect.left - paneRect.left + point.x, 0, paneRect.width);
  const y = clamp(mapRect.top - paneRect.top + point.y, 0, paneRect.height);
  const maskImage = `radial-gradient(circle ${radius}px at ${x}px ${y}px, transparent 0 ${Math.max(radius - 1, 0)}px, #fff ${radius}px)`;
  setMaskImage(pane, {
    image: maskImage,
    repeat: "no-repeat",
    size: "100% 100%",
    position: "0 0",
  });
};
