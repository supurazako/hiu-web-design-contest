import type { MapPoint } from "./map-types";

export type ScratchTransform = {
  a: number;
  b: number;
  c: number;
  d: number;
  e: number;
  f: number;
};

export const identityTransform = (): ScratchTransform => ({
  a: 1,
  b: 0,
  c: 0,
  d: 1,
  e: 0,
  f: 0,
});

export const multiplyTransform = (left: ScratchTransform, right: ScratchTransform): ScratchTransform => ({
  a: left.a * right.a + left.c * right.b,
  b: left.b * right.a + left.d * right.b,
  c: left.a * right.c + left.c * right.d,
  d: left.b * right.c + left.d * right.d,
  e: left.a * right.e + left.c * right.f + left.e,
  f: left.b * right.e + left.d * right.f + left.f,
});

export const scaleTransform = (scale: number): ScratchTransform => ({
  a: scale,
  b: 0,
  c: 0,
  d: scale,
  e: 0,
  f: 0,
});

export const translateTransform = (x: number, y: number): ScratchTransform => ({
  a: 1,
  b: 0,
  c: 0,
  d: 1,
  e: x,
  f: y,
});

export const invertTransform = (transform: ScratchTransform): ScratchTransform => {
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

export const applyTransformToPoint = (point: MapPoint, transform: ScratchTransform): MapPoint => ({
  x: transform.a * point.x + transform.c * point.y + transform.e,
  y: transform.b * point.x + transform.d * point.y + transform.f,
});

export const getTransformScale = (transform: ScratchTransform) => Math.hypot(transform.a, transform.b);

export const serializeTransform = (transform: ScratchTransform) =>
  `matrix(${transform.a} ${transform.b} ${transform.c} ${transform.d} ${transform.e} ${transform.f})`;
