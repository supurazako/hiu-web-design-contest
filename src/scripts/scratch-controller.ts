import type { MapPoint, PointerBounds } from "./map-types";
import { clearMaskStyles, setMaskImage } from "./pane-utils";

type ScratchMaskLayout = {
  width: number;
  height: number;
  targets: { pane: HTMLElement; maskX: number; maskY: number }[];
  inverseTargets: { pane: HTMLElement; maskX: number; maskY: number }[];
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
};

type ZoomSnapshot = {
  center: L.LatLng;
  zoom: number;
  width: number;
  height: number;
  transform: ScratchTransform;
};

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

const applyTransformToPoint = (point: MapPoint, transform: ScratchTransform): MapPoint => ({
  x: transform.a * point.x + transform.c * point.y + transform.e,
  y: transform.b * point.x + transform.d * point.y + transform.f,
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

const getTransformScale = (transform: ScratchTransform) => Math.hypot(transform.a, transform.b);

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
  const inverseSurface = document.createElement("canvas");
  const inverseContext = inverseSurface.getContext("2d");
  const strokes: ScratchStroke[] = [];
  let currentStroke: ScratchStroke | null = null;
  let lastScreenPoint: MapPoint | null = null;
  let isScratching = false;
  let pointerBounds: PointerBounds | null = null;
  let maskLayout: ScratchMaskLayout | null = null;
  let maskFrame: number | null = null;
  let currentTransform = identityTransform();
  let zoomSnapshot: ZoomSnapshot | null = null;

  const configureDrawingContext = (target: CanvasRenderingContext2D | null) => {
    if (!target) return;
    target.setTransform(1, 0, 0, 1, 0, 0);
    target.scale(pixelRatio, pixelRatio);
  };

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
    const { width, height } = snapshot ?? getLogicalSurfaceSize();
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

  const drawStroke = (stroke: ScratchStroke) => {
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

  const renderStrokes = () => {
    clearSurface();
    strokes.forEach(drawStroke);
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
    inverseSurface.width = nextWidth;
    inverseSurface.height = nextHeight;
    surface.style.width = `${width}px`;
    surface.style.height = `${height}px`;
    configureDrawingContext(context);
    configureDrawingContext(inverseContext);

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

  const toLocalPoint = (screenPoint: MapPoint) => {
    return applyTransformToPoint(screenPoint, invertTransform(currentTransform));
  };

  const getMaskLayout = () => {
    if (maskLayout) return maskLayout;
    const mapRect = mapElement.getBoundingClientRect();
    const { width, height } = mapRect;
    const targets = getMaskTargets().map((pane) => {
      const paneRect = pane.getBoundingClientRect();
      return {
        pane,
        maskX: mapRect.left - paneRect.left,
        maskY: mapRect.top - paneRect.top,
      };
    });
    const inverseTargets = getInverseMaskTargets().map((pane) => {
      const paneRect = pane.getBoundingClientRect();
      return {
        pane,
        maskX: mapRect.left - paneRect.left,
        maskY: mapRect.top - paneRect.top,
      };
    });
    maskLayout = { width, height, targets, inverseTargets };
    return maskLayout;
  };

  const drawMask = () => {
    maskFrame = null;
    const { width, height, targets, inverseTargets } = getMaskLayout();
    const maskUrl = `url(${surface.toDataURL("image/png")})`;
    let inverseMaskUrl = "";
    if (inverseContext) {
      inverseContext.globalCompositeOperation = "source-over";
      inverseContext.clearRect(0, 0, width, height);
      inverseContext.fillStyle = "rgba(255, 255, 255, 1)";
      inverseContext.fillRect(0, 0, width, height);
      inverseContext.globalCompositeOperation = "destination-out";
      inverseContext.drawImage(surface, 0, 0, width, height);
      inverseMaskUrl = `url(${inverseSurface.toDataURL("image/png")})`;
    }

    targets.forEach(({ pane, maskX, maskY }) => {
      setMaskImage(pane, {
        image: maskUrl,
        repeat: "no-repeat",
        size: `${Math.round(width)}px ${Math.round(height)}px`,
        position: `${Math.round(maskX)}px ${Math.round(maskY)}px`,
      });
    });
    inverseTargets.forEach(({ pane, maskX, maskY }) => {
      setMaskImage(pane, {
        image: inverseMaskUrl,
        repeat: "no-repeat",
        size: `${Math.round(width)}px ${Math.round(height)}px`,
        position: `${Math.round(maskX)}px ${Math.round(maskY)}px`,
      });
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
    renderStrokes();
    applyMask();
  };

  const reset = () => {
    strokes.length = 0;
    currentStroke = null;
    lastScreenPoint = null;
    isScratching = false;
    pointerBounds = null;
    currentTransform = identityTransform();
    zoomSnapshot = null;
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
      currentStroke = {
        localBrushRadius: brushRadius / getTransformScale(currentTransform),
        points: [localPoint],
      };
      strokes.push(currentStroke);
    } else {
      currentStroke.points.push(localPoint);
    }

    lastScreenPoint = screenPoint;
    renderStrokes();
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
    const { width, height } = getLogicalSurfaceSize();
    zoomSnapshot = {
      center: map.getCenter(),
      zoom: map.getZoom(),
      width,
      height,
      transform: { ...currentTransform },
    };
  };

  const transformForZoom = (targetCenter: L.LatLng, targetZoom: number) => {
    if (!zoomSnapshot) return;
    currentTransform = computeZoomTransform(targetCenter, targetZoom);
    redraw();
  };

  const commitZoomTransform = (targetCenter: L.LatLng, targetZoom: number) => {
    if (!zoomSnapshot) return;
    currentTransform = computeZoomTransform(targetCenter, targetZoom);
    zoomSnapshot = null;
    redraw();
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
