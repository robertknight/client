'use strict';

/**
 * This module provides functions to convert between DOM Ranges and a
 * serialized representation (a "range selector") using an XPath to represent
 * the start and end containers.
 *
 */

const textPosition = require('./text-position');

/**
 * @typedef RangeSelector
 * @prop {string} startContainer - XPath from root to the start
 * @prop {number} startOffset
 * @prop {string} endContainer
 * @prop {number} endOffset
 */

/**
 * Traverse an XPath starting at `root` and return the DOM node that it refers
 * to.
 *
 * @param {Node} root
 * @param {string} xpath
 * @return {Element|null}
 */
function traverse(root, xpath) {
  // Since the client needs to support browsers which don't have any native XPath
  // support (IE 11) and we don't have a compelling need to support anything
  // beyond a very minimal subset, we translate XPaths into CSS selectors and
  // use `querySelector`.
  //
  // This implementation is simple but not particularly efficient. If it shows
  // up as a hotspot during anchoring, we can re-implement this with manual
  // traversal.

  // Matches `<element-name>[<1-based index>]`.
  const segmentPattern = /([a-z]+[-a-z0-9()]*)\[([0-9]+)\]/;
  const cssSelector = xpath
    .split('/')
    .filter(section => section.length > 0)
    .map(segment => {
      const match = segment.match(segmentPattern);
      if (!match) {
        return 'unknown-element';
      }
      const [, type, index] = match;
      return `${type}:nth-of-type(${index})`;
    })
    .join(' > ');
  return root.querySelector(cssSelector);
}

/**
 * Generate an XPath expression that describes the path from `root` to its
 * descendant `node`.
 */
function xpath(root, node) {
  if (!root.contains(node)) {
    return null;
  }

  const path = [];
  while (node !== root) {
    if (node.nodeType === Node.ELEMENT_NODE) {
      let segment = node.localName;
      const siblings = Array.from(node.parentNode.querySelectorAll(segment));
      segment += `[${siblings.indexOf(node) + 1}]`;
      path.unshift(segment);
    }
    node = node.parentNode;
  }

  return '/' + path.join('/');
}

function textOffsetToRange(root, textOffset) {
  if (textOffset === 0) {
    // Special case offset 0, in case the `root` element has no text nodes.
    const range = root.ownerDocument.createRange();
    range.setStart(root, 0);
    return range;
  }
  return textPosition.toRange(root, textOffset, textOffset);
}

/**
 * Convert a range selector to a DOM range.
 *
 * @param {Element} root
 * @param {RangeSelector} selector
 * @return {Range|null}
 */
function toRange(root, selector) {
  // Resolve the XPaths to DOM nodes for the start and end of the range.
  const startNode = traverse(root, selector.startContainer);
  const endNode = traverse(root, selector.endContainer);

  if (!startNode || !endNode) {
    return null;
  }

  try {
    // Resolve the character offsets within the start and end nodes.
    const { startOffset, endOffset } = selector;
    const range = textOffsetToRange(startNode, startOffset);
    const endRange = textOffsetToRange(endNode, endOffset);
    range.setEnd(endRange.endContainer, endRange.endOffset);
    return range;
  } catch (err) {
    return null;
  }
}

/**
 * Convert a DOM range to a range selector relative to `root`.
 *
 * @param {Element} root
 * @param {Range} range
 * @return {RangeSelector}
 */
function fromRange(root, range) {
  // Map the start and end containers to their nearest element ancestor.
  let startContainer = range.startContainer;
  if (startContainer.nodeType === Node.TEXT_NODE) {
    startContainer = startContainer.parentNode;
  }

  let endContainer = range.endContainer;
  if (endContainer.nodeType === Node.TEXT_NODE) {
    endContainer = endContainer.parentNode;
  }

  // Serialize containers to xpaths.
  const start = xpath(root, startContainer);
  if (!start) {
    throw new Error('Range starts outside of root');
  }

  const end = xpath(root, endContainer);
  if (!end) {
    throw new Error('Range ends outside of root');
  }

  // Map the start and end offset to text positions within the start and end
  // element.
  const [startOffset] = textPosition.fromRange(startContainer, range);
  const [, endOffset] = textPosition.fromRange(endContainer, range);

  return {
    startContainer: start,
    startOffset,
    endContainer: end,
    endOffset,
  };
}

module.exports = {
  fromRange,
  toRange,
};
