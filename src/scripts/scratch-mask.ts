import { clearMaskStyles, setMaskReference } from "./pane-utils";

export type ScratchMaskGeometry = {
  revealGeometry: SVGGElement;
  inverseGeometry: SVGGElement;
};

type ScratchMaskLayout = {
  targets: { pane: HTMLElement; maskId: string; maskX: number; maskY: number; width: number; height: number }[];
  inverseTargets: { pane: HTMLElement; maskId: string; maskX: number; maskY: number; width: number; height: number }[];
};

type ScratchMaskOptions = {
  mapElement: HTMLElement;
  getMaskTargets: () => HTMLElement[];
  getInverseMaskTargets: () => HTMLElement[];
};

const SVG_NS = "http://www.w3.org/2000/svg";
let scratchMaskIdCounter = 0;

export const createSvgElement = <K extends keyof SVGElementTagNameMap>(tagName: K) =>
  document.createElementNS(SVG_NS, tagName);

export const createScratchMaskController = ({
  mapElement,
  getMaskTargets,
  getInverseMaskTargets,
}: ScratchMaskOptions) => {
  let maskLayout: ScratchMaskLayout | null = null;
  let maskFrame: number | null = null;

  const scratchMaskHost = mapElement.parentElement ?? mapElement;
  const maskSvg = createSvgElement("svg");
  const defs = createSvgElement("defs");
  const revealGeometry = createSvgElement("g");
  const inverseGeometry = createSvgElement("g");
  const revealContent = createSvgElement("g");
  const inverseContent = createSvgElement("g");

  revealContent.setAttribute("fill", "none");
  revealContent.setAttribute("stroke", "#ffffff");
  revealContent.setAttribute("stroke-linecap", "round");
  revealContent.setAttribute("stroke-linejoin", "round");
  inverseContent.setAttribute("fill", "none");
  inverseContent.setAttribute("stroke", "#000000");
  inverseContent.setAttribute("stroke-linecap", "round");
  inverseContent.setAttribute("stroke-linejoin", "round");
  revealContent.appendChild(revealGeometry);
  inverseContent.appendChild(inverseGeometry);
  defs.appendChild(revealContent);
  defs.appendChild(inverseContent);
  maskSvg.appendChild(defs);
  maskSvg.setAttribute("aria-hidden", "true");
  maskSvg.style.position = "absolute";
  maskSvg.style.inset = "0";
  maskSvg.style.width = "0";
  maskSvg.style.height = "0";
  maskSvg.style.pointerEvents = "none";
  scratchMaskHost.appendChild(maskSvg);

  const ensureMaskDefinition = (
    maskId: string,
    width: number,
    height: number,
    maskX: number,
    maskY: number,
    contentId: string,
    inverse = false,
  ) => {
    let mask = defs.querySelector(`#${maskId}`) as SVGMaskElement | null;
    if (!mask) {
      mask = createSvgElement("mask");
      mask.id = maskId;
      mask.setAttribute("maskUnits", "userSpaceOnUse");
      mask.setAttribute("maskContentUnits", "userSpaceOnUse");
      defs.appendChild(mask);
    }

    mask.replaceChildren();
    mask.setAttribute("x", "0");
    mask.setAttribute("y", "0");
    mask.setAttribute("width", String(width));
    mask.setAttribute("height", String(height));

    const baseRect = createSvgElement("rect");
    baseRect.setAttribute("x", "0");
    baseRect.setAttribute("y", "0");
    baseRect.setAttribute("width", String(width));
    baseRect.setAttribute("height", String(height));
    baseRect.setAttribute("fill", inverse ? "#ffffff" : "#000000");
    mask.appendChild(baseRect);

    const use = createSvgElement("use");
    use.setAttribute("href", `#${contentId}`);
    use.setAttributeNS("http://www.w3.org/1999/xlink", "href", `#${contentId}`);
    use.setAttribute("transform", `translate(${maskX} ${maskY})`);
    use.setAttribute("stroke", inverse ? "#000000" : "#ffffff");
    mask.appendChild(use);
  };

  const invalidateLayout = () => {
    maskLayout = null;
  };

  const getMaskLayout = () => {
    if (maskLayout) return maskLayout;
    const mapRect = mapElement.getBoundingClientRect();
    const targets = getMaskTargets().map((pane) => {
      const paneRect = pane.getBoundingClientRect();
      return {
        pane,
        maskId: `scratch-mask-${scratchMaskIdCounter++}`,
        maskX: mapRect.left - paneRect.left,
        maskY: mapRect.top - paneRect.top,
        width: Math.round(paneRect.width),
        height: Math.round(paneRect.height),
      };
    });
    const inverseTargets = getInverseMaskTargets().map((pane) => {
      const paneRect = pane.getBoundingClientRect();
      return {
        pane,
        maskId: `scratch-mask-${scratchMaskIdCounter++}`,
        maskX: mapRect.left - paneRect.left,
        maskY: mapRect.top - paneRect.top,
        width: Math.round(paneRect.width),
        height: Math.round(paneRect.height),
      };
    });
    maskLayout = {
      targets,
      inverseTargets,
    };
    return maskLayout;
  };

  const drawMask = () => {
    maskFrame = null;
    const { targets, inverseTargets } = getMaskLayout();
    const revealContentId = "scratch-reveal-content";
    const inverseContentId = "scratch-inverse-content";
    revealContent.id = revealContentId;
    inverseContent.id = inverseContentId;

    targets.forEach(({ pane, maskId, maskX, maskY, width, height }) => {
      ensureMaskDefinition(maskId, width, height, maskX, maskY, revealContentId, false);
      setMaskReference(pane, maskId);
    });

    inverseTargets.forEach(({ pane, maskId, maskX, maskY, width, height }) => {
      ensureMaskDefinition(maskId, width, height, maskX, maskY, inverseContentId, true);
      setMaskReference(pane, maskId);
    });
  };

  const scheduleMask = () => {
    if (maskFrame !== null) return;
    maskFrame = window.requestAnimationFrame(drawMask);
  };

  const cancelScheduledMask = () => {
    if (maskFrame === null) return;
    window.cancelAnimationFrame(maskFrame);
    maskFrame = null;
  };

  const applyMask = () => {
    cancelScheduledMask();
    drawMask();
  };

  const clearMask = () => {
    cancelScheduledMask();
    getMaskTargets().forEach(clearMaskStyles);
    getInverseMaskTargets().forEach(clearMaskStyles);
  };

  return {
    applyMask,
    clearMask,
    geometry: {
      revealGeometry,
      inverseGeometry,
    },
    invalidateLayout,
    scheduleMask,
  };
};
