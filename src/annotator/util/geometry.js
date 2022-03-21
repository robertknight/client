/**
 * Return the intersection of two rects.
 *
 * @param {DOMRect} rectA
 * @param {DOMRect} rectB
 */
export function intersectRects(rectA, rectB) {
  const left = Math.max(rectA.left, rectB.left);
  const right = Math.min(rectA.right, rectB.right);
  const top = Math.max(rectA.top, rectB.top);
  const bottom = Math.min(rectA.bottom, rectB.bottom);
  return new DOMRect(left, top, right - left, bottom - top);
}

/**
 * Return `true` if a rect is _empty_.
 *
 * An empty rect is defined as one with zero or negative width/height, eg.
 * as returned by `new DOMRect()` or `Element.getBoundingClientRect()` for a
 * hidden element.
 *
 * @param {DOMRect} rect
 */
export function rectIsEmpty(rect) {
  return rect.width <= 0 || rect.height <= 0;
}

/**
 * Return true if the 1D lines a-b and c-d overlap (ie. the length of their
 * intersection is non-zero).
 *
 * For example, the following lines overlap:
 *
 *   a----b
 *      c------d
 *
 * The inputs must be normalized such that b >= a and d >= c.
 *
 * @param {number} a
 * @param {number} b
 * @param {number} c
 * @param {number} d
 */
function linesOverlap(a, b, c, d) {
  const maxStart = Math.max(a, c);
  const minEnd = Math.min(b, d);
  return maxStart < minEnd;
}

/**
 * Return true if the intersection of `rectB` and `rectA` is non-empty.
 *
 * @param {DOMRect} rectA
 * @param {DOMRect} rectB
 */
export function rectIntersects(rectA, rectB) {
  if (rectIsEmpty(rectA) || rectIsEmpty(rectB)) {
    return false;
  }

  return (
    linesOverlap(rectA.left, rectA.right, rectB.left, rectB.right) &&
    linesOverlap(rectA.top, rectA.bottom, rectB.top, rectB.bottom)
  );
}

/**
 * Return true if `rectB` is fully contained within `rectA`
 *
 * @param {DOMRect} rectA
 * @param {DOMRect} rectB
 */
export function rectContains(rectA, rectB) {
  if (rectIsEmpty(rectA) || rectIsEmpty(rectB)) {
    return false;
  }

  return (
    rectB.left >= rectA.left &&
    rectB.right <= rectA.right &&
    rectB.top >= rectA.top &&
    rectB.bottom <= rectA.bottom
  );
}

/**
 * Return true if two rects overlap vertically.
 *
 * @param {DOMRect} a
 * @param {DOMRect} b
 */
export function rectsOverlapVertically(a, b) {
  return linesOverlap(a.top, a.bottom, b.top, b.bottom);
}

/**
 * Return true if two rects overlap horizontally.
 *
 * @param {DOMRect} a
 * @param {DOMRect} b
 */
export function rectsOverlapHorizontally(a, b) {
  return linesOverlap(a.left, a.right, b.left, b.right);
}

/**
 * Return the union of two rects.
 *
 * The union of an empty rect (see {@link rectIsEmpty}) with a non-empty rect is
 * defined to be the non-empty rect. The union of two empty rects is an empty
 * rect.
 *
 * @param {DOMRect} a
 * @param {DOMRect} b
 */
export function unionRects(a, b) {
  if (rectIsEmpty(a)) {
    return b;
  } else if (rectIsEmpty(b)) {
    return a;
  }

  const left = Math.min(a.left, b.left);
  const top = Math.min(a.top, b.top);
  const right = Math.max(a.right, b.right);
  const bottom = Math.max(a.bottom, b.bottom);

  return new DOMRect(left, top, right - left, bottom - top);
}

/**
 * Return the point at the center of a rect.
 *
 * @param {DOMRect} rect
 */
export function rectCenter(rect) {
  return new DOMPoint(
    (rect.left + rect.right) / 2,
    (rect.top + rect.bottom) / 2
  );
}

/**
 * Return the manhattan distance between two points.
 *
 * This is useful when a cheap distance metric is needed.
 *
 * @param {DOMPoint} a
 * @param {DOMPoint} b
 */
export function manhattanDist(a, b) {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

/**
 * @param {number} value
 * @param {number} a
 * @param {number} b
 */
function inRange(value, a, b) {
  if (a <= b) {
    return value >= a && value <= b;
  } else {
    return value >= b && value <= a;
  }
}

/**
 * Return true if the lines a-b and c-d intersect.
 *
 * @param {DOMPoint} a
 * @param {DOMPoint} b
 * @param {DOMPoint} c
 * @param {DOMPoint} d
 */
export function linesIntersect(a, b, c, d) {
  // Find slope and intercept of each line.
  const m1 = (b.y - a.y) / (b.x - a.x);
  const c1 = m1 * a.x - a.y;
  const m2 = (d.y - c.y) / (d.x - c.x);
  const c2 = m2 * c.x - c.y;

  // Find x coordinate where lines would intersect if they had infinite length.
  const x = (c2 - c1) / (m1 - m2);

  // Check if the x coordinate lies on both lines.
  return inRange(x, a.x, b.x) && inRange(x, c.x, d.x);
}

