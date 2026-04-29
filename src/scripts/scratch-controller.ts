import type { MapPoint, PointerBounds } from "./map-types";
import { clearMaskStyles, setMaskImage } from "./pane-utils";

type ScratchMaskLayout = {
  width: number;
  height: number;
  targets: { pane: HTMLElement; maskX: number; maskY: number }[];
  inverseTargets: { pane: HTMLElement; maskX: number; maskY: number }[];
};

type ScratchControllerOptions = {
  surface: HTMLCanvasElement;
  mapElement: HTMLElement;
  getMaskTargets: () => HTMLElement[];
  getInverseMaskTargets: () => HTMLElement[];
  brushRadius?: number;
  minPointDistance?: number;
  pixelRatio?: number;
};

export const createScratchController = ({
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
  const strokes: MapPoint[][] = [];
  let currentStroke: MapPoint[] | null = null;
  let lastPoint: MapPoint | null = null;
  let isScratching = false;
  let pointerBounds: PointerBounds | null = null;
  let maskLayout: ScratchMaskLayout | null = null;
  let maskFrame: number | null = null;

  const invalidateLayout = () => {
    maskLayout = null;
  };

  const syncSurfaceSize = () => {
    invalidateLayout();
    const { width, height } = mapElement.getBoundingClientRect();
    const nextWidth = Math.round(width * pixelRatio);
    const nextHeight = Math.round(height * pixelRatio);
    const sizeChanged = surface.width !== nextWidth || surface.height !== nextHeight;
    if (!sizeChanged) return false;

    surface.width = nextWidth;
    surface.height = nextHeight;
    inverseSurface.width = nextWidth;
    inverseSurface.height = nextHeight;
    surface.style.width = `${Math.round(width)}px`;
    surface.style.height = `${Math.round(height)}px`;

    if (context) {
      context.setTransform(1, 0, 0, 1, 0, 0);
      context.scale(pixelRatio, pixelRatio);
    }
    if (inverseContext) {
      inverseContext.setTransform(1, 0, 0, 1, 0, 0);
      inverseContext.scale(pixelRatio, pixelRatio);
    }

    return true;
  };

  const paintOverlay = () => {
    if (!context) return;
    const { width, height } = mapElement.getBoundingClientRect();
    context.globalCompositeOperation = "source-over";
    context.clearRect(0, 0, width, height);
  };

  const eraseStroke = (points: MapPoint[]) => {
    if (!context || points.length === 0) return;
    context.globalCompositeOperation = "source-over";
    context.lineCap = "round";
    context.lineJoin = "round";
    context.lineWidth = brushRadius * 2;
    context.strokeStyle = "rgba(255, 255, 255, 1)";
    context.fillStyle = "rgba(255, 255, 255, 1)";

    if (points.length === 1) {
      context.beginPath();
      context.arc(points[0].x, points[0].y, brushRadius, 0, Math.PI * 2);
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

  const eraseSegment = (from: MapPoint | null, to: MapPoint) => {
    if (!context) return;
    context.globalCompositeOperation = "source-over";
    context.lineCap = "round";
    context.lineJoin = "round";
    context.lineWidth = brushRadius * 2;
    context.strokeStyle = "rgba(255, 255, 255, 1)";
    context.fillStyle = "rgba(255, 255, 255, 1)";

    if (!from) {
      context.beginPath();
      context.arc(to.x, to.y, brushRadius, 0, Math.PI * 2);
      context.fill();
      return;
    }

    context.beginPath();
    context.moveTo(from.x, from.y);
    context.lineTo(to.x, to.y);
    context.stroke();
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
    paintOverlay();
    strokes.forEach((stroke) => eraseStroke(stroke));
    applyMask();
  };

  const reset = () => {
    strokes.length = 0;
    currentStroke = null;
    lastPoint = null;
    isScratching = false;
    redraw();
  };

  const eraseAtPoint = (point: MapPoint) => {
    if (lastPoint) {
      const distance = Math.hypot(point.x - lastPoint.x, point.y - lastPoint.y);
      if (distance < minPointDistance) return;
    }

    const previousPoint = lastPoint;
    if (!currentStroke) {
      currentStroke = [point];
      strokes.push(currentStroke);
    } else {
      currentStroke.push(point);
    }
    eraseSegment(previousPoint, point);
    lastPoint = point;
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
    lastPoint = null;
    eraseAtPoint(point);
    applyMask();
    return true;
  };

  const move = (clientX: number, clientY: number) => {
    if (!isScratching) return;
    const point = getPointFromPointer(clientX, clientY);
    if (!point) {
      currentStroke = null;
      lastPoint = null;
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
    lastPoint = null;
    pointerBounds = null;
  };

  const isRevealedAtPoint = (point: MapPoint) => {
    if (!context || surface.hidden) return false;
    if (point.x < 0 || point.y < 0 || point.x >= surface.width || point.y >= surface.height) return false;
    const pixel = context.getImageData(Math.round(point.x), Math.round(point.y), 1, 1).data;
    return pixel[3] > 0;
  };

  const isActive = () => isScratching;

  return {
    applyMask,
    begin,
    clearMask,
    end,
    getPointFromPointer,
    invalidateLayout,
    isActive,
    isRevealedAtPoint,
    moveFromPointerEvent,
    redraw,
    reset,
    syncSurfaceSize,
  };
};
