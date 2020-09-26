/**
 * @typedef RangeSelector
 * @prop {string} startContainer
 * @prop {string} endContainer
 * @prop {number} startOffset
 * @prop {number} endOffset
 */

/**
 * Return the index of `element` amongst siblings of the same type.
 *
 * @param {Element} element
 * @return {number}
 */
function childElementIndex(element) {
  const parent = element.parentNode;
  if (!parent) {
    throw new Error('Element has no parent');
  }

  const children = Array.from(parent.childNodes);
  const childIndex = children.indexOf(element);

  let typeIndex = 0;
  for (let i = 0; i < childIndex; i++) {
    const sibling = children[i];
    if (
      sibling.nodeType === Node.ELEMENT_NODE &&
      sibling.nodeName === element.nodeName
    ) {
      ++typeIndex;
    }
  }
  return typeIndex;
}

/**
 * Generate a relative XPath of the form `/tagName[n]/.../tagName[n]` from `root`
 * to `node`.
 *
 * @param {Element} root
 * @param {Node} node
 * @return {string}
 */
function xpathFromNode(root, node) {
  if (!root.contains(node)) {
    throw new Error('Node is not contained within root');
  }

  if (node.nodeType !== Node.ELEMENT_NODE) {
    node = /** @type {Element} */ (node.parentElement);
  }

  const segments = [];
  while (node !== root) {
    const index = childElementIndex(/** @type {Element} */ (node));
    segments.push(node.nodeName.toLowerCase() + '[' + (index + 1) + ']');
  }
  return segments.join('/');
}

/**
 * Serialize a DOM range to a `RangeSelector` relative to `root`.
 *
 * Throws an error if a valid selector cannot be generated.
 *
 * @param {Element} root
 * @param {Range} range
 * @param {Object} options
 * @param {string} [options.ignoreSelector]
 */
export function toSelector(root, range, { ignoreSelector }) {
  // TODO - Clip the input range to exclude any portion inside `ignoreSelector`.

  const startXPath = xpathFromNode(root, range.startContainer);
  const endXPath = xpathFromNode(root, range.endContainer);

  const startOffset = textOffset(range.startContainer, range.startOffset);
  const endOffset = textOffset(range.endContainer, range.endOffset);

  return {
    type: 'RangeSelector',
    startContainer: startXPath,
    startOffset,
    endContainer: endXPath,
    endOffset,
  };
}

/**
 * Return index of `index`th child element of type `childType` within `parent`.
 *
 * @param {Element} parent
 * @param {string} childType
 * @param {number} index - 1-based index
 * @return {Element|null}
 */
function nthChildOfType(parent, childType, index) {
  childType = childType.toUpperCase();

  let childIndex = 0;
  const childNodes = parent.childNodes;
  for (let i = 0; i < childNodes.length; i++) {
    const child = childNodes[i];
    if (child.nodeType === Node.ELEMENT_NODE && child.nodeName === childType) {
      ++childIndex;
      if (childIndex === index) {
        return /** @type {Element} */ (child);
      }
    }
  }
  return null;
}

/**
 * Resolve an XPath relative to `root` and text offset to a text node and
 * offset within that node.
 *
 * This function only supports simple XPaths of the form `/tagName[n]/.../tagName[n]`.
 *
 * @param {Element} root
 * @param {string} xpath
 * @param {number} offset
 * @return {[Text, number]}
 */
function evaluateXPath(root, xpath, offset) {
  const pathSegments = xpath.split('/');
  if (pathSegments.length < 1 || pathSegments[0] !== '') {
    throw new Error('Unsupported XPath');
  }

  let element = root;

  // Resolve the element path within the XPath to an element node.
  for (let segment of pathSegments) {
    const match = segment.match(/^([a-zA-Z-]+)\[([0-9]+)\]$/);
    if (!match) {
      throw new Error('Unsupported XPath');
    }
    const elementType = match[1];
    const elementIndex = parseInt(match[2]);

    const child = nthChildOfType(element, elementType, elementIndex);
    if (!child) {
      throw new Error('Unable to resolve XPath');
    }

    element = child;
  }

  // Resolve the text offset to a text node within the element and the text offset
  // within that node.
  if (offset < 0) {
    throw new Error('Text offset is negative');
  }

  let textLength = 0;
  for (let i = 0; i < element.childNodes.length; i++) {
    const child = element.childNodes[i];
    if (child.nodeType !== Node.TEXT_NODE) {
      continue;
    }

    const text = /** @type {string} */ (child.nodeValue);
    if (offset - textLength < text.length) {
      return [/** @type {Text} */ (child), offset - textLength];
    }

    textLength += text.length;
  }

  throw new Error('Text offset is not valid within node');
}

/**
 * Resolve a serialized `RangeSelector` to a DOM Range.
 *
 * Throws an error if the selector cannot be resolved to a range.
 *
 * @param {RangeSelector} selector
 * @param {Element} root
 * @return {Range}
 */
export function fromSelector(root, selector) {
  const [startNode, startOffset] = evaluateXPath(
    root,
    selector.startContainer,
    selector.startOffset
  );
  const [endNode, endOffset] = evaluateXPath(
    root,
    selector.endContainer,
    selector.endOffset
  );

  const range = root.ownerDocument.createRange();
  range.setStart(startNode, startOffset);
  range.setEnd(endNode, endOffset);
  return range;
}
