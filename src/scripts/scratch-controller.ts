import type { MapPoint, PointerBounds } from "./map-types";
import { clearMaskStyles, setMaskReference } from "./pane-utils";

type ScratchMaskLayout = {
  width: number;
  height: number;
  targets: { pane: HTMLElement; maskId: string; maskX: number; maskY: number; width: number; height: number }[];
  inverseTargets: { pane: HTMLElement; maskId: string; maskX: number; maskY: number; width: number; height: number }[];
};

type ScratchControllerOptions = {
  map: L.Map;
  surface: HTMLCanvasElement;
  mapElement: HTMLElement;
  getMaskTargets: () => HTMLElement[];
  getInverseMaskTargets: () => HTMLElement[];
  brushRadius?: number;
  minPointDistance?: number;
  pixelRatio?: number;
};

type ScratchTransform = {
  a: number;
  b: number;
  c: number;
  d: number;
  e: number;
  f: number;
};

type ScratchStroke = {
  localBrushRadius: number;
  points: MapPoint[];
  path: SVGPathElement;
};

type ZoomSnapshot = {
  center: L.LatLng;
  zoom: number;
  transform: ScratchTransform;
};

const SVG_NS = "http://www.w3.org/2000/svg";
let scratchMaskIdCounter = 0;

const createSvgElement = <K extends keyof SVGElementTagNameMap>(tagName: K) =>
  document.createElementNS(SVG_NS, tagName);

const identityTransform = (): ScratchTransform => ({
  a: 1,
  b: 0,
  c: 0,
  d: 1,
  e: 0,
  f: 0,
});

const multiplyTransform = (left: ScratchTransform, right: ScratchTransform): ScratchTransform => ({
  a: left.a * right.a + left.c * right.b,
  b: left.b * right.a + left.d * right.b,
  c: left.a * right.c + left.c * right.d,
  d: left.b * right.c + left.d * right.d,
  e: left.a * right.e + left.c * right.f + left.e,
  f: left.b * right.e + left.d * right.f + left.f,
});

const scaleTransform = (scale: number): ScratchTransform => ({
  a: scale,
  b: 0,
  c: 0,
  d: scale,
  e: 0,
  f: 0,
});

const translateTransform = (x: number, y: number): ScratchTransform => ({
  a: 1,
  b: 0,
  c: 0,
  d: 1,
  e: x,
  f: y,
});

const invertTransform = (transform: ScratchTransform): ScratchTransform => {
  const determinant = transform.a * transform.d - transform.b * transform.c;
  if (Math.abs(determinant) < 0.000001) return identityTransform();

  return {
    a: transform.d / determinant,
    b: -transform.b / determinant,
    c: -transform.c / determinant,
    d: transform.a / determinant,
    e: (transform.c * transform.f - transform.d * transform.e) / determinant,
    f: (transform.b * transform.e - transform.a * transform.f) / determinant,
  };
};

const applyTransformToPoint = (point: MapPoint, transform: ScratchTransform): MapPoint => ({
  x: transform.a * point.x + transform.c * point.y + transform.e,
  y: transform.b * point.x + transform.d * point.y + transform.f,
});

const getTransformScale = (transform: ScratchTransform) => Math.hypot(transform.a, transform.b);

const serializeTransform = (transform: ScratchTransform) =>
  `matrix(${transform.a} ${transform.b} ${transform.c} ${transform.d} ${transform.e} ${transform.f})`;

const pathDataForPoints = (points: MapPoint[]) => {
  if (points.length === 0) return "";
  if (points.length === 1) {
    const point = points[0];
    return `M ${point.x} ${point.y} L ${point.x} ${point.y}`;
  }
  return points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ");
};

export const createScratchController = ({
  map,
  surface,
  mapElement,
  getMaskTargets,
  getInverseMaskTargets,
  brushRadius = 48,
  minPointDistance = 4,
  pixelRatio = 1,
}: ScratchControllerOptions) => {
  const context = surface.getContext("2d");
  const strokes: ScratchStroke[] = [];
  let currentStroke: ScratchStroke | null = null;
  let lastScreenPoint: MapPoint | null = null;
  let isScratching = false;
  let pointerBounds: PointerBounds | null = null;
  let maskLayout: ScratchMaskLayout | null = null;
  let maskFrame: number | null = null;
  let currentTransform = identityTransform();
  let animatedTransform: ScratchTransform | null = null;
  let zoomSnapshot: ZoomSnapshot | null = null;

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

  const configureDrawingContext = (target: CanvasRenderingContext2D | null) => {
    if (!target) return;
    target.setTransform(1, 0, 0, 1, 0, 0);
    target.scale(pixelRatio, pixelRatio);
  };

  configureDrawingContext(context);

  const getLogicalSurfaceSize = () => {
    const { width, height } = mapElement.getBoundingClientRect();
    return {
      width: Math.round(width),
      height: Math.round(height),
    };
  };

  const clearSurface = () => {
    if (!context) return;
    const { width, height } = getLogicalSurfaceSize();
    context.globalCompositeOperation = "source-over";
    context.clearRect(0, 0, width, height);
  };

  const getZoomAnchor = (targetCenter: L.LatLng, targetZoom: number): MapPoint => {
    const snapshot = zoomSnapshot;
    const { width, height } = getLogicalSurfaceSize();
    const viewportCenter = { x: width / 2, y: height / 2 };
    if (!snapshot) return viewportCenter;

    const scale = map.getZoomScale(targetZoom, snapshot.zoom);
    if (!Number.isFinite(scale) || scale === 1) return viewportCenter;

    const snapshotCenterWorld = map.project(snapshot.center, snapshot.zoom);
    const targetCenterWorld = map.project(targetCenter, snapshot.zoom);
    const offsetX = targetCenterWorld.x - snapshotCenterWorld.x;
    const offsetY = targetCenterWorld.y - snapshotCenterWorld.y;
    const denominator = 1 - 1 / scale;

    if (!Number.isFinite(denominator) || Math.abs(denominator) < 0.000001) {
      return viewportCenter;
    }

    return {
      x: viewportCenter.x + offsetX / denominator,
      y: viewportCenter.y + offsetY / denominator,
    };
  };

  const computeZoomTransform = (targetCenter: L.LatLng, targetZoom: number) => {
    const snapshot = zoomSnapshot;
    if (!snapshot) return currentTransform;

    const scale = map.getZoomScale(targetZoom, snapshot.zoom);
    const anchor = getZoomAnchor(targetCenter, targetZoom);

    return multiplyTransform(
      translateTransform(anchor.x, anchor.y),
      multiplyTransform(
        scaleTransform(scale),
        multiplyTransform(translateTransform(-anchor.x, -anchor.y), snapshot.transform),
      ),
    );
  };

  const syncGeometryTransform = (transform: ScratchTransform = animatedTransform ?? currentTransform) => {
    const transformValue = serializeTransform(transform);
    revealGeometry.setAttribute("transform", transformValue);
    inverseGeometry.setAttribute("transform", transformValue);
  };

  const updateStrokePath = (stroke: ScratchStroke) => {
    stroke.path.setAttribute("d", pathDataForPoints(stroke.points));
    stroke.path.setAttribute("stroke-width", String(stroke.localBrushRadius * 2));
  };

  const clonePathForInverse = (path: SVGPathElement) => {
    const inversePath = path.cloneNode(true) as SVGPathElement;
    return inversePath;
  };

  const syncCanvasStroke = (stroke: ScratchStroke) => {
    if (!context || stroke.points.length === 0) return;
    const points = stroke.points.map((point) => applyTransformToPoint(point, currentTransform));
    const currentBrushRadius = stroke.localBrushRadius * getTransformScale(currentTransform);

    context.globalCompositeOperation = "source-over";
    context.lineCap = "round";
    context.lineJoin = "round";
    context.lineWidth = currentBrushRadius * 2;
    context.strokeStyle = "rgba(255, 255, 255, 1)";
    context.fillStyle = "rgba(255, 255, 255, 1)";

    if (points.length === 1) {
      context.beginPath();
      context.arc(points[0].x, points[0].y, currentBrushRadius, 0, Math.PI * 2);
      context.fill();
      return;
    }

    context.beginPath();
    context.moveTo(points[0].x, points[0].y);
    points.slice(1).forEach((point) => {
      context.lineTo(point.x, point.y);
    });
    context.stroke();
  };

  const renderCanvas = () => {
    clearSurface();
    strokes.forEach(syncCanvasStroke);
  };

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
    if (inverse) {
      use.setAttribute("stroke", "#000000");
    } else {
      use.setAttribute("stroke", "#ffffff");
    }
    mask.appendChild(use);
  };

  const invalidateLayout = () => {
    maskLayout = null;
  };

  const syncSurfaceSize = () => {
    invalidateLayout();
    const { width, height } = getLogicalSurfaceSize();
    const nextWidth = Math.round(width * pixelRatio);
    const nextHeight = Math.round(height * pixelRatio);
    const sizeChanged = surface.width !== nextWidth || surface.height !== nextHeight;
    if (!sizeChanged) return false;

    surface.width = nextWidth;
    surface.height = nextHeight;
    surface.style.width = `${width}px`;
    surface.style.height = `${height}px`;
    configureDrawingContext(context);
    return true;
  };

  const getPointFromPointer = (
    clientX: number,
    clientY: number,
    bounds: PointerBounds = pointerBounds ?? mapElement.getBoundingClientRect(),
  ): MapPoint | null => {
    if (clientX < bounds.left || clientX > bounds.right || clientY < bounds.top || clientY > bounds.bottom) {
      return null;
    }
    return {
      x: clientX - bounds.left,
      y: clientY - bounds.top,
    };
  };

  const toLocalPoint = (screenPoint: MapPoint) => applyTransformToPoint(screenPoint, invertTransform(currentTransform));

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
      width: Math.round(mapRect.width),
      height: Math.round(mapRect.height),
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

  const applyMask = () => {
    if (maskFrame !== null) {
      window.cancelAnimationFrame(maskFrame);
      maskFrame = null;
    }
    drawMask();
  };

  const clearMask = () => {
    if (maskFrame !== null) {
      window.cancelAnimationFrame(maskFrame);
      maskFrame = null;
    }
    getMaskTargets().forEach(clearMaskStyles);
    getInverseMaskTargets().forEach(clearMaskStyles);
  };

  const redraw = () => {
    syncGeometryTransform(currentTransform);
    renderCanvas();
    applyMask();
  };

  const reset = () => {
    strokes.length = 0;
    currentStroke = null;
    lastScreenPoint = null;
    isScratching = false;
    pointerBounds = null;
    currentTransform = identityTransform();
    animatedTransform = null;
    zoomSnapshot = null;
    revealGeometry.replaceChildren();
    inverseGeometry.replaceChildren();
    clearSurface();
    applyMask();
  };

  const eraseAtPoint = (screenPoint: MapPoint) => {
    if (lastScreenPoint) {
      const distance = Math.hypot(screenPoint.x - lastScreenPoint.x, screenPoint.y - lastScreenPoint.y);
      if (distance < minPointDistance) return;
    }

    const localPoint = toLocalPoint(screenPoint);
    if (!currentStroke) {
      const path = createSvgElement("path");
      path.setAttribute("fill", "none");
      const inversePath = clonePathForInverse(path);
      currentStroke = {
        localBrushRadius: brushRadius / getTransformScale(currentTransform),
        points: [localPoint],
        path,
      };
      path.setAttribute("stroke-width", String(currentStroke.localBrushRadius * 2));
      inversePath.setAttribute("stroke-width", String(currentStroke.localBrushRadius * 2));
      revealGeometry.appendChild(path);
      inverseGeometry.appendChild(inversePath);
      strokes.push(currentStroke);
    } else {
      currentStroke.points.push(localPoint);
    }

    const strokeIndex = strokes.indexOf(currentStroke);
    updateStrokePath(currentStroke);
    const inversePath = inverseGeometry.children.item(strokeIndex) as SVGPathElement | null;
    if (inversePath) {
      inversePath.setAttribute("d", currentStroke.path.getAttribute("d") ?? "");
      inversePath.setAttribute("stroke-width", currentStroke.path.getAttribute("stroke-width") ?? "0");
    }

    lastScreenPoint = screenPoint;
    renderCanvas();
    scheduleMask();
  };

  const begin = (clientX: number, clientY: number) => {
    pointerBounds = mapElement.getBoundingClientRect();
    const point = getPointFromPointer(clientX, clientY, pointerBounds);
    if (!point) {
      pointerBounds = null;
      return false;
    }
    isScratching = true;
    currentStroke = null;
    lastScreenPoint = null;
    zoomSnapshot = null;
    eraseAtPoint(point);
    applyMask();
    return true;
  };

  const move = (clientX: number, clientY: number) => {
    if (!isScratching) return;
    const point = getPointFromPointer(clientX, clientY);
    if (!point) {
      currentStroke = null;
      lastScreenPoint = null;
      return;
    }
    eraseAtPoint(point);
  };

  const moveFromPointerEvent = (event: PointerEvent) => {
    const samples = typeof event.getCoalescedEvents === "function" ? event.getCoalescedEvents() : [event];
    samples.forEach((sample) => {
      move(sample.clientX, sample.clientY);
    });
  };

  const end = () => {
    isScratching = false;
    currentStroke = null;
    lastScreenPoint = null;
    pointerBounds = null;
  };

  const captureZoomSnapshot = () => {
    animatedTransform = null;
    zoomSnapshot = {
      center: map.getCenter(),
      zoom: map.getZoom(),
      transform: { ...currentTransform },
    };
  };

  const transformForZoom = (targetCenter: L.LatLng, targetZoom: number) => {
    if (!zoomSnapshot) return;
    animatedTransform = computeZoomTransform(targetCenter, targetZoom);
    syncGeometryTransform(animatedTransform);
  };

  const commitZoomTransform = (targetCenter: L.LatLng, targetZoom: number) => {
    if (!zoomSnapshot) return;
    currentTransform = computeZoomTransform(targetCenter, targetZoom);
    animatedTransform = null;
    zoomSnapshot = null;
    syncGeometryTransform(currentTransform);
    renderCanvas();
  };

  const isRevealedAtPoint = (point: MapPoint) => {
    if (!context || surface.hidden) return false;
    const sampleX = Math.round(point.x * pixelRatio);
    const sampleY = Math.round(point.y * pixelRatio);
    if (sampleX < 0 || sampleY < 0 || sampleX >= surface.width || sampleY >= surface.height) return false;
    const pixel = context.getImageData(sampleX, sampleY, 1, 1).data;
    return pixel[3] > 0;
  };

  const isActive = () => isScratching;

  return {
    applyMask,
    begin,
    captureZoomSnapshot,
    clearMask,
    commitZoomTransform,
    end,
    getPointFromPointer,
    invalidateLayout,
    isActive,
    isRevealedAtPoint,
    moveFromPointerEvent,
    redraw,
    reset,
    syncSurfaceSize,
    transformForZoom,
  };
};
