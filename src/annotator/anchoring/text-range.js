/**
 * Return the total length of the text of all previous siblings of `node`.
 *
 * @param {Node} node
 */
function previousSiblingTextLength(node) {
  let sibling = node.previousSibling;
  let length = 0;
  while (sibling) {
    length += sibling.textContent?.length ?? 0;
    sibling = sibling.previousSibling;
  }
  return length;
}

/**
 * Represents an offset within the text content of an element.
 *
 * This position can be resolved to a specific descendant node in the current
 * DOM subtree of the element using the `resolve` method.
 */
export class TextPosition {
  /**
   * Construct a `TextPosition` that refers to the text position `offset` within
   * the text content of `element`.
   *
   * @param {Element} element
   * @param {number} offset
   */
  constructor(element, offset) {
    if (offset < 0) {
      throw new Error('Offset is invalid');
    }

    this.element = element;
    this.offset = offset;
  }

  /**
   * Resolve the position to a specific text node and offset within that node.
   *
   * @return {{ node: Text, offset: number }}
   */
  resolve() {
    const root = this.element;
    const nodeIter = /** @type {Document} */ (root.ownerDocument).createNodeIterator(
      root,
      NodeFilter.SHOW_TEXT
    );

    let currentNode;
    let length = 0;
    while ((currentNode = nodeIter.nextNode())) {
      const textNode = /** @type {Text} */ (currentNode);
      if (this.offset <= length + textNode.data.length) {
        return { node: textNode, offset: this.offset - length };
      }
      length += textNode.data.length;
    }

    // TODO - Handle case where `this.element` contains no `Text` children.

    throw new Error('Offset exceeds text length');
  }

  /**
   * Construct a `TextPosition` representing the range start or end point (node, offset).
   *
   * @param {Node} node
   * @param {number} offset
   * @param {(el: Element) => boolean} [ignoreParent] -
   *   Callback to determine whether to ignore a particular parent node - ie.
   *   behave as if it did not exist in the DOM. The returned `TextPosition` will
   *   use the first non-ignored parent as its element.
   * @return {TextPosition}
   */
  static fromPoint(node, offset, ignoreParent = () => false) {
    switch (node.nodeType) {
      case Node.TEXT_NODE: {
        if (offset < 0 || offset > /** @type {Text} */ (node).data.length) {
          throw new Error('Text node offset is out of range');
        }

        // Get the offset to the start of the parent element.
        let textOffset = previousSiblingTextLength(node) + offset;

        // Add the offset to the start of the first non-ignored parent element.
        let parent = node.parentElement;
        while (parent && ignoreParent(parent)) {
          textOffset += previousSiblingTextLength(parent);
          parent = parent.parentElement;
        }

        if (!parent) {
          throw new Error('Text node has no non-ignored parent');
        }

        return new TextPosition(parent, textOffset);
      }
      case Node.ELEMENT_NODE: {
        if (offset < 0 || offset > node.childNodes.length) {
          throw new Error('Child node offset is out of range');
        }

        // Get the text length before the `offset`th child of element.
        let textOffset = 0;
        for (let i = 0; i < offset; i++) {
          textOffset += node.childNodes[i].textContent?.length ?? 0;
        }

        // Add the offset to the start of the first non-ignored parent.
        let element = /** @type {Element|null} */ (node);
        while (element && ignoreParent(element)) {
          textOffset += previousSiblingTextLength(element);
          element = element.parentElement;
        }

        if (!element) {
          throw new Error('Element node has no non-ignored ancestor');
        }

        return new TextPosition(element, textOffset);
      }
      default:
        throw new Error('Point is not in an element or text node');
    }
  }
}

/**
 * Represents a region of a document as a (start, end) pair of `TextPosition` points.
 *
 * Representing a range in this way allows for changes in the DOM content of the
 * range which don't affect its text content, without affecting the text content
 * of the range itself.
 */
export class TextRange {
  /**
   * Construct an immutable `TextRange` from a `start` and `end` point.
   *
   * @param {TextPosition} start
   * @param {TextPosition} end
   */
  constructor(start, end) {
    this.start = start;
    this.end = end;
  }

  /**
   * Resolve the `TextRange` to a DOM range.
   *
   * @return {Range}
   */
  toRange() {
    const { node: startNode, offset: startOffset } = this.start.resolve();
    const { node: endNode, offset: endOffset } = this.end.resolve();

    const range = new Range();
    range.setStart(startNode, startOffset);
    range.setEnd(endNode, endOffset);
    return range;
  }

  /**
   * Convert an exiting DOM `Range` to a `TextRange`
   *
   * @param {Range} range
   * @return {TextRange}
   */
  static fromRange(range) {
    const start = TextPosition.fromPoint(
      range.startContainer,
      range.startOffset
    );
    const end = TextPosition.fromPoint(range.endContainer, range.endOffset);
    return new TextRange(start, end);
  }
}
