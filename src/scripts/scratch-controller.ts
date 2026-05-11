import type { MapPoint, PointerBounds } from "./map-types";
import { createScratchCanvasController, type ScratchCanvasStroke } from "./scratch-canvas";
import { createScratchMaskController, createSvgElement } from "./scratch-mask";
import {
  applyTransformToPoint,
  getTransformScale,
  identityTransform,
  invertTransform,
  multiplyTransform,
  scaleTransform,
  serializeTransform,
  translateTransform,
  type ScratchTransform,
} from "./scratch-transform";

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

type ScratchStroke = {
  path: SVGPathElement;
} & ScratchCanvasStroke;

type ZoomSnapshot = {
  center: L.LatLng;
  zoom: number;
  transform: ScratchTransform;
};

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
  const strokes: ScratchStroke[] = [];
  let currentStroke: ScratchStroke | null = null;
  let lastScreenPoint: MapPoint | null = null;
  let isScratching = false;
  let pointerBounds: PointerBounds | null = null;
  let currentTransform = identityTransform();
  let animatedTransform: ScratchTransform | null = null;
  let zoomSnapshot: ZoomSnapshot | null = null;

  const scratchMask = createScratchMaskController({
    mapElement,
    getMaskTargets,
    getInverseMaskTargets,
  });
  const { revealGeometry, inverseGeometry } = scratchMask.geometry;
  const scratchCanvas = createScratchCanvasController({ surface, mapElement, pixelRatio });

  const getZoomAnchor = (targetCenter: L.LatLng, targetZoom: number): MapPoint => {
    const snapshot = zoomSnapshot;
    const { width, height } = scratchCanvas.getLogicalSurfaceSize();
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

  const renderCanvas = () => {
    scratchCanvas.renderStrokes(strokes, currentTransform);
  };

  const invalidateLayout = () => {
    scratchMask.invalidateLayout();
  };

  const syncSurfaceSize = () => {
    invalidateLayout();
    return scratchCanvas.syncSurfaceSize();
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

  const scheduleMask = scratchMask.scheduleMask;
  const applyMask = scratchMask.applyMask;
  const clearMask = scratchMask.clearMask;

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
    scratchCanvas.clearSurface();
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
    return scratchCanvas.isRevealedAtPoint(point);
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
