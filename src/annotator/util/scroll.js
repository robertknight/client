/**
 * Return a promise that resolves on the next animation frame.
 */
function nextAnimationFrame() {
  return new Promise(resolve => {
    requestAnimationFrame(resolve);
  });
}

/**
 * Linearly interpolate between two values.
 *
 * @param {number} a
 * @param {number} b
 * @param {number} fraction - Value in [0, 1]
 */
function interpolate(a, b, fraction) {
  return a + fraction * (b - a);
}

/**
 * Return the offset of `element` from the top of a positioned ancestor `parent`.
 *
 * `parent` may be in the parent frame of the one that contains `element`
 * provided that both frames are same-origin.
 *
 * @param {HTMLElement} element
 * @param {HTMLElement} parent - Positioned ancestor of `element`
 * @return {number}
 */
export function offsetRelativeTo(element, parent) {
  // Handle the case where `element` is in a same-origin descendant of the
  // frame that contains `parent`.
  if (element.ownerDocument !== parent.ownerDocument) {
    let frameToParentOffset = 0;
    const frame = iframeContainingElement(element);
    if (frame) {
      frameToParentOffset = offsetRelativeTo(frame, parent);
    }

    // Add the offset from `element` to the top of its frame and the offset
    // from the top of the frame to the top of the parent frame.
    const root = element.ownerDocument.documentElement;
    return frameToParentOffset + offsetRelativeTo(element, root);
  }

  let offset = 0;
  while (element !== parent && parent.contains(element)) {
    offset += element.offsetTop;
    element = /** @type {HTMLElement} */ (element.offsetParent);
  }
  return offset;
}

/**
 * Return true if an element can be scrolled vertically.
 *
 * @param {Element} element
 */
function isScrollable(element) {
  // According to https://drafts.csswg.org/cssom-view/#element-scrolling-members
  // we should not treat an element as scrollable if the `overflow-y` style
  // is set to `hidden` or `clip`. This is not currently implemented.
  return element.scrollHeight > element.clientHeight;
}

/**
 * Return the `<iframe>` element, if any, which contains `element`.
 *
 * @param {Element} element
 */
function iframeContainingElement(element) {
  return /** @type {HTMLElement|null} */ (
    element.ownerDocument.defaultView?.frameElement ?? null
  );
}

/**
 * Return the nearest ancestor of element which can be scrolled.
 *
 * If `element` is contained within an iframe that is same-origin with its parent,
 * this function will traverse the frame boundary. As a result this can return
 * an element which is in a different document to `element`.
 *
 * @param {Element} element
 */
function getScrollableAncestor(element) {
  /** @param {Element} el */
  const parentOf = el => el.parentElement || iframeContainingElement(el);

  let parent = parentOf(element);
  while (parent) {
    if (isScrollable(parent)) {
      return parent;
    }
    parent = parentOf(parent);
  }
  return null;
}

/**
 * @typedef ScrollOptions
 * @prop {number} [maxDuration]
 */

/**
 * Scroll the scrollable ancestors of an element until the element is visible
 * within the top-most viewport.
 *
 * This is similar to the native `Element.scrollIntoView` method except that it
 * works in browsers which don't support the `behavior: "smooth"` option and it
 * returns a Promise to indicate when scrolling is complete. Like the native
 * `scrollIntoView`, this function supports elements in the current document
 * as well as those in child iframes.
 *
 * This function currently only handles vertical scrolling.
 *
 * @param {HTMLElement} element
 * @param {ScrollOptions} options
 * @return {Promise<void>} - Promise that resolves when the scroll is complete
 */
export async function scrollIntoView(element, options) {
  let ancestor = getScrollableAncestor(element);

  if (!ancestor) {
    return;
  }

  // Scroll each scrollable ancestor of `element` concurrently until it is in
  // view in the current document.
  const scrollDone = [];
  while (ancestor) {
    const offset = offsetRelativeTo(element, ancestor);
    const scrolled = scrollElement(ancestor, offset, options);
    scrollDone.push(scrolled);

    element = ancestor;
    ancestor = getScrollableAncestor(element);
  }
  await Promise.all(scrollDone);
}

/**
 * Scroll `element` until its `scrollTop` offset reaches a target value.
 *
 * @param {Element} element - Container element to scroll
 * @param {number} offset - Target value for the scroll offset
 * @param {ScrollOptions} options
 * @return {Promise<void>} - A promise that resolves once the scroll animation
 *   is complete
 */
export async function scrollElement(
  element,
  offset,
  /* istanbul ignore next - default options are overridden in tests */
  { maxDuration = 500 } = {}
) {
  const startOffset = element.scrollTop;
  const endOffset = offset;
  const scrollStart = Date.now();

  // Choose a scroll duration proportional to the scroll distance, but capped
  // to avoid it being too slow.
  const pixelsPerMs = 3;
  const scrollDuration = Math.min(
    Math.abs(endOffset - startOffset) / pixelsPerMs,
    maxDuration
  );

  let scrollFraction = 0.0;
  while (scrollFraction < 1.0) {
    await nextAnimationFrame();
    scrollFraction = Math.min(1.0, (Date.now() - scrollStart) / scrollDuration);
    element.scrollTop = interpolate(startOffset, endOffset, scrollFraction);
  }
}
