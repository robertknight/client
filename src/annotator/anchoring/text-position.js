'use strict';

/**
 * Functions to convert between DOM ranges and characters offsets within the
 * `textContent` of HTML elements.
 */

/**
 * Return a `NodeIterator` over all text nodes in `root`.
 *
 * @param {HTMLElement} root
 * @return {NodeIterator}
 */
function textNodeIterator(root) {
  return root.ownerDocument.createNodeIterator(
    root,
    NodeFilter.SHOW_TEXT,

    // The `filter` and `expandEntityReferences` arguments are mandatory in IE
    // although optional according to the spec.
    null, // filter
    false // expandEntityReferences
  );
}

/**
 * Convert a DOM `Range` into a `start` and `end` offset within the `textContent`
 * of `root`.
 *
 * If `range` starts or ends outside `root`, this function behaves as if `range`
 * were clamped to `root`. The returned offsets will always be in the range
 * `[0, root.textContent.length]`.
 *
 * @param {HTMLElement} root
 * @param {Range} range - DOM range
 * @return {[number, number]} A pair of start and end offsets
 */
function fromRange(root, range) {
  const nodeIter = textNodeIterator(root);

  // Number of characters in text nodes visited so far.
  let textLength = 0;

  // Start offset of range within `root.textContent`.
  let start = null;

  // End offset of range within `root.textContent`.
  let end = null;

  const nodeRange = root.ownerDocument.createRange();

  let node;
  while ((node = nodeIter.nextNode())) {
    nodeRange.selectNodeContents(node);

    if (range.startContainer === node) {
      // Range starts within this node.
      start = textLength + range.startOffset;
    } else if (
      start === null &&
      range.compareBoundaryPoints(Range.START_TO_START, nodeRange) < 0
    ) {
      // Range starts before this node, but after the previously visited node.
      start = textLength;
    }

    if (range.endContainer === node) {
      // Range ends within this node.
      end = textLength + range.endOffset;
    } else if (
      end === null &&
      range.compareBoundaryPoints(Range.START_TO_END, nodeRange) < 0
    ) {
      // Range ends before this node, but after the previously visited node.
      end = textLength;
    }

    textLength += node.nodeValue.length;
  }

  if (start === null) {
    // The range starts after `root`.
    start = textLength;
  }

  if (end === null) {
    // The range ends after `root`.
    end = textLength;
  }

  return [start, end];
}

/**
 * Convert `start` and `end` character offset positions within the `textContent`
 * of a `root` element into a `Range`.
 *
 * Throws if the `start` or `end` offsets are outside of the range `[0,
 * root.textContent.length]`.
 *
 * @param {HTMLElement} root
 * @param {number} start - Character offset within `root.textContent`
 * @param {number} end - Character offset within `root.textContent`
 * @return {Range} Range spanning text from `start` to `end`
 */
function toRange(root, start, end) {
  const nodeIter = textNodeIterator(root);

  let startContainer;
  let startOffset;
  let endContainer;
  let endOffset;

  let textLength = 0;

  let node;
  while ((node = nodeIter.nextNode()) && (!startContainer || !endContainer)) {
    const nodeText = node.nodeValue;

    if (
      !startContainer &&
      start >= textLength &&
      start <= textLength + nodeText.length
    ) {
      startContainer = node;
      startOffset = start - textLength;
    }

    if (
      !endContainer &&
      end >= textLength &&
      end <= textLength + nodeText.length
    ) {
      endContainer = node;
      endOffset = end - textLength;
    }

    textLength += nodeText.length;
  }

  if (!startContainer) {
    throw new Error('invalid start offset');
  }
  if (!endContainer) {
    throw new Error('invalid end offset');
  }

  const range = root.ownerDocument.createRange();
  range.setStart(startContainer, startOffset);
  range.setEnd(endContainer, endOffset);

  return range;
}

module.exports = {
  fromRange,
  toRange,
  textNodeIterator,
};
