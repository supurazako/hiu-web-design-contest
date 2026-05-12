import { clamp } from "./map-utils";
import type { MapPoint } from "./map-types";

const webkitMaskProperties = [
  "-webkit-mask-image",
  "-webkit-mask-repeat",
  "-webkit-mask-size",
  "-webkit-mask-position",
] as const;

export const clearMaskStyles = (pane: HTMLElement) => {
  pane.style.maskImage = "";
  pane.style.maskRepeat = "";
  pane.style.maskSize = "";
  pane.style.maskPosition = "";
  webkitMaskProperties.forEach((property) => {
    pane.style.removeProperty(property);
  });
};

export const setMaskImage = (
  pane: HTMLElement,
  options: { image: string; repeat: string; size: string; position: string },
) => {
  pane.style.maskImage = options.image;
  pane.style.maskRepeat = options.repeat;
  pane.style.maskSize = options.size;
  pane.style.maskPosition = options.position;
  pane.style.setProperty("-webkit-mask-image", options.image);
  pane.style.setProperty("-webkit-mask-repeat", options.repeat);
  pane.style.setProperty("-webkit-mask-size", options.size);
  pane.style.setProperty("-webkit-mask-position", options.position);
};

export const setMaskReference = (pane: HTMLElement, maskId: string) => {
  const maskValue = `url(#${maskId})`;
  pane.style.maskImage = maskValue;
  pane.style.maskRepeat = "no-repeat";
  pane.style.maskSize = "100% 100%";
  pane.style.maskPosition = "0 0";
  pane.style.setProperty("-webkit-mask-image", maskValue);
  pane.style.setProperty("-webkit-mask-repeat", "no-repeat");
  pane.style.setProperty("-webkit-mask-size", "100% 100%");
  pane.style.setProperty("-webkit-mask-position", "0 0");
};

export const setPaneState = (
  pane: HTMLElement,
  options: { visible: boolean; clipPath: string },
) => {
  const nextOpacity = options.visible ? "1" : "0";
  const nextVisibility = options.visible ? "visible" : "hidden";
  const nextClipPath = options.visible ? options.clipPath : "none";
  if (pane.style.opacity !== nextOpacity) pane.style.opacity = nextOpacity;
  if (pane.style.visibility !== nextVisibility)
    pane.style.visibility = nextVisibility;
  if (pane.style.clipPath !== nextClipPath) pane.style.clipPath = nextClipPath;
};

export const setBlendPaneState = (
  pane: HTMLElement,
  opacity: number,
  clipPath = "none",
) => {
  const nextOpacity = String(opacity);
  const nextVisibility = opacity > 0 ? "visible" : "hidden";
  if (pane.style.opacity !== nextOpacity) pane.style.opacity = nextOpacity;
  if (pane.style.visibility !== nextVisibility)
    pane.style.visibility = nextVisibility;
  if (pane.style.clipPath !== clipPath) pane.style.clipPath = clipPath;
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
