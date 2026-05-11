import type { MapPoint } from "./map-types";
import { applyTransformToPoint, getTransformScale, type ScratchTransform } from "./scratch-transform";

export type ScratchCanvasStroke = {
  localBrushRadius: number;
  points: MapPoint[];
};

export const createScratchCanvasController = ({
  surface,
  mapElement,
  pixelRatio,
}: {
  surface: HTMLCanvasElement;
  mapElement: HTMLElement;
  pixelRatio: number;
}) => {
  const context = surface.getContext("2d");

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

  const syncSurfaceSize = () => {
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

  const syncStroke = (stroke: ScratchCanvasStroke, transform: ScratchTransform) => {
    if (!context || stroke.points.length === 0) return;
    const points = stroke.points.map((point) => applyTransformToPoint(point, transform));
    const currentBrushRadius = stroke.localBrushRadius * getTransformScale(transform);

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

  const renderStrokes = (strokes: ScratchCanvasStroke[], transform: ScratchTransform) => {
    clearSurface();
    strokes.forEach((stroke) => syncStroke(stroke, transform));
  };

  const isRevealedAtPoint = (point: MapPoint) => {
    if (!context || surface.hidden) return false;
    const sampleX = Math.round(point.x * pixelRatio);
    const sampleY = Math.round(point.y * pixelRatio);
    if (sampleX < 0 || sampleY < 0 || sampleX >= surface.width || sampleY >= surface.height) return false;
    const pixel = context.getImageData(sampleX, sampleY, 1, 1).data;
    return pixel[3] > 0;
  };

  configureDrawingContext(context);

  return {
    clearSurface,
    getLogicalSurfaceSize,
    isRevealedAtPoint,
    renderStrokes,
    syncSurfaceSize,
  };
};
